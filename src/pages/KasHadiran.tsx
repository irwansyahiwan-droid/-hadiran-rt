import { useEffect, useState } from 'react';
import {
  RefreshCw, Plus, TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownLeft, Building2, Wallet,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal } from '../lib/utils';
import type { TransaksiKas } from '../lib/types';

type TipeFilter = 'semua' | 'kas_masuk' | 'talangan_masuk' | 'kas_keluar' | 'setor_kas_rt';

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIPE_META: Record<string, { label: string; color: string; bg: string; sign: 1 | -1 }> = {
  kas_masuk:      { label: 'Kas Masuk',     color: 'text-emerald-600', bg: 'bg-emerald-100', sign: 1 },
  talangan_masuk: { label: 'Talangan Masuk', color: 'text-blue-600',   bg: 'bg-blue-100',    sign: 1 },
  kas_keluar:     { label: 'Kas Keluar',    color: 'text-red-500',    bg: 'bg-red-100',     sign: -1 },
  setor_kas_rt:   { label: 'Setor Kas RT',  color: 'text-amber-600',  bg: 'bg-amber-100',   sign: -1 },
  talangan_keluar:{ label: 'Talangan Keluar', color: 'text-red-500',  bg: 'bg-red-100',     sign: -1 },
};

function TipeIcon({ tipe }: { tipe: string }) {
  const icons: Record<string, React.ReactNode> = {
    kas_masuk:       <ArrowDownLeft className="w-4 h-4" />,
    talangan_masuk:  <ArrowDownLeft className="w-4 h-4" />,
    kas_keluar:      <ArrowUpRight  className="w-4 h-4" />,
    setor_kas_rt:    <Building2     className="w-4 h-4" />,
    talangan_keluar: <ArrowUpRight  className="w-4 h-4" />,
  };
  return <>{icons[tipe] ?? <Wallet className="w-4 h-4" />}</>;
}

// ── Add Kas Keluar Modal ────────────────────────────────────────────────────────

interface ModalProps {
  currentSaldo: number;
  onSave: (data: { keterangan: string; nominal: number; tanggal: string }) => Promise<void>;
  onClose: () => void;
}

