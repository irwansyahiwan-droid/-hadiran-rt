import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Calendar, CheckCircle2, Coins, Lock, MoreVertical, Pencil, Plus,
  Play, RefreshCw, RotateCcw, Search, UserCheck, X, AlertTriangle, MessageCircle, FileText, Share2,
} from 'lucide-react';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import FilterChips from '../components/FilterChips';
import StatRow from '../components/StatRow';
import Tag from '../components/Tag';
import SuccessOverlay from '../components/SuccessOverlay';
import ConfirmDestruktif from '../components/ConfirmDestruktif';
import CrossFade from '../components/CrossFade';
import PageHeader from '../components/layout/PageHeader';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatTanggal, formatRupiahPlain, haptic } from '../lib/utils';
import { ringkasAbsensi } from '../lib/absensiHitung';
import { simpanTarikanSelesai } from '../lib/simpanTarikan';
import { fetchAbsensiTersimpan } from '../lib/absensiTersimpan';
import { hitungUlangNomorJadwal } from '../lib/jadwalNomor';
import { openWa, pesanTarikan } from '../lib/waReminder';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { showToast, showUndo } from '../lib/toast';
import { getPageCache, setPageCache } from '../lib/pageCache';
import type { AbsensiStatus, Tarikan, Warga } from '../lib/types';

type AbsensiMap = Record<string, AbsensiStatus>;
type AbsensiFilter = 'semua' | 'hadir' | 'titip' | 'belum';

// Tap memutar status: tidak hadir → hadir → titip → tidak hadir.
// (Awal semua 'tidak_hadir', jadi tap pertama = Hadir.)
const NEXT_STATUS: Record<AbsensiStatus, AbsensiStatus> = {
  tidak_hadir: 'hadir',
  hadir: 'titip',
  titip: 'tidak_hadir',
};

// Bahasa visual per status di daftar hadir.
const STATUS_UI: Record<AbsensiStatus, { label: string; text: string; ava: string; hover: string }> = {
  hadir: {
    label: 'Hadir',
    text: 'text-emerald-700 dark:text-emerald-400',
    ava: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    hover: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/15',
  },
  titip: {
    label: 'Titip · iuran masuk',
    text: 'text-blue-700 dark:text-blue-400',
    ava: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    hover: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/15',
  },
  tidak_hadir: {
    label: 'Tidak hadir → Talangan',
    text: 'text-neg dark:text-rose-400',
    ava: 'bg-rose-50 dark:bg-rose-900/25 text-neg dark:text-rose-400',
    hover: 'hover:bg-rose-50/30 dark:hover:bg-rose-900/15',
  },
};

/* (formatKompak DIHAPUS 5 Agu 2026 — satu-satunya pemakainya adalah strip
   statistik absensi, dan nominalnya kini tampil eksak di baris sendiri.
   Jangan dihidupkan lagi untuk "menghemat tempat": menyingkat uang menukar
   ketepatan dengan ruang, dan di app kas ketepatan yang menang. Kalau sempit,
   ubah TATA LETAKNYA — jangan angkanya.) */

// ── Absensi View ────────────────────────────────────────────

interface AbsensiResult {
  tarikanNomor: number;
  hadirCount: number;
  titipCount: number; // tidak hadir tapi iuran masuk (tidak kena talangan)
  tidakCount: number; // = jumlah yang kena talangan
  kasTotal: number;
  talanganTotal: number;
  sohibulBaitTerima: number;
  tidakHadirNama: string[]; // nama pembayar yg tidak hadir & TIDAK titip (= kena talangan) — utk kontrol cek-fisik
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
  const [absensiError, setAbsensiError] = useState(false);
  const [muatUlang, setMuatUlang] = useState(0);
  useBackDismiss(true, onBack); // tombol Back HP keluar dari editor absensi

  useEffect(() => {
    async function loadExisting() {
      const sohibulId = tarikan.sohibul_bait_id ?? '';
      if (tarikan.status === 'selesai') {
        // Gagal baca TIDAK boleh lolos jadi peta kosong: layar mengawali semua
        // anggota 'tidak_hadir', jadi tanpa baris penimpa satu tap Simpan
        // menuliskan talangan Rp50.000 ke seluruh warga. Lihat komentar di
        // lib/absensiTersimpan.ts.
        let tersimpan: Record<string, AbsensiStatus>;
        try {
          tersimpan = await fetchAbsensiTersimpan(tarikan.id);
        } catch {
          setAbsensiError(true);
          setLoadingAbsensi(false);
          return;
        }
        const init: AbsensiMap = {};
        wargaList.forEach(w => { init[w.id] = 'tidak_hadir'; });
        Object.entries(tersimpan).forEach(([wargaId, status]) => {
          init[wargaId] = status;
        });
        // Sohibul Bait penerima → selalu 'hadir' (di luar akuntansi talangan).
        if (sohibulId) init[sohibulId] = 'hadir';
        setAbsensiError(false);
        setMap(init);
      } else {
        const init: AbsensiMap = {};
        wargaList.forEach(w => { init[w.id] = 'tidak_hadir'; });
        if (sohibulId) init[sohibulId] = 'hadir';
        setMap(init);
      }
      setLoadingAbsensi(false);
    }
    loadExisting();
  }, [tarikan, wargaList, muatUlang]);

