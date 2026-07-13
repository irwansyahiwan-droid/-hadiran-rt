import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownLeft, Wallet, ArrowLeftRight, CalendarDays, Receipt, Search, Eye, EyeOff, TrendingUp, ChevronRight, RotateCcw, Crown } from 'lucide-react';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { showToast } from '../lib/toast';
import FilterChips from '../components/FilterChips';
import Odometer from '../components/Odometer';
import StatRow from '../components/StatRow';
import CrossFade from '../components/CrossFade';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useCountUp, useHideAmount, toggleHideAmount, useFirstPlay } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { getPageCache, setPageCache } from '../lib/pageCache';
import { fetchDashboardSummary, formatRupiahPlain, formatTanggal, haptic, labelTanggalRelatif, maskRp } from '../lib/utils';
import BannerCarousel, { bannerViewportHeight } from '../components/BannerCarousel';
import { useAuthContext } from '../context/AuthContext';
import AvatarPeci from '../components/AvatarPeci';
import Tag from '../components/Tag';
import SectionTitle from '../components/SectionTitle';
import type { DashboardSummary, Tarikan } from '../lib/types';


interface TrxItem {
  id: string;
  tipe: 'setor' | 'talangan_lunas';
  /** Kalimat penuh — dipakai untuk PENCARIAN & sheet detail. */
  keterangan: string;
  /** Judul baris: subjeknya saja (nama warga). Kalimat penuh "Talangan lunas oleh
      X — Tarikan #N" membungkus 3 baris di HP karena nama terkubur di tengah;
      dipecah jadi judul (nama) + sub (konteks) supaya daftar bisa dipindai. */
  judul: string;
  sub: string | null;
  tanggal: string;
  nominal: number;
  /** null = di luar batas kelengkapan jendela fetch (saldo berjalan tak bisa
      dihitung jujur karena transaksi lebih tua tak ikut terambil). */
  saldoSetelah: number | null;
}

// Jendela fetch Beranda — ringkasan, bukan ledger penuh: ambil N terbaru per
// sumber (setor & talangan lunas), BUKAN seluruh riwayat → payload dashboard
// tetap datar saat data bertahun-tahun (skala 300 KK). Riwayat & pencarian
// penuh tetap di tab Hadiran ("Lihat semua").
const TRX_FETCH = 100;

interface BerandaCache {
  summary: DashboardSummary;
  jadwalList: Tarikan[];
  trxItems: TrxItem[];
  lastDelta: number;
}

interface BerandaProps {
  onNavigate: (tab: string) => void;
}

