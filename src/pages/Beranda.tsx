import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchDashboardSummary, formatRupiahPlain, formatTanggal } from '../lib/utils';
import { useAuthContext } from '../context/AuthContext';
import AvatarPeci from '../components/AvatarPeci';
import type { DashboardSummary, Tarikan } from '../lib/types';


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
  useAuthContext();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [jadwalList, setJadwalList] = useState<Tarikan[]>([]);
  const [trxItems, setTrxItems] = useState<TrxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<TrxItem | null>(null);

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
    <>
    <div className="space-y-4 pb-2">
      {/* Main Kas Card — always green (kasHadiran always positive) */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-b from-[#0A5C4A] via-[#0D6B5E] to-[#1DB88A]">
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
            <span className="text-white text-5xl font-black tracking-tighter">
              Rp{kasHadiran.toLocaleString('id-ID')}
            </span>
          </div>
          <p className="text-emerald-200 text-xs mb-5">
            Total iuran terkumpul · {summary?.jumlah_tarikan ?? 0} tarikan · {summary?.jumlah_anggota ?? 0} anggota
          </p>

          {/* Stat row — no icons, divider only */}
          <div className="border-t border-white/20 mb-3" />
          <div className="grid grid-cols-3">
            <button
              onClick={() => onNavigate('kas')}
              className="flex flex-col py-3 pr-3 border-r border-white/20 active:opacity-70 transition-opacity"
            >
              <p className="text-[10px] uppercase tracking-widest text-white/60 font-medium">Saldo Aktif</p>
              <p className="text-sm font-bold text-white mt-1">Rp{Math.abs(saldo).toLocaleString('id-ID')}</p>
            </button>
            <button
              onClick={() => onNavigate('talangan')}
              className="flex flex-col py-3 px-3 border-r border-white/20 active:opacity-70 transition-opacity"
            >
              <p className="text-[10px] uppercase tracking-widest text-white/60 font-medium">Talangan</p>
              <p className="text-sm font-bold text-white mt-1">{formatRupiahPlain(talangan)}</p>
            </button>
            <button
              onClick={() => onNavigate('kas-rt')}
              className="flex flex-col py-3 pl-3 active:opacity-70 transition-opacity"
            >
              <p className="text-[10px] uppercase tracking-widest text-white/60 font-medium">Setor Kas RT</p>
              <p className="text-sm font-bold text-white mt-1">{formatRupiahPlain(summary?.total_setor_kas_rt ?? 0)}</p>
            </button>
          </div>

        </div>
      </div>

      {/* Stats Row */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 py-4">
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary?.jumlah_anggota ?? 0}</span>
            <span className="text-xs text-gray-400">Anggota</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary?.jumlah_tarikan ?? 0}</span>
            <span className="text-xs text-gray-400">Tarikan</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary?.jumlah_dijadwalkan ?? 0}</span>
            <span className="text-xs text-gray-400">Terjadwal</span>
          </div>
        </div>
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
        <div className="flex items-center justify-between mt-6 mb-3 px-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Jadwal Berikutnya</h2>
          <button onClick={() => onNavigate('jadwal')} className="text-sm text-[#0D6B5E] dark:text-[#1A9B86] font-medium">Lihat semua →</button>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {jadwalList.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Tidak ada jadwal terjadwal</div>
          ) : (
            jadwalList.map((j, idx) => (
              <div key={j.id} className={`flex items-center gap-3 p-4 ${idx < jadwalList.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                {/* Avatar + badge nomor */}
                <div className="relative shrink-0">
                  <AvatarPeci nama={j.sohibul_bait?.nama ?? '?'} className="w-12 h-12 rounded-2xl" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                    {j.nomor}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 leading-tight">{j.sohibul_bait?.nama ?? '-'}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatTanggal(j.tanggal)}</p>
                </div>
                <span className="px-3 py-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 rounded-full border border-blue-300 dark:border-blue-600 shrink-0">
                  Terjadwal
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaksi Terakhir */}
      <div>
        <div className="flex items-center justify-between mt-6 mb-3 px-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transaksi Terakhir</h2>
          <button onClick={() => onNavigate('kas')} className="text-sm text-[#0D6B5E] dark:text-[#1A9B86] font-medium">Lihat semua →</button>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {trxItems.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Belum ada transaksi</div>
          ) : (
            trxItems.map((trx, idx) => (
              <button
                key={trx.id}
                onClick={() => setSelectedTrx(trx)}
                className={`w-full flex items-start gap-3 p-4 text-left cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 active:scale-[0.98] transition-all ${idx < trxItems.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${trx.tipe === 'setor' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                  {trx.tipe === 'setor'
                    ? <ArrowUpRight className="w-4 h-4 text-orange-500" />
                    : <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{trx.keterangan}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatTanggal(trx.tanggal)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Saldo: {trx.saldoSetelah < 0 ? '-' : ''}Rp{Math.abs(trx.saldoSetelah).toLocaleString('id-ID')}
                  </p>
                </div>
                <span className={`text-[17px] font-semibold shrink-0 mt-0.5 ${trx.nominal < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {trx.nominal < 0 ? '-' : '+'}Rp{Math.abs(trx.nominal).toLocaleString('id-ID')}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>

    {/* Transaksi detail bottom sheet */}
    {selectedTrx !== null && (
      <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedTrx(null)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${selectedTrx.tipe === 'setor' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
            {selectedTrx.tipe === 'setor'
              ? <ArrowUpRight className="w-5 h-5 text-orange-500" />
              : <ArrowDownLeft className="w-5 h-5 text-emerald-500" />}
          </div>
          <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 mb-1">{selectedTrx.keterangan}</p>
          <p className="text-xs text-gray-400 mb-4">{formatTanggal(selectedTrx.tanggal)}</p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Jumlah</span>
              <span className={`text-[17px] font-semibold ${selectedTrx.nominal < 0 ? 'text-red-500' : 'text-green-600'}`}>
                {selectedTrx.nominal < 0 ? '-' : '+'}Rp{Math.abs(selectedTrx.nominal).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Saldo Setelah</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedTrx.saldoSetelah < 0 ? '-' : ''}Rp{Math.abs(selectedTrx.saldoSetelah).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tipe</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedTrx.tipe === 'setor' ? 'Setor ke Kas RT' : 'Talangan Lunas'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
