import { useEffect, useState } from 'react';
import { FileText, RefreshCw, ArrowUpRight, X, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal } from '../lib/utils';
import type { Tarikan, TransaksiKas } from '../lib/types';

// ── Setor Modal ────────────────────────────────────────────

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nominal) return;
    setSaving(true);
    await onSave({ nominal, keterangan, tanggal });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl p-5 pb-10 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <div>
          <h3 className="text-base font-bold text-gray-900">Setor ke Kas Besar RT</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Saldo hadiran: <span className="font-semibold text-emerald-600">{formatRupiahPlain(saldoHadiran)}</span>
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Keterangan</label>
            <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} required
              placeholder="Setoran bulan Mei 2026"
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nominal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                <input type="number" value={nominal || ''} onChange={e => setNominal(Number(e.target.value))} required min={1}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tanggal</label>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Batal</button>
            <button type="submit" disabled={saving || !nominal}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 active:scale-[0.98] transition-all">
              {saving ? 'Menyimpan...' : 'Setor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function KasHadiranPage() {
  const { isBendahara } = useAuthContext();
  const [transaksi, setTransaksi] = useState<TransaksiKas[]>([]);
  const [tarikanSelesai, setTarikanSelesai] = useState<Tarikan[]>([]);
  const [totalTalanganBelum, setTotalTalanganBelum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    const [txRes, tarRes, talRes] = await Promise.all([
      supabase.from('transaksi_kas').select('*').order('tanggal', { ascending: true }),
      supabase
        .from('tarikan')
        .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
        .eq('status', 'selesai')
        .order('nomor', { ascending: false }),
      supabase.from('talangan').select('nominal, status_lunas').eq('status_lunas', false),
    ]);
    setTransaksi((txRes.data as TransaksiKas[]) ?? []);
    setTarikanSelesai((tarRes.data as Tarikan[]) ?? []);
    const total = (talRes.data ?? []).reduce((s: number, t: { nominal: number }) => s + t.nominal, 0);
    setTotalTalanganBelum(total);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalSetor = transaksi.filter(t => t.tipe === 'setor_kas_rt').reduce((s, t) => s + t.nominal, 0);
  const totalKasTerkumpul = tarikanSelesai.reduce((s, t) => s + (t.total_terkumpul ?? 0), 0);
  const saldo = totalKasTerkumpul - totalTalanganBelum - totalSetor;

  async function handleSetor(data: { nominal: number; keterangan: string; tanggal: string }) {
    const saldoBaru = saldo - data.nominal;
    await Promise.all([
      supabase.from('transaksi_kas').insert({
        tipe: 'setor_kas_rt',
        nominal: data.nominal,
        keterangan: data.keterangan,
        tanggal: data.tanggal,
        saldo_setelah: saldoBaru,
      }),
      supabase.from('kas_rt').insert({
        tipe: 'masuk',
        nominal: data.nominal,
        keterangan: data.keterangan,
        tanggal: data.tanggal,
        saldo_setelah: 0,
      }),
    ]);
    setShowModal(false);
    load();
  }

  return (
    <>
      <div className="space-y-4 pb-2">
        {/* Header Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)' }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative p-5">
            <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest mb-1">Saldo Kas Hadiran</p>
            <p className={`text-4xl font-black tracking-tight mb-1 ${saldo < 0 ? 'text-red-300' : 'text-white'}`}>
              {saldo < 0 ? '-' : ''}Rp{Math.abs(saldo).toLocaleString('id-ID')}
            </p>
            <p className="text-emerald-200 text-xs mb-4">{tarikanSelesai.length} tarikan terlaksana</p>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 bg-white/15 border border-white/25 rounded-xl py-2.5 text-white text-xs font-semibold hover:bg-white/25 transition-all">
                <FileText className="w-3.5 h-3.5" />
                Cetak PDF
              </button>
              {isBendahara && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white rounded-xl py-2.5 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 transition-all shadow-md"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Setor ke Kas Besar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alur Kas */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Alur Kas Hadiran</p>
            <span className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {tarikanSelesai.length}
            </span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <span className="text-sm text-gray-700">Kas Hadiran Terkumpul</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600">+{formatRupiahPlain(totalKasTerkumpul)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-base">🔴</span>
                <span className="text-sm text-gray-700">Talangan Belum Lunas</span>
              </div>
              <span className="text-sm font-semibold text-red-500">-{formatRupiahPlain(totalTalanganBelum)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-base">🔵</span>
                <span className="text-sm text-gray-700">Setoran ke Kas Besar</span>
              </div>
              <span className="text-sm font-semibold text-red-500">-{formatRupiahPlain(totalSetor)}</span>
            </div>
            <div className={`flex items-center justify-between rounded-2xl p-3 mt-1 ${saldo < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className="text-sm font-bold text-gray-900">Total Bersih Kas Hadiran</p>
              <span className={`text-base font-bold ${saldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {saldo < 0 ? '-' : ''}Rp{Math.abs(saldo).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Rekap Per Tarikan */}
        {tarikanSelesai.length > 0 && (
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3 px-1">🧾 Rekap Per Tarikan</p>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : (
                tarikanSelesai.map(t => {
                  const iuranHadir  = t.total_hadir * 50000;
                  return (
                    <div key={t.id} className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-50">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            Tarikan ke-{t.nomor}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatTanggal(t.tanggal)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-gray-900">{formatRupiahPlain(iuranHadir)}</p>
                          <p className="text-xs text-gray-400">{t.total_hadir}/{t.total_warga} hadir</p>
                        </div>
                      </div>

                      {/* Sohibul Bait */}
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-700">
                          {t.sohibul_bait?.nama?.charAt(0) ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{t.sohibul_bait?.nama ?? '—'}</p>
                            <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 rounded-full border border-emerald-200 shrink-0">
                              SOHIBUL BAIT
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Terima: <span className="font-semibold text-emerald-600">{formatRupiahPlain(iuranHadir)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <SetorModal
          saldoHadiran={saldo}
          onSave={handleSetor}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