function KasKeluarModal({ currentSaldo, onSave, onClose }: ModalProps) {
  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState(0);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ keterangan, nominal, tanggal });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl p-5 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <div>
          <h3 className="text-base font-bold text-gray-900">Tambah Kas Keluar</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Saldo saat ini: <span className="font-semibold text-emerald-600">{formatRupiahPlain(currentSaldo)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Keterangan</label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Beli snack, konsumsi hadiran"
              required
              className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nominal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">Rp</span>
              <input
                type="number"
                value={nominal || ''}
                onChange={(e) => setNominal(Number(e.target.value))}
                placeholder="0"
                required
                min={1}
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          {nominal > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-red-600">
                Saldo setelah transaksi:{' '}
                <span className="font-bold">{formatRupiahPlain(Math.max(0, currentSaldo - nominal))}</span>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Catat Pengeluaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function KasHadiranPage() {
  const { isBendahara } = useAuthContext();
  const [list, setList] = useState<TransaksiKas[]>([]);
  const [filter, setFilter] = useState<TipeFilter>('semua');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('transaksi_kas')
      .select('*, warga(*), tarikan(*)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });
    setList((data as TransaksiKas[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Saldo breakdown
  const total = (tipe: string) =>
    list.filter((t) => t.tipe === tipe).reduce((s, t) => s + t.nominal, 0);

  const kasMasuk     = total('kas_masuk');
  const talanganMasuk = total('talangan_masuk');
  const kasKeluar    = total('kas_keluar');
  const setorRT      = total('setor_kas_rt');
  const saldo        = kasMasuk + talanganMasuk - kasKeluar - setorRT;

  const FILTERS: { id: TipeFilter; label: string }[] = [
    { id: 'semua',          label: 'Semua' },
    { id: 'kas_masuk',      label: 'Kas Masuk' },
    { id: 'talangan_masuk', label: 'Talangan' },
    { id: 'kas_keluar',     label: 'Keluar' },
    { id: 'setor_kas_rt',   label: 'Setor RT' },
  ];

  const filtered = filter === 'semua' ? list : list.filter((t) => t.tipe === filter);

  const counts: Record<TipeFilter, number> = {
    semua:          list.length,
    kas_masuk:      list.filter((t) => t.tipe === 'kas_masuk').length,
    talangan_masuk: list.filter((t) => t.tipe === 'talangan_masuk').length,
    kas_keluar:     list.filter((t) => t.tipe === 'kas_keluar').length,
    setor_kas_rt:   list.filter((t) => t.tipe === 'setor_kas_rt').length,
  };

  async function handleKasKeluar(data: { keterangan: string; nominal: number; tanggal: string }) {
    await supabase.from('transaksi_kas').insert({
      tipe: 'kas_keluar',
      nominal: data.nominal,
      keterangan: data.keterangan,
      tanggal: data.tanggal,
      warga_id: null,
      tarikan_id: null,
      saldo_setelah: saldo - data.nominal,
    });
    setShowModal(false);
    load();
  }

  return (
    <>
      <div className="space-y-4 pb-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Kas Hadiran</h1>
            <p className="text-xs text-gray-400 mt-0.5">{list.length} transaksi tercatat</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {isBendahara && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-red-500 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-red-600 active:scale-95 transition-all shadow-md shadow-red-200"
              >
                <Plus className="w-4 h-4" />
                Kas Keluar
              </button>
            )}
          </div>
        </div>

        {/* Saldo Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)' }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative p-5">
            <p className="text-emerald-200 text-xs font-semibold tracking-widest uppercase mb-1">
              Saldo Kas Hadiran
            </p>
            <p className={`text-4xl font-black tracking-tight mb-4 ${saldo < 0 ? 'text-red-300' : 'text-white'}`}>
              {saldo < 0 ? '-' : ''}Rp{Math.abs(saldo).toLocaleString('id-ID')}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/15 rounded-2xl p-3 border border-white/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                  <p className="text-emerald-100 text-[9px] font-semibold uppercase tracking-wide">Pemasukan</p>
                </div>
                <p className="text-sm font-bold text-white">+{formatRupiahPlain(kasMasuk + talanganMasuk)}</p>
                <p className="text-[10px] text-emerald-200 mt-0.5">
                  Tarikan {formatRupiahPlain(kasMasuk)} · Talangan {formatRupiahPlain(talanganMasuk)}
                </p>
              </div>
              <div className="bg-white/15 rounded-2xl p-3 border border-white/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-300" />
                  <p className="text-emerald-100 text-[9px] font-semibold uppercase tracking-wide">Pengeluaran</p>
                </div>
                <p className="text-sm font-bold text-red-300">-{formatRupiahPlain(kasKeluar + setorRT)}</p>
                <p className="text-[10px] text-emerald-200 mt-0.5">
                  Keluar {formatRupiahPlain(kasKeluar)} · Setor {formatRupiahPlain(setorRT)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filter === f.id
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Transaction List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Wallet className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm overflow-hidden">
            {filtered.map((t, idx) => {
              const meta = TIPE_META[t.tipe] ?? TIPE_META['kas_masuk'];
              const isLast = idx === filtered.length - 1;

              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-4 ${!isLast ? 'border-b border-gray-50' : ''}`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color}`}>
                    <TipeIcon tipe={t.tipe} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.keterangan || meta.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{formatTanggal(t.tanggal)}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <p className={`text-sm font-bold flex-shrink-0 ${meta.sign === 1 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {meta.sign === 1 ? '+' : '-'}{formatRupiahPlain(t.nominal)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <KasKeluarModal
          currentSaldo={saldo}
          onSave={handleKasKeluar}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
