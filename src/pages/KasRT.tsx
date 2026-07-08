import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Landmark, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, FileText, Search, Download, Pencil, Trash2, Eye, EyeOff, Share2, RotateCcw } from 'lucide-react';
import { useCountUp, useHideAmount, toggleHideAmount } from '../lib/hooks';
import ClearButton from '../components/ClearButton';
import FilterChips from '../components/FilterChips';
import InfoTip from '../components/InfoTip';
import SectionTitle from '../components/SectionTitle';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal, haptic, maskRp, pesanError } from '../lib/utils';
import FitAmount from '../components/FitAmount';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Odometer from '../components/Odometer';
import SmartInsight from '../components/SmartInsight';
import CrossFade from '../components/CrossFade';
import Fab from '../components/Fab';
import ExportMenu from '../components/ExportMenu';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { showToast, showUndo } from '../lib/toast';
import MonthlyBars from '../components/charts/MonthlyBars';
import AreaTrend from '../components/charts/AreaTrend';
import TargetKasRT from '../components/TargetKasRT';
import { recomputeKasRTSaldo } from '../lib/kasRt';
import { kategoriOpsi, kategoriDefault, labelKategoriSingkat, KATEGORI_MASUK, KATEGORI_KELUAR } from '../lib/kategoriKasRt';
import type { KasRT } from '../lib/types';

type Tipe = 'masuk' | 'keluar';

interface ModalProps {
  saldoSekarang: number;
  initial?: KasRT | null;
  onSave: (data: { tipe: Tipe; nominal: number; keterangan: string; tanggal: string; kategori: string }) => Promise<void>;
  onClose: () => void;
}

