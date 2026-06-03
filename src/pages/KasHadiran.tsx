import { useEffect, useState } from 'react';
import { FileText, RefreshCw, ArrowUpRight, Users, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCountUp } from '../lib/hooks';
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
    try {
      await onSave({ nominal, keterangan, tanggal });
    } finally {
      setSaving(false);
    }
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
              className="flex-1 py-3 rounded-full bg-[#0F6039] text-white text-sm font-semibold disabled:opacity-70 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
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
  const animatedSaldo = useCountUp(saldo);

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

  const sudahSetor = totalSetor > 0;
  const heroGradient = sudahSetor
    ? 'from-[#1E40AF] via-[#2563EB] to-[#3B82F6]'
    : saldo < 0
      ? 'from-slate-800 via-slate-700 to-slate-500'
      : 'from-[#0F4C2E] via-[#145D39] to-[#1B7249]';

  return (
    <>
      <div className="space-y-4 pb-2">
        {/* Header Card */}
        <div className={`relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-br ${heroGradient}`}>

          <div className="relative p-5">
            <p className="text-white/75 text-[10px] font-bold uppercase tracking-widest mb-1">Saldo Kas Hadiran</p>
            <p className={`text-5xl font-black tracking-tighter mb-1 ${saldo < 0 ? 'text-rose-200' : 'text-white'}`}>
              {animatedSaldo < 0 ? '-' : ''}Rp{Math.abs(animatedSaldo).toLocaleString('id-ID')}
            </p>
            <p className="text-white/75 text-xs">{tarikanSelesai.length} tarikan terlaksana</p>
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
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 shadow-sm text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.97] transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Cetak PDF
          </button>
          {isBendahara && (
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 shadow-sm text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.97] transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              Setor Kas RT
            </button>
          )}
        </div>

        {/* Alur Kas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Alur Kas Hadiran</p>
            <span
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 rounded-full text-white text-[10px] font-bold"
              aria-label={`${tarikanSelesai.length} tarikan selesai`}
            >
              {tarikanSelesai.length}
              <span className="font-medium opacity-90">tarikan</span>
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Kas Hadiran Terkumpul</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">+{formatRupiahPlain(totalKasTerkumpul)}</span>
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
            <p className="text-base font-extrabold text-[#111111] mt-6 mb-3 px-1">Rekap Per Tarikan</p>
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
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                      style={talanganInfo.count === 0 ? { borderLeft: '3px solid #10B981' } : undefined}
                    >

                      {/* ── Timeline mini-header ─────────────────────── */}
                      <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            talanganInfo.count === 0
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}>
                            {t.nomor}
                          </div>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTanggal(t.tanggal)}</span>
                        </div>
                        {talanganInfo.count > 0 ? (
                          <span className="px-[8px] py-[2px] text-[10px] font-medium rounded-[6px]" style={{ background: 'rgba(255,59,48,0.10)', color: '#9F1239' }}>
                            {talanganInfo.count} belum bayar
                          </span>
                        ) : (
                          <span className="px-[8px] py-[2px] text-[10px] font-medium rounded-[6px]" style={{ background: 'rgba(52,199,89,0.12)', color: '#166534' }}>
                            ✓ Lunas semua
                          </span>
                        )}
                      </div>

                      {/* ── Focal row: penerima + amount ─────────────── */}
                      <div className="flex items-center gap-3 px-4 pb-4">
                        <AvatarPeci nama={t.sohibul_bait?.nama ?? '?'} className="w-12 h-12 rounded-2xl" />
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                            {t.sohibul_bait?.nama ?? '—'}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-full">
                            Dapat Arisan
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[17px] font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatRupiahPlain(iuranHadir)}
                          </p>
                          <p className="text-[12px] font-medium text-slate-400/90 dark:text-gray-500 mt-0.5">
                            {t.total_hadir}/{t.total_warga} hadir
                          </p>
                        </div>
                      </div>

                      {/* ── Progress bar + kas info ───────────────────── */}
                      <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-800 pt-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span>
                            Kas Hadiran{' '}
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatRupiahPlain(kasHadiran)}</span>
                          </span>
                          <span className="font-semibold">{pctHadir}% hadir</span>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
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
                        <div className="flex items-center gap-5 px-4 pb-3 pt-3 border-t border-gray-100">
                          <button className="flex items-center gap-1.5 text-xs text-[#555555] font-medium hover:text-blue-600 transition-colors">
                            <Users className="w-3.5 h-3.5" />
                            Absensi
                          </button>
                          <button
                            onClick={() => handlePendapatanPDF(t)}
                            disabled={pdfLoading === t.id}
                            className="flex items-center gap-1.5 text-xs text-[#555555] font-medium hover:text-emerald-600 transition-colors disabled:opacity-50"
                          >
                            <FileText className={`w-3.5 h-3.5 ${pdfLoading === t.id ? 'animate-pulse' : ''}`} />
                            {pdfLoading === t.id ? 'Memuat...' : 'PDF'}
                          </button>
                          <button className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors ml-auto">
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
