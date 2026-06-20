import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Calendar, CheckCircle2, Pencil, RefreshCw,
  RotateCcw, Search, UserCheck, X, AlertTriangle, MessageCircle, FileText, Plus, Share2,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Tag from '../components/Tag';
import SuccessOverlay from '../components/SuccessOverlay';
import CrossFade from '../components/CrossFade';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggal, formatRupiahPlain, haptic } from '../lib/utils';
import { openWa, pesanTarikan } from '../lib/waReminder';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { showToast } from '../lib/toast';
import type { Tarikan, Warga } from '../lib/types';

type AbsensiMap = Record<string, 'hadir' | 'tidak_hadir'>;
type AbsensiFilter = 'semua' | 'hadir' | 'belum';

function formatKompak(n: number): string {
  if (n === 0) return 'Rp0';
  if (n >= 1_000_000) {
    const val = (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    return `Rp${val} jt`;
  }
  return `Rp${Math.round(n / 1000)}rb`;
}

// ── Absensi View ────────────────────────────────────────────

interface AbsensiResult {
  tarikanNomor: number;
  hadirCount: number;
  tidakCount: number;
  kasTotal: number;
  talanganTotal: number;
  sohibulBaitTerima: number;
  tidakHadirNama: string[]; // nama pembayar yg tidak hadir (= kena talangan) — utk kontrol cek-fisik
}

interface AbsensiViewProps {
  tarikan: Tarikan;
  wargaList: Warga[];
  onBack: () => void;
  onSaved: (result: AbsensiResult) => void;
  onCancelled: () => void;
}

function AbsensiView({ tarikan, wargaList, onBack, onSaved, onCancelled }: AbsensiViewProps) {
  const [map, setMap] = useState<AbsensiMap>({});
  const [filter, setFilter] = useState<AbsensiFilter>('semua');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loadingAbsensi, setLoadingAbsensi] = useState(true);
  useBackDismiss(true, onBack); // tombol Back HP keluar dari editor absensi

  useEffect(() => {
    async function loadExisting() {
      if (tarikan.status === 'selesai') {
        const { data } = await supabase
          .from('absensi')
          .select('warga_id, status')
          .eq('tarikan_id', tarikan.id);
        const init: AbsensiMap = {};
        wargaList.forEach(w => { init[w.id] = 'tidak_hadir'; });
        (data ?? []).forEach((a: { warga_id: string; status: string }) => {
          init[a.warga_id] = a.status as 'hadir' | 'tidak_hadir';
        });
        setMap(init);
      } else {
        const init: AbsensiMap = {};
        wargaList.forEach(w => { init[w.id] = 'tidak_hadir'; });
        setMap(init);
      }
      setLoadingAbsensi(false);
    }
    loadExisting();
  }, [tarikan, wargaList]);

  // Pembayar = semua anggota KECUALI Sohibul Bait (Sohibul tidak bayar)
  const sohibulId = tarikan.sohibul_bait_id ?? '';
  const pembayarCount = wargaList.filter(w => w.id !== sohibulId).length;
  const hadirCount = Object.values(map).filter(v => v === 'hadir').length;
  const tidakCount = wargaList.length - hadirCount;
  // Pembayar yang tidak hadir → kena talangan (Sohibul dikecualikan)
  const talanganCount = wargaList.filter(w => w.id !== sohibulId && map[w.id] !== 'hadir').length;
  // Kas & Sohibul KONSTAN: berbasis jumlah pembayar (bukan jumlah hadir)
  const kasTotal = pembayarCount * 5000;       // mis. 68 × 5.000 = 340.000
  const talanganTotal = talanganCount * 50000; // 50.000 per pembayar absen

  function setAll(status: 'hadir' | 'tidak_hadir') {
    const next: AbsensiMap = {};
    wargaList.forEach(w => { next[w.id] = status; });
    setMap(next);
  }

  function toggle(id: string) {
    setMap(prev => ({ ...prev, [id]: prev[id] === 'hadir' ? 'tidak_hadir' : 'hadir' }));
  }

  const filtered = useMemo(() => {
    let list = wargaList;
    if (search) list = list.filter(w => w.nama.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'hadir')  list = list.filter(w => map[w.id] === 'hadir');
    if (filter === 'belum')  list = list.filter(w => map[w.id] === 'tidak_hadir');
    return list;
  }, [wargaList, search, filter, map]);

  async function simpan() {
    setSaving(true);
    try {
      const tarikanId = tarikan.id;
      const hadirIds  = wargaList.filter(w => map[w.id] === 'hadir').map(w => w.id);
      const tidakIds  = wargaList.filter(w => map[w.id] === 'tidak_hadir').map(w => w.id);

      // Pembayar = semua anggota KECUALI Sohibul Bait. Sohibul tidak bayar.
      // Kas & Sohibul dihitung dari jumlah pembayar (konstan), BUKAN jumlah hadir.
      const pembayarIds   = wargaList.filter(w => w.id !== sohibulId).map(w => w.id);
      const pembayarCount = pembayarIds.length;                              // mis. 68
      const kasTerkumpul  = pembayarCount * 5000;                            // 340.000
      // Pembayar yang tidak hadir → kena talangan (Sohibul dikecualikan)
      const talanganIds   = pembayarIds.filter(id => map[id] !== 'hadir');

      // Simpan status lunas yang sudah ada sebelum menghapus (agar tidak ter-reset saat Hitung Ulang)
      const { data: existingLunas } = await supabase
        .from('talangan')
        .select('warga_id, tanggal_lunas')
        .eq('tarikan_id', tarikanId)
        .eq('status_lunas', true);
      const lunasMap = new Map<string, string | null>(
        (existingLunas ?? []).map(t => [t.warga_id, t.tanggal_lunas as string | null])
      );

      await supabase.from('absensi').delete().eq('tarikan_id', tarikanId);

      if (hadirIds.length)
        await supabase.from('absensi').insert(hadirIds.map(warga_id => ({ tarikan_id: tarikanId, warga_id, status: 'hadir' })));
      if (tidakIds.length)
        await supabase.from('absensi').insert(tidakIds.map(warga_id => ({ tarikan_id: tarikanId, warga_id, status: 'tidak_hadir' })));

      await supabase.from('talangan').delete().eq('tarikan_id', tarikanId);
      if (talanganIds.length)
        await supabase.from('talangan').insert(talanganIds.map(warga_id => ({
          tarikan_id: tarikanId,
          warga_id,
          nominal: 50000,
          status_lunas: lunasMap.has(warga_id),
          tanggal_lunas: lunasMap.get(warga_id) ?? null,
        })));

      await supabase.from('transaksi_kas').delete().eq('tarikan_id', tarikanId).eq('tipe', 'kas_masuk');
      if (pembayarCount)
        await supabase.from('transaksi_kas').insert({
          tipe: 'kas_masuk',
          nominal: kasTerkumpul,
          keterangan: `Kas hadiran tarikan #${tarikan.nomor} (${pembayarCount} pembayar × Rp5.000)`,
          tanggal: tarikan.tanggal,
          tarikan_id: tarikanId,
          saldo_setelah: 0,
        });

      await supabase.from('tarikan').update({
        status: 'selesai',
        total_hadir: hadirIds.length,
        total_terkumpul: kasTerkumpul,
      }).eq('id', tarikanId);

      // Nama pembayar tidak hadir (urut sesuai wargaList) — Sohibul dikecualikan.
      const tidakHadirNama = wargaList
        .filter(w => w.id !== sohibulId && map[w.id] !== 'hadir')
        .map(w => w.nama);

      onSaved({
        tarikanNomor: tarikan.nomor,
        hadirCount: hadirIds.length,
        tidakCount: talanganIds.length,
        kasTotal: kasTerkumpul,
        talanganTotal: talanganIds.length * 50000,
        sohibulBaitTerima: pembayarCount * 45000,
        tidakHadirNama,
      });
    } catch {
      // Penyimpanan gagal (mis. koneksi putus) → JANGAN diam: beri tahu & tahan
      // di layar absensi supaya bendahara bisa tekan "Simpan & Hitung" lagi.
      // Kartu rincian hanya muncul kalau onSaved() benar-benar tercapai.
      showToast('Gagal menyimpan & menghitung. Cek koneksi lalu tekan lagi.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Batalkan hasil "Simpan & Hitung" — kembalikan tarikan ke status terjadwal
  // dan hapus SEMUA data turunannya (absensi, talangan, transaksi kas tarikan ini).
  async function batalkan() {
    setCancelling(true);
    setConfirmCancel(false);
    try {
      const tarikanId = tarikan.id;
      await supabase.from('absensi').delete().eq('tarikan_id', tarikanId);
      await supabase.from('talangan').delete().eq('tarikan_id', tarikanId);
      // Hapus kas masuk + talangan masuk yang terkait tarikan ini
      await supabase.from('transaksi_kas').delete().eq('tarikan_id', tarikanId);
      await supabase.from('tarikan').update({
        status: 'dijadwalkan',
        total_hadir: 0,
        total_terkumpul: 0,
      }).eq('id', tarikanId);
      onCancelled();
    } finally {
      setCancelling(false);
    }
  }

  function handleBatalkanClick() {
    if (confirmCancel) {
      batalkan();
    } else {
      setConfirmCancel(true);
      setTimeout(() => setConfirmCancel(false), 3500);
    }
  }

  if (loadingAbsensi) {
    return (
      <div className="space-y-6 pb-20">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-4 w-44 rounded-full" />
            <div className="skeleton h-2.5 w-28 rounded-full" />
          </div>
        </div>
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
        {/* Filter tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-9 rounded-xl" />)}
        </div>
        {/* Warga list */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex items-center gap-3 p-3.5 ${i < 5 ? 'border-b border-line dark:border-gray-800' : ''}`}>
              <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-2/5 rounded-full" />
                <div className="skeleton h-2.5 w-1/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Back header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">
            Absensi Tarikan #{tarikan.nomor}
          </p>
          <p className="text-xs text-ink-faint dark:text-gray-400">{tarikan.sohibul_bait?.nama ?? '—'} · {formatTanggal(tarikan.tanggal)}</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Hadir', value: hadirCount, color: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Tdk Hadir', value: tidakCount, color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Kas', value: formatKompak(kasTotal), color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Talangan', value: formatKompak(talanganTotal), color: 'text-warn dark:text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-2.5 text-center">
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-micro text-ink-faint dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Title + count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Daftar Hadir</p>
        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
          {wargaList.length}
        </span>
      </div>

      {/* Bulk actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setAll('hadir')}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Semua Hadir
        </button>
        <button
          onClick={() => setAll('hadir')}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/25 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Semua Titip
        </button>
        <button
          onClick={() => setAll('tidak_hadir')}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Filter tabs */}
      <div className="grid grid-cols-3 gap-1.5">
        {(['semua', 'hadir', 'belum'] as AbsensiFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filter === f
                ? 'bg-brand text-white border-brand'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-control dark:border-gray-700'
            }`}
          >
            {f === 'semua' ? 'Semua' : f === 'hadir' ? 'Sudah Hadir' : 'Belum Hadir'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama..."
          className="field-search"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Warga list */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
        {filtered.map((w, idx) => {
          const isHadir = map[w.id] === 'hadir';
          return (
            <button
              key={w.id}
              onClick={() => toggle(w.id)}
              className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${
                idx < filtered.length - 1 ? 'border-b border-line dark:border-gray-800' : ''
              } ${isHadir ? 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/15' : 'hover:bg-rose-50/30 dark:hover:bg-rose-900/15'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                isHadir ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/25 text-rose-600 dark:text-rose-400'
              }`}>
                {w.nama.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{w.nama}</p>
                <p className={`text-xs ${isHadir ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isHadir ? 'Hadir' : 'Tidak hadir → Talangan'}
                </p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isHadir ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {isHadir && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky action buttons — offset di atas nav + safe-area agar tidak ketutup nav */}
      <div
        className="fixed left-0 right-0 px-5 z-30"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto space-y-2">
          <button
            onClick={() => { haptic(12); simpan(); }}
            disabled={saving || cancelling}
            className="btn-brand w-full py-3.5 font-bold text-sm disabled:opacity-70 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Menghitung...' : tarikan.status === 'selesai' ? 'Hitung Ulang Iuran' : 'Simpan & Hitung Iuran'}
          </button>

          {/* Batalkan — hanya untuk tarikan yang sudah selesai (undo simpan & hitung) */}
          {tarikan.status === 'selesai' && (
            <button
              onClick={handleBatalkanClick}
              disabled={saving || cancelling}
              className={`w-full py-3 rounded-full font-bold text-sm shadow-sm active:scale-[0.97] transition-all duration-150 disabled:opacity-70 flex items-center justify-center gap-2 ${
                confirmCancel
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
              }`}
            >
              {cancelling ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Membatalkan...</>
              ) : confirmCancel ? (
                'Yakin? Data tarikan ini akan dihapus'
              ) : (
                <><RotateCcw className="w-4 h-4" />Batalkan Hasil Tarikan</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Result Card ─────────────────────────────────────────────

function ResultCard({ result, onDismiss }: { result: AbsensiResult; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const hasTalangan = result.talanganTotal > 0;

  // Tampil tetap sampai bendahara menutup sendiri (untuk cocokkan uang real).
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t1);
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }

  // Bagikan rincian tarikan sbg kartu PNG bermerek → grup WA warga.
  async function share() {
    haptic(12);
    setSharing(true);
    try {
      const { shareReceipt } = await import('../lib/shareReceipt');
      await shareReceipt({
        title: `Hasil Tarikan #${result.tarikanNomor} — RT 004 / RW 006`,
        amountLabel: 'Kas Terkumpul',
        amount: formatRupiahPlain(result.kasTotal),
        rows: [
          { label: 'Hadir', value: `${result.hadirCount} warga` },
          { label: 'Tidak Hadir', value: `${result.tidakCount} warga` },
          ...(hasTalangan ? [{ label: 'Talangan Keluar', value: formatRupiahPlain(result.talanganTotal) }] : []),
          { label: 'Sohibul Bait Terima', value: formatRupiahPlain(result.sohibulBaitTerima) },
        ],
        list: result.tidakHadirNama.length
          ? { heading: `Tidak Hadir (${result.tidakHadirNama.length})`, items: result.tidakHadirNama }
          : undefined,
        shareText: `Hasil Tarikan #${result.tarikanNomor} RT 004/006\nKas terkumpul: ${formatRupiahPlain(result.kasTotal)} · Sohibul terima: ${formatRupiahPlain(result.sohibulBaitTerima)}\n— Hadiran RT`,
      });
    } catch {
      showToast('Gagal membuat gambar. Coba lagi.', 'error');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className={`transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift overflow-hidden">
        {/* Header — badge sukses + judul + tutup */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-400/40">
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Tarikan #{result.tarikanNomor} selesai dihitung</p>
            <p className="text-micro text-ink-faint dark:text-gray-400">Cocokkan uang dulu sebelum ditutup</p>
          </div>
          <button onClick={dismiss} aria-label="Tutup" className="press w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dua nominal utama bersisian */}
        <div className="grid grid-cols-2 divide-x divide-line dark:divide-gray-800 border-t border-line dark:border-gray-800">
          <div className="px-4 py-3 min-w-0">
            <p className="text-micro font-bold uppercase tracking-wider text-ink-faint dark:text-gray-400">Kas Terkumpul</p>
            <p className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 tabular-nums mt-0.5 truncate">{formatRupiahPlain(result.kasTotal)}</p>
          </div>
          <div className="px-4 py-3 min-w-0">
            <p className="text-micro font-bold uppercase tracking-wider text-ink-faint dark:text-gray-400">Sohibul Terima</p>
            <p className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5 truncate">{formatRupiahPlain(result.sohibulBaitTerima)}</p>
          </div>
        </div>

        {/* Kehadiran */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-line dark:border-gray-800 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {result.hadirCount} Hadir
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {result.tidakCount} Tidak hadir
          </span>
        </div>

        {/* Daftar tidak hadir — kontrol cocokkan uang fisik vs data */}
        {result.tidakHadirNama.length > 0 && (
          <div className="px-4 py-3 border-t border-line dark:border-gray-800">
            <p className="text-micro font-bold uppercase tracking-wider text-warn dark:text-amber-400 mb-2">
              Tidak hadir ({result.tidakHadirNama.length}) — cek vs uang fisik
            </p>
            <ol className="space-y-1">
              {result.tidakHadirNama.map((nama, i) => (
                <li key={`${i}-${nama}`} className="flex items-center gap-2 text-caption text-ink-sub dark:text-gray-300">
                  <span className="w-5 shrink-0 text-right tabular-nums text-ink-faint dark:text-gray-500">{i + 1}.</span>
                  <span className="truncate">{nama}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Talangan keluar */}
        {hasTalangan && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-900/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-micro text-amber-700 dark:text-amber-400 font-medium">
              Talangan keluar {formatRupiahPlain(result.talanganTotal)}
            </p>
          </div>
        )}

        {/* Bagikan PNG */}
        <div className="p-3 border-t border-line dark:border-gray-800">
          <button
            onClick={share}
            disabled={sharing}
            className="btn-brand press w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold disabled:opacity-60"
          >
            <Share2 className="w-3.5 h-3.5" /> {sharing ? 'Menyiapkan…' : 'Bagikan PNG'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Tarikan Modal ──────────────────────────────────────

interface EditTarikanModalProps {
  tarikan: Tarikan;
  wargaList: Warga[];
  onClose: () => void;
  onSaved: () => void;
}

function EditTarikanModal({ tarikan, wargaList, onClose, onSaved }: EditTarikanModalProps) {
  const [tanggal, setTanggal] = useState((tarikan.tanggal ?? '').slice(0, 10));
  const [sohibulId, setSohibulId] = useState(tarikan.sohibul_bait_id ?? '');
  const [saving, setSaving] = useState(false);
  useBackDismiss(true, onClose);
  const dlg = useDialog(true, { onClose, label: `Revisi jadwal tarikan #${tarikan.nomor}` });

  // Pastikan sohibul saat ini tetap muncul di dropdown walau tidak aktif lagi
  const options = useMemo(() => {
    const list = [...wargaList];
    if (tarikan.sohibul_bait && !list.some(w => w.id === tarikan.sohibul_bait!.id)) {
      list.unshift(tarikan.sohibul_bait);
    }
    return list;
  }, [wargaList, tarikan.sohibul_bait]);

  async function simpan() {
    setSaving(true);
    try {
      await supabase
        .from('tarikan')
        .update({ tanggal, sohibul_bait_id: sohibulId || null })
        .eq('id', tarikan.id);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={dlg.panelRef} {...dlg.panelProps} className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 float">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Revisi Jadwal #{tarikan.nomor}</p>
            <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">Ubah tanggal atau Sohibul Bait</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="press w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Tanggal Tarikan</label>
        <input
          type="date"
          value={tanggal}
          onChange={e => setTanggal(e.target.value)}
          className="field mb-4"
        />

        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Sohibul Bait</label>
        <select
          value={sohibulId}
          onChange={e => setSohibulId(e.target.value)}
          className="field mb-5"
        >
          <option value="">— Belum ditentukan —</option>
          {options.map(w => (
            <option key={w.id} value={w.id}>{w.nama}</option>
          ))}
        </select>

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 py-3 rounded-full"
          >
            Batal
          </button>
          <button
            onClick={() => { haptic(12); simpan(); }}
            disabled={saving || !tanggal}
            className="btn-brand flex-1 py-3 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Menyimpan...' : 'Simpan Revisi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tambah Tarikan Modal ────────────────────────────────────

interface TambahTarikanModalProps {
  nextNomor: number;
  wargaList: Warga[];
  onClose: () => void;
  onSaved: () => void;
}

function TambahTarikanModal({ nextNomor, wargaList, onClose, onSaved }: TambahTarikanModalProps) {
  const dlg = useDialog(true, { onClose, label: `Tambah jadwal tarikan #${nextNomor}` });
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [sohibulId, setSohibulId] = useState('');
  const [saving, setSaving] = useState(false);
  useBackDismiss(true, onClose);

  async function simpan() {
    setSaving(true);
    try {
      await supabase.from('tarikan').insert({
        nomor: nextNomor,
        tanggal,
        sohibul_bait_id: sohibulId || null,
        status: 'dijadwalkan',
        jumlah_per_orang: 50000,
        total_warga: wargaList.length,
        total_hadir: 0,
        total_terkumpul: 0,
      });
      showToast(`Tarikan #${nextNomor} ditambahkan`);
      haptic(12);
      onSaved();
    } catch {
      showToast('Gagal menambah tarikan', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={dlg.panelRef} {...dlg.panelProps} className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 float">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Tambah Tarikan #{nextNomor}</p>
            <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">Jadwalkan putaran tarikan berikutnya</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="press w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Tanggal Tarikan</label>
        <input
          type="date"
          value={tanggal}
          onChange={e => setTanggal(e.target.value)}
          className="field mb-4"
        />

        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Sohibul Bait</label>
        <select
          value={sohibulId}
          onChange={e => setSohibulId(e.target.value)}
          className="field mb-5"
        >
          <option value="">— Belum ditentukan —</option>
          {wargaList.map(w => (
            <option key={w.id} value={w.id}>{w.nama}</option>
          ))}
        </select>

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 py-3 rounded-full"
          >
            Batal
          </button>
          <button
            onClick={() => { haptic(12); simpan(); }}
            disabled={saving || !tanggal}
            className="btn-brand flex-1 py-3 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Menyimpan...' : 'Simpan Tarikan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function JadwalPage() {
  const { isBendahara } = useAuthContext();
  const [tarikanList, setTarikanList] = useState<Tarikan[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarikan, setSelectedTarikan] = useState<Tarikan | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AbsensiResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingTarikan, setEditingTarikan] = useState<Tarikan | null>(null);
  const [creatingTarikan, setCreatingTarikan] = useState(false);

  async function load() {
    setLoading(true);
    const [tarRes, wargaRes] = await Promise.all([
      supabase
        .from('tarikan')
        .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
        .order('nomor', { ascending: true }),
      supabase
        .from('warga')
        .select('*')
        .eq('status_aktif', true)
        .order('nama', { ascending: true }),
    ]);
    setTarikanList((tarRes.data as Tarikan[]) ?? []);
    setWargaList((wargaRes.data as Warga[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    import('../lib/generateJadwalPDF').catch(() => {}); // preload: jaga gesture share di HP
  }, []);

  const selesaiCount    = tarikanList.filter(t => t.status === 'selesai').length;
  const dijadwalCount   = tarikanList.filter(t => t.status === 'dijadwalkan' || t.status === 'berlangsung').length;
  const nextDijadwal    = tarikanList.find(t => t.status === 'dijadwalkan');
  const nextNomor       = tarikanList.reduce((max, t) => Math.max(max, t.nomor), 0) + 1;

  if (selectedTarikan) {
    return (
      <AbsensiView
        tarikan={selectedTarikan}
        wargaList={wargaList}
        onBack={() => setSelectedTarikan(null)}
        onSaved={(result) => { setLastResult(result); setShowSuccess(true); setSelectedTarikan(null); load(); }}
        onCancelled={() => { setSelectedTarikan(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-2 page-enter">
      <SuccessOverlay show={showSuccess} message="Iuran tersimpan & dihitung" onDone={() => setShowSuccess(false)} />
      {lastResult && (
        <ResultCard result={lastResult} onDismiss={() => setLastResult(null)} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Jadwal Tarikan</h1>
          <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">{selesaiCount} selesai · {dijadwalCount} terjadwal</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isBendahara && (
            <button
              onClick={() => { haptic(); setCreatingTarikan(true); }}
              className="btn-brand flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl active:scale-[0.97] transition-all"
            >
              <Plus className="w-4 h-4" /> Tarikan
            </button>
          )}
          {isBendahara && tarikanList.length > 0 && (
            <button
              onClick={async () => {
                haptic();
                try {
                  const { generateJadwalPDF } = await import('../lib/generateJadwalPDF');
                  generateJadwalPDF(tarikanList);
                } catch {
                  showToast('Gagal membuat PDF. Coba muat ulang aplikasi.', 'error');
                }
              }}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-control dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.97] transition-all"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-3 text-center">
          <p className="font-display text-xl font-bold text-gray-500 tabular-nums">{selesaiCount}</p>
          <p className="text-micro text-ink-faint dark:text-gray-400 font-medium">Selesai</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-3 text-center">
          <p className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{dijadwalCount}</p>
          <p className="text-micro text-ink-faint dark:text-gray-400 font-medium">Terjadwal</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-3 text-center">
          <p className="font-display text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{tarikanList.length}</p>
          <p className="text-micro text-ink-faint dark:text-gray-400 font-medium">Total</p>
        </div>
      </div>

      {/* List — cross-fade skeleton → konten */}
      <CrossFade loading={loading} skeleton={(
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-4 ${i < 4 ? 'border-b border-line dark:border-gray-800' : ''}`}>
              <div className="w-7 h-4 skeleton rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 skeleton rounded-lg w-3/5" />
                <div className="h-3 skeleton rounded-lg w-2/5" />
              </div>
              <div className="h-6 w-16 skeleton rounded-md shrink-0" />
            </div>
          ))}
        </div>
      )}>
        {tarikanList.length === 0 ? (
        <EmptyState icon={Calendar} title="Belum ada jadwal" subtitle="Jadwal tarikan akan muncul setelah dibuat oleh bendahara." />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {tarikanList.map((t, idx) => {
            const isLast    = idx === tarikanList.length - 1;
            const isSelesai = t.status === 'selesai';
            const isNext    = t.id === nextDijadwal?.id;

            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-4 py-4 cursor-pointer active:bg-gray-50/80 dark:active:bg-gray-800/50 transition-colors duration-200 ${!isLast ? 'border-b border-line dark:border-gray-800' : ''}`}
                style={isSelesai ? { borderLeft: '3px solid #10B981' } : isNext ? { borderLeft: '3px solid #34D399' } : undefined}
              >
                {/* Nomor kecil */}
                <span className="text-base font-bold text-ink-faint dark:text-gray-400 w-7 shrink-0 text-right tabular-nums">
                  {String(t.nomor).padStart(2, '0')}.
                </span>

                {/* Info + action inline */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-base font-semibold truncate ${isSelesai ? 'text-ink-sub dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {t.sohibul_bait?.nama ?? '—'}
                    </p>

                    {isBendahara ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelesai ? (
                          <button
                            onClick={() => { setNavigatingId(t.id); setSelectedTarikan(t); }}
                            disabled={navigatingId === t.id}
                            title="Hitung Ulang"
                            aria-label="Hitung Ulang"
                            className="w-8 h-8 rounded-xl border border-control dark:border-gray-700 text-gray-400 inline-flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-70"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${navigatingId === t.id ? 'animate-spin' : ''}`} />
                          </button>
                        ) : (
                          // Semua tarikan terjadwal punya tombol Proses — tinggal klik saat pertemuan
                          <button
                            onClick={() => { setNavigatingId(t.id); setSelectedTarikan(t); }}
                            disabled={navigatingId === t.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold active:scale-[0.97] active:opacity-90 transition-all duration-150 shadow-sm disabled:opacity-70 ${
                              isNext
                                ? 'btn-brand'
                                : 'bg-emerald-50 text-brand border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            <RefreshCw className={`w-3 h-3 ${navigatingId === t.id ? 'animate-spin' : ''}`} />
                            {navigatingId === t.id ? 'Memproses...' : 'Proses'}
                          </button>
                        )}

                        {/* Bagikan pengingat ke WhatsApp (tarikan terjadwal) */}
                        {!isSelesai && (
                          <button
                            onClick={() => { haptic(); openWa(null, pesanTarikan(t.nomor, t.tanggal, t.sohibul_bait?.nama ?? '—', t.jumlah_per_orang)); }}
                            title="Bagikan pengingat ke WhatsApp"
                            aria-label="Bagikan pengingat ke WhatsApp"
                            className="w-8 h-8 rounded-xl border border-control dark:border-gray-700 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.97] transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Tombol revisi jadwal */}
                        <button
                          onClick={() => setEditingTarikan(t)}
                          title="Revisi jadwal"
                          aria-label="Revisi jadwal"
                          className="w-8 h-8 rounded-xl border border-control dark:border-gray-700 text-gray-400 inline-flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.97] transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Tag tone="neutral" className="shrink-0">
                        {isSelesai ? 'Selesai' : 'Terjadwal'}
                      </Tag>
                    )}
                  </div>
                  <p className="text-caption font-medium text-ink-faint dark:text-gray-400 mt-0.5">
                    {formatTanggal(t.tanggal)}
                    {t.sohibul_bait && t.sohibul_bait.status_aktif === false && (
                      <span className="text-rose-500 dark:text-rose-400 font-semibold"> · Sohibul nonaktif</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </CrossFade>

      {editingTarikan && (
        <EditTarikanModal
          tarikan={editingTarikan}
          wargaList={wargaList}
          onClose={() => setEditingTarikan(null)}
          onSaved={() => { setEditingTarikan(null); load(); }}
        />
      )}

      {creatingTarikan && (
        <TambahTarikanModal
          nextNomor={nextNomor}
          wargaList={wargaList}
          onClose={() => setCreatingTarikan(false)}
          onSaved={() => { setCreatingTarikan(false); load(); }}
        />
      )}
    </div>
  );
}
