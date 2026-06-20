import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownLeft, Wallet, ArrowLeftRight, CalendarDays, Receipt, Search, X, Eye, EyeOff, TrendingUp, ChevronRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import FilterChips from '../components/FilterChips';
import Odometer from '../components/Odometer';
import CrossFade from '../components/CrossFade';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useCountUp, useHideAmount, toggleHideAmount } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { fetchDashboardSummary, formatRupiahPlain, formatTanggal, haptic, maskRp } from '../lib/utils';
import HeroSparkline from '../components/charts/HeroSparkline';
import PengumumanBanner from '../components/PengumumanBanner';
import { useAuthContext } from '../context/AuthContext';
import AvatarPeci from '../components/AvatarPeci';
import Tag from '../components/Tag';
import SectionTitle from '../components/SectionTitle';
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
  const [kasSeries, setKasSeries] = useState<number[]>([]);
  const [lastDelta, setLastDelta] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<TrxItem | null>(null);
  const trxDrag = useDragDismiss(() => setSelectedTrx(null));
  useBackDismiss(selectedTrx !== null, () => setSelectedTrx(null));
  const trxDlg = useDialog(selectedTrx !== null, { onClose: () => setSelectedTrx(null), label: 'Detail transaksi' });
  const [trxFilter, setTrxFilter] = useState<'semua' | 'setor' | 'talangan_lunas'>('semua');
  const [trxSort, setTrxSort] = useState<'terbaru' | 'terlama' | 'nominal'>('terbaru');
  const [trxSearch, setTrxSearch] = useState('');

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    const [summaryData, jadwalRes, setorRes, talanganLunasRes, selesaiRes] = await Promise.all([
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
      supabase
        .from('tarikan')
        .select('nomor, total_terkumpul')
        .eq('status', 'selesai')
        .order('nomor', { ascending: true }),
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

    // Tren pertumbuhan kas — deret kumulatif total_terkumpul per tarikan selesai
    const selesaiRows = (selesaiRes.data as { nomor: number; total_terkumpul: number | null }[]) ?? [];
    let run = 0;
    const series = selesaiRows.map((t) => (run += t.total_terkumpul ?? 0));
    setKasSeries(series);
    setLastDelta(selesaiRows.length ? (selesaiRows[selesaiRows.length - 1].total_terkumpul ?? 0) : 0);

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
  const hidden = useHideAmount();

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

  // Beranda = ringkasan, bukan ledger penuh. Batasi render ke 20 teratas →
  // dashboard tetap ringan saat data tumbuh (target 300 KK); sisanya lewat
  // "Lihat semua" ke tab Kas. Pencarian/filter tetap atas seluruh data.
  const TRX_LIMIT = 20;
  const visibleTrx = displayTrx.slice(0, TRX_LIMIT);
  const trxHidden = displayTrx.length - visibleTrx.length;


  const skeleton = (
      <div className="space-y-6 pb-2">
        <div className="rounded-3xl h-48 skeleton" />
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift px-5 py-4">
          <div className="grid grid-cols-3 divide-x divide-line">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 px-3">
                <div className="h-7 w-12 skeleton rounded-lg" />
                <div className="h-3 w-10 skeleton rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-[14px] ${i < 3 ? 'border-b border-line dark:border-gray-800' : ''}`}>
              <div className="w-11 h-11 rounded-2xl skeleton shrink-0" />
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
          <p className="text-caption text-ink-faint dark:text-gray-400">{greeting},</p>
          <h1 className="text-xl font-bold text-ink dark:text-gray-100 leading-tight">{roleLabel}</h1>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-bold ${kasStatus.bg} ${kasStatus.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${kasStatus.dot}`} />
          {kasStatus.label}
        </span>
      </div>

      {/* Main Kas Card — clean & premium hero */}
      <div className="hero-card hero-noise" style={{ padding: '18px 20px 16px' }}>
        {/* Ambient growth wave — latar "hidup" di belakang konten, tanpa menambah tinggi kartu */}
        {kasSeries.length >= 2 && (
          <div className="absolute inset-x-0 bottom-0 z-0 pointer-events-none" style={{ height: 104, opacity: 0.55 }}>
            <HeroSparkline points={kasSeries} height={104} />
          </div>
        )}

        {/* Scrim bawah — ujung kanan gradient (#1C9A5C) terlalu terang utk teks kecil
            putih (≈2.7:1 < AA). Veil hitam halus hanya di area sub-text + baris stat
            → teks kecil lolos 4.5:1 TANPA mengubah gradient brand. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-0 pointer-events-none"
          style={{ height: '70%', background: 'linear-gradient(to top, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.14) 50%, transparent 100%)' }}
        />

        {/* Label row */}
        <div className="relative flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_2px_rgba(110,231,183,0.55)]" />
            <p
              className="text-caption font-semibold uppercase text-white/[0.85]"
              style={{ letterSpacing: '0.16em' }}
            >
              Saldo Kas Hadiran
            </p>
          </div>
          <div className="flex items-center -mr-2">
            <button
              onClick={() => { haptic(); toggleHideAmount(); }}
              className="press w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
            >
              {hidden
                ? <EyeOff className="w-[18px] h-[18px] text-white/65" />
                : <Eye className="w-[18px] h-[18px] text-white/65" />}
            </button>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="press w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Muat ulang"
            >
              <RefreshCw className={`w-[18px] h-[18px] text-white/65 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Big amount — ukuran konsisten dengan hero Kas RT */}
        <div className="relative mb-1">
          <span className={`font-display block text-5xl font-extrabold tracking-tighter leading-none tabular-nums ${saldo < 0 ? 'text-rose-200' : 'text-white'}`}>
            {hidden
              ? maskRp(`${animatedSaldo < 0 ? '-' : ''}Rp${Math.abs(animatedSaldo).toLocaleString('id-ID')}`, hidden, 7)
              : <Odometer value={animatedSaldo} />}
          </span>
        </div>

        {/* Sub-text */}
        <p className="relative text-caption text-white/90 mb-3.5">
          Total terkumpul {maskRp(formatRupiahPlain(kasHadiran), hidden, 5)} · {summary?.jumlah_tarikan ?? 0} tarikan · {summary?.jumlah_anggota ?? 0} anggota
          {lastDelta > 0 && (
            <span className="inline-flex items-center gap-0.5 ml-1.5 font-semibold text-emerald-200/90 align-middle">
              <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
              {maskRp(`+Rp${lastDelta.toLocaleString('id-ID')}`, hidden, 4)}
            </span>
          )}
        </p>

        {/* Divider */}
        <div className="relative hero-divider-x mb-1" />

        {/* 3-column stat row */}
        <div className="relative grid grid-cols-3">
          <button
            onClick={() => onNavigate('kas')}
            className="hero-col press flex flex-col items-center w-full min-w-0 px-2 py-2.5 active:opacity-80"
          >
            <Wallet className="w-[18px] h-[18px] text-white/80" strokeWidth={1.7} />
            <span className="text-micro text-white/90 mt-1.5">Terkumpul</span>
            <span className="text-body font-bold text-white mt-0.5 whitespace-nowrap tabular-nums">
              {maskRp(`Rp${Math.abs(animatedKasHadiran).toLocaleString('id-ID')}`, hidden, 4)}
            </span>
          </button>
          <button
            onClick={() => onNavigate('talangan')}
            className="hero-col press flex flex-col items-center w-full min-w-0 px-2 py-2.5 active:opacity-80"
          >
            <ArrowLeftRight className="w-[18px] h-[18px] text-white/80" strokeWidth={1.7} />
            <span className="text-micro text-white/90 mt-1.5">Talangan</span>
            <span className="text-body font-bold text-white mt-0.5 whitespace-nowrap tabular-nums">{maskRp(`Rp${Math.abs(animatedTalangan).toLocaleString('id-ID')}`, hidden, 4)}</span>
          </button>
          <button
            onClick={() => onNavigate('kas-rt')}
            className="hero-col press flex flex-col items-center w-full min-w-0 px-2 py-2.5 active:opacity-80"
          >
            <ArrowUpRight className="w-[18px] h-[18px] text-white/80" strokeWidth={1.7} />
            <span className="text-micro text-white/90 mt-1.5">Setor Kas RT</span>
            <span className="text-body font-bold text-white mt-0.5 whitespace-nowrap tabular-nums">{maskRp(`Rp${Math.abs(animatedSetor).toLocaleString('id-ID')}`, hidden, 4)}</span>
          </button>
        </div>
      </div>

      {/* Pengumuman / Info Penting — dikelola bendahara, dilihat semua warga */}
      <PengumumanBanner canManage={isBendahara && !isWargaMode} />

      {/* Stats Row */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift px-5 py-4">
        <div className="grid grid-cols-3 divide-x divide-line dark:divide-gray-800">
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="font-display text-2xl font-bold text-ink dark:text-gray-100 tabular-nums">{summary?.jumlah_anggota ?? 0}</span>
            <span className="text-xs text-ink-sub dark:text-gray-400 font-medium">Anggota</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="font-display text-2xl font-bold text-ink dark:text-gray-100 tabular-nums">{summary?.jumlah_tarikan ?? 0}</span>
            <span className="text-xs text-ink-sub dark:text-gray-400 font-medium">Tarikan</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3">
            <span className="font-display text-2xl font-bold text-ink dark:text-gray-100 tabular-nums">{summary?.jumlah_dijadwalkan ?? 0}</span>
            <span className="text-xs text-ink-sub dark:text-gray-400 font-medium">Terjadwal</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {talangan > 0 && (
        <div className="flex items-start gap-3 bg-amber-50/90 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-3xl px-5 py-4">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Talangan Belum Lunas</p>
            <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
              Total {maskRp(formatRupiahPlain(talangan), hidden, 4)} belum diselesaikan
            </p>
          </div>
          <button
            onClick={() => onNavigate('talangan')}
            className="press inline-flex items-center min-h-[44px] text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-900/40 px-3.5 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Jadwal Berikutnya */}
      <div>
        <SectionTitle
          count={jadwalList.length}
          action={
            <button onClick={() => onNavigate('jadwal')} className="press group inline-flex items-center gap-0.5 min-h-[44px] -my-1 pl-2 pr-1 text-sm text-brand-link dark:text-brand-linkDark font-medium">
              Lihat semua
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-active:translate-x-0.5" strokeWidth={2.25} />
            </button>
          }
        >
          Jadwal Berikutnya
        </SectionTitle>
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {jadwalList.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Belum ada jadwal" subtitle="Jadwal tarikan berikutnya akan tampil di sini." />
          ) : (
            jadwalList.map((j, idx) => (
              <div key={j.id} style={{ animationDelay: `${idx * 0.05}s` }} className={`rise flex items-center gap-3 px-4 py-[14px] ${idx < jadwalList.length - 1 ? 'border-b border-line dark:border-gray-800' : ''}`}>
                {/* Avatar + badge nomor */}
                <div className="relative shrink-0">
                  <AvatarPeci nama={j.sohibul_bait?.nama ?? '?'} className="w-11 h-11 rounded-2xl" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-micro font-bold rounded-full flex items-center justify-center shadow-sm">
                    {j.nomor}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body font-semibold text-ink dark:text-gray-100 leading-tight truncate flex-1">{j.sohibul_bait?.nama ?? '-'}</p>
                    <Tag tone="neutral" className="shrink-0">Terjadwal</Tag>
                  </div>
                  <p className="text-caption font-medium text-ink-faint dark:text-gray-400 mt-0.5">{formatTanggal(j.tanggal)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaksi Terakhir */}
      <div>
        <SectionTitle
          count={trxItems.length}
          action={
            <button onClick={() => onNavigate('kas')} className="press group inline-flex items-center gap-0.5 min-h-[44px] -my-1 pl-2 pr-1 text-sm text-brand-link dark:text-brand-linkDark font-medium">
              Lihat semua
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-active:translate-x-0.5" strokeWidth={2.25} />
            </button>
          }
        >
          Transaksi Terakhir
        </SectionTitle>
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
              aria-label="Cari transaksi"
              className="field-search pr-11"
            />
            {trxSearch && (
              <button onClick={() => setTrxSearch('')} className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center" aria-label="Bersihkan pencarian">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <FilterChips
            className="px-1"
            options={[
              { id: 'semua', label: 'Semua' },
              { id: 'setor', label: 'Setor' },
              { id: 'talangan_lunas', label: 'Talangan' },
            ] as const}
            value={trxFilter}
            onChange={setTrxFilter}
            sort={{
              value: trxSort,
              options: [
                { id: 'terbaru', label: 'Terbaru' },
                { id: 'terlama', label: 'Terlama' },
                { id: 'nominal', label: 'Nominal' },
              ] as const,
              onChange: setTrxSort,
            }}
          />
          </div>
        )}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {trxItems.length === 0 ? (
            <EmptyState icon={Receipt} title="Belum ada transaksi" subtitle="Setoran & pelunasan talangan akan muncul di sini." />
          ) : displayTrx.length === 0 ? (
            <EmptyState icon={Receipt} title="Tidak ada hasil" subtitle="Tidak ada transaksi pada filter ini." />
          ) : (
            visibleTrx.map((trx, idx) => (
              <button
                key={trx.id}
                onClick={() => setSelectedTrx(trx)}
                style={{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }}
                className={`press rise w-full flex items-start gap-3 px-4 py-[14px] text-left cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 ${idx < visibleTrx.length - 1 ? 'border-b border-line dark:border-gray-800' : ''}`}
              >
                <div className={`w-11 h-11 rounded-2xl inline-flex items-center justify-center shrink-0 mt-0.5 ${trx.tipe === 'setor' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                  {trx.tipe === 'setor'
                    ? <ArrowUpRight className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                    : <ArrowDownLeft className="w-[18px] h-[18px] text-emerald-500 dark:text-emerald-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-ink dark:text-gray-100 leading-snug break-words">{trx.keterangan}</p>
                  <p className="text-caption font-medium text-ink-faint dark:text-gray-400 mt-0.5">{formatTanggal(trx.tanggal)}</p>
                  <p className={`text-xs font-medium tabular-nums ${trx.saldoSetelah < 0 ? 'text-neg dark:text-rose-400' : 'text-ink-sub dark:text-gray-400'}`}>
                    Saldo: {maskRp(`${trx.saldoSetelah < 0 ? '-' : ''}Rp${Math.abs(trx.saldoSetelah).toLocaleString('id-ID')}`, hidden, 4)}
                  </p>
                </div>
                <span className={`font-display text-amount font-bold shrink-0 tabular-nums ${trx.nominal < 0 ? 'text-neg dark:text-rose-400' : 'text-pos dark:text-emerald-400'}`}>
                  {maskRp(`${trx.nominal < 0 ? '-' : '+'}Rp${Math.abs(trx.nominal).toLocaleString('id-ID')}`, hidden, 4)}
                </span>
              </button>
            ))
          )}
          {trxHidden > 0 && (
            <button
              onClick={() => onNavigate('kas')}
              className="press w-full flex items-center justify-center gap-1 px-4 py-3.5 text-sm font-semibold text-brand-link dark:text-brand-linkDark border-t border-line dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              Lihat {trxHidden} transaksi lainnya
              <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
            </button>
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
          ref={trxDlg.panelRef}
          {...trxDlg.panelProps}
          className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10 float"
          onClick={e => e.stopPropagation()}
          style={trxDrag.style}
          {...trxDrag.handlers}
        >
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${selectedTrx.tipe === 'setor' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
            {selectedTrx.tipe === 'setor'
              ? <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              : <ArrowDownLeft className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />}
          </div>
          <p className="text-body font-medium text-gray-900 dark:text-gray-100 mb-1">{selectedTrx.keterangan}</p>
          <p className="text-xs text-ink-faint mb-4">{formatTanggal(selectedTrx.tanggal)}</p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Jumlah</span>
              <span className={`font-display text-amount font-bold tabular-nums ${selectedTrx.nominal < 0 ? 'text-neg dark:text-rose-400' : 'text-pos dark:text-emerald-400'}`}>
                {maskRp(`${selectedTrx.nominal < 0 ? '-' : '+'}Rp${Math.abs(selectedTrx.nominal).toLocaleString('id-ID')}`, hidden, 4)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Saldo Setelah</span>
              <span className={`text-sm font-semibold ${selectedTrx.saldoSetelah < 0 ? 'text-neg dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {maskRp(`${selectedTrx.saldoSetelah < 0 ? '-' : ''}Rp${Math.abs(selectedTrx.saldoSetelah).toLocaleString('id-ID')}`, hidden, 4)}
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