  function cobaMuatAbsensi() {
    setAbsensiError(false);
    setLoadingAbsensi(true);
    setMuatUlang((n) => n + 1);
  }

  // Pembayar = semua anggota KECUALI Sohibul Bait (Sohibul tidak bayar).
  const sohibulId = tarikan.sohibul_bait_id ?? '';
  const sohibulWarga = useMemo(() => wargaList.find(w => w.id === sohibulId), [wargaList, sohibulId]);
  // Daftar yang bisa di-absen = pembayar saja; Sohibul Bait dipajang terpisah.
  const pembayarList = useMemo(() => wargaList.filter(w => w.id !== sohibulId), [wargaList, sohibulId]);
  // Ringkasan kehadiran & talangan dari satu sumber teruji (absensiHitung.test.ts).
  const { hadirCount, titipCount, tidakCount, talanganTotal } = ringkasAbsensi(wargaList, map, sohibulId);

  // Bulk action hanya menyentuh pembayar; status Sohibul Bait dikunci 'hadir'.
  // Menimpa tandaan ~79 baris sekali tap → selalu tawarkan "Urungkan" (salah
  // tap Reset di tengah mengabsen = kerja menandai ulang dari nol tanpa ini).
  function setAll(status: AbsensiStatus) {
    haptic();
    const before = map; // snapshot utk undo
    setMap(prev => {
      const next: AbsensiMap = { ...prev };
      pembayarList.forEach(w => { next[w.id] = status; });
      if (sohibulId) next[sohibulId] = 'hadir';
      return next;
    });
    const pesan =
      status === 'hadir' ? 'Semua ditandai hadir'
      : status === 'titip' ? 'Semua ditandai titip'
      : 'Tandaan direset';
    showUndo(pesan, () => {}, { onUndo: () => setMap(before) });
  }

  function toggle(id: string) {
    setMap(prev => ({ ...prev, [id]: NEXT_STATUS[prev[id] ?? 'tidak_hadir'] }));
  }

  const filtered = useMemo(() => {
    let list = pembayarList;
    if (search) list = list.filter(w => w.nama.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'hadir')  list = list.filter(w => map[w.id] === 'hadir');
    if (filter === 'titip')  list = list.filter(w => map[w.id] === 'titip');
    if (filter === 'belum')  list = list.filter(w => map[w.id] === 'tidak_hadir');
    return list;
  }, [pembayarList, search, filter, map]);

