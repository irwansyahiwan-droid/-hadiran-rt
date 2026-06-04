import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownLeft, Wallet, ArrowLeftRight, CalendarDays, Receipt, ArrowDownUp, Search, X } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import CrossFade from '../components/CrossFade';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useCountUp } from '../lib/hooks';
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
  const { isBendahara, isWargaMode } = useAuthContext();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [jadwalList, setJadwalList] = useState<Tarikan[]>([]);
  const [trxItems, setTrxItems] = useState<TrxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<TrxItem | null>(null);
  const trxDrag = useDragDismiss(() => setSelectedTrx(null));
  const [trxFilter, setTrxFilter] = useState<'semua' | 'setor' | 'talangan_lunas'>('semua');
  const [trxSort, setTrxSort] = useState<'terbaru' | 'terlama' | 'nominal'>('terbaru');
  const [trxSearch, setTrxSearch] = useState('');

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

    // Semua transaksi (tanpa batas) — terbaru di atas
    const sorted = [...setorItems, ...talanganItems]
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

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
  const setorKasRT = summary?.total_setor_kas_rt ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const roleLabel = isWargaMode ? 'Warga' : isBendahara ? 'Bendahara' : 'Pengguna';
  const kasStatus =
    saldo < 0
      ? { label: 'Perlu Perhatian', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' }
      : talangan > 0
        ? { label: 'Ada Tunggakan', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' }
        : { label: 'Kas Sehat', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
  const animatedKasHadiran = useCountUp(kasHadiran);
  const animatedSaldo = useCountUp(saldo);
  const animatedTalangan = useCountUp(talangan);
  const animatedSetor = useCountUp(setorKasRT);

  // Transaksi terakhir difilter (tipe) & diurutkan. trxItems sudah urut terbaru→lama.
  const displayTrx = useMemo(() => {
    const q = trxSearch.trim().toLowerCase();
    let arr = [...trxItems];
    if (trxSort === 'terlama') arr.reverse();
    else if (trxSort === 'nominal') arr.sort((a, b) => Math.abs(b.nominal) - Math.abs(a.nominal));
    if (trxFilter !== 'semua') arr = arr.filter((t) => t.tipe === trxFilter);
    if (q) arr = arr.filter((t) => t.keterangan.toLowerCase().includes(q));
    return arr;
  }, [trxItems, trxFilter, trxSort, trxSearch]);

  const trxSortLabel = trxSort === 'terbaru' ? 'Terbaru' : trxSort === 'terlama' ? 'Terlama' : 'Nominal';
  const cycleTrxSort = () =>
    setTrxSort((s) => (s === 'terbaru' ? 'terlama' : s === 'terlama' ? 'nominal' : 'terbaru'));

  const skeleton = (
      <div className="space-y-6 pb-2">
        <div className="rounded-3xl h-48 skeleton" />
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800/60 lift px-5 py-4">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 px-3">
                <div className="h-7 w-12 skeleton rounded-lg" />
                <div className="h-3 w-10 skeleton rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-[14px] ${i < 3 ? 'border-b border-[#F0F0F0] dark:border-gray-800' : ''}`}>
              <div className="w-12 h-12 rounded-2xl skeleton shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 skeleton rounded-lg w-3/5" />
                <div className="h-3 skeleton rounded-lg w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <>
    <CrossFade loading={loading} skeleton={skeleton}>
    <div className="space-y-6 pb-2">
      {/* Sapaan + badge status kas */}
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-[13px] text-gray-400 dark:text-gray-500">{greeting},</p>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">{roleLabel}</h1>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${kasStatus.bg} ${kasStatus.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${kasStatus.dot}`} />
          {kasStatus.label}
        </span>
      </div>

      {/* Main Kas Card — clean & premium hero */}
      <div className="hero-card hero-noise" style={{ padding: '18px 20px 16px' }}>
        {/* Label row */}
        <div className="relative flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_2px_rgba(110,231,183,0.55)]" />
            <p
              className="text-[12px] font-semibold uppercase text-white/[0.85]"
              style={{ letterSpacing: '0.16em' }}
            >
              Pendapatan Kas Hadiran
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-1.5 -mr-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Muat ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/65 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Big amount — ukuran konsisten dengan hero Kas RT */}
        <div className="relative mb-1">
          <span className="block text-white text-5xl font-black tracking-tighter leading-none tabular-nums">
            Rp{animatedKasHadiran.toLocaleString('id-ID')}
          </span>
        </div>

        {/* Sub-text */}
        <p className="relative text-[13px] text-white/[0.78] mb-3.5">
          Total iuran terkumpul · {summary?.jumlah_tarikan ?? 0} tarikan · {summary?.jumlah_anggota ?? 0} anggota
        </p>

        {/* Divider */}
        <div className="relative hero-divider-x mb-1" />

        {/* 3-column stat row */}
        <div className="relative grid grid-cols-3">
          <button
            onClick={() => onNavigate('kas')}
            className="hero-col press flex flex-col items-center w-full min-w-0 px-2 py-2.5 active:opacity-80"
          >
            <Wallet className="w-[18px] h-[18px] text-white/70" strokeWidth={1.7} />
            <span className="text-[11px] text-white/75 mt-1.5">Saldo Aktif</span>
            <span className={`text-[15px] font-bold mt-0.5 whitespace-nowrap tabular-nums ${saldo < 0 ? 'text-rose-200' : 'text-white'}`}>
              {animatedSaldo < 0 ? '-' : ''}Rp{Math.abs(animatedSaldo).toLocaleString('id-ID')}
            </span>
          </button>
          <button
            onClick={() => onNavigate('talangan')}
            className="hero-col press flex flex-col items-center w-full min-w-0 px-2 py-2.5 active:opacity-80"
          >
            <ArrowLeftRight className="w-[18px] h-[18px] text-white/70" strokeWidth={1.7} />
            <span className="text-[11px] text-white/75 mt-1.5">Talangan</span>
            <span className="text-[15px] font-bold text-white mt-0.5 whitespace-nowrap tabular-nums">Rp{Math.abs(animatedTalangan).toLocaleString('id-ID')}</span>
          </button>
          <button
            onClick={() => onNavigate('kas-rt')}
            className="hero-col press flex flex-col items-center w-full min-w-0 px-2 py-2.5 active:opacity-80"
          >
            <ArrowUpRight className="w-[18px] h-[18px] text-white/70" strokeWidth={1.7} />
            <span className="text-[11px] text-white/75 mt-1.5">Setor Kas RT</span>
            <span className="text-[15px] font-bold text-white mt-0.5 whitespace-nowrap tabular-nums">Rp{Math.abs(animatedSetor).toLocaleString('id-ID')}</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800/60 lift px-5 py-4">
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="text-2xl font-extrabold text-[#111111] dark:text-gray-100">{summary?.jumlah_anggota ?? 0}</span>
            <span className="text-xs text-[#555555] dark:text-gray-400 font-medium">Anggota</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="text-2xl font-extrabold text-[#111111] dark:text-gray-100">{summary?.jumlah_tarikan ?? 0}</span>
            <span className="text-xs text-[#555555] dark:text-gray-400 font-medium">Tarikan</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="text-2xl font-extrabold text-[#111111] dark:text-gray-100">{summary?.jumlah_dijadwalkan ?? 0}</span>
            <span className="text-xs text-[#555555] dark:text-gray-400 font-medium">Terjadwal</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {talangan > 0 && (
        <div className="flex items-start gap-3 bg-amber-50/90 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-3xl p-4 shadow-[0_4px_12px_rgba(245,158,11,0.08)]">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Talangan Belum Lunas</p>
            <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
              Total {formatRupiahPlain(talangan)} belum diselesaikan
            </p>
          </div>
          <button
            onClick={() => onNavigate('talangan')}
            className="text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Jadwal Berikutnya */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-extrabold text-[#111111] dark:text-gray-100">Jadwal Berikutnya</h2>
          <button onClick={() => onNavigate('jadwal')} className="text-sm text-[#0D6B5E] dark:text-[#1A9B86] font-medium">Lihat semua →</button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden">
          {jadwalList.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Belum ada jadwal" subtitle="Jadwal tarikan berikutnya akan tampil di sini." />
          ) : (
            jadwalList.map((j, idx) => (
              <div key={j.id} style={{ animationDelay: `${idx * 0.05}s` }} className={`rise flex items-center gap-3 px-4 py-[14px] ${idx < jadwalList.length - 1 ? 'border-b border-[#F0F0F0] dark:border-gray-800' : ''}`}>
                {/* Avatar + badge nomor */}
                <div className="relative shrink-0">
                  <AvatarPeci nama={j.sohibul_bait?.nama ?? '?'} className="w-12 h-12 rounded-2xl" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                    {j.nomor}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold text-[#111111] dark:text-gray-100 leading-tight truncate flex-1">{j.sohibul_bait?.nama ?? '-'}</p>
                    <span className="shrink-0 text-[0.72rem] font-medium px-[7px] py-[1px] rounded-[5px]" style={{ background: 'rgba(142,142,147,0.12)', color: '#4B5563' }}>Terjadwal</span>
                  </div>
                  <p className="text-[12px] font-medium text-slate-400/90 dark:text-gray-500 mt-0.5">{formatTanggal(j.tanggal)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaksi Terakhir */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-extrabold text-[#111111] dark:text-gray-100">Transaksi Terakhir</h2>
          <button onClick={() => onNavigate('kas')} className="text-sm text-[#0D6B5E] dark:text-[#1A9B86] font-medium">Lihat semua →</button>
        </div>
        {trxItems.length > 0 && (
          <div className="space-y-2 mb-3">
          {/* Search + filter + sort */}
          <div className="relative px-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={trxSearch}
              onChange={(e) => setTrxSearch(e.target.value)}
              placeholder="Cari keterangan / nama..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {trxSearch && (
              <button onClick={() => setTrxSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Bersihkan">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 px-1">
            <div className="flex items-center gap-1.5">
              {([
                { id: 'semua', label: 'Semua' },
                { id: 'setor', label: 'Setor' },
                { id: 'talangan_lunas', label: 'Talangan' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTrxFilter(f.id)}
                  className={`press px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    trxFilter === f.id
                      ? 'bg-[#0F4C2E] text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={cycleTrxSort}
              className="press ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              aria-label={`Urutkan: ${trxSortLabel}`}
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              {trxSortLabel}
            </button>
          </div>
          </div>
        )}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800/60 lift overflow-hidden">
          {trxItems.length === 0 ? (
            <EmptyState icon={Receipt} title="Belum ada transaksi" subtitle="Setoran & pelunasan talangan akan muncul di sini." />
          ) : displayTrx.length === 0 ? (
            <EmptyState icon={Receipt} title="Tidak ada hasil" subtitle="Tidak ada transaksi pada filter ini." />
          ) : (
            displayTrx.map((trx, idx) => (
              <button
                key={trx.id}
                onClick={() => setSelectedTrx(trx)}
                style={{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }}
                className={`rise w-full flex items-start gap-3 px-4 py-[14px] text-left cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 active:scale-[0.98] transition-all ${idx < displayTrx.length - 1 ? 'border-b border-[#F0F0F0] dark:border-gray-800' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 mt-0.5 ${trx.tipe === 'setor' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                  {trx.tipe === 'setor'
                    ? <ArrowUpRight className="w-4 h-4 text-orange-500" />
                    : <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#111111] dark:text-gray-100 leading-snug break-words">{trx.keterangan}</p>
                  <p className="text-[12px] font-medium text-slate-400/90 dark:text-gray-500 mt-0.5">{formatTanggal(trx.tanggal)}</p>
                  <p className={`text-xs font-medium ${trx.saldoSetelah < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-[#555555] dark:text-gray-400'}`}>
                    Saldo: {trx.saldoSetelah < 0 ? '-' : ''}Rp{Math.abs(trx.saldoSetelah).toLocaleString('id-ID')}
                  </p>
                </div>
                <span className={`text-[17px] font-extrabold shrink-0 ${trx.nominal < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {trx.nominal < 0 ? '-' : '+'}Rp{Math.abs(trx.nominal).toLocaleString('id-ID')}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
    </CrossFade>

    {/* Transaksi detail bottom sheet */}
    {selectedTrx !== null && (
      <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedTrx(null)}>
        <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 float"
          onClick={e => e.stopPropagation()}
          style={trxDrag.style}
          {...trxDrag.handlers}
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
              <span className={`text-sm font-semibold ${selectedTrx.saldoSetelah < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>
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
