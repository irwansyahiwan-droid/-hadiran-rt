import { useEffect, useState } from 'react';
import { AlertTriangle, Users, Zap, Calendar, FileText, Building2, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchDashboardSummary, formatRupiahPlain, formatTanggal } from '../lib/utils';
import { useAuthContext } from '../context/AuthContext';
import type { DashboardSummary, Tarikan } from '../lib/types';

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 border border-white dark:border-gray-700 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

interface TrxItem {
  id: string;
  tipe: 'setor' | 'talangan_lunas';
  keterangan: string;
  tanggal: string;
  nominal: number;
  saldoSetelah: number;
}

interface BerandaProps {
  onNavigate: (tab: string) => void;
}

export default function Beranda({ onNavigate }: BerandaProps) {
  const { isBendahara } = useAuthContext();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [jadwalList, setJadwalList] = useState<Tarikan[]>([]);
  const [trxItems, setTrxItems] = useState<TrxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    const [summaryData, jadwalRes, setorRes, talanganLunasRes] = await Promise.all([
      fetchDashboardSummary(),
      supabase
        .from('tarikan')
        .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
        .eq('status', 'dijadwalkan')
        .order('tanggal', { ascending: true })
        .limit(5),
      supabase
        .from('transaksi_kas')
        .select('id, keterangan, tanggal, nominal')
        .eq('tipe', 'setor_kas_rt'),
      supabase
        .from('talangan')
        .select('id, nominal, tanggal_lunas, warga:warga_id(nama), tarikan:tarikan_id(nomor)')
        .eq('status_lunas', true)
        .not('tanggal_lunas', 'is', null),
    ]);

    // Merge setor + talangan lunas → sort tanggal DESC → limit 20
    type SetorRow = { id: string; keterangan: string; tanggal: string; nominal: number };
    type TalanganLunasRow = { id: string; nominal: number; tanggal_lunas: string | null; warga: { nama: string } | null; tarikan: { nomor: number } | null };

    const setorItems = (setorRes.data as SetorRow[] ?? []).map(t => ({
      id: t.id,
      tipe: 'setor' as const,
      keterangan: t.keterangan,
      tanggal: t.tanggal,
      nominal: -t.nominal,
    }));

    const talanganItems = (talanganLunasRes.data as unknown as TalanganLunasRow[] ?? [])
      .filter(t => t.tanggal_lunas)
      .map(t => ({
        id: t.id,
        tipe: 'talangan_lunas' as const,
        keterangan: `Talangan lunas oleh ${t.warga?.nama ?? '-'} — Tarikan #${t.tarikan?.nomor ?? '-'}`,
        tanggal: t.tanggal_lunas as string,
        nominal: t.nominal as number,
      }));

    const sorted = [...setorItems, ...talanganItems]
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      .slice(0, 20);

    // Hitung running saldo mundur dari saldo_aktif saat ini
    let saldoCurrent = summaryData.saldo_aktif;
    const withSaldo: TrxItem[] = sorted.map(item => {
      const saldoSetelah = saldoCurrent;
      saldoCurrent = saldoCurrent - item.nominal;
      return { ...item, saldoSetelah };
    });

    setSummary(summaryData);
    setJadwalList((jadwalRes.data as Tarikan[]) ?? []);
    setTrxItems(withSaldo);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, []);

  const kasHadiran = summary?.total_kas_terkumpul ?? 0;
  const saldo = summary?.saldo_aktif ?? 0;
  const talangan = summary?.total_talangan_belum_lunas ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Main Kas Card — always green (kasHadiran always positive) */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-emerald-800 to-emerald-700">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-6 -right-4 w-20 h-20 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

        <div className="relative p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-emerald-200 text-xs font-semibold tracking-widest uppercase">
              Pendapatan Kas Hadiran
            </p>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-white text-4xl font-black tracking-tight">
              Rp{kasHadiran.toLocaleString('id-ID')}
            </span>
          </div>
          <p className="text-emerald-200 text-xs mb-5">
            Total iuran terkumpul · {summary?.jumlah_tarikan ?? 0} tarikan · {summary?.jumlah_anggota ?? 0} anggota
          </p>

          {/* Sub Cards Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onNavigate('kas')}
              className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20 text-left hover:bg-white/25 active:scale-95 transition-all"
            >
              <p className="text-emerald-100 text-[9px] font-semibold uppercase tracking-wide mb-1">Saldo Aktif</p>
              <p className={`text-sm font-bold ${saldo < 0 ? 'text-red-300' : 'text-white'}`}>
                {saldo < 0 ? '-' : '+'}Rp{Math.abs(saldo).toLocaleString('id-ID')}
              </p>
            </button>
            <button
              onClick={() => onNavigate('talangan')}
              className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20 text-left hover:bg-white/25 active:scale-95 transition-all"
            >
              <p className="text-emerald-100 text-[9px] font-semibold uppercase tracking-wide mb-1">Talangan</p>
              <p className="text-sm font-bold text-amber-300">
                -{formatRupiahPlain(talangan)}
              </p>
            </button>
            <button
              onClick={() => onNavigate('kas-rt')}
              className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20 text-left hover:bg-white/25 active:scale-95 transition-all"
            >
              <p className="text-emerald-100 text-[9px] font-semibold uppercase tracking-wide mb-1">Setor Kas RT</p>
              <p className="text-sm font-bold text-white">
                -{formatRupiahPlain(summary?.total_setor_kas_rt ?? 0)}
              </p>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onNavigate('cetak')}
              className="flex-1 flex items-center justify-center gap-2 bg-white/15 border border-white/25 rounded-xl py-2.5 text-white text-sm font-semibold hover:bg-white/25 active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              Cetak PDF
            </button>
            {isBendahara && (
              <button
                onClick={() => onNavigate('kas-rt')}
                className="flex-1 flex items-center justify-center gap-2 bg-white rounded-xl py-2.5 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 active:scale-95 transition-all shadow-md"
              >
                <Building2 className="w-4 h-4" />
                Setor ke Kas RT
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Anggota" value={summary?.jumlah_anggota ?? 0} icon={Users} color="bg-blue-500" />
        <StatCard label="Tarikan" value={summary?.jumlah_tarikan ?? 0} icon={Zap} color="bg-emerald-500" />
        <StatCard label="Terjadwal" value={summary?.jumlah_dijadwalkan ?? 0} icon={Calendar} color="bg-amber-500" />
      </div>

      {/* Alert Banner */}
      {talangan > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Talangan Belum Lunas</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Total {formatRupiahPlain(talangan)} belum diselesaikan
            </p>
          </div>
          <button
            onClick={() => onNavigate('talangan')}
            className="text-xs text-amber-700 font-semibold bg-amber-100 px-3 py-1.5 rounded-xl hover:bg-amber-200 transition-colors whitespace-nowrap"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Jadwal Berikutnya */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-1">Jadwal Berikutnya</h2>
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-3xl border border-white dark:border-gray-700 shadow-sm overflow-hidden">
          {jadwalList.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Tidak ada jadwal terjadwal</div>
          ) : (
            jadwalList.map((j, idx) => (
              <div key={j.id} className={`flex items-center gap-3 p-4 ${idx < jadwalList.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-200">
                  <span className="text-white text-sm font-black">{j.nomor}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{j.sohibul_bait?.nama ?? '-'}</p>
                  <p className="text-xs text-gray-400">{formatTanggal(j.tanggal)}</p>
                </div>
                <span className="px-3 py-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full border border-emerald-200">
                  Terjadwal
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaksi Terakhir */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-1">Transaksi Terakhir</h2>
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-3xl border border-white dark:border-gray-700 shadow-sm overflow-hidden">
          {trxItems.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Belum ada transaksi</div>
          ) : (
            trxItems.map((trx, idx) => (
              <div key={trx.id} className={`flex items-start gap-3 p-4 ${idx < trxItems.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 ${trx.tipe === 'setor' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                  {trx.tipe === 'setor'
                    ? <ArrowUpRight className="w-4 h-4 text-orange-500" />
                    : <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{trx.keterangan}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatTanggal(trx.tanggal)}</p>
                  <p className="text-xs text-gray-400">
                    Saldo: {trx.saldoSetelah < 0 ? '-' : ''}Rp{Math.abs(trx.saldoSetelah).toLocaleString('id-ID')}
                  </p>
                </div>
                <span className={`text-sm font-bold shrink-0 mt-0.5 ${trx.nominal < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {trx.nominal < 0 ? '-' : '+'}Rp{Math.abs(trx.nominal).toLocaleString('id-ID')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