export default function Beranda({ onNavigate }: BerandaProps) {
  const { isBendahara, isWargaMode } = useAuthContext();
  // SWR: render dari snapshot terakhir (pindah tab / sinyal jelek → data tampil
  // instan, tanpa skeleton), lalu load() tetap revalidate diam-diam di bawah.
  const [cached] = useState(() => getPageCache<BerandaCache>('beranda'));
  const [summary, setSummary] = useState<DashboardSummary | null>(cached?.summary ?? null);
  const [jadwalList, setJadwalList] = useState<Tarikan[]>(cached?.jadwalList ?? []);
  const [trxItems, setTrxItems] = useState<TrxItem[]>(cached?.trxItems ?? []);
  const [lastDelta, setLastDelta] = useState(cached?.lastDelta ?? 0);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<TrxItem | null>(null);
  const trxDrag = useDragDismiss(() => setSelectedTrx(null));
  // Semua jalur tutup (backdrop, Back HP, Escape) lewat dismiss() yang sama →
  // sheet selalu MELUNCUR keluar, bukan lenyap seketika (unmount ditunda hook).
  useBackDismiss(selectedTrx !== null, trxDrag.dismiss);
  const trxDlg = useDialog(selectedTrx !== null, { onClose: trxDrag.dismiss, label: 'Detail transaksi' });
  const [trxFilter, setTrxFilter] = useState<'semua' | 'setor' | 'talangan_lunas'>('semua');
  const [trxSort, setTrxSort] = useState<'terbaru' | 'terlama' | 'nominal'>('terbaru');
  const [trxSearch, setTrxSearch] = useState('');

  async function load(showRefreshing = false) {
    // Sudah ada data tampil (dari cache / load sebelumnya) → revalidate
    // diam-diam: tanpa skeleton, gagal = toast (bukan layar error).
    const silent = summary !== null;
    if (showRefreshing) setRefreshing(true);
    else if (!silent) setLoading(true);
    setError(false);

    try {
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
        .eq('tipe', 'setor_kas_rt')
        .order('tanggal', { ascending: false })
        .limit(TRX_FETCH),
      supabase
        .from('talangan')
        .select('id, nominal, tanggal_lunas, warga:warga_id(nama), tarikan:tarikan_id(nomor)')
        .eq('status_lunas', true)
        .not('tanggal_lunas', 'is', null)
        .order('tanggal_lunas', { ascending: false })
        .limit(TRX_FETCH),
      supabase
        .from('tarikan')
        .select('nomor, total_terkumpul')
        .eq('status', 'selesai')
        .order('nomor', { ascending: false })
        .limit(1),
    ]);

    // Merge setor + talangan lunas → sort tanggal DESC → limit 20
    type SetorRow = { id: string; keterangan: string; tanggal: string; nominal: number };
    type TalanganLunasRow = { id: string; nominal: number; tanggal_lunas: string | null; warga: { nama: string } | null; tarikan: { nomor: number } | null };

    const setorItems = (setorRes.data as SetorRow[] ?? []).map(t => ({
      id: t.id,
      tipe: 'setor' as const,
      keterangan: t.keterangan,
      judul: t.keterangan,
      sub: 'Setor ke Kas RT',
      tanggal: t.tanggal,
      nominal: -t.nominal,
    }));

    const talanganItems = (talanganLunasRes.data as unknown as TalanganLunasRow[] ?? [])
      .filter(t => t.tanggal_lunas)
      .map(t => {
        const nama = t.warga?.nama ?? '-';
        const nomor = t.tarikan?.nomor ?? '-';
        return {
          id: t.id,
          tipe: 'talangan_lunas' as const,
          // Kalimat penuh tetap disimpan → pencarian "talangan" & sheet detail utuh.
          keterangan: `Talangan lunas oleh ${nama} — Tarikan #${nomor}`,
          judul: nama,
          // "Talangan lunas · Tarikan #N" tak muat di kolom teks (terpotong justru di
          // nomor tarikan — bagian yang paling berguna). Kata "lunas" sudah dibawa
          // ikon panah-masuk + nominal hijau bertanda plus, jadi ia yang dilepas.
          sub: `Talangan · Tarikan #${nomor}`,
          tanggal: t.tanggal_lunas as string,
          nominal: t.nominal as number,
        };
      });

    // Gabungan jendela terbaru per sumber — terbaru di atas
    const sorted = [...setorItems, ...talanganItems]
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    // Batas kelengkapan jendela: sumber yang TERPOTONG limit tak membawa
    // transaksi lebih tua dari baris terakhirnya → saldo berjalan hanya sah
    // sampai tanggal termuda di antara batas-batas itu. Sumber yang datang
    // utuh (< limit) tidak membatasi apa pun.
    let coverage = -Infinity;
    const setorRaw = (setorRes.data as SetorRow[]) ?? [];
    if (setorRaw.length === TRX_FETCH) {
      coverage = Math.max(coverage, new Date(setorRaw[setorRaw.length - 1].tanggal).getTime());
    }
    const talRaw = (talanganLunasRes.data as unknown as TalanganLunasRow[]) ?? [];
    if (talRaw.length === TRX_FETCH && talRaw[talRaw.length - 1].tanggal_lunas) {
      coverage = Math.max(coverage, new Date(talRaw[talRaw.length - 1].tanggal_lunas as string).getTime());
    }

    // Hitung running saldo mundur dari saldo_aktif saat ini; di luar batas
    // kelengkapan → null (baris tetap tampil, angka saldo disembunyikan —
    // lebih baik tak ada angka daripada angka salah di app uang).
    let saldoCurrent = summaryData.saldo_aktif;
    const withSaldo: TrxItem[] = sorted.map(item => {
      const sah = new Date(item.tanggal).getTime() >= coverage;
      const saldoSetelah = sah ? saldoCurrent : null;
      saldoCurrent = saldoCurrent - item.nominal;
      return { ...item, saldoSetelah };
    });

    // Delta tarikan terakhir → dipakai di sub-teks saldo ("↗ +RpX").
    const selesaiRows = (selesaiRes.data as { nomor: number; total_terkumpul: number | null }[]) ?? [];
    const lastDeltaVal = selesaiRows[0]?.total_terkumpul ?? 0;
    setLastDelta(lastDeltaVal);

    setSummary(summaryData);
    setJadwalList((jadwalRes.data as Tarikan[]) ?? []);
    setTrxItems(withSaldo);
    setPageCache<BerandaCache>('beranda', {
      summary: summaryData,
      jadwalList: (jadwalRes.data as Tarikan[]) ?? [],
      trxItems: withSaldo,
      lastDelta: lastDeltaVal,
    });
    } catch {
      // Data sudah tampil (refresh manual / revalidate cache) → jangan hapus
      // dashboard, cukup beri tahu. Cold load / retry gagal → error screen.
      if (showRefreshing || silent) showToast('Gagal memperbarui data. Coba lagi.', 'error');
      else setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
  // Chip status = SATU suara ringkas. Saat ada tunggakan, banner "Talangan
  // Belum Lunas" di bawah sudah membawa pesannya → chip TIDAK mengulang
  // "Ada Tunggakan" (dedup), cukup netral "Kas Aktif". Saldo minus tetap
  // kritis & pesannya BEDA dari banner → "Perlu Perhatian" (bukan duplikat).
  const kasStatus =
    saldo < 0
      ? { label: 'Perlu Perhatian', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' }
      : talangan > 0
        ? { label: 'Kas Aktif', dot: 'bg-gray-400 dark:bg-gray-500', text: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800' }
        : { label: 'Kas Sehat', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
  // Entrance hero (count-up, sheen sweep, draw-on sparkline) hanya pada
  // kunjungan pertama sesi — balik ke Beranda via tab/back tak mengulanginya.
  const firstHero = useFirstPlay('beranda-hero');
  const animatedKasHadiran = useCountUp(kasHadiran, 1000, firstHero);
  const animatedSaldo = useCountUp(saldo, 1000, firstHero);
  const animatedTalangan = useCountUp(talangan, 1000, firstHero);
  const animatedSetor = useCountUp(setorKasRT, 1000, firstHero);
  // Baris statistik (Anggota/Tarikan/Terjadwal) ikut count-up spt nominal hero →
  // angka "berputar naik" konsisten, bukan diam saat hero beranimasi.
  const animAnggota = useCountUp(summary?.jumlah_anggota ?? 0, 900, firstHero);
  const animTarikan = useCountUp(summary?.jumlah_tarikan ?? 0, 900, firstHero);
  const animTerjadwal = useCountUp(summary?.jumlah_dijadwalkan ?? 0, 900, firstHero);
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
  // dashboard tetap ringan; sisanya lewat "Lihat semua" ke tab Kas.
  // Pencarian/filter bekerja atas JENDELA yang diambil (TRX_FETCH terbaru per
  // sumber) — riwayat & pencarian penuh ada di tab Hadiran.
  const TRX_LIMIT = 20;
  const visibleTrx = displayTrx.slice(0, TRX_LIMIT);
  const trxHidden = displayTrx.length - visibleTrx.length;

  // Kelompokkan per tanggal → tanggal ditulis SEKALI sebagai kepala kelompok,
  // bukan diulang di tiap baris. Tanpa ini daftar jadi tembok baris kembar
  // ("Talangan lunas oleh … — Tarikan #N", +Rp50.000, tanggal sama) yang mustahil
  // dipindai. Kepala kelompok juga membawa NET hari itu (pola buku besar bank).
  // Hanya saat urutan kronologis — pada sort 'nominal' baris tak berurut tanggal,
  // jadi kelompok tanggal akan menyesatkan; di situ tanggal balik ke per-baris.
  const trxGroups = useMemo(() => {
    if (trxSort === 'nominal') return null;
    const out: { key: string; label: string; net: number; items: TrxItem[] }[] = [];
    for (const t of visibleTrx) {
      const key = t.tanggal.slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.key === key) {
        last.items.push(t);
        last.net += t.nominal;
      } else {
        out.push({ key, label: labelTanggalRelatif(t.tanggal), net: t.nominal, items: [t] });
      }
    }
    return out;
  }, [visibleTrx, trxSort]);


  /**
   * Satu baris transaksi. `showDate` hanya true saat daftar TIDAK dikelompokkan
   * (sort 'nominal'); di mode kelompok tanggal sudah dipikul kepala kelompok, jadi
   * mengulangnya di tiap baris = derau. Saldo berjalan juga tak lagi di baris —
   * sudah ada di sheet detail (satu ketuk), dan di daftar ia hanya menambah
   * kolom angka ketiga yang bersaing dengan nominal.
   */
  const trxRow = (trx: TrxItem, idx: number, lastInGroup: boolean, showDate: boolean) => (
    <button
      key={trx.id}
      onClick={() => { haptic(); setSelectedTrx(trx); }}
      style={{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }}
      className={`press rise w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 ${lastInGroup ? '' : 'divide-inset'}`}
    >
      <div className={`icon-tile w-11 h-11 rounded-2xl inline-flex items-center justify-center shrink-0 ${trx.tipe === 'setor' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
        {trx.tipe === 'setor'
          ? <ArrowUpRight className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
          : <ArrowDownLeft className="w-[18px] h-[18px] text-emerald-500 dark:text-emerald-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-ink dark:text-gray-100 leading-snug truncate">{trx.judul}</p>
        {/* Baris kedua = konteks (+ tanggal saat daftar tak dikelompokkan).
            mt-1 (bukan mt-0.5): jarak 2px bikin judul & sub nyaris bersentuhan —
            biang rasa "rapat" yang dilaporkan. 4px = dua baris terbaca sebagai
            pasangan, bukan satu gumpalan. */}
        <p className="text-caption font-medium text-ink-faint dark:text-gray-400 mt-1 truncate">
          {[trx.sub, showDate ? formatTanggal(trx.tanggal) : null].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className={`font-display text-amount font-bold shrink-0 tabular-nums ${trx.nominal < 0 ? 'text-neg dark:text-rose-400' : 'text-pos dark:text-emerald-400'}`}>
        {maskRp(`${trx.nominal < 0 ? '-' : '+'}Rp${Math.abs(trx.nominal).toLocaleString('id-ID')}`, hidden, 4)}
      </span>
    </button>
  );

  const renderTrxRows = () => {
    // Sort 'nominal' → baris tak berurut kronologis, kelompok tanggal menyesatkan.
    if (!trxGroups) {
      return visibleTrx.map((trx, idx) =>
        trxRow(trx, idx, idx === visibleTrx.length - 1, true),
      );
    }
    let idx = 0;
    return trxGroups.map((g, gi) => (
      <div key={g.key}>
        {/* Kepala kelompok: tanggal SEKALI + net hari itu (pola buku besar bank).
            Tanpa fill abu — putih polos + hairline pemisah antar-kelompok, agar
            tetap sebahasa dgn kartu MATERIAL-FLAT (abu disimpan utk kontrol). */}
        {/* pt-5/pb-3 (bukan pt-4/pb-2): kepala kelompok dulu menempel ke baris
            pertama di bawahnya (8px) padahal berjarak 16px dari baris sebelumnya —
            terbaca "jatuh" ke kelompok yang salah. Kini napas atas > bawah, jadi
            label jelas MILIK kelompok di bawahnya. */}
        <div className={`flex items-baseline justify-between gap-3 px-5 pt-5 pb-3 ${gi > 0 ? 'border-t border-line dark:border-gray-800' : ''}`}>
          <span className="text-micro font-bold uppercase tracking-wide text-ink-faint dark:text-gray-400">{g.label}</span>
          <span className={`text-micro font-bold tabular-nums ${g.net < 0 ? 'text-neg dark:text-rose-400' : 'text-ink-faint dark:text-gray-400'}`}>
            {maskRp(`${g.net < 0 ? '-' : '+'}Rp${Math.abs(g.net).toLocaleString('id-ID')}`, hidden, 4)}
          </span>
        </div>
        {g.items.map((trx, ii) => trxRow(trx, idx++, ii === g.items.length - 1, false))}
      </div>
    ));
  };

  const skeleton = (
      <div className="space-y-7 pb-2">
        {/* Setinggi blok carousel real (bannerViewportHeight) → tanpa layout jump
            saat skeleton → konten (CrossFade blur tak bisa menutup pergeseran 150px). */}
        <div className="rounded-3xl skeleton" style={{ height: bannerViewportHeight(window.innerHeight) }} />
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift px-5 py-5">
          <div className="grid grid-cols-3 divide-x divide-line dark:divide-gray-800">
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
            <div key={i} className={`flex items-center gap-3 px-5 py-4 ${i < 3 ? 'divide-inset' : ''}`}>
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
    {error ? (
    <ErrorState className="pt-10" onRetry={() => load()} retrying={loading} />
    ) : (
    <div className="space-y-7 pb-2">
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

      {/* Hero saldo + promo digabung jadi SATU carousel mewah: saldo = slide
          "rumah" (ditahan lebih lama lalu balik), promo numpang lewat di
          permukaan yang sama. Container bawa --hero-shadow → semua slide naik kelas. */}
      <BannerCarousel
        kasRT={setorKasRT}
        onNavigate={onNavigate}
        heroSweep={firstHero}
        heroSlide={
          <>
            {/* Aksi pojok kanan-atas — sembunyikan nominal & muat ulang. Absolut
                relatif area konten (di dalam padding kartu) → sejajar eyebrow. */}
            <div className="absolute right-0 top-0 flex items-center gap-2.5">
              <button
                onClick={() => { haptic(); toggleHideAmount(); }}
                className="press relative grid h-[38px] w-[38px] place-items-center rounded-full bg-white/15 ring-1 ring-inset ring-white/15 before:absolute before:-inset-[3px] before:content-['']"
                aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
              >
                {hidden
                  ? <EyeOff className="h-[18px] w-[18px] text-white/85" />
                  : <Eye className="h-[18px] w-[18px] text-white/85" />}
              </button>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="press relative grid h-[38px] w-[38px] place-items-center rounded-full bg-white/15 ring-1 ring-inset ring-white/15 before:absolute before:-inset-[3px] before:content-[''] disabled:opacity-60"
                aria-label="Muat ulang"
              >
                <RefreshCw className={`h-[18px] w-[18px] text-white/85 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Eyebrow */}
            <div className="flex items-center gap-[9px]">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_2px_rgba(110,231,183,0.55)]" />
              <span className="text-micro font-bold uppercase tracking-[0.16em] text-white">Saldo Kas Hadiran</span>
            </div>

            {/* Nominal besar + sub-teks.
                Rongga tengah kartu dulu menganga: footer stat ditahan mt-auto ke dasar
                sementara konten atas pendek → satu lubang ~130px, kartu terasa melar.
                Sparkline sempat dicoba untuk mengisinya, tapi datanya memang tak
                berbentuk (tiap tarikan mengumpulkan nominal SAMA → garis lurus datar);
                grafik yang tak bercerita = hiasan yang terlihat rusak. Solusinya ruang,
                bukan isi: blok nominal DIPUSATKAN di sisa ruang (flex-1 + justify-center)
                → celah terbagi rata atas-bawah dan terbaca sebagai napas yang disengaja,
                bukan lubang. Anatomi jadi: eyebrow di atas, angka di tengah, stat di dasar. */}
            <div className="flex flex-1 flex-col justify-center">
              {/* Saldo minus disengaja (talangan ditutup penuh dari kas). Dulu ditandai
                  dgn mewarnai SELURUH nominal jadi salmon (text-rose-200) — rona pastel =
                  sinyal lemah & sumbang di atas jewel-green. Ganti: nominal tetap putih
                  premium, negatif ditandai chip KATA "Defisit" DI SAMPING angka (lebih
                  terbaca utk lansia/mata yg sulit bedakan warna) + tanda minus + badge
                  "Perlu Perhatian" di header. Chip di baris nominal (bukan eyebrow) supaya
                  tak menabrak tombol mata/refresh yg absolute di kanan-atas. */}
              <div className="flex flex-wrap items-end gap-x-2.5 gap-y-1">
                <span className="font-display text-[clamp(1.9rem,9vw,2.6rem)] font-extrabold leading-none tracking-tighter tabular-nums text-white">
                  {hidden
                    ? maskRp(`${animatedSaldo < 0 ? '-' : ''}Rp${Math.abs(animatedSaldo).toLocaleString('id-ID')}`, hidden, 7)
                    : <Odometer value={animatedSaldo} />}
                </span>
                {saldo < 0 && (
                  <span className="mb-[3px] rounded-full bg-rose-600 px-2 py-[3px] text-micro font-bold uppercase tracking-[0.08em] text-white ring-1 ring-inset ring-white/20">
                    Defisit
                  </span>
                )}
              </div>
              {/* Sub-teks dulu menabrak 4 fakta jadi satu kalimat yang membungkus dua
                  baris — dan TIGA di antaranya sudah tampil di layar yang sama (Terkumpul
                  di footer hero, tarikan & anggota di kartu statistik). Sisakan yang
                  benar-benar baru: delta tarikan terakhir. Satu kalimat, satu maksud. */}
              <p className="mt-2.5 flex items-center gap-1 text-caption font-medium text-white/95">
                {lastDelta > 0 ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-100" strokeWidth={2.5} />
                    <span className="font-semibold text-emerald-100">
                      {maskRp(`+Rp${lastDelta.toLocaleString('id-ID')}`, hidden, 4)}
                    </span>
                    <span className="text-white/90">dari tarikan terakhir</span>
                  </>
                ) : (
                  <span className="text-white/80">Belum ada tarikan selesai</span>
                )}
              </p>
            </div>

            {/* Baris stat 3-kolom — di dasar kartu (blok nominal di atas sudah flex-1). */}
            <div className="grid grid-cols-3 border-t border-white/15 pt-[18px]">
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate('kas'); }}
                className="press flex w-full min-w-0 flex-col items-center gap-1 border-r border-white/15 px-0.5 active:opacity-80"
              >
                <Wallet className="h-[17px] w-[17px] text-white/80" strokeWidth={1.7} />
                <span className="mt-0.5 text-micro font-medium text-white/95">Terkumpul</span>
                <span className="whitespace-nowrap text-[clamp(0.72rem,3.1vw,0.78rem)] font-extrabold tabular-nums text-white">{maskRp(`Rp${Math.abs(animatedKasHadiran).toLocaleString('id-ID')}`, hidden, 4)}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate('talangan'); }}
                className="press flex w-full min-w-0 flex-col items-center gap-1 border-r border-white/15 px-0.5 active:opacity-80"
              >
                <ArrowLeftRight className="h-[17px] w-[17px] text-white/80" strokeWidth={1.7} />
                <span className="mt-0.5 text-micro font-medium text-white/95">Talangan</span>
                <span className="whitespace-nowrap text-[clamp(0.72rem,3.1vw,0.78rem)] font-extrabold tabular-nums text-white">{maskRp(`Rp${Math.abs(animatedTalangan).toLocaleString('id-ID')}`, hidden, 4)}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate('kas-rt'); }}
                className="press flex w-full min-w-0 flex-col items-center gap-1 px-0.5 active:opacity-80"
              >
                <ArrowUpRight className="h-[17px] w-[17px] text-white/80" strokeWidth={1.7} />
                <span className="mt-0.5 text-micro font-medium text-white/95">Setor Kas RT</span>
                <span className="whitespace-nowrap text-[clamp(0.72rem,3.1vw,0.78rem)] font-extrabold tabular-nums text-white">{maskRp(`Rp${Math.abs(animatedSetor).toLocaleString('id-ID')}`, hidden, 4)}</span>
              </button>
            </div>
          </>
        }
      />

      {/* Stats Row */}
      <StatRow
        items={[
          { label: 'Anggota', value: animAnggota },
          { label: 'Tarikan', value: animTarikan },
          { label: 'Terjadwal', value: animTerjadwal },
        ]}
      />

      {/* Alert Banner */}
      {talangan > 0 && (
        <div className="flex items-start gap-3 bg-amber-50/90 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-3xl px-5 py-5">
          <div className="icon-tile w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
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
            <EmptyState icon={CalendarDays} title="Belum ada jadwal tarikan" subtitle="Giliran Sohibul Bait berikutnya akan muncul di sini." />
          ) : (
            jadwalList.map((j, idx) => {
              // Item pertama = giliran TERDEKAT → sorot "honor": inti sosial arisan
              // adalah giliran siapa. Sohibul Bait berikutnya dapat mahkota + cincin
              // emas songket (selaras motif hero), sisanya tetap baris netral.
              const next = idx === 0;
              return (
              <div key={j.id} style={{ animationDelay: `${idx * 0.05}s` }} className={`rise flex items-center gap-3 px-5 py-4 ${next ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''} ${idx < jadwalList.length - 1 ? 'divide-inset' : ''}`}>
                {/* Avatar + badge nomor */}
                <div className="relative shrink-0">
                  <AvatarPeci nama={j.sohibul_bait?.nama ?? '?'} className={`w-11 h-11 rounded-2xl ${next ? 'ring-2 ring-[var(--gold-songket)] ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}`} />
                  {next && (
                    <Crown
                      className="absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2 -rotate-[8deg]"
                      style={{ color: 'var(--gold-songket)', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.35))' }}
                      fill="currentColor" strokeWidth={0}
                    />
                  )}
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 text-white text-micro font-bold rounded-full flex items-center justify-center shadow-sm">
                    {j.nomor}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body font-semibold text-ink dark:text-gray-100 leading-tight truncate flex-1">{j.sohibul_bait?.nama ?? '-'}</p>
                    {next ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/25 px-2 py-0.5 text-micro font-bold text-emerald-700 dark:text-emerald-300">
                        <Crown className="h-3 w-3" style={{ color: 'var(--gold-songket)' }} fill="currentColor" strokeWidth={0} />
                        Giliran berikutnya
                      </span>
                    ) : (
                      <Tag tone="neutral" className="shrink-0">Terjadwal</Tag>
                    )}
                  </div>
                  <p className="text-caption font-medium text-ink-faint dark:text-gray-400 mt-0.5">{formatTanggal(j.tanggal)}</p>
                </div>
              </div>
              );
            })
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
              placeholder="Cari keterangan / nama…"
              aria-label="Cari transaksi"
              inputMode="search"
              enterKeyHint="search"
              className="field-search pr-11"
            />
            {trxSearch && <ClearButton onClick={() => setTrxSearch('')} />}
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
            <EmptyState
              icon={Receipt}
              title="Tidak ada hasil"
              subtitle="Tidak ada di transaksi terkini. Riwayat lengkap ada di tab Hadiran."
              action={{ label: 'Reset filter', icon: RotateCcw, onClick: () => { setTrxFilter('semua'); setTrxSearch(''); } }}
            />
          ) : (
            renderTrxRows()
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
    )}
    </CrossFade>

    {/* Transaksi detail bottom sheet */}
    {selectedTrx !== null && (
      <div className="fixed inset-0 z-50 flex items-end" onClick={trxDrag.dismiss}>
        <div className={`sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm ${trxDrag.dismissing ? 'sheet-backdrop-out' : ''}`} />
        <div
          ref={trxDlg.panelRef}
          {...trxDlg.panelProps}
          className="sheet-panel relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] float"
          onClick={e => e.stopPropagation()}
          style={trxDrag.style}
          {...trxDrag.handlers}
        >
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
          <div className={`icon-tile w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${selectedTrx.tipe === 'setor' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
            {selectedTrx.tipe === 'setor'
              ? <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              : <ArrowDownLeft className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />}
          </div>
          <p className="text-body font-medium text-ink dark:text-gray-100 mb-1">{selectedTrx.keterangan}</p>
          <p className="text-xs text-ink-faint dark:text-gray-400 mb-4">{formatTanggal(selectedTrx.tanggal)}</p>
          <div className="inset-soft rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-faint dark:text-gray-400">Jumlah</span>
              <span className={`font-display text-amount font-bold tabular-nums ${selectedTrx.nominal < 0 ? 'text-neg dark:text-rose-400' : 'text-pos dark:text-emerald-400'}`}>
                {maskRp(`${selectedTrx.nominal < 0 ? '-' : '+'}Rp${Math.abs(selectedTrx.nominal).toLocaleString('id-ID')}`, hidden, 4)}
              </span>
            </div>
            {selectedTrx.saldoSetelah !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-faint dark:text-gray-400">Saldo Setelah</span>
                <span className={`text-sm font-semibold ${selectedTrx.saldoSetelah < 0 ? 'text-neg dark:text-rose-400' : 'text-ink-sub dark:text-gray-300'}`}>
                  {maskRp(`${selectedTrx.saldoSetelah < 0 ? '-' : ''}Rp${Math.abs(selectedTrx.saldoSetelah).toLocaleString('id-ID')}`, hidden, 4)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-faint dark:text-gray-400">Tipe</span>
              <span className="text-sm font-medium text-ink-sub dark:text-gray-300">
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
