import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Plus, Landmark, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, FileText, Search, X, Download, Pencil, Trash2, Eye, EyeOff, Share2 } from 'lucide-react';
import { useCountUp, useHideAmount, toggleHideAmount } from '../lib/hooks';
import FilterChips from '../components/FilterChips';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal, haptic, maskRp } from '../lib/utils';
import EmptyState from '../components/EmptyState';
import Odometer from '../components/Odometer';
import SmartInsight from '../components/SmartInsight';
import CrossFade from '../components/CrossFade';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { showToast, showUndo } from '../lib/toast';
import MonthlyBars from '../components/charts/MonthlyBars';
import AreaTrend from '../components/charts/AreaTrend';
import TargetKasRT from '../components/TargetKasRT';
import { recomputeKasRTSaldo } from '../lib/kasRt';
import type { KasRT } from '../lib/types';

type Tipe = 'masuk' | 'keluar';

interface ModalProps {
  saldoSekarang: number;
  initial?: KasRT | null;
  onSave: (data: { tipe: Tipe; nominal: number; keterangan: string; tanggal: string }) => Promise<void>;
  onClose: () => void;
}

function TambahModal({ saldoSekarang, initial, onSave, onClose }: ModalProps) {
  const isEdit = !!initial;
  const [tipe, setTipe] = useState<Tipe>(initial?.tipe ?? 'masuk');
  const [nominal, setNominal] = useState(initial?.nominal ?? 0);
  const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '');
  const [tanggal, setTanggal] = useState((initial?.tanggal ?? new Date().toISOString()).split('T')[0]);
  const [saving, setSaving] = useState(false);
  const drag = useDragDismiss(onClose);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nominal) return;
    setSaving(true);
    try {
      await onSave({ tipe, nominal, keterangan, tanggal });
    } finally {
      setSaving(false);
    }
  }

  const saldoPreview = tipe === 'masuk' ? saldoSekarang + nominal : saldoSekarang - nominal;

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4"
        onClick={(e) => e.stopPropagation()}
        style={drag.style}
      >
        <div className="-mt-2 mb-1 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...drag.handlers}>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit Transaksi Kas RT' : 'Tambah Transaksi Kas RT'}</h3>

        <form onSubmit={submit} className="space-y-3">
          {/* Tipe toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['masuk', 'keluar'] as Tipe[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipe(t)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  tipe === t
                    ? t === 'masuk'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-red-500 text-white border-red-500'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-control dark:border-gray-700'
                }`}
              >
                {t === 'masuk' ? '↓ Pemasukan' : '↑ Pengeluaran'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Keterangan</label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
              placeholder="Contoh: Iuran warga bulan Juni"
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 text-sm dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nominal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={nominal ? nominal.toLocaleString('id-ID') : ''}
                  onChange={(e) => setNominal(Number(e.target.value.replace(/\D/g, '')) || 0)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-control dark:border-gray-700 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
            </div>
          </div>

          {nominal > 0 && (
            <div className={`rounded-xl px-4 py-2.5 border ${tipe === 'masuk' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/40'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Saldo setelah transaksi:{' '}
                <span className={`font-bold ${saldoPreview < 0 ? 'text-neg dark:text-red-400' : tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {formatRupiahPlain(Math.abs(saldoPreview))}
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-control dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !nominal}
              className={`flex-1 py-3 rounded-full text-white text-sm font-semibold active:scale-[0.97] active:opacity-90 disabled:opacity-70 transition-all duration-150 flex items-center justify-center gap-2 ${
                tipe === 'masuk' ? 'bg-[#0F6039]' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
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

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('kas_rt')
      .select('*')
      .order('tanggal', { ascending: true })
      .order('created_at', { ascending: true });
    setList((data as KasRT[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    import('../lib/generateKasRTPDF').catch(() => {}); // preload: jaga gesture share di HP
  }, []);

  const saldoAwalEntry = list.find((k) => k.keterangan === 'Saldo Awal Kas RT');
  const saldoAwal   = saldoAwalEntry?.nominal ?? 0;
  const totalMasuk  = list.filter((k) => k.tipe === 'masuk' && k.keterangan !== 'Saldo Awal Kas RT').reduce((s, k) => s + k.nominal, 0);
  const totalKeluar = list.filter((k) => k.tipe === 'keluar').reduce((s, k) => s + k.nominal, 0);
  // Insight: kas masuk bulan ini vs bulan lalu (kecuali Saldo Awal).
  const ymKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const curYM = ymKey(new Date());
  const masukBulan = (back: number) =>
    list
      .filter((k) => k.tipe === 'masuk' && k.keterangan !== 'Saldo Awal Kas RT' && ymKey(new Date(k.tanggal)) === curYM - back)
      .reduce((s, k) => s + k.nominal, 0);
  const masukBulanIni = masukBulan(0);
  const masukBulanLalu = masukBulan(1);
  const saldo       = saldoAwal + totalMasuk - totalKeluar;
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

  const sortLabel = sort === 'terbaru' ? 'Terbaru' : sort === 'terlama' ? 'Terlama' : 'Nominal';
  const cycleSort = () =>
    setSort((s) => (s === 'terbaru' ? 'terlama' : s === 'terlama' ? 'nominal' : 'terbaru'));

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  async function handleSave(data: { tipe: Tipe; nominal: number; keterangan: string; tanggal: string }) {
    if (editing) {
      const { data: upd, error } = await supabase
        .from('kas_rt')
        .update({ tipe: data.tipe, nominal: data.nominal, keterangan: data.keterangan, tanggal: data.tanggal })
        .eq('id', editing.id)
        .select();
      if (error) { showToast('Gagal mengubah: ' + error.message, 'error'); return; }
      if (!upd || upd.length === 0) { showToast('Gagal mengubah — policy UPDATE kas_rt belum aktif di database', 'error'); return; }
    } else {
      const { error } = await supabase.from('kas_rt').insert({
        tipe: data.tipe,
        nominal: data.nominal,
        keterangan: data.keterangan,
        tanggal: data.tanggal,
        saldo_setelah: 0, // sementara; dihitung ulang di bawah
      });
      if (error) { showToast('Gagal menyimpan: ' + error.message, 'error'); return; }
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
        if (error) { showToast('Gagal menghapus: ' + error.message, 'error'); await load(); return; }
        if (!del || del.length === 0) { showToast('Gagal menghapus — policy DELETE kas_rt belum aktif di database', 'error'); await load(); return; }
        await recomputeKasRTSaldo();
        await load();
      },
      { onUndo: () => load() },
    );
  }

  return (
    <>
      <div className="space-y-6 pb-2 page-enter">
        {/* Header — di HP: judul di atas, tombol di bawah (anti-kepotong) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Kas RT</h1>
            <p className="text-xs text-gray-400 mt-0.5">Per {today}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={async () => {
                try {
                  const { generateKasRTPDF } = await import('../lib/generateKasRTPDF');
                  generateKasRTPDF(list, { saldo, totalMasuk, totalKeluar, saldoAwal });
                } catch {
                  showToast('Gagal membuat PDF. Coba muat ulang aplikasi.', 'error');
                }
              }}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-control dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            {/* Ekspor Excel (.xlsx) — multi-sheet + styling */}
            <button
              onClick={async () => {
                const { generateKasRTExcel } = await import('../lib/generateKasRTExcel');
                await generateKasRTExcel(displayList, { saldo, totalMasuk, totalKeluar, saldoAwal });
              }}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-control dark:border-gray-700 text-emerald-700 dark:text-emerald-400 text-sm font-semibold px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            {isBendahara && (
              <button
                onClick={() => { setEditing(null); setShowModal(true); }}
                className="btn-brand flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full active:scale-[0.97] active:opacity-90 transition-all duration-150"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            )}
          </div>
        </div>

        {/* Saldo Card — always teal */}
        <div className="relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-br from-brand via-brand-600 to-brand-500">

          <div className="relative p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-teal-200" />
                <p className="text-teal-100 text-xs font-semibold tracking-widest uppercase">Saldo Bersih Kas RT</p>
              </div>
              <div className="flex items-center gap-0.5 -mr-1.5">
                <button
                  onClick={handleShareReceipt}
                  className="press p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Bagikan ringkasan ke WhatsApp"
                >
                  <Share2 className="w-4 h-4 text-teal-100/80" />
                </button>
                <button
                  onClick={() => { haptic(); toggleHideAmount(); }}
                  className="press p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                >
                  {hidden
                    ? <EyeOff className="w-4 h-4 text-teal-100/80" />
                    : <Eye className="w-4 h-4 text-teal-100/80" />}
                </button>
              </div>
            </div>
            <p className="text-5xl font-black tracking-tighter text-white mb-3 tabular-nums">
              {hidden
                ? maskRp(`Rp${animatedSaldo.toLocaleString('id-ID')}`, hidden, 7)
                : <Odometer value={animatedSaldo} />}
            </p>

            {/* Saldo Awal inline info */}
            {saldoAwal > 0 && saldoAwalEntry && (
              <p className="text-teal-200/80 text-xs mb-4">
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
                  <p className="text-teal-100 text-[9px] font-semibold uppercase tracking-wide">Total Masuk</p>
                </div>
                <p className="text-sm font-bold text-white">{maskRp(`+${formatRupiahPlain(totalMasuk)}`, hidden, 4)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-300" />
                  <p className="text-teal-100 text-[9px] font-semibold uppercase tracking-wide">Total Keluar</p>
                </div>
                <p className="text-sm font-bold text-white">{maskRp(`-${formatRupiahPlain(totalKeluar)}`, hidden, 4)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Target & progres Kas RT */}
        <TargetKasRT saldo={saldo} />

        {/* Insight ringkas: kas masuk bulan ini vs bulan lalu */}
        {(masukBulanIni > 0 || masukBulanLalu > 0) && (
          <SmartInsight label="Kas masuk bulan ini" current={masukBulanIni} previous={masukBulanLalu} />
        )}

        {/* Grafik tren saldo & masuk/keluar per bulan (periode 3/6/12) */}
        {!loading && list.length > 1 && (
          <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-4">
              <p className="text-sm font-bold text-ink dark:text-gray-100 mb-2">Tren Saldo</p>
              <AreaTrend points={saldoSeries} />
            </div>
            {monthly.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-ink dark:text-gray-100">Masuk vs Keluar</p>
                  <div className="flex items-center gap-1">
                    {[3, 6, 12].map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                          chartPeriod === p ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {p}B
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-medium mb-2">
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />Masuk</span>
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-rose-400" />Keluar</span>
                </div>
                <MonthlyBars data={monthly} />
              </div>
            )}
          </div>
        )}

        {/* Mutasi list — terbaru di atas (cross-fade skeleton → konten) */}
        <h2 className="text-base font-bold text-ink dark:text-gray-100 mt-6 mb-3 px-1">Mutasi Kas Besar RT</h2>

        <CrossFade loading={loading} skeleton={(
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-4 ${i < 4 ? 'border-b border-line/70 dark:border-gray-800/50' : ''}`}>
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
          {list.length === 0 ? (
          <EmptyState icon={Landmark} title="Belum ada transaksi" subtitle="Transaksi akan muncul setelah data pertama ditambahkan." />
        ) : (
          <>
          {/* Cari + filter tipe + sort mutasi */}
          <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari keterangan..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-control dark:border-gray-700 text-sm dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Bersihkan">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <FilterChips
            options={[
              { id: 'semua',  label: 'Semua' },
              { id: 'masuk',  label: 'Masuk' },
              { id: 'keluar', label: 'Keluar' },
            ] as const}
            value={filter}
            onChange={setFilter}
            sort={{ label: sortLabel, onCycle: cycleSort }}
          />
          </div>

          {displayList.length === 0 ? (
            <EmptyState icon={Landmark} title="Tidak ada hasil" subtitle="Tidak ada transaksi pada filter ini." />
          ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {displayList.map((k, idx) => {
              const isMasuk = k.tipe === 'masuk';
              const isLast  = idx === displayList.length - 1;
              const editable = isBendahara && k.keterangan !== 'Saldo Awal Kas RT';
              return (
                <div
                  key={k.id}
                  onClick={editable ? () => { setSelectedRow(k); setConfirmDel(false); } : undefined}
                  style={{ animationDelay: `${Math.min(idx, 10) * 0.035}s` }}
                  className={`rise flex items-center gap-3 px-4 py-4 ${editable ? 'cursor-pointer active:bg-gray-50/80 dark:active:bg-gray-800/50' : ''} transition-colors duration-200 ${!isLast ? 'border-b border-line/70 dark:border-gray-800/50' : ''}`}
                >
                  <div className="w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800">
                    {isMasuk
                      ? <ArrowDownLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      : <ArrowUpRight  className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-ink dark:text-gray-100 leading-snug break-words">
                      {k.keterangan || (isMasuk ? 'Pemasukan' : 'Pengeluaran')}
                    </p>
                    <p className="text-[12px] font-medium text-ink-faint dark:text-gray-500 whitespace-nowrap">{formatTanggal(k.tanggal)}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-[17px] font-bold ${isMasuk ? 'text-pos' : 'text-neg'}`}>
                      {maskRp(`${isMasuk ? '+' : '-'}${formatRupiahPlain(k.nominal)}`, hidden, 4)}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${k.saldo_setelah < 0 ? 'text-neg dark:text-rose-400' : 'text-ink-sub dark:text-gray-400'}`}>
                      Saldo: {maskRp(`${k.saldo_setelah < 0 ? '-' : ''}Rp${Math.abs(k.saldo_setelah).toLocaleString('id-ID')}`, hidden, 4)}
                    </p>
                  </div>
                </div>
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
            className="sheet-panel float relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10"
            onClick={(e) => e.stopPropagation()}
            style={rowDrag.style}
          >
            <div className="-mt-2 mb-3 py-2 flex justify-center touch-none cursor-grab active:cursor-grabbing" {...rowDrag.handlers}>
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">{selectedRow.keterangan || (selectedRow.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatTanggal(selectedRow.tanggal)}</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2.5 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tipe</span>
                <span className={`text-sm font-semibold ${selectedRow.tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-neg dark:text-red-400'}`}>
                  {selectedRow.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Nominal</span>
                <span className={`text-base font-bold ${selectedRow.tipe === 'masuk' ? 'text-pos dark:text-emerald-400' : 'text-neg dark:text-red-400'}`}>
                  {maskRp(`${selectedRow.tipe === 'masuk' ? '+' : '-'}${formatRupiahPlain(selectedRow.nominal)}`, hidden, 4)}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setEditing(selectedRow); setSelectedRow(null); setShowModal(true); }}
                className="btn-brand flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => { if (confirmDel) deleteRow(selectedRow); else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); } }}
                className={`press flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border ${confirmDel ? 'bg-rose-600 text-white border-rose-600' : 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'}`}
              >
                <Trash2 className="w-4 h-4" /> {confirmDel ? 'Yakin hapus?' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
