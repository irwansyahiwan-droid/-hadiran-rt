import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownLeft, Wallet, ArrowLeftRight, CalendarDays, Receipt, Search, Eye, EyeOff, TrendingUp, ChevronRight, ChevronDown, RotateCcw, Crown } from 'lucide-react';
import ClearButton from '../components/ClearButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { showToast } from '../lib/toast';
import FilterChips from '../components/FilterChips';
import Odometer from '../components/Odometer';
import StatRow from '../components/StatRow';
import CrossFade from '../components/CrossFade';
import { HeroStats } from '../components/HeroSaldo';
import { useDragDismiss } from '../hooks/useDragDismiss';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { useCountUp, useHideAmount, toggleHideAmount, useFirstPlay, heroRingkas, useTinggiLayar } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { getPageCache, setPageCache } from '../lib/pageCache';
import { formatRupiahPlain, formatTanggal, haptic, labelTanggalRelatif, maskRp } from '../lib/utils';
import { fetchDashboardSummary } from '../lib/dashboard';
import BannerCarousel, { BannerSkeleton } from '../components/BannerCarousel';
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

const BULAN_ID = 'januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember';

/**
 * Judul baris untuk setoran ke Kas RT = PERIODENYA saja ("Juli 2026").
 *
 * Keterangan yang ditulis bendahara berbunyi "Setoran kas Hadiran Ke Kas RT
 * bulan Juli 2026" — 45 karakter yang dua pertiganya sudah dikatakan ulang oleh
 * sub barisnya ("Setor ke Kas RT") dan oleh tile panah + nominal merahnya.
 * Diukur di 360px, kolom judul hanya 96px sementara teks itu butuh 4 baris:
 * `line-clamp-2` memotongnya, dan menaikkan ke 3 baris pun tak menolong. Jadi
 * yang dipangkas adalah PENGULANGANNYA, bukan tinggi barisnya — sisa yang benar-
 * benar informatif cuma periodenya.
 *
 * Keterangan ASLI tidak diubah: ia tetap dipakai pencarian, sheet detail, PDF,
 * dan Excel. Kalau tak ada bulan yang bisa dikenali (mis. "Kas hadiran di rumah
 * Bpk Tagor"), judulnya dibiarkan utuh apa adanya — lebih baik panjang daripada
 * mengarang.
 */
