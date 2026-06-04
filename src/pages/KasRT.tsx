import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Plus, Landmark, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, FileText, ArrowDownUp, Search, X, Download } from 'lucide-react';
import { exportCsv, todayStamp } from '../lib/exportCsv';
import { useCountUp } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal } from '../lib/utils';
import EmptyState from '../components/EmptyState';
import CrossFade from '../components/CrossFade';
import { useDragDismiss } from '../hooks/useDragDismiss';
import type { KasRT } from '../lib/types';

type Tipe = 'masuk' | 'keluar';

interface ModalProps {
  saldoSekarang: number;
  onSave: (data: { tipe: Tipe; nominal: number; keterangan: string; tanggal: string }) => Promise<void>;
  onClose: () => void;
}

function TambahModal({ saldoSekarang, onSave, onClose }: ModalProps) {
  const [tipe, setTipe] = useState<Tipe>('masuk');
  const [nominal, setNominal] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
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
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Tambah Transaksi Kas RT</h3>

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
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
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
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nominal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                <input
                  type="number"
                  value={nominal || ''}
                  onChange={(e) => setNominal(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
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
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
            </div>
          </div>

          {nominal > 0 && (
            <div className={`rounded-xl px-4 py-2.5 border ${tipe === 'masuk' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/40'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Saldo setelah transaksi:{' '}
                <span className={`font-bold ${saldoPreview < 0 ? 'text-red-600 dark:text-red-400' : tipe === 'masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {formatRupiahPlain(Math.abs(saldoPreview))}
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
              {saving ? 'Menyimpan...' : 'Simpan'}
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

  useEffect(() => { load(); }, []);

  const saldoAwalEntry = list.find((k) => k.keterangan === 'Saldo Awal Kas RT');
  const saldoAwal   = saldoAwalEntry?.nominal ?? 0;
  const totalMasuk  = list.filter((k) => k.tipe === 'masuk' && k.keterangan !== 'Saldo Awal Kas RT').reduce((s, k) => s + k.nominal, 0);
  const totalKeluar = list.filter((k) => k.tipe === 'keluar').reduce((s, k) => s + k.nominal, 0);
  const saldo       = saldoAwal + totalMasuk - totalKeluar;
  const animatedSaldo = useCountUp(saldo);

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

  const sortLabel = sort === 'terbaru' ? 'Terbaru' : sort === 'terlama' ? 'Terlama' : 'Nominal';
  const cycleSort = () =>
    setSort((s) => (s === 'terbaru' ? 'terlama' : s === 'terlama' ? 'nominal' : 'terbaru'));

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  async function handleSave(data: { tipe: Tipe; nominal: number; keterangan: string; tanggal: string }) {
    const saldoBaru = data.tipe === 'masuk' ? saldo + data.nominal : saldo - data.nominal;
    await supabase.from('kas_rt').insert({
      tipe:          data.tipe,
      nominal:       data.nominal,
      keterangan:    data.keterangan,
      tanggal:       data.tanggal,
      saldo_setelah: saldoBaru,
    });
    setShowModal(false);
    load();
  }

  return (
    <>
      <div className="space-y-4 pb-2 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Kas RT</h1>
            <p className="text-xs text-gray-400 mt-0.5">Per {today}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={async () => {
                const { generateKasRTPDF } = await import('../lib/generateKasRTPDF');
                generateKasRTPDF(list, { saldo, totalMasuk, totalKeluar, saldoAwal });
              }}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() =>
                exportCsv(
                  `Kas-RT-${todayStamp()}.csv`,
                  ['Tanggal', 'Tipe', 'Keterangan', 'Nominal', 'Saldo Setelah'],
                  displayList.map((k) => [
                    formatTanggal(k.tanggal),
                    k.tipe === 'masuk' ? 'Masuk' : 'Keluar',
                    k.keterangan ?? '',
                    k.nominal,
                    k.saldo_setelah,
                  ]),
                )
              }
              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-emerald-700 dark:text-emerald-400 text-sm font-semibold px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            {isBendahara && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-[#0F6039] text-white text-sm font-semibold px-4 py-2 rounded-full active:scale-[0.97] active:opacity-90 transition-all duration-150 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            )}
          </div>
        </div>

        {/* Saldo Card — always teal */}
        <div className="relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-br from-[#0F4C2E] via-[#145D39] to-[#1B7249]">

          <div className="relative p-6">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-teal-200" />
              <p className="text-teal-100 text-xs font-semibold tracking-widest uppercase">Saldo Bersih Kas RT</p>
            </div>
            <p className="text-5xl font-black tracking-tighter text-white mb-3">
              Rp{animatedSaldo.toLocaleString('id-ID')}
            </p>

            {/* Saldo Awal inline info */}
            {saldoAwal > 0 && saldoAwalEntry && (
              <p className="text-teal-200/80 text-xs mb-4">
                Saldo Awal
                {' · '}
                {new Date(saldoAwalEntry.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {formatRupiahPlain(saldoAwal)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                  <p className="text-teal-100 text-[9px] font-semibold uppercase tracking-wide">Total Masuk</p>
                </div>
                <p className="text-sm font-bold text-white">+{formatRupiahPlain(totalMasuk)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-300" />
                  <p className="text-teal-100 text-[9px] font-semibold uppercase tracking-wide">Total Keluar</p>
                </div>
                <p className="text-sm font-bold text-white">-{formatRupiahPlain(totalKeluar)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mutasi list — terbaru di atas (cross-fade skeleton → konten) */}
        <h2 className="text-base font-extrabold text-[#111111] dark:text-gray-100 mt-6 mb-3 px-1">Mutasi Kas Besar RT</h2>

        <CrossFade loading={loading} skeleton={(
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-4 ${i < 4 ? 'border-b border-gray-100/70 dark:border-gray-800/50' : ''}`}>
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
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Bersihkan">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {([
                { id: 'semua',  label: 'Semua' },
                { id: 'masuk',  label: 'Masuk' },
                { id: 'keluar', label: 'Keluar' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`press px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filter === f.id
                      ? 'bg-[#0F4C2E] text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={cycleSort}
              className="press ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              aria-label={`Urutkan: ${sortLabel}`}
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              {sortLabel}
            </button>
          </div>
          </div>

          {displayList.length === 0 ? (
            <EmptyState icon={Landmark} title="Tidak ada hasil" subtitle="Tidak ada transaksi pada filter ini." />
          ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden">
            {displayList.map((k, idx) => {
              const isMasuk = k.tipe === 'masuk';
              const isLast  = idx === displayList.length - 1;
              return (
                <div
                  key={k.id}
                  style={{ animationDelay: `${Math.min(idx, 10) * 0.035}s` }}
                  className={`rise flex items-center gap-3 px-4 py-4 cursor-pointer active:bg-gray-50/80 dark:active:bg-gray-800/50 transition-colors duration-200 ${!isLast ? 'border-b border-gray-100/70 dark:border-gray-800/50' : ''}`}
                >
                  <div className="w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 bg-gray-100">
                    {isMasuk
                      ? <ArrowDownLeft className="w-4 h-4 text-gray-500" />
                      : <ArrowUpRight  className="w-4 h-4 text-gray-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#111111] dark:text-gray-100 line-clamp-2 leading-snug">
                      {k.keterangan || (isMasuk ? 'Pemasukan' : 'Pengeluaran')}
                    </p>
                    <p className="text-[12px] font-medium text-slate-400/90 dark:text-gray-500 whitespace-nowrap">{formatTanggal(k.tanggal)}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-[17px] font-extrabold ${isMasuk ? 'text-green-700' : 'text-red-600'}`}>
                      {isMasuk ? '+' : '-'}{formatRupiahPlain(k.nominal)}
                    </p>
                    <p className="text-xs text-[#555555] dark:text-gray-400 font-medium mt-0.5">
                      Saldo: {formatRupiahPlain(k.saldo_setelah)}
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
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