function TambahModal({ saldoSekarang, initial, onSave, onClose }: ModalProps) {
  const isEdit = !!initial;
  const [tipe, setTipe] = useState<Tipe>(initial?.tipe ?? 'masuk');
  const [nominal, setNominal] = useState(initial?.nominal ?? 0);
  const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '');
  const [tanggal, setTanggal] = useState(() => (initial?.tanggal ?? new Date().toISOString()).split('T')[0]);
  const [kategori, setKategori] = useState<string>(initial?.kategori ?? kategoriDefault(initial?.tipe ?? 'masuk'));
  const [saving, setSaving] = useState(false);
  const drag = useDragDismiss(onClose);
  const dlg = useDialog(true, { onClose, label: isEdit ? 'Edit transaksi Kas RT' : 'Tambah transaksi Kas RT' });

  // Ganti tipe → pastikan kategori tetap valid utk tipe baru (set default bila tidak).
  function pilihTipe(t: Tipe) {
    setTipe(t);
    setKategori((cur) => (kategoriOpsi(t).some((o) => o.key === cur) ? cur : kategoriDefault(t)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nominal) return;
    setSaving(true);
    try {
      await onSave({ tipe, nominal, keterangan, tanggal, kategori });
    } finally {
      setSaving(false);
    }
  }

  const saldoPreview = tipe === 'masuk' ? saldoSekarang + nominal : saldoSekarang - nominal;

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={dlg.panelRef}
        {...dlg.panelProps}
        className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={drag.style}
      >
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <h3 className="text-base font-bold text-ink dark:text-gray-100">{isEdit ? 'Edit Transaksi Kas RT' : 'Tambah Transaksi Kas RT'}</h3>

        <form onSubmit={submit} className="space-y-3">
          {/* Tipe toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['masuk', 'keluar'] as Tipe[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pilihTipe(t)}
                aria-pressed={tipe === t}
                className={`press inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  tipe === t
                    ? t === 'masuk'
                      ? 'bg-pos text-white border-pos'
                      : 'bg-neg text-white border-neg'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-control dark:border-gray-700'
                }`}
              >
                {/* Ikon lucide (bukan panah unicode) — rima dgn ikon tile mutasi */}
                {t === 'masuk'
                  ? <><ArrowDownLeft className="w-4 h-4" /> Pemasukan</>
                  : <><ArrowUpRight className="w-4 h-4" /> Pengeluaran</>}
              </button>
            ))}
          </div>

          {/* Kategori — untuk laporan pertanggungjawaban (opsi ikut tipe) */}
          <div>
            <label htmlFor="kasrt-kategori" className="block text-xs font-semibold text-ink-sub dark:text-gray-400 mb-1.5">Kategori</label>
            <select id="kasrt-kategori" name="kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} required
              className="field">
              {kategoriOpsi(tipe).map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="kasrt-keterangan" className="block text-xs font-semibold text-ink-sub dark:text-gray-400 mb-1.5">Keterangan</label>
            <input
              id="kasrt-keterangan"
              name="keterangan"
              autoComplete="off"
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
              placeholder="Contoh: Iuran warga bulan Juni…"
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="kasrt-nominal" className="block text-xs font-semibold text-ink-sub dark:text-gray-400 mb-1.5">Nominal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">Rp</span>
                <input
                  id="kasrt-nominal"
                  name="nominal"
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  value={nominal ? nominal.toLocaleString('id-ID') : ''}
                  onChange={(e) => setNominal(Number(e.target.value.replace(/\D/g, '')) || 0)}
                  required
                  className="field pl-9 pr-3"
                />
              </div>
            </div>
            <div>
              <label htmlFor="kasrt-tanggal" className="block text-xs font-semibold text-ink-sub dark:text-gray-400 mb-1.5">Tanggal</label>
              <input
                id="kasrt-tanggal"
                name="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="field"
              />
            </div>
          </div>

          {nominal > 0 && (
            <div className={`rounded-xl px-4 py-2.5 border ${tipe === 'masuk' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/40'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Saldo setelah transaksi:{' '}
                <span className={`font-bold ${saldoPreview < 0 ? 'text-neg dark:text-rose-400' : tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-ink-sub dark:text-gray-300'}`}>
                  {/* formatRupiahPlain pakai Math.abs → tanda minus ditambah sendiri */}
                  {(saldoPreview < 0 ? '-' : '') + formatRupiahPlain(saldoPreview)}
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !nominal}
              className={`flex-1 py-3 rounded-full text-white text-sm font-semibold active:scale-[0.97] active:opacity-90 disabled:opacity-70 transition duration-150 flex items-center justify-center gap-2 ${
                tipe === 'masuk' ? 'btn-brand' : 'btn-danger'
              }`}
            >
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function KasRTPage() {
  const { isBendahara } = useAuthContext();
  const [list, setList] = useState<KasRT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [sort, setSort] = useState<'terbaru' | 'terlama' | 'nominal'>('terbaru');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<KasRT | null>(null);
  const [selectedRow, setSelectedRow] = useState<KasRT | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [chartPeriod, setChartPeriod] = useState(6); // bulan terakhir di bar chart
  const rowDrag = useDragDismiss(() => setSelectedRow(null));
  useBackDismiss(showModal, () => { setEditing(null); setShowModal(false); });
  useBackDismiss(selectedRow !== null, () => setSelectedRow(null));
  const rowDlg = useDialog(selectedRow !== null, { onClose: () => setSelectedRow(null), label: 'Aksi transaksi' });

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await supabase
        .from('kas_rt')
        .select('*')
        .order('tanggal', { ascending: true })
        .order('created_at', { ascending: true });
      setList((data as KasRT[]) ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    import('../lib/generateKasRTPDF').catch(() => {}); // preload: jaga gesture share di HP
  }, []);

  // Agregat ringkasan (saldo, total masuk/keluar, insight bulanan) — satu pass
  // atas list, hanya dihitung ulang saat list berubah (bukan tiap keystroke cari/filter).
  const { saldoAwalEntry, saldoAwal, totalMasuk, totalKeluar, masukBulanIni, masukBulanLalu, saldo } = useMemo(() => {
    const ymKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();
    const curYM = ymKey(new Date());
    const awalEntry = list.find((k) => k.keterangan === 'Saldo Awal Kas RT');
    const awal = awalEntry?.nominal ?? 0;
    let masuk = 0, keluar = 0, mIni = 0, mLalu = 0;
    for (const k of list) {
      const isSaldoAwal = k.keterangan === 'Saldo Awal Kas RT';
      if (k.tipe === 'keluar') { keluar += k.nominal; continue; }
      if (k.tipe === 'masuk' && !isSaldoAwal) {
        masuk += k.nominal;
        const back = curYM - ymKey(new Date(k.tanggal));
        if (back === 0) mIni += k.nominal;
        else if (back === 1) mLalu += k.nominal;
      }
    }
    return {
      saldoAwalEntry: awalEntry, saldoAwal: awal,
      totalMasuk: masuk, totalKeluar: keluar,
      masukBulanIni: mIni, masukBulanLalu: mLalu,
      saldo: awal + masuk - keluar,
    };
  }, [list]);
  const animatedSaldo = useCountUp(saldo);
  const hidden = useHideAmount();

  // Bagikan ringkasan Kas RT sbg kartu PNG bermerek → grup WA warga.
  async function handleShareReceipt() {
    haptic(12);
    // formatRupiahPlain pakai Math.abs → tambahkan tanda minus sendiri utk saldo negatif.
    const fmtSaldo = (saldo < 0 ? '-' : '') + formatRupiahPlain(saldo);
    try {
      const { shareReceipt } = await import('../lib/shareReceipt');
      await shareReceipt({
        title: 'Ringkasan Kas Besar RT 004 / RW 006',
        amountLabel: 'Saldo Bersih Kas RT',
        amount: fmtSaldo,
        rows: [
          { label: 'Saldo Awal', value: formatRupiahPlain(saldoAwal) },
          { label: 'Total Masuk', value: '+' + formatRupiahPlain(totalMasuk) },
          { label: 'Total Keluar', value: '-' + formatRupiahPlain(totalKeluar) },
          { label: 'Saldo Bersih', value: fmtSaldo },
        ],
        shareText: `Ringkasan Kas RT 004/006\nSaldo bersih: ${fmtSaldo}\n— Hadiran RT`,
      });
    } catch {
      showToast('Gagal membuat gambar. Coba lagi.', 'error');
    }
  }

  // Daftar tampil = list difilter (tipe) & diurutkan (sort). saldo_setelah per
  // baris tetap akurat karena dihitung saat insert.
  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = [...list];
    if (sort === 'terbaru') arr.reverse();          // list dari DB urut menaik (terlama→terbaru)
    else if (sort === 'nominal') arr.sort((a, b) => b.nominal - a.nominal);
    // 'terlama' = biarkan urutan menaik apa adanya
    if (filter !== 'semua') arr = arr.filter((k) => k.tipe === filter);
    if (q) arr = arr.filter((k) => (k.keterangan ?? '').toLowerCase().includes(q));
    return arr;
  }, [list, filter, sort, search]);

  // Agregasi bulanan (masuk vs keluar) — 6 bulan terakhir.
  const monthly = useMemo(() => {
    const map = new Map<string, { masuk: number; keluar: number }>();
    list.forEach((k) => {
      if (k.keterangan === 'Saldo Awal Kas RT') return;
      const key = (k.tanggal ?? '').slice(0, 7);
      if (!key) return;
      const e = map.get(key) ?? { masuk: 0, keluar: 0 };
      if (k.tipe === 'masuk') e.masuk += k.nominal;
      else e.keluar += k.nominal;
      map.set(key, e);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-chartPeriod)
      .map(([key, v]) => ({
        label: new Date(`${key}-01`).toLocaleDateString('id-ID', { month: 'short' }),
        masuk: v.masuk,
        keluar: v.keluar,
      }));
  }, [list, chartPeriod]);

  // Seri saldo kronologis untuk area tren.
  const saldoSeries = useMemo(() => list.map((k) => k.saldo_setelah), [list]);

  // Rekap per kategori (pertanggungjawaban) — Saldo Awal dikecualikan.
  const rekapKategori = useMemo(() => {
    const masuk: Record<string, number> = {};
    const keluar: Record<string, number> = {};
    for (const k of list) {
      if (k.keterangan === 'Saldo Awal Kas RT') continue;
      const bucket = k.tipe === 'masuk' ? masuk : keluar;
      const key = k.kategori ?? 'lainnya';
      bucket[key] = (bucket[key] ?? 0) + k.nominal;
    }
    return { masuk, keluar };
  }, [list]);


  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  async function handleSave(data: { tipe: Tipe; nominal: number; keterangan: string; tanggal: string; kategori: string }) {
    if (editing) {
      const { data: upd, error } = await supabase
        .from('kas_rt')
        .update({ tipe: data.tipe, nominal: data.nominal, keterangan: data.keterangan, tanggal: data.tanggal, kategori: data.kategori })
        .eq('id', editing.id)
        .select();
      if (error) { showToast(pesanError(error, 'Gagal mengubah transaksi.'), 'error'); return; }
      if (!upd || upd.length === 0) { showToast('Gagal mengubah — policy UPDATE kas_rt belum aktif di database', 'error'); return; }
    } else {
      const { error } = await supabase.from('kas_rt').insert({
        tipe: data.tipe,
        nominal: data.nominal,
        keterangan: data.keterangan,
        tanggal: data.tanggal,
        kategori: data.kategori,
        saldo_setelah: 0, // sementara; dihitung ulang di bawah
      });
      if (error) { showToast(pesanError(error, 'Gagal menyimpan transaksi.'), 'error'); return; }
    }
    await recomputeKasRTSaldo();
    setShowModal(false);
    const wasEdit = !!editing;
    setEditing(null);
    await load();
    showToast(wasEdit ? 'Transaksi diperbarui' : data.tipe === 'masuk' ? 'Pemasukan tersimpan' : 'Pengeluaran tersimpan');
  }

  // Hapus transaksi Kas RT dengan pola undo (hapus permanen setelah 5 dtk bila tak diurungkan).
  function deleteRow(row: KasRT) {
    setSelectedRow(null);
    setConfirmDel(false);
    setList(prev => prev.filter(x => x.id !== row.id)); // optimistik
    showUndo(
      'Transaksi dihapus',
      async () => {
        const { data: del, error } = await supabase.from('kas_rt').delete().eq('id', row.id).select();
        if (error) { showToast(pesanError(error, 'Gagal menghapus transaksi.'), 'error'); await load(); return; }
        if (!del || del.length === 0) { showToast('Gagal menghapus — policy DELETE kas_rt belum aktif di database', 'error'); await load(); return; }
        await recomputeKasRTSaldo();
        await load();
      },
      { onUndo: () => load() },
    );
  }

  return (
    <>
      <div className="space-y-7 pb-2 page-enter">
        {/* Header — di HP: judul di atas, tombol di bawah (anti-kepotong) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="inline-flex items-center gap-1 text-lg font-bold text-ink dark:text-gray-100">
              Kas RT
              <InfoTip label="Kas RT">
                Kas besar RT 004/006. Sebagian iuran tiap tarikan (Rp5.000/anggota) disetor ke sini untuk kebutuhan RT — terpisah dari Kas Hadiran.
              </InfoTip>
            </h1>
            <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">Per {today}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={load} aria-label="Muat ulang" className="press w-11 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {/* Ekspor (PDF/Excel) disatukan ke satu menu → aksi utama "Tambah"
                tak tersaingi di toolbar; kini hadir sebagai FAB di zona jempol.
                align kiri: tombol berada di kiri toolbar (HP) → dropdown buka ke
                kanan agar tidak terpotong tepi layar. */}
            <ExportMenu
              align="left"
              items={[
                {
                  label: 'Cetak PDF',
                  icon: FileText,
                  onClick: async () => {
                    try {
                      const { generateKasRTPDF } = await import('../lib/generateKasRTPDF');
                      generateKasRTPDF(list, { saldo, totalMasuk, totalKeluar, saldoAwal });
                    } catch {
                      showToast('Gagal membuat PDF. Coba muat ulang aplikasi.', 'error');
                    }
                  },
                },
                {
                  label: 'Ekspor Excel',
                  icon: Download,
                  tone: 'text-emerald-600 dark:text-emerald-400',
                  onClick: async () => {
                    const { generateKasRTExcel } = await import('../lib/generateKasRTExcel');
                    await generateKasRTExcel(displayList, { saldo, totalMasuk, totalKeluar, saldoAwal });
                  },
                },
              ]}
            />
          </div>
        </div>

        {/* Saldo Card — always teal. Di dalam CrossFade: sebelum data siap
            saldo=0 → hero berkedip "Rp0" (angka salah sesaat). */}
        <CrossFade loading={loading} skeleton={<div className="h-[218px] rounded-2xl skeleton" />}>
        <div className="relative rounded-2xl overflow-hidden hero-emerald" style={{ boxShadow: 'var(--hero-shadow)' }}>
          <div className="hero-sheen pointer-events-none absolute inset-0" />

          <div className="relative p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-white/80" />
                {/* white/90 (bukan teal-100): seragam dgn hero Kas Hadiran + jaga AA di ujung terang gradient */}
                <p className="text-white/90 text-xs font-semibold tracking-widest uppercase">Saldo Bersih Kas RT</p>
              </div>
              <div className="flex items-center gap-0.5 -mr-1.5">
                {/* Urutan ikon seragam app-wide: mata (sembunyikan nominal) selalu pertama. */}
                <button
                  onClick={() => { haptic(); toggleHideAmount(); }}
                  className="press w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                >
                  {hidden
                    ? <EyeOff className="w-4 h-4 text-white/80" />
                    : <Eye className="w-4 h-4 text-white/80" />}
                </button>
                <button
                  onClick={handleShareReceipt}
                  className="press w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Bagikan ringkasan ke WhatsApp"
                >
                  <Share2 className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
            <FitAmount
              measure={`${saldo < 0 ? '-' : ''}Rp${Math.abs(saldo).toLocaleString('id-ID')}`}
              maxPx={48}
              minPx={30}
              className={`font-display font-extrabold tracking-tighter mb-3 tabular-nums ${saldo < 0 ? 'text-rose-200' : 'text-white'}`}
            >
              {hidden
                ? maskRp(`Rp${animatedSaldo.toLocaleString('id-ID')}`, hidden, 7)
                : <Odometer value={animatedSaldo} />}
            </FitAmount>

            {/* Saldo Awal inline info */}
            {saldoAwal > 0 && saldoAwalEntry && (
              <p className="text-white/90 text-xs mb-4">
                Saldo Awal
                {' · '}
                {new Date(saldoAwalEntry.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {maskRp(formatRupiahPlain(saldoAwal), hidden, 4)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                  <p className="text-white/90 text-micro font-semibold uppercase tracking-wide">Total Masuk</p>
                </div>
                <p className="text-sm font-bold text-white">{maskRp(`+${formatRupiahPlain(totalMasuk)}`, hidden, 4)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
                  <p className="text-white/90 text-micro font-semibold uppercase tracking-wide">Total Keluar</p>
                </div>
                <p className="text-sm font-bold text-white">{maskRp(`-${formatRupiahPlain(totalKeluar)}`, hidden, 4)}</p>
              </div>
            </div>
          </div>
        </div>
        </CrossFade>

        {/* Target & progres Kas RT */}
        <TargetKasRT saldo={saldo} />

        {/* Insight ringkas: kas masuk bulan ini vs bulan lalu */}
        {(masukBulanIni > 0 || masukBulanLalu > 0) && (
          <SmartInsight label="Kas masuk bulan ini" current={masukBulanIni} previous={masukBulanLalu} />
        )}

        {/* Grafik tren saldo & masuk/keluar per bulan (periode 3/6/12) */}
        {!loading && list.length > 1 && (
          <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-5">
              <p className="text-sm font-bold text-ink dark:text-gray-100 mb-2">Tren Saldo</p>
              <AreaTrend points={saldoSeries} />
            </div>
            {monthly.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-ink dark:text-gray-100">Masuk vs Keluar</p>
                  <div className="flex items-center gap-1">
                    {[3, 6, 12].map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        aria-pressed={chartPeriod === p}
                        aria-label={`${p} bulan terakhir`}
                        className={`press min-h-[44px] min-w-[44px] px-2 inline-flex items-center justify-center rounded-md text-micro font-bold transition-colors ${
                          chartPeriod === p ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {p}B
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-micro font-medium mb-2">
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />Masuk</span>
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-rose-400" />Keluar</span>
                </div>
                <MonthlyBars data={monthly} />
              </div>
            )}
          </div>
        )}

        {/* Rekap per kategori — untuk pertanggungjawaban */}
        {!loading && list.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-5 mt-4">
            <p className="text-sm font-bold text-ink dark:text-gray-100 mb-3">Rekap per Kategori</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Penerimaan */}
              <div className="inset-soft rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400">Penerimaan</span>
                  <span className="text-caption font-bold text-pos dark:text-emerald-400 tabular-nums shrink-0">{maskRp(`+${formatRupiahPlain(totalMasuk)}`, hidden, 4)}</span>
                </div>
                <div className="space-y-1.5">
                  {KATEGORI_MASUK.filter((o) => (rekapKategori.masuk[o.key] ?? 0) > 0).map((o) => (
                    <div key={o.key} className="flex items-start justify-between gap-2 text-caption">
                      <span className="text-ink-sub dark:text-gray-300 leading-snug">{o.label}</span>
                      <span className="font-semibold text-ink dark:text-gray-100 tabular-nums shrink-0">{maskRp(`+${formatRupiahPlain(rekapKategori.masuk[o.key])}`, hidden, 4)}</span>
                    </div>
                  ))}
                  {totalMasuk === 0 && <p className="text-caption text-ink-faint dark:text-gray-500">Belum ada penerimaan.</p>}
                </div>
              </div>
              {/* Pengeluaran */}
              <div className="inset-soft rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400">Pengeluaran</span>
                  <span className="text-caption font-bold text-neg dark:text-rose-400 tabular-nums shrink-0">{maskRp(`-${formatRupiahPlain(totalKeluar)}`, hidden, 4)}</span>
                </div>
                <div className="space-y-1.5">
                  {KATEGORI_KELUAR.filter((o) => (rekapKategori.keluar[o.key] ?? 0) > 0).map((o) => (
                    <div key={o.key} className="flex items-start justify-between gap-2 text-caption">
                      <span className="text-ink-sub dark:text-gray-300 leading-snug">{o.label}</span>
                      <span className="font-semibold text-ink dark:text-gray-100 tabular-nums shrink-0">{maskRp(`-${formatRupiahPlain(rekapKategori.keluar[o.key])}`, hidden, 4)}</span>
                    </div>
                  ))}
                  {totalKeluar === 0 && <p className="text-caption text-ink-faint dark:text-gray-500">Belum ada pengeluaran.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mutasi list — terbaru di atas (cross-fade skeleton → konten) */}
        <SectionTitle className="mt-6" count={list.length}>Mutasi Kas Besar RT</SectionTitle>

        <CrossFade loading={loading} skeleton={(
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-4 [--di-l:4.25rem]${i < 4 ? ' divide-inset' : ''}`}>
                <div className="w-9 h-9 rounded-xl skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded-lg w-3/4" />
                  <div className="h-3 skeleton rounded-lg w-1/3" />
                </div>
                <div className="text-right space-y-1.5">
                  <div className="h-4 w-20 skeleton rounded-lg" />
                  <div className="h-3 w-16 skeleton rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}>
          {error ? (
          <ErrorState onRetry={() => load()} retrying={loading} />
        ) : list.length === 0 ? (
          <EmptyState icon={Landmark} title="Belum ada transaksi" subtitle="Transaksi akan muncul setelah data pertama ditambahkan." />
        ) : (
          <>
          {/* Cari + filter tipe + sort mutasi */}
          <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="cari-mutasi"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari keterangan…"
              aria-label="Cari mutasi kas"
              inputMode="search"
              enterKeyHint="search"
              className="field-search pr-11"
            />
            {search && <ClearButton onClick={() => setSearch('')} />}
          </div>
          <FilterChips
            options={[
              { id: 'semua',  label: 'Semua' },
              { id: 'masuk',  label: 'Masuk' },
              { id: 'keluar', label: 'Keluar' },
            ] as const}
            value={filter}
            onChange={setFilter}
            sort={{
              value: sort,
              options: [
                { id: 'terbaru', label: 'Terbaru' },
                { id: 'terlama', label: 'Terlama' },
                { id: 'nominal', label: 'Nominal' },
              ] as const,
              onChange: setSort,
            }}
          />
          </div>

          {displayList.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="Tidak ada hasil"
              subtitle="Tidak ada transaksi pada filter ini."
              action={{ label: 'Reset filter', icon: RotateCcw, onClick: () => { setFilter('semua'); setSearch(''); } }}
            />
          ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {displayList.map((k, idx) => {
              const isMasuk = k.tipe === 'masuk';
              const isLast  = idx === displayList.length - 1;
              const editable = isBendahara && k.keterangan !== 'Saldo Awal Kas RT';
              // Baris bendahara = <button> asli (klik/Enter/Space/fokus bawaan);
              // baris view-only warga tetap <div> non-interaktif.
              const Row: React.ElementType = editable ? 'button' : 'div';
              return (
                <Row
                  key={k.id}
                  type={editable ? 'button' : undefined}
                  onClick={editable ? () => { haptic(); setSelectedRow(k); setConfirmDel(false); } : undefined}
                  aria-label={editable ? `Aksi: ${k.keterangan || (isMasuk ? 'Pemasukan' : 'Pengeluaran')}` : undefined}
                  style={{ animationDelay: `${Math.min(idx, 10) * 0.035}s` }}
                  className={`rise w-full text-left flex items-center gap-3 px-5 py-4 [--di-l:4.25rem] [content-visibility:auto] [contain-intrinsic-block-size:auto_72px]${editable ? ' cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-800/40 active:bg-gray-50/80 dark:active:bg-gray-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40' : ''} transition-colors duration-200 ${!isLast ? 'divide-inset' : ''}`}
                >
                  <div className={`icon-tile w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 ${isMasuk ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                    {isMasuk
                      ? <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      : <ArrowUpRight  className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-ink dark:text-gray-100 leading-snug break-words">
                      {k.keterangan || (isMasuk ? 'Pemasukan' : 'Pengeluaran')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <p className="text-caption font-medium text-ink-faint dark:text-gray-400 whitespace-nowrap">{formatTanggal(k.tanggal)}</p>
                      {k.kategori && (
                        <span className="text-micro font-semibold px-1.5 py-0.5 rounded-md border border-line dark:border-gray-700 text-ink-sub dark:text-gray-300 whitespace-nowrap">
                          {labelKategoriSingkat(k.tipe, k.kategori)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-amount font-bold tabular-nums ${isMasuk ? 'text-pos dark:text-emerald-400' : 'text-neg dark:text-rose-400'}`}>
                      {maskRp(`${isMasuk ? '+' : '-'}${formatRupiahPlain(k.nominal)}`, hidden, 4)}
                    </p>
                    <p className={`text-xs font-medium tabular-nums mt-0.5 ${k.saldo_setelah < 0 ? 'text-neg dark:text-rose-400' : 'text-ink-sub dark:text-gray-400'}`}>
                      Saldo: {maskRp(`${k.saldo_setelah < 0 ? '-' : ''}Rp${Math.abs(k.saldo_setelah).toLocaleString('id-ID')}`, hidden, 4)}
                    </p>
                  </div>
                </Row>
              );
            })}
          </div>
          )}
          </>
        )}
        </CrossFade>
      </div>

      {showModal && (
        <TambahModal
          saldoSekarang={saldo}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      {/* Aksi baris: detail + Edit + Hapus (bendahara) */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedRow(null)}>
          <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
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
            <p className="text-base font-bold text-ink dark:text-gray-100 leading-snug">{selectedRow.keterangan || (selectedRow.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran')}</p>
            <p className="text-xs text-ink-faint dark:text-gray-400 mt-0.5">{formatTanggal(selectedRow.tanggal)}</p>
            <div className="inset-soft rounded-2xl p-4 space-y-2.5 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-faint dark:text-gray-400">Tipe</span>
                <span className={`text-sm font-semibold ${selectedRow.tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-neg dark:text-rose-400'}`}>
                  {selectedRow.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-faint dark:text-gray-400">Nominal</span>
                <span className={`text-base font-bold ${selectedRow.tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-neg dark:text-rose-400'}`}>
                  {maskRp(`${selectedRow.tipe === 'masuk' ? '+' : '-'}${formatRupiahPlain(selectedRow.nominal)}`, hidden, 4)}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setEditing(selectedRow); setSelectedRow(null); setShowModal(true); }}
                className="btn-brand flex-1 inline-flex items-center justify-center gap-2 py-3 text-sm font-bold"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => { if (confirmDel) deleteRow(selectedRow); else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); } }}
                className={`press flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border ${confirmDel ? 'btn-danger border-transparent' : 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'}`}
              >
                <Trash2 className="w-4 h-4" /> {confirmDel ? 'Yakin hapus?' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aksi utama di zona jempol */}
      {isBendahara && (
        <Fab label="Tambah" ariaLabel="Tambah transaksi Kas RT" onClick={() => { setEditing(null); setShowModal(true); }} />
      )}
    </>
  );
}
