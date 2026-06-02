import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Building2, Landmark, ArrowUpRight, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal } from '../lib/utils';
import type { TransaksiKas } from '../lib/types';

// ── Setor Modal ────────────────────────────────────────────────────────────────

interface SetorModalProps {
  saldoHadiran: number;
  onSave: (data: { nominal: number; keterangan: string; tanggal: string }) => Promise<void>;
  onClose: () => void;
}

function SetorModal({ saldoHadiran, onSave, onClose }: SetorModalProps) {
  const [nominal, setNominal] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const sisaSaldo = saldoHadiran - nominal;
  const isOverSaldo = nominal > saldoHadiran;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isOverSaldo) return;
    setSaving(true);
    await onSave({ nominal, keterangan, tanggal });
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
          <h3 className="text-base font-bold text-gray-900">Setor ke Kas RT</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Saldo Kas Hadiran:{' '}
            <span className="font-semibold text-emerald-600">{formatRupiahPlain(saldoHadiran)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nominal Setoran</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">Rp</span>
              <input
                type="number"
                value={nominal || ''}
                onChange={(e) => setNominal(Number(e.target.value))}
                placeholder="0"
                required
                min={1}
                className={`w-full pl-9 pr-3 py-3 rounded-xl bg-gray-50 border text-sm text-gray-900 focus:outline-none focus:ring-2 transition ${
                  isOverSaldo
                    ? 'border-red-300 focus:ring-red-300'
                    : 'border-gray-200 focus:ring-emerald-400'
                }`}
              />
            </div>
            {isOverSaldo && (
              <p className="text-xs text-red-500 mt-1">Nominal melebihi saldo Kas Hadiran</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Keterangan</label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Setoran bulanan Juni 2026"
              required
              className="w-full px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
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

          {nominal > 0 && !isOverSaldo && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2.5">
                <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Disetor ke RT</p>
                <p className="text-sm font-bold text-amber-700 mt-0.5">+{formatRupiahPlain(nominal)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Sisa Hadiran</p>
                <p className={`text-sm font-bold mt-0.5 ${sisaSaldo < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatRupiahPlain(sisaSaldo)}
                </p>
              </div>
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
              disabled={saving || isOverSaldo || nominal === 0}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Setor Sekarang'}
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
  const [setoran, setSetoran] = useState<TransaksiKas[]>([]);
  const [saldoHadiran, setSaldoHadiran] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    const [setoranRes, allTxRes] = await Promise.all([
      supabase
        .from('transaksi_kas')
        .select('*, warga(*), tarikan(*)')
        .eq('tipe', 'setor_kas_rt')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('transaksi_kas').select('tipe, nominal'),
    ]);

    setSetoran((setoranRes.data as TransaksiKas[]) ?? []);

    const tx = allTxRes.data ?? [];
    const saldo =
      tx.filter((t) => t.tipe === 'kas_masuk').reduce((s: number, t: { nominal: number }) => s + t.nominal, 0) +
      tx.filter((t) => t.tipe === 'talangan_masuk').reduce((s: number, t: { nominal: number }) => s + t.nominal, 0) -
      tx.filter((t) => t.tipe === 'setor_kas_rt').reduce((s: number, t: { nominal: number }) => s + t.nominal, 0) -
      tx.filter((t) => t.tipe === 'kas_keluar').reduce((s: number, t: { nominal: number }) => s + t.nominal, 0);
    setSaldoHadiran(saldo);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalSetor = setoran.reduce((s, t) => s + t.nominal, 0);

  async function handleSetor(data: { nominal: number; keterangan: string; tanggal: string }) {
    await supabase.from('transaksi_kas').insert({
      tipe: 'setor_kas_rt',
      nominal: data.nominal,
      keterangan: data.keterangan,
      tanggal: data.tanggal,
      warga_id: null,
      tarikan_id: null,
      saldo_setelah: saldoHadiran - data.nominal,
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
            <h1 className="text-lg font-bold text-gray-900">Kas RT</h1>
            <p className="text-xs text-gray-400 mt-0.5">{setoran.length} kali setoran</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {isBendahara && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-amber-500 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-amber-600 active:scale-95 transition-all shadow-md shadow-amber-200"
              >
                <Plus className="w-4 h-4" />
                Setor
              </button>
            )}
          </div>
        </div>

        {/* Saldo Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #78350f 0%, #d97706 55%, #fbbf24 100%)' }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute top-8 -right-4 w-20 h-20 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-amber-200" />
              <p className="text-amber-100 text-xs font-semibold tracking-widest uppercase">
                Total Setoran ke Kas RT
              </p>
            </div>
            <p className="text-4xl font-black tracking-tight text-white mb-1">
              Rp{totalSetor.toLocaleString('id-ID')}
            </p>
            <p className="text-amber-200 text-xs mb-5">dari {setoran.length} kali setoran</p>

            {/* Saldo Hadiran info */}
            <div className="bg-white/15 rounded-2xl p-3 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-amber-200" />
                  <p className="text-amber-100 text-xs font-semibold">Saldo Kas Hadiran tersisa</p>
                </div>
                <p className={`text-sm font-bold ${saldoHadiran < 0 ? 'text-red-300' : 'text-white'}`}>
                  {saldoHadiran < 0 ? '-' : ''}Rp{Math.abs(saldoHadiran).toLocaleString('id-ID')}
                </p>
              </div>
              {isBendahara && saldoHadiran > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-all rounded-xl py-2 text-white text-xs font-semibold border border-white/25"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Setor ke Kas RT
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Riwayat Setoran */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Riwayat Setoran</h2>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
            </div>
          ) : setoran.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Building2 className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400">Belum ada setoran ke Kas RT</p>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm overflow-hidden">
              {setoran.map((t, idx) => {
                const isLast = idx === setoran.length - 1;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-4 ${!isLast ? 'border-b border-gray-50' : ''}`}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-amber-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {t.keterangan || 'Setoran Kas RT'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatTanggal(t.tanggal)}</p>
                    </div>

                    {/* Amount */}
                    <p className="text-sm font-bold text-amber-600 flex-shrink-0">
                      +{formatRupiahPlain(t.nominal)}
                    </p>
                  </div>
                );
              })}

              {/* Total footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-sm font-semibold text-amber-800">Total Disetor</p>
                <p className="text-sm font-bold text-amber-700">{formatRupiahPlain(totalSetor)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <SetorModal
          saldoHadiran={saldoHadiran}
          onSave={handleSetor}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
