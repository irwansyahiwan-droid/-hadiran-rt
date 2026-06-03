import { useEffect, useState } from 'react';
import { FileText, RefreshCw, ArrowUpRight, Users, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import AvatarPeci from '../components/AvatarPeci';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { formatRupiahPlain, formatTanggal } from '../lib/utils';
import { generateKasHadiranPDF } from '../lib/generateKasHadiranPDF';
import { generatePendapatanPDF } from '../lib/generatePendapatanPDF';
import type { Tarikan, TransaksiKas, Warga } from '../lib/types';

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
      <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-2" />
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Setor ke Kas Besar RT</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Saldo hadiran: <span className="font-semibold text-emerald-600">{formatRupiahPlain(saldoHadiran)}</span>
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Keterangan</label>
            <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} required
              placeholder="Setoran bulan Mei 2026"
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nominal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                <input type="number" value={nominal || ''} onChange={e => setNominal(Number(e.target.value))} required min={1}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tanggal</label>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">Batal</button>
            <button type="submit" disabled={saving || !nominal}
              className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#0D6B5E] to-[#1A9B86] text-white text-sm font-semibold disabled:opacity-60 active:scale-[0.98] transition-all">
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
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [totalTalanganBelum, setTotalTalanganBelum] = useState(0);
  const [talanganMap, setTalanganMap] = useState<Record<string, { count: number; total: number }>>({});
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    const [txRes, tarRes, talRes, wargaRes] = await Promise.all([
      supabase.from('transaksi_kas').select('*').order('tanggal', { ascending: true }),
      supabase
        .from('tarikan')
        .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
        .eq('status', 'selesai')
        .order('nomor', { ascending: true }),
      supabase.from('talangan').select('tarikan_id, nominal').eq('status_lunas', false),
      supabase.from('warga').select('*').eq('status_aktif', true).order('nama', { ascending: true }),
    ]);
    setTransaksi((txRes.data as TransaksiKas[]) ?? []);
    setTarikanSelesai((tarRes.data as Tarikan[]) ?? []);
    setWargaList((wargaRes.data as Warga[]) ?? []);

    const talData = (talRes.data ?? []) as { tarikan_id: string; nominal: number }[];
    const total = talData.reduce((s, t) => s + t.nominal, 0);
    setTotalTalanganBelum(total);

    const map = talData.reduce<Record<string, { count: number; total: number }>>((acc, t) => {
      if (!acc[t.tarikan_id]) acc[t.tarikan_id] = { count: 0, total: 0 };
      acc[t.tarikan_id].count += 1;
      acc[t.tarikan_id].total += t.nominal;
      return acc;
    }, {});
    setTalanganMap(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalSetor = transaksi.filter(t => t.tipe === 'setor_kas_rt').reduce((s, t) => s + t.nominal, 0);
  const totalKasTerkumpul = tarikanSelesai.reduce((s, t) => s + (t.total_terkumpul ?? 0), 0);
  const saldo = totalKasTerkumpul - totalTalanganBelum - totalSetor;

  // Setor per tarikan — untuk kolom SETOR di PDF
  const setorMap = transaksi
    .filter(t => t.tipe === 'setor_kas_rt' && t.tarikan_id)
    .reduce<Record<string, number>>((acc, t) => {
      if (t.tarikan_id) acc[t.tarikan_id] = (acc[t.tarikan_id] ?? 0) + t.nominal;
      return acc;
    }, {});

  async function handlePendapatanPDF(tarikan: Tarikan) {
    setPdfLoading(tarikan.id);
    const [absensiRes, talanganRes] = await Promise.all([
      supabase.from('absensi').select('warga_id, status').eq('tarikan_id', tarikan.id),
      supabase.from('talangan').select('warga_id').eq('tarikan_id', tarikan.id).eq('status_lunas', true),
    ]);
    const absensiMap: Record<string, 'hadir' | 'tidak_hadir'> = {};
    (absensiRes.data as { warga_id: string; status: 'hadir' | 'tidak_hadir' }[] ?? [])
      .forEach(a => { absensiMap[a.warga_id] = a.status; });
    const lunasSet = new Set(
      (talanganRes.data as { warga_id: string }[] ?? []).map(t => t.warga_id),
    );
    generatePendapatanPDF(tarikan, wargaList, absensiMap, lunasSet);
    setPdfLoading(null);
  }

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

  const heroGradient = saldo < 0 ? 'from-slate-700 to-slate-600' : 'from-[#0A5C4A] via-[#0D6B5E] to-[#1DB88A]';

  return (
    <>
      <div className="space-y-4 pb-2">
        {/* Header Card */}
        <div className={`relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-b ${heroGradient}`}>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative p-5">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Saldo Kas Hadiran</p>
            <p className="text-5xl font-black tracking-tighter mb-1 text-white">
              {saldo < 0 ? '-' : ''}Rp{Math.abs(saldo).toLocaleString('id-ID')}
            </p>
            <p className="text-white/60 text-xs">{tarikanSelesai.length} tarikan terlaksana</p>
            {saldo <= 0 && totalSetor > 0 && (
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-green-400/20 border border-green-300/30 rounded-full text-green-200 text-xs font-semibold">
                ✓ Sudah disetor ke Kas RT
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — outside hero */}
        <div className="flex gap-2">
          <button
            onClick={() => generateKasHadiranPDF(tarikanSelesai, talanganMap, setorMap, { totalKasTerkumpul, totalTalanganBelum, totalSetor, saldoAktif: saldo })}
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.97] transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Cetak PDF
          </button>
          {isBendahara && (
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.97] transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              Setor Kas RT
            </button>
          )}
        </div>

        {/* Alur Kas */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Alur Kas Hadiran</p>
            <span className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {tarikanSelesai.length}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Kas Hadiran Terkumpul</span>
              </div>
              <span className="text-sm font-bold text-green-600">+{formatRupiahPlain(totalKasTerkumpul)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Talangan Belum Lunas</span>
              </div>
              <span className="text-sm font-semibold text-amber-600">-{formatRupiahPlain(totalTalanganBelum)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Setoran ke Kas Besar</span>
              </div>
              <span className="text-sm font-semibold text-blue-600">-{formatRupiahPlain(totalSetor)}</span>
            </div>
            <div className={`flex items-center justify-between rounded-2xl p-3 mt-1 ${saldo < 0 ? 'bg-slate-100 dark:bg-slate-800' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Total Bersih</p>
              <span className={`text-base font-black ${saldo < 0 ? 'text-slate-700 dark:text-slate-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {saldo < 0 ? '-' : ''}Rp{Math.abs(saldo).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Rekap Per Tarikan */}
        {tarikanSelesai.length > 0 && (
          <div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-6 mb-3 px-1">Rekap Per Tarikan</p>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : (
                tarikanSelesai.map(t => {
                  const iuranHadir = t.total_hadir * 50000;
                  const kasHadiran = t.total_terkumpul ?? 0;
                  const talanganInfo = talanganMap[t.id] ?? { count: 0, total: 0 };
                  const pctHadir = Math.round((t.total_hadir / t.total_warga) * 100);

                  return (
                    <div key={t.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

                      {/* ── Timeline mini-header ─────────────────────── */}
                      <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            Tarikan ke-{t.nomor}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTanggal(t.tanggal)}</span>
                        </div>
                        {talanganInfo.count > 0 ? (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-2.5 py-0.5 rounded-full">
                            {talanganInfo.count} belum bayar
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                            ✓ Lunas semua
                          </span>
                        )}
                      </div>

                      {/* ── Focal row: penerima + amount ─────────────── */}
                      <div className="flex items-center gap-3 px-4 pb-4">
                        <AvatarPeci nama={t.sohibul_bait?.nama ?? '?'} className="w-12 h-12 rounded-2xl" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 leading-tight">
                            {t.sohibul_bait?.nama ?? '—'}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-full">
                            Dapat Arisan
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[17px] font-semibold text-green-600 dark:text-green-400">
                            +{formatRupiahPlain(iuranHadir)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {t.total_hadir}/{t.total_warga} hadir
                          </p>
                        </div>
                      </div>

                      {/* ── Progress bar + kas info ───────────────────── */}
                      <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-800 pt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <span>
                            Kas Hadiran{' '}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatRupiahPlain(kasHadiran)}</span>
                          </span>
                          <span className="font-medium">{pctHadir}% hadir</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pctHadir}%` }}
                          />
                        </div>
                        {talanganInfo.count > 0 && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                            ⚠ {talanganInfo.count} warga belum bayar · {formatRupiahPlain(talanganInfo.total)}
                          </p>
                        )}
                      </div>

                      {/* ── Admin actions (bendahara only) ────────────── */}
                      {isBendahara && (
                        <div className="flex items-center gap-2 px-4 pb-4">
                          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                            <Users className="w-3.5 h-3.5" />
                            Absensi
                          </button>
                          <button
                            onClick={() => handlePendapatanPDF(t)}
                            disabled={pdfLoading === t.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                          >
                            <FileText className={`w-3.5 h-3.5 ${pdfLoading === t.id ? 'animate-pulse' : ''}`} />
                            {pdfLoading === t.id ? 'Memuat...' : 'Pendapatan'}
                          </button>
                          <button className="flex items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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
