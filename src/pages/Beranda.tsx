import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownLeft, Wallet, ArrowLeftRight, CalendarDays, Receipt, Eye, EyeOff, TrendingUp, ChevronRight, CalendarClock } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Odometer from '../components/Odometer';
import CrossFade from '../components/CrossFade';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useCountUp, useHideAmount, toggleHideAmount } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { fetchDashboardSummary, formatRupiahPlain, formatTanggal, haptic, maskRp } from '../lib/utils';
import DonutChart from '../components/charts/DonutChart';
import HeroSparkline from '../components/charts/HeroSparkline';
import PengumumanBanner from '../components/PengumumanBanner';
import { useAuthContext } from '../context/AuthContext';
import AvatarPeci from '../components/AvatarPeci';
import SectionTitle from '../components/SectionTitle';
import Tag from '../components/Tag';
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
  const jumlahDijadwalkan = summary?.jumlah_dijadwalkan ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const roleLabel = isWargaMode ? 'Warga' : isBendahara ? 'Bendahara' : 'Pengguna';
  const donutData = [
    { label: 'Saldo Aktif', value: Math.max(0, saldo), color: '#10B981' },
    { label: 'Talangan', value: talangan, color: '#F59E0B' },
    { label: 'Setor ke Kas RT', value: setorKasRT, color: '#3B82F6' },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);
  const kasStatus =
    saldo < 0
      ? { label: 'Perlu Perhatian', dot: 'bg-red-500', text: 'text-red-600 dark:text-rose-400', bg: 'bg-red-50 dark:bg-rose-900/20' }
      : talangan > 0
        ? { label: 'Ada Tunggakan', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' }
        : { label: 'Kas Sehat', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
  const animatedKasHadiran = useCountUp(kasHadiran);
  const animatedSaldo = useCountUp(saldo);
  const hidden = useHideAmount();

  // Pintasan navigasi — destinasi, bukan pengulangan nominal (nominal hidup di donut)
  const quickActions = [
    { label: 'Kas Hadiran', icon: Wallet, tab: 'kas', chip: 'bg-emerald-100 dark:bg-emerald-900/30', ic: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Talangan', icon: ArrowLeftRight, tab: 'talangan', chip: 'bg-amber-100 dark:bg-amber-900/30', ic: 'text-amber-600 dark:text-amber-400' },
    { label: 'Kas RT', icon: ArrowUpRight, tab: 'kas-rt', chip: 'bg-blue-100 dark:bg-blue-900/30', ic: 'text-blue-600 dark:text-blue-400' },
    { label: 'Jadwal', icon: CalendarDays, tab: 'jadwal', chip: 'bg-slate-100 dark:bg-slate-800/60', ic: 'text-slate-600 dark:text-slate-300' },
  ] as const;

  // Beranda hanya menampilkan 5 transaksi terbaru sebagai preview.
  // Pencarian & filter penuh hidup di halaman Kas Hadiran.
  const recentTrx = trxItems.slice(0, 5);

  const skeleton = (
      <div className="space-y-6 pb-2">
        <div className="rounded-3xl h-44 skeleton" />
        <div className="grid grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[84px] rounded-2xl skeleton" />
          ))}
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
      {/* Sapaan + avatar + badge status kas */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-[0_6px_16px_-5px_rgba(16,185,129,0.6)] ring-1 ring-white/40 dark:ring-white/10">
            <span className="text-white text-lg font-black tracking-tight">{roleLabel.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-ink-faint dark:text-gray-500 leading-tight">{greeting},</p>
            <h1 className="text-lg font-bold text-ink dark:text-gray-100 leading-tight truncate">{roleLabel}</h1>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${kasStatus.bg} ${kasStatus.text}`}>
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
              className="text-[12px] font-semibold uppercase text-white/[0.85]"
              style={{ letterSpacing: '0.16em' }}
            >
              Pendapatan Kas Hadiran
            </p>
          </div>
          <div className="flex items-center -mr-2">
            <button
              onClick={() => { haptic(); toggleHideAmount(); }}
              className="press w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
            >
              {hidden
                ? <EyeOff className="w-3.5 h-3.5 text-white/65" />
                : <Eye className="w-3.5 h-3.5 text-white/65" />}
            </button>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="press w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Muat ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white/65 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Big amount — ukuran konsisten dengan hero Kas RT */}
        <div className="relative mb-1">
          <span className="block text-white text-5xl font-black tracking-tighter leading-none tabular-nums">
            {hidden
              ? maskRp(`Rp${animatedKasHadiran.toLocaleString('id-ID')}`, hidden, 7)
              : <Odometer value={animatedKasHadiran} />}
          </span>
        </div>

        {/* Sub-text */}
        <p className="relative text-[13px] text-white/90 mb-3.5">
          Total iuran terkumpul · {summary?.jumlah_tarikan ?? 0} tarikan · {summary?.jumlah_anggota ?? 0} anggota
          {lastDelta > 0 && (
            <span className="inline-flex items-center gap-0.5 ml-1.5 font-semibold text-emerald-200/90 align-middle">
              <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
              {maskRp(`+Rp${lastDelta.toLocaleString('id-ID')}`, hidden, 4)}
            </span>
          )}
        </p>

        {/* Divider */}
        <div className="relative hero-divider-x mb-2.5" />

        {/* Saldo aktif — satu nominal penting (tampil minus bila kas talangan menipis),
            sekaligus pintasan ke Kas Hadiran. Talangan & Setor pindah ke donut komposisi. */}
        <button
          onClick={() => onNavigate('kas')}
          className="relative press flex items-center justify-between w-full -mb-1 py-1.5 active:opacity-80"
        >
          <span className="flex items-center gap-2">
            <Wallet className="w-[18px] h-[18px] text-white/80" strokeWidth={1.7} />
            <span className="text-[13px] text-white/90">Saldo aktif</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`text-[18px] font-bold whitespace-nowrap tabular-nums ${saldo < 0 ? 'text-rose-200' : 'text-white'}`}>
              {maskRp(`${animatedSaldo < 0 ? '-' : ''}Rp${Math.abs(animatedSaldo).toLocaleString('id-ID')}`, hidden, 4)}
            </span>
            <ChevronRight className="w-4 h-4 text-white/50" />
          </span>
        </button>
      </div>

      {/* Pintasan cepat — 4 destinasi utama, navigasi tanpa mengulang nominal */}
      <div className="grid grid-cols-4 gap-2.5">
        {quickActions.map(({ label, icon: Icon, tab, chip, ic }, i) => (
          <button
            key={label}
            onClick={() => { haptic(); onNavigate(tab); }}
            style={{ animationDelay: `${i * 0.04}s` }}
            className="rise press flex flex-col items-center gap-2 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift active:scale-[0.97] transition-transform"
          >
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10 ${chip}`}>
              <Icon className={`w-[20px] h-[20px] ${ic}`} strokeWidth={1.9} />
            </span>
            <span className="text-[11px] font-semibold text-ink-sub dark:text-gray-300 leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* Perhatian — talangan urgent naik ke atas agar terlihat lebih cepat */}
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

      {/* Pengumuman / Info Penting — dikelola bendahara, dilihat semua warga */}
      <PengumumanBanner canManage={isBendahara && !isWargaMode} />

      {/* Donut komposisi kas (interaktif) — satu-satunya rumah rincian Saldo/Talangan/Setor */}
      {donutTotal > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift px-5 py-4">
          <p className="text-sm font-bold text-ink dark:text-gray-100 mb-3">Komposisi Kas Hadiran</p>
          <DonutChart data={donutData} centerTop="Total" format={(v) => maskRp(formatRupiahPlain(v), hidden, 5)} />
        </div>
      )}

      {/* Jadwal Berikutnya */}
      <div>
        <SectionTitle
          action={<button onClick={() => onNavigate('jadwal')} className="press inline-flex items-center min-h-[44px] -my-1 pl-2 pr-1 text-sm text-brand-link dark:text-brand-linkDark font-medium">Lihat semua →</button>}
        >
          Jadwal Berikutnya
          {jumlahDijadwalkan > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400">
              <CalendarClock className="w-3 h-3" strokeWidth={2.2} />
              {jumlahDijadwalkan}
            </span>
          )}
        </SectionTitle>
        {jadwalList.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            <EmptyState icon={CalendarDays} title="Belum ada jadwal" subtitle="Jadwal tarikan berikutnya akan tampil di sini." />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Spotlight — tarikan paling dekat, ditonjolkan */}
            <button
              onClick={() => onNavigate('jadwal')}
              className="rise press w-full text-left bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-4 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <AvatarPeci nama={jadwalList[0].sohibul_bait?.nama ?? '?'} className="w-14 h-14 rounded-3xl" />
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-900">
                    {jadwalList[0].nomor}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <Tag tone="success">Tarikan berikutnya</Tag>
                  <p className="text-[17px] font-bold text-ink dark:text-gray-100 leading-tight truncate mt-1.5">{jadwalList[0].sohibul_bait?.nama ?? '-'}</p>
                  <p className="text-[13px] font-medium text-ink-faint dark:text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    {formatTanggal(jadwalList[0].tanggal)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-ink-faint/40 dark:text-gray-600 shrink-0" />
              </div>
            </button>

            {/* Sisa jadwal — daftar ringkas */}
            {jadwalList.length > 1 && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
                {jadwalList.slice(1).map((j, idx, arr) => (
                  <div key={j.id} style={{ animationDelay: `${(idx + 1) * 0.05}s` }} className={`rise flex items-center gap-3 px-4 py-[14px] ${idx < arr.length - 1 ? 'border-b border-line dark:border-gray-800' : ''}`}>
                    <div className="relative shrink-0">
                      <AvatarPeci nama={j.sohibul_bait?.nama ?? '?'} className="w-11 h-11 rounded-2xl" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {j.nomor}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[15px] font-semibold text-ink dark:text-gray-100 leading-tight truncate flex-1">{j.sohibul_bait?.nama ?? '-'}</p>
                        <Tag tone="neutral" className="shrink-0">Terjadwal</Tag>
                      </div>
                      <p className="text-[12px] font-medium text-ink-faint dark:text-gray-500 mt-0.5">{formatTanggal(j.tanggal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaksi Terakhir — preview 5 teratas; pencarian penuh ada di halaman Kas */}
      <div>
        <SectionTitle
          action={<button onClick={() => onNavigate('kas')} className="press inline-flex items-center min-h-[44px] -my-1 pl-2 pr-1 text-sm text-brand-link dark:text-brand-linkDark font-medium">Lihat semua →</button>}
        >
          Transaksi Terakhir
        </SectionTitle>
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {recentTrx.length === 0 ? (
            <EmptyState icon={Receipt} title="Belum ada transaksi" subtitle="Setoran & pelunasan talangan akan muncul di sini." />
          ) : (
            recentTrx.map((trx, idx) => (
              <button
                key={trx.id}
                onClick={() => setSelectedTrx(trx)}
                style={{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }}
                className={`rise w-full flex items-start gap-3 px-4 py-[14px] text-left cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 active:scale-[0.98] transition-all ${idx < recentTrx.length - 1 ? 'border-b border-line dark:border-gray-800' : ''}`}
              >
                <div className={`w-11 h-11 rounded-2xl inline-flex items-center justify-center shrink-0 mt-0.5 ${trx.tipe === 'setor' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                  {trx.tipe === 'setor'
                    ? <ArrowUpRight className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                    : <ArrowDownLeft className="w-[18px] h-[18px] text-emerald-500 dark:text-emerald-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-ink dark:text-gray-100 leading-snug break-words">{trx.keterangan}</p>
                  <p className="text-[12px] font-medium text-ink-faint dark:text-gray-500 mt-0.5">{formatTanggal(trx.tanggal)}</p>
                  <p className={`text-xs font-medium ${trx.saldoSetelah < 0 ? 'text-neg dark:text-rose-400' : 'text-ink-sub dark:text-gray-400'}`}>
                    Saldo: {maskRp(`${trx.saldoSetelah < 0 ? '-' : ''}Rp${Math.abs(trx.saldoSetelah).toLocaleString('id-ID')}`, hidden, 4)}
                  </p>
                </div>
                <span className={`text-[17px] font-bold shrink-0 ${trx.nominal < 0 ? 'text-neg' : 'text-pos'}`}>
                  {maskRp(`${trx.nominal < 0 ? '-' : '+'}Rp${Math.abs(trx.nominal).toLocaleString('id-ID')}`, hidden, 4)}
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
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${selectedTrx.tipe === 'setor' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
            {selectedTrx.tipe === 'setor'
              ? <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              : <ArrowDownLeft className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />}
          </div>
          <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 mb-1">{selectedTrx.keterangan}</p>
          <p className="text-xs text-ink-faint mb-4">{formatTanggal(selectedTrx.tanggal)}</p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Jumlah</span>
              <span className={`text-[17px] font-semibold ${selectedTrx.nominal < 0 ? 'text-neg' : 'text-pos'}`}>
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