function judulSetor(keterangan: string): string {
  const m = keterangan.match(new RegExp(`(${BULAN_ID})\\s+(\\d{4})`, 'i'));
  if (!m) return keterangan;
  const bulan = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  return `${bulan} ${m[2]}`;
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
  // Tinggi layar (ikut rotasi) → kartu saldo & skeleton-nya membaca angka yang SAMA.
  const vh = useTinggiLayar();
  const ringkas = heroRingkas(vh);
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
  /** Lipatan baris sejenis yang sedang dibuka (kunci: tanggal|sub|indeks). */
  const [openFold, setOpenFold] = useState<Set<string>>(() => new Set());

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

    // Supabase tak melempar — cek error per hasil; tanpa ini satu query gagal
    // jadi "Belum ada jadwal/transaksi" palsu + cache tertimpa kosong.
    const resErr = jadwalRes.error ?? setorRes.error ?? talanganLunasRes.error ?? selesaiRes.error;
    if (resErr) throw resErr;

    // Merge setor + talangan lunas → sort tanggal DESC → limit 20
    type SetorRow = { id: string; keterangan: string; tanggal: string; nominal: number };
    type TalanganLunasRow = { id: string; nominal: number; tanggal_lunas: string | null; warga: { nama: string } | null; tarikan: { nomor: number } | null };

    const setorItems = (setorRes.data as SetorRow[] ?? []).map(t => ({
      id: t.id,
      tipe: 'setor' as const,
      keterangan: t.keterangan,
      judul: judulSetor(t.keterangan),
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
  // Pass "Etched Premium" (26 Jul): tiap pill status dapat hairline ring tone-nya
  // sendiri (ring-inset) → terbaca "chip tercetak", bukan fill datar. Varian netral
  // "Kas Aktif" dulu paling pudar (gray-100 + dot gray-400 + teks gray-600 = blob abu)
  // → dipindah ke SLATE sejuk yang sadar-kanvas: teks & dot dinaikkan agar tegas.
  const kasStatus =
    saldo < 0
      ? { label: 'Perlu Perhatian', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', ring: 'ring-rose-600/20 dark:ring-rose-400/20' }
      : talangan > 0
        ? { label: 'Kas Aktif', dot: 'bg-slate-500 dark:bg-slate-400', text: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800', ring: 'ring-slate-500/25 dark:ring-slate-400/25' }
        : { label: 'Kas Sehat', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', ring: 'ring-emerald-600/20 dark:ring-emerald-400/20' };
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
  const trxRow = (trx: TrxItem, idx: number, lastInGroup: boolean, showDate: boolean, hideSub = false) => (
    <button
      key={trx.id}
      onClick={() => { haptic(); setSelectedTrx(trx); }}
      style={{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }}
      className={`press rise w-full flex items-center gap-2 px-4 py-4 text-left cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 ${lastInGroup ? '' : 'divide-inset'}`}
    >
      <div className={`icon-tile w-11 h-11 rounded-2xl inline-flex items-center justify-center shrink-0 ${trx.tipe === 'setor' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
        {trx.tipe === 'setor'
          ? <ArrowUpRight className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
          : <ArrowDownLeft className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        {/* clamp 2 baris (bukan truncate 1 baris): nominal panjang spt
            "-Rp1.380.000" memakan kolom kanan → judul kepotong jadi
            "Setoran kas Ha…". Judul = identitas transaksi, harus utuh;
            sub-baris tetap 1 baris agar tinggi baris tak liar. */}
        <p className="text-body font-semibold text-ink dark:text-gray-100 leading-snug line-clamp-2">{trx.judul}</p>
        {/* Baris kedua = konteks (+ tanggal saat daftar tak dikelompokkan).
            mt-1 (bukan mt-0.5): jarak 2px bikin judul & sub nyaris bersentuhan —
            biang rasa "rapat" yang dilaporkan. 4px = dua baris terbaca sebagai
            pasangan, bukan satu gumpalan. */}
        {/* `hideSub` = baris ini anak sebuah lipatan yang terbuka: konteksnya
            ("Talangan · Tarikan #12") sudah tercetak di baris induk persis di
            atasnya, jadi mengulangnya di 9 baris berturut-turut hanya derau. */}
        {!(hideSub && !showDate) && (
          <p className="text-caption font-medium text-ink-faint dark:text-gray-400 mt-1 truncate">
            {[trx.sub, showDate ? formatTanggal(trx.tanggal) : null].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <span className={`font-display text-amount font-semibold shrink-0 tabular-nums ${trx.nominal < 0 ? 'text-neg dark:text-rose-400' : 'text-pos dark:text-emerald-400'}`}>
        {maskRp(`${trx.nominal < 0 ? '-' : '+'}Rp${Math.abs(trx.nominal).toLocaleString('id-ID')}`, hidden, 4)}
      </span>
    </button>
  );

  /**
   * Baris LIPATAN: satu baris mewakili deretan transaksi sejenis (mis. 8 talangan
   * Tarikan #11 di tanggal yang sama). Identitas baris ini adalah KELOMPOKNYA,
   * jadi judul = konteks ("Talangan · Tarikan #11") dan sub = jumlah warga +
   * beberapa nama; nominal = jumlahnya. Dibuka satu ketuk → baris aslinya muncul
   * apa adanya (nama sebagai judul, aturan lama tetap berlaku).
   */
  const trxFoldRow = (run: { key: string; sub: string; items: TrxItem[]; total: number }, idx: number, lastInGroup: boolean) => {
    const open = openFold.has(run.key);
    const seg = run.sub.split(' · ');
    const judul = seg.length > 1 ? seg[seg.length - 1] : run.sub;
    const jenis = seg.length > 1 ? seg.slice(0, -1).join(' · ') : null;
    // "warga" hanya benar untuk talangan (satu baris = satu orang); pos lain
    // dihitung sebagai transaksi supaya subnya tak pernah bohong.
    const satuan = /talangan/i.test(run.sub) ? 'warga' : 'transaksi';
    return (
      <div key={run.key}>
        <button
          onClick={() => {
            haptic();
            setOpenFold((prev) => {
              const next = new Set(prev);
              if (next.has(run.key)) next.delete(run.key); else next.add(run.key);
              return next;
            });
          }}
          aria-expanded={open}
          style={{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }}
          className={`press rise w-full flex items-center gap-2 px-4 py-4 text-left cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 ${lastInGroup && !open ? '' : 'divide-inset'}`}
        >
          <div className="icon-tile w-11 h-11 rounded-2xl inline-flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
            <ArrowDownLeft className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
          </div>
          {/* Hierarki dibalik dari `sub` aslinya: NOMOR TARIKAN jadi judul, jenis
              + jumlah jadi sub. Baris ini menanggung 4 kolom (tile, teks, nominal,
              chevron); judul "Talangan · Tarikan #12" selalu terpotong justru di
              nomornya — bagian yang paling berguna. "Tarikan #12" pendek, muat,
              dan tetap identitas yang benar untuk sebuah lipatan. */}
          <div className="flex-1 min-w-0">
            <p className="text-body font-semibold text-ink dark:text-gray-100 leading-snug truncate">{judul}</p>
            <p className="text-caption font-medium text-ink-faint dark:text-gray-400 mt-1 truncate">
              {[jenis, `${run.items.length} ${satuan}`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <span className="font-display text-amount font-semibold shrink-0 tabular-nums text-pos dark:text-emerald-400">
            {maskRp(`+Rp${run.total.toLocaleString('id-ID')}`, hidden, 4)}
          </span>
          <ChevronDown className={`w-4 h-4 -ml-1 -mr-1 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2.25} />
        </button>
        {open && run.items.map((trx, ii) => trxRow(trx, idx, lastInGroup && ii === run.items.length - 1, false, true))}
      </div>
    );
  };

  /**
   * Pecah baris sebuah kelompok tanggal menjadi deretan sejenis. Sejenis =
   * `sub` sama (mis. "Talangan · Tarikan #11") DAN arah nominal sama; hanya
   * dilipat bila anggotanya ≥ FOLD_MIN, karena melipat 2 baris jadi 1 baris +
   * penunjuk buka bukan penghematan.
   *
   * TIDAK dilipat saat ada kata pencarian: di situ warga sedang mencari SATU
   * nama, dan nama justru yang tersembunyi di balik lipatan.
   */
  const FOLD_MIN = 3;
  const buildRuns = (items: TrxItem[], groupKey: string) => {
    type Run = { kind: 'run'; key: string; sub: string; items: TrxItem[]; total: number };
    const out: ({ kind: 'one'; item: TrxItem } | Run)[] = [];
    if (trxSearch.trim()) return items.map((item) => ({ kind: 'one' as const, item }));

    /* Dikumpulkan per-KUNCI di seluruh kelompok tanggal, BUKAN per deret
       beruntun. Di satu tanggal, talangan Tarikan #11 & #12 saling menyela
       (urutannya jam pelunasan), jadi versi "deret beruntun" cuma melipat
       sebagian → satu baris lipatan berdampingan dgn 4 baris sejenis yang tak
       terlipat: lebih rancu daripada tak melipat sama sekali. */
    const bucket = new Map<string, TrxItem[]>();
    for (const t of items) {
      const k = `${t.sub}|${Math.sign(t.nominal)}`;
      const arr = bucket.get(k);
      if (arr) arr.push(t); else bucket.set(k, [t]);
    }
    const sudah = new Set<string>();
    for (const t of items) {
      const k = `${t.sub}|${Math.sign(t.nominal)}`;
      const anggota = bucket.get(k) as TrxItem[];
      if (!t.sub || anggota.length < FOLD_MIN) { out.push({ kind: 'one', item: t }); continue; }
      if (sudah.has(k)) continue;          // sudah diwakili baris lipatan di posisi pertamanya
      sudah.add(k);
      out.push({
        kind: 'run',
        key: `${groupKey}|${k}`,
        sub: t.sub,
        items: anggota,
        total: anggota.reduce((s, x) => s + x.nominal, 0),
      });
    }
    return out;
  };

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
          <span className={`font-display text-micro font-bold tabular-nums ${g.net < 0 ? 'text-neg dark:text-rose-400' : 'text-ink-faint dark:text-gray-400'}`}>
            {maskRp(`${g.net < 0 ? '-' : '+'}Rp${Math.abs(g.net).toLocaleString('id-ID')}`, hidden, 4)}
          </span>
        </div>
        {buildRuns(g.items, g.key).map((r, ri, arr) => {
          const last = ri === arr.length - 1;
          return r.kind === 'run'
            ? trxFoldRow(r, idx++, last)
            : trxRow(r.item, idx++, last, false);
        })}
      </div>
    ));
  };

  const skeleton = (
      <div className="space-y-7 pb-2">
        {/* Geometri + anatomi kartu asli, satu sumber di BannerCarousel → tanpa
            layout jump saat skeleton → konten. (Versi lama: slab polos setinggi
            bannerViewportHeight saja — kurang 46px krn indikator tak dihitung,
            dan 44px lebih lebar dari kartu asli, jadi konten melompat & menyempit.) */}
        <BannerSkeleton vh={vh} />
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
            <div key={i} className={`flex items-center gap-2 px-4 py-4 ${i < 3 ? 'divide-inset' : ''}`}>
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
      {/* Tepi 16px, sama dgn kartu & judul seksi (lihat SectionTitle). */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-caption text-ink-faint dark:text-gray-400">{greeting},</p>
          <h1 className="text-xl font-bold text-ink dark:text-gray-100 leading-tight">{roleLabel}</h1>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-bold ring-1 ring-inset ${kasStatus.bg} ${kasStatus.text} ${kasStatus.ring}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${kasStatus.dot}`} />
          {kasStatus.label}
        </span>
      </div>

      {/* Hero saldo + promo digabung jadi SATU carousel mewah: saldo = slide
          "rumah" (ditahan lebih lama lalu balik), promo numpang lewat di
          permukaan yang sama. Container bawa --hero-shadow → semua slide naik kelas. */}
      <BannerCarousel
        onNavigate={onNavigate}
        heroSweep={firstHero}
        heroSlide={
          <>
            {/* Baris atas: eyebrow + aksi (sembunyikan nominal, muat ulang).
                Dulu tombolnya `absolute right-0 top-0` → di 360px eyebrow yang
                lebih panjang MENABRAK tombol mata (terukur 15px tumpang tindih,
                audit 30 Jul). Kini satu baris flex: eyebrow `min-w-0` mengalah,
                tombol `shrink-0` — lebar layar apa pun, tak bisa saling timpa. */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-[9px]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_8px_2px_rgba(110,231,183,0.55)]" />
                {/* Label ikut lebar layar: di 360px ruang sisa cuma 121px sedang
                    label butuh 148px pada 11px/0.16em → kata "SALDO" akan hilang
                    ditelan ellipsis. clamp menyusutkan huruf ~2px di HP tersempit
                    (dan tracking sedikit dirapatkan) supaya TIGA katanya utuh, lalu
                    kembali ke 11px begitu ada ruang. truncate = jaring pengaman. */}
                <span className="truncate text-[clamp(0.575rem,2.55vw,0.6875rem)] font-bold uppercase tracking-[0.12em] text-white">Saldo Kas Hadiran</span>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
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
                  <span className="mb-[3px] rounded-full bg-rose-700 px-2 py-[3px] text-micro font-bold uppercase tracking-[0.08em] text-white ring-1 ring-inset ring-white/20">
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
                    <span className="font-display font-semibold tabular-nums text-emerald-100">
                      {maskRp(`+Rp${lastDelta.toLocaleString('id-ID')}`, hidden, 4)}
                    </span>
                    <span className="text-white/90">dari tarikan terakhir</span>
                  </>
                ) : (
                  <span className="text-white/80">Belum ada tarikan selesai</span>
                )}
              </p>
            </div>

            {/* Kaki stat — di dasar kartu (blok nominal di atas sudah flex-1).
                Markup-nya kini milik `HeroStats`, komponen yang sama dipakai hero
                Kas RT & Talangan; kartu ini yang jadi acuan bentuknya.

                DILEPAS di layar pendek (heroRingkas, <700px): di 360×640 blok hero
                menelan seluruh layar pertama sampai nol konten mengintip di atas bar
                nav. Ketiga angka ini yang paling murah dikorbankan — masing-masing
                punya halaman sendiri, dan tap di kaki stat ini memang cuma jalan
                pintas ke sana. Syaratnya WAJIB sama dgn BannerSkeleton & cardHeight
                (ketiganya baca heroRingkas), kalau tidak layar meloncat saat data
                datang. */}
            {!ringkas && (
              <HeroStats
                className="pt-[18px]"
                items={[
                  { icon: Wallet, label: 'Terkumpul', value: maskRp(`Rp${Math.abs(animatedKasHadiran).toLocaleString('id-ID')}`, hidden, 4), onClick: () => onNavigate('kas') },
                  { icon: ArrowLeftRight, label: 'Talangan', value: maskRp(`Rp${Math.abs(animatedTalangan).toLocaleString('id-ID')}`, hidden, 4), onClick: () => onNavigate('talangan') },
                  { icon: ArrowUpRight, label: 'Setor Kas RT', value: maskRp(`Rp${Math.abs(animatedSetor).toLocaleString('id-ID')}`, hidden, 4), onClick: () => onNavigate('kas-rt') },
                ]}
              />
            )}
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
            <p className="text-body font-semibold text-amber-800 dark:text-amber-300">Talangan Belum Lunas</p>
            {/* Sub = ANGKANYA saja. "Total … belum diselesaikan" mengulang judul
                tepat di atasnya ("Talangan Belum Lunas"), dan panjangnya itu yang
                memecah kalimat jadi 2 baris di 360px. Bentuk label-lalu-angka juga
                memberi nominal bobot yang seharusnya — ia satu-satunya informasi
                baru di kartu ini. */}
            <p className="font-display text-caption font-bold tabular-nums text-amber-800 dark:text-amber-300 mt-0.5">
              {maskRp(formatRupiahPlain(talangan), hidden, 4)}
            </p>
          </div>
          <button
            onClick={() => onNavigate('talangan')}
            className="press inline-flex items-center min-h-[44px] text-caption text-warn dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-900/40 px-3.5 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap"
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
            <button onClick={() => onNavigate('jadwal')} className="press group inline-flex items-center gap-0.5 min-h-[44px] -my-1 pl-2 pr-1 text-body text-brand-link dark:text-brand-linkDark font-medium">
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
              <div key={j.id} style={{ animationDelay: `${idx * 0.05}s` }} className={`rise flex items-center gap-2 px-4 py-4 ${next ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''} ${idx < jadwalList.length - 1 ? 'divide-inset' : ''}`}>
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
                  {/* Nomor tarikan = penanda urut, bukan aksen. Dulu fill
                      brand-500 putih: warna brand paling menyala di baris ini
                      dipakai untuk data paling remeh, dan di baris pertama ia
                      bersaing dgn mahkota + cincin emas songket + tag "Giliran
                      berikutnya" (4 ornamen pada avatar 44px). Kini chip netral
                      ber-hairline — tetap terbaca di atas avatar (fill putih,
                      bukan abu yg melebur ke avatar), tapi diam. Sejalan nomor
                      tarikan di Kas Hadiran & Jadwal warga yang juga netral.

                      DIBUANG 6 Agu — nomornya pindah ke baris meta di bawah nama
                      sbg "Tarikan ke-N · <tanggal>". Riwayat di atas sudah dua
                      kali menunjuk arah yang sama: meredam ornamen keempat cuma
                      menunda, membuangnya menyelesaikan. Dua alasan lain:
                      (1) ini satu-satunya nomor tarikan di app yang DITUMPUK di
                      atas elemen lain — Jadwal warga & Talangan menaruhnya di
                      slot depan, dan kanon §5 melarang penumpukan konten;
                      (2) kalimat "Tarikan ke-N · <tanggal>" BUKAN pola baru, itu
                      persis yang sudah dipakai hero Jadwal warga. Avatar kini
                      membawa satu hal saja: siapa. */}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
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
                  <p className="text-caption font-medium tabular-nums text-ink-faint dark:text-gray-400 mt-0.5">Tarikan ke-{j.nomor} · {formatTanggal(j.tanggal)}</p>
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
            <button onClick={() => onNavigate('kas')} className="press group inline-flex items-center gap-0.5 min-h-[44px] -my-1 pl-2 pr-1 text-body text-brand-link dark:text-brand-linkDark font-medium">
              Lihat semua
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-active:translate-x-0.5" strokeWidth={2.25} />
            </button>
          }
        >
          {/* "Transaksi", bukan "Transaksi Terakhir": diukur di 360px, judul +
              chip 3 digit (103) memakan 200px dari anggaran 201px → pecah 2
              baris, padahal seksi kembarnya ("Jadwal Berikutnya" + chip 5) tetap
              1 baris. Kata "Terakhir" pun sudah dikatakan chip sort "Terbaru"
              tepat di bawahnya dan oleh tombol "Lihat semua" di sampingnya. */}
          Transaksi
        </SectionTitle>
        {trxItems.length > 0 && (
          <div className="space-y-2 mb-3">
          {/* Search + filter + sort */}
          <div className="relative">
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
              className="press w-full flex items-center justify-center gap-1 px-4 py-3.5 text-body font-semibold text-brand-link dark:text-brand-linkDark border-t border-line dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
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
      <div className="fixed inset-0 z-overlay flex items-end" onClick={trxDrag.dismiss}>
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
              : <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          </div>
          <p className="text-body font-medium text-ink dark:text-gray-100 mb-1">{selectedTrx.keterangan}</p>
          <p className="text-caption text-ink-faint dark:text-gray-400 mb-4">{formatTanggal(selectedTrx.tanggal)}</p>
          <div className="inset-soft rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body text-ink-faint dark:text-gray-400">Jumlah</span>
              <span className={`font-display text-amount font-semibold tabular-nums ${selectedTrx.nominal < 0 ? 'text-neg dark:text-rose-400' : 'text-pos dark:text-emerald-400'}`}>
                {maskRp(`${selectedTrx.nominal < 0 ? '-' : '+'}Rp${Math.abs(selectedTrx.nominal).toLocaleString('id-ID')}`, hidden, 4)}
              </span>
            </div>
            {selectedTrx.saldoSetelah !== null && (
              <div className="flex items-center justify-between">
                <span className="text-body text-ink-faint dark:text-gray-400">Saldo Setelah</span>
                <span className={`font-display text-body font-semibold tabular-nums ${selectedTrx.saldoSetelah < 0 ? 'text-neg dark:text-rose-400' : 'text-ink-sub dark:text-gray-300'}`}>
                  {maskRp(`${selectedTrx.saldoSetelah < 0 ? '-' : ''}Rp${Math.abs(selectedTrx.saldoSetelah).toLocaleString('id-ID')}`, hidden, 4)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-body text-ink-faint dark:text-gray-400">Tipe</span>
              <span className="text-body font-medium text-ink-sub dark:text-gray-300">
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