  async function simpan() {
    setSaving(true);
    try {
      // Rantai tulis 4 tabel + aturan "status lunas tak boleh ter-reset" kini
      // tinggal di src/lib/simpanTarikan.ts supaya bisa diuji tanpa merender
      // React — lihat simpanTarikan.test.ts. Perilakunya sama persis.
      onSaved(await simpanTarikanSelesai(tarikan, wargaList, map, sohibulId));
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
  // dan hapus SEMUA data turunannya (absensi, talangan, transaksi kas tarikan
  // ini). Lewat RPC atomik: server mengarsipkan snapshot pemulihan (absensi +
  // talangan + nama warga) ke audit_log DULU, baru menghapus — satu transaksi,
  // koneksi putus di tengah tak meninggalkan data setengah terhapus.
  async function batalkan() {
    setCancelling(true);
    try {
      const { error } = await supabase.rpc('batalkan_tarikan', {
        p_tarikan_id: tarikan.id,
        p_hapus: false,
      });
      if (error) throw error;
      onCancelled();
    } catch {
      showToast('Gagal membatalkan. Cek koneksi lalu coba lagi — tidak ada data yang terhapus.', 'error');
    } finally {
      setCancelling(false);
    }
  }

  function handleBatalkanClick() {
    haptic(8);
    setConfirmCancel(true); // buka dialog pengaman (wajib ketik nomor tarikan)
  }

  // Absensi tarikan selesai gagal dibaca → JANGAN tampilkan editor. Peta kosong
  // di layar ini terlihat sah ("semua tidak hadir") dan bisa disimpan.
  if (absensiError) {
    return (
      <div className="space-y-7 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { haptic(); onBack(); }}
            aria-label="Kembali"
            className="press w-9 h-9 rounded-xl border border-line dark:border-gray-800/60 flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-[18px] h-[18px] text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-base font-display font-bold text-ink dark:text-gray-100">
            Absensi Tarikan #{tarikan.nomor}
          </h2>
        </div>
        <ErrorState onRetry={cobaMuatAbsensi} retrying={loadingAbsensi} />
      </div>
    );
  }

  if (loadingAbsensi) {
    return (
      <div className="space-y-7 pb-2">
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
            <div key={i} className={`flex items-center gap-3 p-3.5 [--di-l:3.625rem] [--di-r:0.875rem] ${i < 5 ? 'divide-inset' : ''}`}>
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
    /* pb menyisakan ruang utk tumpukan tombol fixed di bawah (Simpan ± Batalkan)
       — tanpa ini baris warga terakhir tertutup & tak bisa di-tap. */
    <div className={`space-y-7 ${tarikan.status === 'selesai' ? 'pb-28' : 'pb-14'}`}>
      {/* Back header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Kembali" className="press w-11 h-11 -ml-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Absensi Tarikan #{tarikan.nomor}
          </h2>
          <p className="text-caption text-ink-faint dark:text-gray-400">{tarikan.sohibul_bait?.nama ?? '—'} · {formatTanggal(tarikan.tanggal)}</p>
        </div>
      </div>

      {/* Stats bar — HITUNGAN saja (3 kolom). Nominal talangan pindah ke baris
          sendiri di bawah, dan itu bukan soal rapi-rapi:

          Kolom keempat cuma selebar 63px @360, sedangkan "Rp3,45 jt" pada 20px
          terukur 94px — nominalnya sudah MELUBER 31px keluar kolomnya sendiri
          sejak dulu. Bentuk eksaknya ("Rp3.450.000") 134px, artinya butuh font
          9,4px untuk muat: setengah ukuran tiga angka di sebelahnya, dan tak
          terbaca warga lansia. Jadi strip 4-kolom memang tak bisa memuat uang
          dalam bentuk APA PUN — menyingkatnya cuma menyembunyikan itu, sambil
          menukar ketepatan (Rp3.454.000 tampil "Rp3,45 jt") di layar tempat
          bendahara mencocokkan uang.

          Dengan 3 kolom, `tight` mati → angkanya justru naik ke text-2xl. */}
      <StatRow
        items={[
          { label: 'Hadir', value: hadirCount, tone: 'pos' },
          { label: 'Titip', value: titipCount, tone: 'info' },
          { label: 'Tdk Hadir', value: tidakCount, tone: 'neg' },
        ]}
      />

      {/* Talangan — nominal EKSAK, satu baris lega (pola baris panel "Alur Kas
          Hadiran": label kiri, nominal kanan, token `warn` sama dgn sebelumnya). */}
      <div className="flex items-center justify-between gap-3 rounded-2xl inset-soft px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-caption font-medium text-ink-sub dark:text-gray-300">
          <AlertTriangle className="w-3.5 h-3.5 text-warn dark:text-warn-dark shrink-0" />
          Talangan
        </span>
        <span className="font-display text-amount font-semibold tabular-nums text-warn dark:text-warn-dark">
          {formatRupiahPlain(talanganTotal)}
        </span>
      </div>

      {/* Title + count (jumlah PEMBAYAR — Sohibul Bait tidak termasuk) */}
      <div className="flex items-center justify-between">
        <p className="text-body font-semibold text-gray-700 dark:text-gray-300">Daftar Hadir <span className="font-normal text-ink-faint dark:text-gray-400">(pembayar)</span></p>
        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-caption font-bold rounded-full">
          {pembayarList.length}
        </span>
      </div>

      {/* Bulk actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setAll('hadir')}
          className="press flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-caption font-semibold hover:bg-emerald-100 active:bg-emerald-100 dark:hover:bg-emerald-900/40 dark:active:bg-emerald-900/40 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Semua Hadir
        </button>
        <button
          onClick={() => setAll('titip')}
          className="press flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-blue-50 dark:bg-blue-900/25 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-caption font-semibold hover:bg-blue-100 active:bg-blue-100 dark:hover:bg-blue-900/40 dark:active:bg-blue-900/40 transition-colors"
        >
          <Coins className="w-3.5 h-3.5" />
          Semua Titip
        </button>
        <button
          onClick={() => setAll('tidak_hadir')}
          className="press flex items-center justify-center gap-1.5 min-h-[44px] py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-control-dark text-gray-600 dark:text-gray-300 text-caption font-semibold hover:bg-gray-100 active:bg-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Filter — FilterChips bersama (pill), bukan grid kotak berbingkai buatan sendiri */}
      <FilterChips
        options={[
          { id: 'semua', label: 'Semua' },
          { id: 'hadir', label: 'Hadir' },
          { id: 'titip', label: 'Titip' },
          { id: 'belum', label: 'Tidak' },
        ] as const}
        value={filter}
        onChange={setFilter}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          name="cari-nama"
          autoComplete="off"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama…"
          aria-label="Cari nama warga"
          inputMode="search"
          enterKeyHint="search"
          className="field-search pr-11"
        />
        {search && <ClearButton onClick={() => setSearch('')} />}
      </div>

      {/* Warga list */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
        {/* Sohibul Bait — baris TERKUNCI di paling atas: penerima, tidak bayar,
            tidak bisa di-tap (hadir/titip/tidak hadir) & di luar hitungan talangan. */}
        {sohibulWarga && (
          <div className="w-full flex items-center gap-3 p-3.5 [--di-l:3.625rem] [--di-r:0.875rem] divide-inset bg-amber-50/60 dark:bg-amber-900/15">
            <div className="icon-tile w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-caption font-bold bg-amber-100 dark:bg-amber-900/30 text-warn dark:text-amber-400">
              {sohibulWarga.nama.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-gray-900 dark:text-gray-100 truncate">{sohibulWarga.nama}</p>
              <p className="text-caption font-medium text-warn dark:text-amber-400">Sohibul Bait · penerima (tidak bayar)</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-micro font-bold rounded-full bg-amber-100 dark:bg-amber-900/30 text-warn dark:text-amber-400 shrink-0">
              <Lock className="w-3 h-3" /> Penerima
            </span>
          </div>
        )}
        {filtered.map((w, idx) => {
          const st = map[w.id] ?? 'tidak_hadir';
          const ui = STATUS_UI[st];
          return (
            <button
              key={w.id}
              onClick={() => toggle(w.id)}
              aria-label={`${w.nama} — ${ui.label}. Ketuk untuk ganti status`}
              // ~79 baris: content-visibility lewati render baris di luar layar
              className={`w-full flex items-center gap-3 p-3.5 text-left [--di-l:3.625rem] [--di-r:0.875rem] [content-visibility:auto] [contain-intrinsic-block-size:auto_64px] transition-colors ${
                idx < filtered.length - 1 ? 'divide-inset' : ''
              } ${ui.hover}`}
            >
              <div className={`icon-tile w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-caption font-bold ${ui.ava}`}>
                {w.nama.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-gray-900 dark:text-gray-100 truncate">{w.nama}</p>
                <p className={`text-caption ${ui.text}`}>{ui.label}</p>
              </div>
              {/* Indikator status: hadir ✓ emerald · titip koin biru · tidak hadir lingkaran kosong */}
              {st === 'hadir' ? (
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 bg-pos border-pos">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              ) : st === 'titip' ? (
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 bg-setor-500 border-setor-500">
                  <Coins className="w-3.5 h-3.5 text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sticky action buttons — melayang di atas nav dok (bar 70px + safe-area).
          Offset SAMA dgn FAB & padding-bottom main di App (4.5rem + 1.75rem)
          → satu garis dasar utk semua aksi melayang. */}
      <div
        className="fixed left-0 right-0 px-5 z-fab"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 1.75rem)' }}
      >
        <div className="max-w-lg mx-auto space-y-2">
          <button
            onClick={() => { haptic(12); simpan(); }}
            disabled={saving || cancelling}
            className="btn-brand w-full py-3.5 font-bold text-body flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Menghitung…' : tarikan.status === 'selesai' ? 'Hitung Ulang Iuran' : 'Simpan & Hitung Iuran'}
          </button>

          {/* Batalkan — hanya untuk tarikan yang sudah selesai (undo simpan & hitung).
              Pengaman: buka dialog yang mewajibkan ketik nomor tarikan. */}
          {tarikan.status === 'selesai' && (
            <button
              onClick={handleBatalkanClick}
              disabled={saving || cancelling}
              className="press w-full py-3 rounded-full font-bold text-body shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900 text-neg dark:text-rose-400"
            >
              {cancelling
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Membatalkan…</>
                : <><RotateCcw className="w-4 h-4" />Batalkan Hasil Tarikan</>}
            </button>
          )}
        </div>
      </div>

      <ConfirmDestruktif
        open={confirmCancel}
        title={`Batalkan hasil Tarikan #${tarikan.nomor}?`}
        description={<>
          Tindakan ini <b>menghapus absensi, talangan, &amp; kas masuk</b> tarikan #{tarikan.nomor} dan
          <b> tidak bisa di-undo</b>. Pemulihan hanya bisa manual.
        </>}
        typeToConfirm={{
          value: String(tarikan.nomor),
          hint: <>Ketik angka <span className="font-bold text-neg dark:text-rose-400">{tarikan.nomor}</span> untuk konfirmasi</>,
        }}
        confirmLabel="Batalkan"
        loadingLabel="Membatalkan…"
        icon={RotateCcw}
        loading={cancelling}
        onClose={() => setConfirmCancel(false)}
        onConfirm={batalkan}
      />
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
          ...(result.titipCount > 0 ? [{ label: 'Titip (iuran masuk)', value: `${result.titipCount} warga` }] : []),
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
    <div className={`transition duration-300 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
      <div className="rounded-3xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift overflow-hidden">
        {/* Header — badge sukses + judul + tutup */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-bold text-gray-900 dark:text-gray-100 leading-tight">Tarikan #{result.tarikanNomor} selesai dihitung</p>
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
            <p className="font-display text-amount font-semibold text-gray-900 dark:text-gray-100 tabular-nums mt-0.5 truncate">{formatRupiahPlain(result.kasTotal)}</p>
          </div>
          <div className="px-4 py-3 min-w-0">
            <p className="text-micro font-bold uppercase tracking-wider text-ink-faint dark:text-gray-400">Sohibul Terima</p>
            <p className="font-display text-amount font-semibold text-pos dark:text-pos-dark tabular-nums mt-0.5 truncate">{formatRupiahPlain(result.sohibulBaitTerima)}</p>
          </div>
        </div>

        {/* Kehadiran */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-line dark:border-gray-800 text-caption">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {result.hadirCount} Hadir
          </span>
          {result.titipCount > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {result.titipCount} Titip
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-semibold text-neg dark:text-rose-400">
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
                  <span className="w-5 shrink-0 text-right tabular-nums text-ink-faint dark:text-gray-400">{i + 1}.</span>
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
            <p className="text-micro text-warn dark:text-amber-400 font-medium">
              Talangan keluar <span className="font-display tabular-nums">{formatRupiahPlain(result.talanganTotal)}</span>
            </p>
          </div>
        )}

        {/* Bagikan PNG */}
        <div className="p-3 border-t border-line dark:border-gray-800">
          <button
            onClick={share}
            disabled={sharing}
            className="btn-brand press w-full inline-flex items-center justify-center gap-2 py-2.5 text-caption font-semibold"
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
  // Exit meluncur: semua jalur tutup (backdrop, X, Batal, Escape, Back HP)
  // lewat drag.dismiss. Handlers disebar HANYA di batang handle, bukan di panel:
  // panelnya form yang bisa di-scroll, dan itulah sebabnya sheet form KasRT &
  // KasHadiran juga memasang handle — batang itu satu-satunya tanda visual bahwa
  // lembar ini bisa disapu turun.
  const drag = useDragDismiss(onClose);
  useBackDismiss(true, drag.dismiss);
  const dlg = useDialog(true, { onClose: drag.dismiss, label: `Revisi jadwal tarikan #${tarikan.nomor}` });

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
      // Supabase tak melempar — tanpa cek ini modal tertutup "sukses" walau gagal.
      const { error } = await supabase
        .from('tarikan')
        .update({ tanggal, sohibul_bait_id: sohibulId || null })
        .eq('id', tarikan.id);
      if (error) {
        showToast('Gagal menyimpan revisi. Cek koneksi lalu coba lagi.', 'error');
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div aria-hidden="true" className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${drag.dismissing ? 'sheet-backdrop-out' : ''}`} onClick={drag.dismiss} />
      <div ref={dlg.panelRef} {...dlg.panelProps} style={drag.style} className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 float max-h-[90vh] overflow-y-auto">
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Revisi Jadwal #{tarikan.nomor}</p>
            <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5">Ubah tanggal atau Sohibul Bait</p>
          </div>
          <button onClick={drag.dismiss} aria-label="Tutup" className="press w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <label htmlFor="jadwal-edit-tanggal" className="block text-caption font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Tanggal Tarikan</label>
        <input
          id="jadwal-edit-tanggal"
          name="tanggal-tarikan"
          type="date"
          value={tanggal}
          onChange={e => setTanggal(e.target.value)}
          className="field mb-4"
        />

        <label htmlFor="jadwal-edit-sohibul" className="block text-caption font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Sohibul Bait</label>
        <select
          id="jadwal-edit-sohibul"
          name="sohibul-bait"
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
            onClick={drag.dismiss}
            className="btn-secondary flex-1 py-3 rounded-xl"
          >
            Batal
          </button>
          <button
            onClick={() => { haptic(12); simpan(); }}
            disabled={saving || !tanggal}
            className="btn-brand flex-1 py-3 text-body font-bold flex items-center justify-center gap-2"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Menyimpan…' : 'Simpan Revisi'}
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
  // Exit meluncur — pola sama dgn EditTarikanModal di atas.
  const drag = useDragDismiss(onClose);
  const dlg = useDialog(true, { onClose: drag.dismiss, label: `Tambah jadwal tarikan #${nextNomor}` });
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [sohibulId, setSohibulId] = useState('');
  const [saving, setSaving] = useState(false);
  useBackDismiss(true, drag.dismiss);

  async function simpan() {
    setSaving(true);
    try {
      // Supabase tak melempar — throw manual agar catch/toast gagal benar-benar jalan.
      const { error } = await supabase.from('tarikan').insert({
        nomor: nextNomor,
        tanggal,
        sohibul_bait_id: sohibulId || null,
        status: 'dijadwalkan',
        jumlah_per_orang: 50000,
        total_warga: wargaList.length,
        total_hadir: 0,
        total_terkumpul: 0,
      });
      if (error) throw error;
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
      <div aria-hidden="true" className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${drag.dismissing ? 'sheet-backdrop-out' : ''}`} onClick={drag.dismiss} />
      <div ref={dlg.panelRef} {...dlg.panelProps} style={drag.style} className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 float max-h-[90vh] overflow-y-auto">
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Tambah Tarikan #{nextNomor}</p>
            <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5">Jadwalkan putaran tarikan berikutnya</p>
          </div>
          <button onClick={drag.dismiss} aria-label="Tutup" className="press w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <label htmlFor="jadwal-add-tanggal" className="block text-caption font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Tanggal Tarikan</label>
        <input
          id="jadwal-add-tanggal"
          name="tanggal-tarikan"
          type="date"
          value={tanggal}
          onChange={e => setTanggal(e.target.value)}
          className="field mb-4"
        />

        <label htmlFor="jadwal-add-sohibul" className="block text-caption font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Sohibul Bait</label>
        <select
          id="jadwal-add-sohibul"
          name="sohibul-bait"
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
            onClick={drag.dismiss}
            className="btn-secondary flex-1 py-3 rounded-xl"
          >
            Batal
          </button>
          <button
            onClick={() => { haptic(12); simpan(); }}
            disabled={saving || !tanggal}
            className="btn-brand flex-1 py-3 text-body font-bold flex items-center justify-center gap-2"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Menyimpan…' : 'Simpan Tarikan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function JadwalPage() {
  const { isBendahara } = useAuthContext();
  // SWR: render dari snapshot terakhir, revalidate diam-diam (lihat lib/pageCache).
  const [cached] = useState(() => getPageCache<{ tarikanList: Tarikan[]; wargaList: Warga[] }>('jadwal'));
  const [tarikanList, setTarikanList] = useState<Tarikan[]>(cached?.tarikanList ?? []);
  const [wargaList, setWargaList] = useState<Warga[]>(cached?.wargaList ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);
  const [selectedTarikan, setSelectedTarikan] = useState<Tarikan | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AbsensiResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingTarikan, setEditingTarikan] = useState<Tarikan | null>(null);
  const [creatingTarikan, setCreatingTarikan] = useState(false);
  // Sheet aksi sekunder per baris (WA + Revisi) — pola sama dgn baris mutasi
  // Kas RT, agar baris cukup memuat SATU aksi utama (Proses/Hitung Ulang).
  const [rowTarikan, setRowTarikan] = useState<Tarikan | null>(null);
  const rowDrag = useDragDismiss(() => setRowTarikan(null));
  useBackDismiss(rowTarikan !== null, rowDrag.dismiss);
  const rowDlg = useDialog(rowTarikan !== null, { onClose: rowDrag.dismiss, label: 'Aksi tarikan' });

  async function load() {
    // Sudah ada data tampil → revalidate diam-diam: tanpa skeleton, gagal = toast.
    const silent = tarikanList.length > 0 || wargaList.length > 0;
    if (!silent) setLoading(true);
    setError(false);
    try {
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
      // Supabase tak melempar — tanpa cek ini fetch gagal jadi "Belum ada
      // jadwal" palsu + cache tertimpa kosong.
      if (tarRes.error || wargaRes.error) throw tarRes.error ?? wargaRes.error;
      let tarikan = (tarRes.data as Tarikan[]) ?? [];

      // Nomor tarikan = urutan tanggal untuk yang BELUM ditarik; 'selesai'
      // terkunci. Bila revisi jadwal menggeser urutan (mis. tanggal diundur),
      // rapikan nomornya di sini agar "tarikan ke-" selalu ikut tanggal. Hanya
      // bendahara yang menulis — warga view-only ditolak RLS.
      if (isBendahara) {
        const changes = hitungUlangNomorJadwal(tarikan);
        if (changes.length) {
          await Promise.all(changes.map(c =>
            supabase.from('tarikan').update({ nomor: c.nomor }).eq('id', c.id)
          ));
          const nomorBaru = new Map(changes.map(c => [c.id, c.nomor]));
          tarikan = tarikan
            .map(t => (nomorBaru.has(t.id) ? { ...t, nomor: nomorBaru.get(t.id)! } : t))
            .sort((a, b) => a.nomor - b.nomor);
        }
      }

      setTarikanList(tarikan);
      setWargaList((wargaRes.data as Warga[]) ?? []);
      setPageCache('jadwal', { tarikanList: tarikan, wargaList: (wargaRes.data as Warga[]) ?? [] });
    } catch {
      if (silent) showToast('Gagal memperbarui data. Coba lagi.', 'error');
      else setError(true);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-7 pb-2 page-enter">
      <SuccessOverlay
        show={showSuccess}
        variant="honor"
        duration={2100}
        message={lastResult ? `Tarikan #${lastResult.tarikanNomor} selesai` : 'Iuran tersimpan & dihitung'}
        submessage={lastResult ? `Sohibul Bait terima ${formatRupiahPlain(lastResult.sohibulBaitTerima)}` : undefined}
        onDone={() => setShowSuccess(false)}
      />
      {lastResult && (
        <ResultCard result={lastResult} onDismiss={() => setLastResult(null)} />
      )}
      {/* Kepala halaman = PageHeader bersama (30 Jul). Tanpa subjudul angka —
          StatRow tepat di bawah sudah memuat selesai/terjadwal/total; satu
          fakta satu suara. */}
      <PageHeader
        title="Jadwal Tarikan"
        /* Tombol muat-ulang 40px lebar (kotak sentuh tetap 44 lewat
           before:-inset-1): di 360px judul kurang 5px dan berakhir
           "Jadwal Tarika…" (audit 30 Jul). Delapan piksel yang dibebaskan
           cukup, tanpa mengecilkan huruf judul. */
        actions={<>
          <button onClick={load} aria-label="Muat ulang" className="press relative w-10 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors before:absolute before:-inset-1 before:content-['']">
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {/* Icon-only (pola tombol unduh Riwayat Aktivitas) — tiga aksi lepas
              bikin judul patah baris di 390px. */}
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
              title="Unduh PDF"
              aria-label="Unduh PDF jadwal"
              className="press relative w-10 h-11 inline-flex items-center justify-center bg-white dark:bg-gray-800 border border-control dark:border-control-dark text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 before:absolute before:-inset-1 before:content-['']"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          {isBendahara && (
            <button
              onClick={() => { haptic(); setCreatingTarikan(true); }}
              aria-label="Tambah jadwal tarikan"
              className="press flex items-center gap-1.5 btn-brand text-body font-semibold min-h-[44px] px-2.5 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Jadwal
            </button>
          )}
        </>}
      />

      {/* Stats — StatRow bersama (dialek "N kartu terpisah" yang tersisa di sini) */}
      <StatRow
        items={[
          { label: 'Selesai', value: loading ? '—' : selesaiCount },
          { label: 'Terjadwal', value: loading ? '—' : dijadwalCount, tone: 'pos' },
          { label: 'Total', value: loading ? '—' : tarikanList.length },
        ]}
      />

      {/* List — cross-fade skeleton → konten */}
      <CrossFade loading={loading} skeleton={(
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-4 [--di-l:3.5rem] [--di-r:1rem] ${i < 4 ? 'divide-inset' : ''}`}>
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
        {error ? (
        <ErrorState onRetry={() => load()} retrying={loading} />
      ) : tarikanList.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Belum ada jadwal"
          subtitle={isBendahara
            ? 'Buat jadwal tarikan pertama — Sohibul Bait & tanggalnya.'
            : 'Jadwal tarikan akan muncul setelah dibuat oleh bendahara.'}
          action={isBendahara
            ? { label: 'Tambah jadwal', icon: Plus, onClick: () => { haptic(); setCreatingTarikan(true); } }
            : undefined}
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {tarikanList.map((t, idx) => {
            const isLast    = idx === tarikanList.length - 1;
            const isSelesai = t.status === 'selesai';
            const isNext    = t.id === nextDijadwal?.id;

            return (
              <div
                key={t.id}
                /* Edge kiri = sinyal "giliran berikutnya" SAJA (token brand);
                   tarikan selesai sudah cukup de-emphasized lewat teks abu. */
                className={`flex items-center gap-3 px-4 py-3 [--di-l:3.5rem] [--di-r:1rem] transition-colors duration-200 ${!isLast ? 'divide-inset' : ''}${isNext ? ' border-l-[3px] border-l-brand-500 dark:border-l-emerald-500' : ''}`}
              >
                {/* Nomor kecil */}
                <span className="text-base font-bold text-ink-faint dark:text-gray-400 w-7 shrink-0 text-right tabular-nums">
                  {String(t.nomor).padStart(2, '0')}.
                </span>

                {/* Nama + tanggal = satu blok RAPAT. Tombol aksi pindah ke level
                    baris (bukan sebaris dengan nama): saat tombol 44px ikut di
                    dalam baris nama, kotak baris pertama jadi setinggi 44px dan
                    tanggal terlempar ±30px ke bawah — nama & tanggalnya terbaca
                    seperti dua hal terpisah, tinggi baris ±98px. */}
                <div className="flex-1 min-w-0">
                  {/* line-clamp-2, bukan truncate: kolom ini 103–178px, sedangkan
                      nama ber-nickname ("Nisan Nasrullah ( Icang )") butuh ~200px.
                      Nickname justru bagian yang dikenal warga — lebih baik baris
                      tumbuh 1 baris daripada nama dipotong elipsis. */}
                  <p className={`text-base font-semibold line-clamp-2 leading-snug break-words ${isSelesai ? 'text-ink-sub dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {t.sohibul_bait?.nama ?? '—'}
                  </p>
                  <p className="text-caption font-medium text-ink-faint dark:text-gray-400 mt-0.5">
                    {formatTanggal(t.tanggal)}
                    {t.sohibul_bait && t.sohibul_bait.status_aktif === false && (
                      <span className="text-rose-500 dark:text-rose-400 font-semibold"> · Sohibul nonaktif</span>
                    )}
                  </p>
                </div>

                <div className="shrink-0">
                    {isBendahara ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelesai ? (
                          <button
                            onClick={() => { haptic(); setNavigatingId(t.id); setSelectedTarikan(t); }}
                            disabled={navigatingId === t.id}
                            title="Hitung Ulang"
                            aria-label="Hitung Ulang"
                            /* Tanpa bingkai (4 Agu 2026). Daftar ini 71 baris, dan
                               dulu tiap barisnya membawa satu–dua kotak bergaris
                               `control` yang identik: berjejer ke bawah, ia terbaca
                               seperti formulir, bukan daftar. Dua alasan konkret,
                               bukan selera:
                                 • DESIGN.md §Cards melarang "kotak abu bergaris" di
                                   DALAM kartu — fill datar, bukan bingkai.
                                 • Ikonnya `text-gray-400`, padahal abu di app ini
                                   sinyal kontrol INAKTIF. Tombol aktif memakai
                                   kostum nonaktif; itu yang bikin barisnya terasa
                                   mati. `.btn-secondary` (resep sekunder kanonik)
                                   pun memakai gray-600/300, bukan 400.
                               Affordance TIDAK dikurangi: 44px tetap, lapisan
                               tekan tetap, `title`+`aria-label` tetap. Yang hilang
                               cuma garisnya. */
                            className="w-11 h-11 rounded-xl text-ink-faint dark:text-gray-300 inline-flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800 active:scale-[0.97] transition cursor-pointer disabled:opacity-70"
                          >
                            <RefreshCw className={`w-[18px] h-[18px] ${navigatingId === t.id ? 'animate-spin' : ''}`} />
                          </button>
                        ) : isNext ? (
                          // Giliran berikutnya = satu-satunya baris yang tombolnya BERLABEL.
                          <button
                            onClick={() => { haptic(); setNavigatingId(t.id); setSelectedTarikan(t); }}
                            disabled={navigatingId === t.id}
                            className="btn-brand flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full text-caption font-bold active:scale-[0.97] active:opacity-90 transition duration-150 shadow-sm"
                          >
                            <RefreshCw className={`w-3 h-3 ${navigatingId === t.id ? 'animate-spin' : ''}`} />
                            {navigatingId === t.id ? 'Memproses…' : 'Proses'}
                          </button>
                        ) : (
                          /* Tarikan terjadwal lain: tombol ikon saja. Pil berlabel di
                             SETIAP baris memakan ±56px sehingga nama Sohibul tersisa
                             138px @390 / 108px @360 dan nama panjang ("Nisan Nasrullah
                             ( Icang )") terpotong — audit 29 Jul. Ikon Play ≠ ikon ⟳
                             milik "Hitung Ulang" supaya dua aksi ini tak tertukar. */
                          <button
                            onClick={() => { haptic(); setNavigatingId(t.id); setSelectedTarikan(t); }}
                            disabled={navigatingId === t.id}
                            title="Proses tarikan"
                            aria-label={`Proses tarikan #${t.nomor}`}
                            className="w-11 h-11 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-brand dark:text-emerald-300 inline-flex items-center justify-center active:scale-[0.97] transition cursor-pointer disabled:opacity-70"
                          >
                            {navigatingId === t.id
                              ? <RefreshCw className="w-[18px] h-[18px] animate-spin" />
                              : <Play className="w-[18px] h-[18px]" strokeWidth={2.2} />}
                          </button>
                        )}

                        {/* Aksi sekunder (WA + Revisi) dilipat ke sheet →
                            baris tetap lega, nama Sohibul tak cepat terpotong.
                            Tarikan yang SUDAH ditarik ('selesai') tak bisa
                            direvisi jadwalnya — cukup "Hitung Ulang". */}
                        {!isSelesai && (
                          <button
                            onClick={() => { haptic(); setRowTarikan(t); }}
                            title="Aksi lainnya"
                            aria-label={`Aksi lainnya tarikan #${t.nomor}`}
                            /* Tanpa bingkai — alasan sama dgn "Hitung Ulang" di atas.
                               Di baris terjadwal ini justru paling terasa: dulu ada
                               DUA kotak sederajat bersebelahan (Play + ⋮) sehingga
                               aksi utama baris tak punya penekanan. Kini hierarkinya
                               terbaca: satu chip ber-tint (Play) + satu ikon tenang. */
                            className="w-11 h-11 rounded-xl text-ink-faint dark:text-gray-300 inline-flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800 active:scale-[0.97] transition cursor-pointer"
                          >
                            <MoreVertical className="w-[18px] h-[18px]" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <Tag tone="neutral">
                        {isSelesai ? 'Selesai' : 'Terjadwal'}
                      </Tag>
                    )}
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

      {/* Sheet aksi sekunder per tarikan: bagikan WA + revisi jadwal */}
      {rowTarikan && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={rowDrag.dismiss}>
          <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${rowDrag.dismissing ? 'sheet-backdrop-out' : ''}`} />
          <div
            ref={rowDlg.panelRef}
            {...rowDlg.panelProps}
            className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10"
            onClick={(e) => e.stopPropagation()}
            style={rowDrag.style}
          >
            <div className="-mt-2 mb-3 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...rowDrag.handlers}>
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <p className="text-base font-bold text-ink dark:text-gray-100 leading-snug">
              Tarikan #{rowTarikan.nomor} · {rowTarikan.sohibul_bait?.nama ?? '—'}
            </p>
            <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5">{formatTanggal(rowTarikan.tanggal)}</p>
            <div className="space-y-2 mt-4">
              {rowTarikan.status !== 'selesai' && (
                <button
                  onClick={() => {
                    haptic();
                    openWa(null, pesanTarikan(rowTarikan.nomor, rowTarikan.tanggal, rowTarikan.sohibul_bait?.nama ?? '—', rowTarikan.jumlah_per_orang));
                    setRowTarikan(null);
                  }}
                  className="press w-full flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-body font-semibold"
                >
                  <MessageCircle className="w-4 h-4" /> Bagikan pengingat WhatsApp
                </button>
              )}
              <button
                onClick={() => { setRowTarikan(null); setEditingTarikan(rowTarikan); }}
                className="press w-full flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-gray-800 border border-control dark:border-control-dark text-gray-700 dark:text-gray-300 text-body font-semibold"
              >
                <Pencil className="w-4 h-4" /> Revisi jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB "Proses" DIBUANG (audit 29 Jul): di halaman ini dia menutup tombol
          aksi milik salah satu baris (tumpang tindih 44×39px, area tap penuh)
          dan isinya duplikat — baris giliran berikutnya sudah punya tombol
          "Proses" berlabel brand sendiri, ditambah edge kiri sebagai penanda. */}
    </div>
  );
}
