import { useEffect, useState } from 'react';
import { FileText, Search, X, Check, Coins, HandCoins, Users, CalendarDays, RotateCcw, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getPageCache, setPageCache } from '../lib/pageCache';
import { formatTanggal, formatRupiahPlain, haptic } from '../lib/utils';
import { showToast } from '../lib/toast';
import { useAksiBerat, useKembaliDariLatar } from '../lib/hooks';
import type { AbsensiStatus, Tarikan, Warga } from '../lib/types';

interface JadwalWargaCache {
  lastTarikan: Tarikan | null;
  wargaList: Warga[];
  allTarikan: Tarikan[];
  absensiMap: Record<string, AbsensiStatus>;
  talanganLunas: string[]; // Set tak bisa di-JSON-kan → simpan sebagai array
}
import Tag from '../components/Tag';
import FilterChips from '../components/FilterChips';
import StatRow from '../components/StatRow';
import PageHeader from '../components/layout/PageHeader';
import ClearButton from '../components/ClearButton';
import InfoTip from '../components/InfoTip';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import SectionTitle from '../components/SectionTitle';

type SubTab = 'anggota' | 'jadwal';

/** Dua sub-tab + ikonnya — dipakai tombol tablist DAN navigasi panah. */
const SUB_TABS = [
  ['anggota', 'Daftar Anggota', Users],
  ['jadwal', 'Jadwal Hadiran', CalendarDays],
] as const;

// Tinggi dasar hero (px) — SATU sumber utk skeleton (height) & hero asli
// (min-height), pola HERO_MIN_H KasHadiran/KasRT/Talangan. Nama Sohibul Bait
// panjang & chip "Titip" kondisional menambah tinggi natural — itu data-driven,
// bukan drift. Ubah di sini bila anatomi hero berubah.
const HERO_MIN_H = 198;

export default function JadwalWargaPage() {
  /* Cetak jadwal = aksi berat (chunk PDF + render di main thread). Lihat
     `useAksiBerat` di lib/hooks.ts. */
  const [pdfSibuk, jalankanPdf] = useAksiBerat();
  // SWR: render dari snapshot terakhir, revalidate diam-diam (lihat lib/pageCache).
  const [cached] = useState(() => getPageCache<JadwalWargaCache>('jadwal-warga'));
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('anggota');
  const [lastTarikan, setLastTarikan] = useState<Tarikan | null>(cached?.lastTarikan ?? null);
  const [wargaList, setWargaList] = useState<Warga[]>(cached?.wargaList ?? []);
  const [allTarikan, setAllTarikan] = useState<Tarikan[]>(cached?.allTarikan ?? []);
  const [absensiMap, setAbsensiMap] = useState<Record<string, AbsensiStatus>>(cached?.absensiMap ?? {});
  const [talanganLunasSet, setTalanganLunasSet] = useState<Set<string>>(() => new Set(cached?.talanganLunas ?? []));
  const [search, setSearch] = useState('');
  const [wargaFilter, setWargaFilter] = useState<'semua' | 'hadir' | 'titip' | 'tidak'>('semua');

  async function load() {
    // Sudah ada data tampil → revalidate diam-diam: tanpa skeleton, gagal = toast.
    const silent = allTarikan.length > 0 || wargaList.length > 0;
    if (!silent) setLoading(true);
    setError(false);
    try {

      const [tarRes, wargaRes] = await Promise.all([
        supabase
          .from('tarikan')
          .select('*, sohibul_bait:warga!sohibul_bait_id(*)')
          .order('nomor', { ascending: true }),
        supabase
          .from('warga')
          .select('*')
          .eq('status_aktif', true)
          .order('nama', { ascending: true }),
      ]);

      // Supabase TIDAK melempar saat gagal — tanpa cek ini, HTTP 500/koneksi
      // putus berubah jadi array kosong dan halaman mengklaim "Belum ada tarikan
      // selesai" + statistik 0 (pernyataan SALAH tentang data), lalu snapshot
      // kosong itu ikut ditulis ke pageCache sehingga kebohongannya bertahan
      // antar-navigasi. Pola cek-per-hasil ini sudah dipakai Beranda, Talangan,
      // Kas Hadiran & Kas RT — halaman ini satu-satunya yang terlewat.
      if (tarRes.error || wargaRes.error) throw tarRes.error ?? wargaRes.error;

      const tarikanAll = (tarRes.data as Tarikan[]) ?? [];
      const warga = (wargaRes.data as Warga[]) ?? [];

      setAllTarikan(tarikanAll);
      setWargaList(warga);

      // Cari tarikan selesai terakhir
      const selesaiList = tarikanAll.filter(t => t.status === 'selesai');
      const last = selesaiList.length > 0 ? selesaiList[selesaiList.length - 1] : null;
      setLastTarikan(last);

      const aMap: Record<string, AbsensiStatus> = {};
      let lunasIds: string[] = [];
      if (last) {
        const [absensiRes, talanganRes] = await Promise.all([
          supabase
            .from('absensi')
            .select('warga_id, status')
            .eq('tarikan_id', last.id),
          supabase
            .from('talangan')
            .select('warga_id')
            .eq('tarikan_id', last.id)
            .eq('status_lunas', true),
        ]);

        if (absensiRes.error || talanganRes.error) throw absensiRes.error ?? talanganRes.error;

        // Default semua tidak hadir
        warga.forEach(w => { aMap[w.id] = 'tidak_hadir'; });
        (absensiRes.data ?? []).forEach((a: { warga_id: string; status: string }) => {
          aMap[a.warga_id] = a.status as AbsensiStatus;
        });
        setAbsensiMap(aMap);

        lunasIds = (talanganRes.data ?? []).map((t: { warga_id: string }) => t.warga_id);
        setTalanganLunasSet(new Set(lunasIds));
      }

      setPageCache<JadwalWargaCache>('jadwal-warga', {
        lastTarikan: last,
        wargaList: warga,
        allTarikan: tarikanAll,
        absensiMap: aMap,
        talanganLunas: lunasIds,
      });
    } catch {
      if (silent) showToast('Gagal memperbarui data. Coba lagi.', 'error');
      else setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    import('../lib/generateJadwalPDF').catch(() => {}); // preload: jaga gesture share di HP
  }, []);

  /* Ditinggal lama lalu dibuka lagi → ambil ulang diam-diam. Lihat
     `useKembaliDariLatar` di lib/hooks.ts: tanpa ini halaman memuat datanya
     SEKALI seumur tab. */
  useKembaliDariLatar(load);

  async function cetakJadwal() {
    haptic();
    await jalankanPdf(async () => {
      const { generateJadwalPDF } = await import('../lib/generateJadwalPDF');
      generateJadwalPDF(allTarikan);
    }, { mulai: 'Menyiapkan PDF…', gagal: 'Gagal membuat PDF. Coba muat ulang aplikasi.' });
  }

  /* Kepala halaman dipakai OLEH KEDUA cabang (memuat & termuat) — satu nilai,
     bukan dua salinan. Sampai 19 Agu 2026 cabang `if (loading)` di bawah
     mengembalikan pohon yang SAMA SEKALI berbeda dan tak memuat PageHeader,
     padahal pohon termuat memuatnya. Halaman ini satu-satunya di app yang
     early-return skeleton begitu; empat halaman lain (KasRT, Talangan,
     KasHadiran, Jadwal) merender SATU pohon dan cuma menukar isi dalamnya,
     jadi kepala mereka tak pernah lepas dari alur.
     Akibatnya seluruh halaman menata ulang saat data datang: layout-shift
     terukur 0,138 di 390px dan 0,186 di 360px (ambang "baik" Google 0,1).
     Bahwa penyebabnya tukar-skeleton dan BUKAN CrossFade dibuktikan lewat
     kunjungan KEDUA ke tab yang sama — data sudah di-cache, skeleton tak
     muncul, dan skornya 0,000 tepat di kedua lebar.
     Sengaja PageHeader ASLI, bukan skeleton tiruannya: propsnya statis
     seluruhnya, jadi tiruan cuma menambah satu titik sinkron yang bisa
     melenceng — dan spinner `animate-spin`-nya justru menjadikan keadaan
     memuat terbaca, bukan sekadar tak menggeser. */
  const kepalaHalaman = (
    <PageHeader
      title="Jadwal Tarikan"
      actions={
        <button onClick={() => load()} aria-label="Muat ulang" className="press w-11 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }
    />
  );

  if (loading) {
    return (
      <div className="space-y-7 pb-2">
        {kepalaHalaman}
        {/* Hero — bentuk kartu + ANATOMI asli (eyebrow, judul, sub Sohibul Bait,
            baris kehadiran, progress, chip), tinggi via HERO_MIN_H. Versi lama:
            slab abu h-44 polos = 22px lebih pendek dari hero asli, dan blok di
            bawahnya (grid 3×h-20) tak menyerupai baris toggle 44px yang asli. */}
        {/* `minHeight`, BUKAN `height`: tinggi tetap MENGUNCI skeleton ke 198px
            padahal hero asli 253px di ≤360px (chip melipat 2 baris) — 55px yang
            hilang itu mendorong seluruh halaman saat data datang, dan itulah
            seluruh CLS 0,146 layar ini. Dengan min-height, anatominya sendiri
            yang menentukan tinggi & ikut melipat di titik yang SAMA, jadi
            HERO_MIN_H kembali jadi lantai (persis perannya di hero asli), bukan
            angka yang harus ditebak ulang tiap kali anatomi berubah. */}
        <div
          style={{ minHeight: HERO_MIN_H }}
          className="rounded-3xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800/60 lift p-5 space-y-3"
        >
          {/* Tinggi tiap blok = tinggi KOTAK BARIS aslinya (diukur 360px: eyebrow
              20, judul 68, progres 28). Batang skeleton sengaja lebih tipis dari
              huruf, jadi kalau blok pembungkusnya tak dipatok, skeleton berakhir
              48px lebih pendek dari hero yang digantikannya — itu sisa geseran
              yang tak hilang hanya dengan membetulkan pelipatan chip.

              Judul memakai `max-[389px]:` karena judul & baris Sohibul Bait
              MELIPAT di bawah 390px (68px) dan tidak di atasnya (46px). Angkanya
              bukan tebakan: 390 persis titik chip berhenti melipat juga, dan
              tinggi hero terukur 253 vs 198 di dua sisi ambang itu. */}
          <div className="skeleton h-5 w-32 rounded-full" />
          <div className="h-[46px] max-[389px]:h-[68px] space-y-1.5">
            <div className="skeleton h-4 w-3/4 rounded-full" />
            <div className="skeleton h-3 w-2/3 rounded-full" />
          </div>
          <div className="h-7 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="skeleton h-2.5 w-20 rounded-full" />
              <div className="skeleton h-2.5 w-24 rounded-full" />
            </div>
            <div className="skeleton h-2 w-full rounded-full" />
          </div>
          {/* `flex-wrap` + lebar disalin dari chip ASLI (diukur 360px: 82 / 107 /
              99 px, lintasan 288 → melipat 2 baris). Tanpa `flex-wrap` skeleton
              memampatkan chipnya jadi satu baris sementara hero asli melipat →
              skeleton 32px lebih pendek dari yang digantikannya. */}
          <div className="flex gap-2 flex-wrap">
            <div className="skeleton h-[25px] w-[82px] rounded-full" />
            <div className="skeleton h-[25px] w-[107px] rounded-full" />
            <div className="skeleton h-[25px] w-[99px] rounded-full" />
          </div>
        </div>
        {/* Sub-tab switcher (2 tombol, min-h 44) */}
        <div className="flex gap-2">
          {[0, 1].map((i) => <div key={i} className="skeleton flex-1 min-h-[44px] rounded-xl" />)}
        </div>
        <div className="space-y-3">
        {/* StatRow 4 kolom — cermin markup StatRow (tight: px-3 py-4) */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift px-3 py-4">
          {/* h-7 = line-height text-xl (28px); h-[15px] = text-caption leading-tight
              → tinggi total sama persis dgn StatRow asli (79px), tanpa drift. */}
          <div className="grid grid-cols-4 divide-x divide-line dark:divide-gray-800">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 px-1.5">
                <div className="skeleton h-7 w-8 rounded-lg" />
                <div className="skeleton h-[15px] w-10 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        {/* Search (.field-search = 46px) */}
        <div className="skeleton h-[46px] rounded-xl" />
        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton min-h-[44px] w-[4.5rem] rounded-full" />)}
        </div>
        {/* List */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex items-center gap-3 p-3.5 [--di-l:3.875rem] [--di-r:0.875rem] ${i < 4 ? 'divide-inset' : ''}`}>
              <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-1/2 rounded-full" />
                <div className="skeleton h-2.5 w-1/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-10">
        <ErrorState onRetry={() => load()} retrying={loading} />
      </div>
    );
  }

  const hadirCount = lastTarikan
    ? Object.values(absensiMap).filter(v => v === 'hadir').length
    : 0;
  const titipCount = lastTarikan
    ? Object.values(absensiMap).filter(v => v === 'titip').length
    : 0;
  const tidakHadirCount = lastTarikan
    ? Object.values(absensiMap).filter(v => v === 'tidak_hadir').length
    : 0;
  const pctHadir = lastTarikan && lastTarikan.total_warga > 0
    ? Math.round((hadirCount / lastTarikan.total_warga) * 100)
    : 0;
  const iuranTerkumpul = lastTarikan?.total_terkumpul ?? 0;

  const selesaiCount = allTarikan.filter(t => t.status === 'selesai').length;
  const terjadwalCount = allTarikan.filter(t => t.status === 'dijadwalkan' || t.status === 'berlangsung').length;

  // Stat "Selesai" di sub-tab anggota = hadir + titip + talanganLunas (sudah menyelesaikan kewajiban)
  const selesaiAnggotaCount = wargaList.filter(w => {
    const statusAbsensi = absensiMap[w.id];
    return statusAbsensi === 'hadir' || statusAbsensi === 'titip' || talanganLunasSet.has(w.id);
  }).length;

  const filteredWarga = wargaList.filter(w => {
    if (search && !w.nama.toLowerCase().includes(search.toLowerCase())) return false;
    if (wargaFilter === 'semua') return true;
    const st = absensiMap[w.id];
    if (wargaFilter === 'hadir') return st === 'hadir';
    if (wargaFilter === 'titip') return st === 'titip';
    return st === 'tidak_hadir'; // 'tidak'
  });

  return (
    <div className="space-y-7 pb-2">
      {/* Kepala halaman = PageHeader bersama (30 Jul). Halaman ini dulu SATU-
          SATUNYA tab tanpa judul — langsung hero, tanpa nama & tanpa muat-ulang,
          padahal tab-nya bernama "Jadwal" dan isinya dua tampilan berbeda.
          Nilainya sekarang `kepalaHalaman` di atas — dipakai cabang memuat juga. */}
      {kepalaHalaman}

      {/* Hero Card — material/warna disamakan dengan hero Beranda (.hero-card) */}
      {lastTarikan ? (
        <div className="hero-card hero-noise" style={{ minHeight: HERO_MIN_H }}>
          <div className="relative p-5 space-y-3">
            <p className="inline-flex items-center gap-1 text-emerald-100 text-micro font-bold uppercase tracking-widest">
              Tarikan Terakhir
              <InfoTip label="Tarikan" tone="onDark">
                Satu putaran arisan. Tiap tarikan ada satu Sohibul Bait (penerima) yang menerima total iuran anggota.
              </InfoTip>
            </p>
            <div>
              <p className="text-white text-subtitle font-bold leading-tight angka-prosa">
                Tarikan ke-{lastTarikan.nomor} · {formatTanggal(lastTarikan.tanggal)}
              </p>
              <p className="text-emerald-100 text-body mt-0.5">
                Sohibul Bait
                <InfoTip label="Sohibul Bait" tone="onDark" className="mx-1">
                  Anggota yang menerima seluruh hasil tarikan pada giliran ini (penerima arisan).
                </InfoTip>
                : {lastTarikan.sohibul_bait?.nama ?? '—'}
              </p>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-caption text-emerald-100 mb-1">
                <span>Kehadiran</span>
                <span className="font-bold tabular-nums">{hadirCount}/{lastTarikan.total_warga} ({pctHadir}%)</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full w-full origin-left bg-white rounded-full transition-transform duration-700 ease-out"
                  style={{ transform: `scaleX(${Math.min(pctHadir, 100) / 100})` }}
                />
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/15 text-white text-micro font-semibold">
                <Check className="w-3 h-3" strokeWidth={2.5} /> {hadirCount} Hadir
              </span>
              {titipCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/15 text-white text-micro font-semibold">
                  <HandCoins className="w-3 h-3" /> {titipCount} Titip
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/15 text-white text-micro font-semibold">
                <X className="w-3 h-3" strokeWidth={2.5} /> {tidakHadirCount} Tidak Hadir
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/15 text-white text-micro font-semibold">
                <Coins className="w-3 h-3" /> <span className="font-display tabular-nums">{formatRupiahPlain(iuranTerkumpul)}</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
          <EmptyState
            icon={CalendarDays}
            title="Belum ada tarikan selesai"
            subtitle="Ringkasan kehadiran akan muncul di sini setelah tarikan pertama selesai."
          />
        </div>
      )}

      {/* Sub-tab switcher — SEGMENTED CONTROL: satu lintasan ber-hairline, pil
          brand meluncur di dalamnya. Dulu dua tombol terpisah (satu fill gelap,
          satu outline) → terbaca sbg pasangan CTA primer+sekunder ("lakukan
          ini"), bukan sbg dua tampilan yang sedang dipilih. Satu wadah = satu
          pilihan (pola sama dgn pil aktif di bottom nav). */}
      <div
        role="tablist"
        aria-label="Tampilan jadwal"
        className="relative flex rounded-2xl border border-control dark:border-control-dark bg-white dark:bg-gray-900 p-1"
      >
        {/* Pil aktif meluncur — 2 segmen, jadi 0% / 100% dari setengah lebar. */}
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 rounded-xl bg-brand transition-transform duration-300"
          style={{
            width: 'calc(50% - 0.25rem)',
            transform: subTab === 'anggota' ? 'translateX(0)' : 'translateX(100%)',
            transitionTimingFunction: 'var(--ease-spring)',
          }}
        />
        {(SUB_TABS).map(([id, label, Icon], i) => (
          <button
            key={id}
            role="tab"
            id={`subtab-${id}`}
            aria-selected={subTab === id}
            aria-controls={`panel-${id}`}
            /* Roving tabindex: hanya tab TERPILIH yang masuk urutan Tab —
               syarat pola tabs WAI-ARIA. Tanpa ini pembaca layar mengumumkan
               "tab 1 dari 2" (janji navigasi panah) padahal panah tak berfungsi
               dan Tab malah menyapu keduanya. */
            tabIndex={subTab === id ? 0 : -1}
            onClick={() => { if (subTab !== id) haptic(); setSubTab(id); }}
            onKeyDown={(e) => {
              const arah = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
              if (!arah) return;
              e.preventDefault();
              const next = SUB_TABS[(i + arah + SUB_TABS.length) % SUB_TABS.length][0];
              haptic();
              setSubTab(next);
              // Fokus ikut pindah (aktivasi otomatis — hanya 2 panel, ringan).
              document.getElementById(`subtab-${next}`)?.focus();
            }}
            /* `min-w-0`: `flex-1` sendiri TIDAK cukup — flex item punya
               `min-width:auto`, jadi tombol menolak menyusut di bawah lebar
               min-content-nya dan MELUBER keluar wadahnya sendiri (terukur saat
               teks dasar browser 200%: wadah 296px, tombol berakhir di 366px).
               Ikon `shrink-0` supaya yang mengalah adalah labelnya, bukan ikon
               yang lalu gepeng. */
            className={`press relative z-10 flex-1 min-w-0 min-h-[44px] py-2.5 rounded-xl text-body font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
              subTab === id ? 'text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" /> <span className="potong-lentur">{label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab: Daftar Anggota */}
      {subTab === 'anggota' && (
        <div className="space-y-3" role="tabpanel" id="panel-anggota" aria-labelledby="subtab-anggota">
          {/* Stat bar — StatRow bersama (satu kartu berkolom, sama dgn Beranda/Jadwal) */}
          <StatRow
            items={[
              /* 'Selesai' netral (ink): dulu hijau sama persis dgn 'Hadir', dan
                 angkanya pun kerap kembar → dua kolom terbaca satu hal. Hijau
                 kini hanya berarti KEHADIRAN. */
              { label: 'Selesai', value: selesaiAnggotaCount, tone: 'ink' },
              { label: 'Hadir', value: hadirCount, tone: 'pos' },
              { label: 'Titip', value: titipCount, tone: 'info' },
              { label: 'Tidak', value: tidakHadirCount, tone: 'neg' },
            ]}
          />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama warga…"
              aria-label="Cari nama warga"
              inputMode="search"
              enterKeyHint="search"
              className="field-search pr-11"
            />
            {search && <ClearButton onClick={() => setSearch('')} />}
          </div>

          {/* Filter status — hanya relevan bila sudah ada tarikan terakhir */}
          {lastTarikan && (
            <FilterChips
              options={[
                { id: 'semua', label: 'Semua' },
                { id: 'hadir', label: 'Hadir' },
                { id: 'titip', label: 'Titip' },
                { id: 'tidak', label: 'Tidak' },
              ] as const}
              value={wargaFilter}
              onChange={setWargaFilter}
            />
          )}

          {/* Warga list */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
            {filteredWarga.length === 0 ? (
              /* Kosong karena TAK ADA DATA ≠ kosong karena pencarian. Dulu layar
                 ini selalu bilang "Tidak ditemukan · Coba kata kunci lain" +
                 tombol "Reset filter" — padahal saat daftar anggota memang masih
                 kosong (RT baru, atau bendahara belum menambah warga) tak ada
                 kata kunci yang diketik dan tak ada filter yang bisa direset:
                 diagnosis salah, perintah salah, tombolnya mati. Pola pembeda
                 ini sudah dipakai Talangan, Riwayat, Beranda & Kelola Anggota. */
              wargaList.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Belum ada anggota"
                  subtitle="Daftar anggota muncul setelah bendahara menambahkan warga."
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="Tidak ditemukan"
                  subtitle="Coba kata kunci lain."
                  action={{ label: 'Reset filter', icon: RotateCcw, onClick: () => { setSearch(''); setWargaFilter('semua'); } }}
                />
              )
            ) : (
              filteredWarga.map((w, idx) => {
                const st = absensiMap[w.id];
                const ava =
                  st === 'hadir' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : st === 'titip' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-rose-50 dark:bg-rose-900/25 text-rose-700 dark:text-rose-400';
                return (
                  <div
                    key={w.id}
                    // ~79 baris: content-visibility lewati render baris di luar layar
                    // (sama seperti daftar absensi bendahara di Jadwal.tsx).
                    /* `flex-wrap` = katup pengaman, bukan perubahan tata letak:
                       di 360px normal baris ini muat jauh di dalam satu baris.
                       Ia baru bekerja saat teks dasar browser 200%, di mana
                       padding+gap+nomor+avatar+chip (semuanya `shrink-0`, semuanya
                       rem) sudah menghabiskan 361px SEBELUM nama dapat ruang —
                       jadi tak ada yang bisa mengalah dan chip mendorong halaman
                       geser samping. Dengan wrap, chip turun sebaris. */
                    /* Stagger masuk — dialek gerak bersama (lihat Jadwal.tsx). */
                    style={{ animationDelay: `${Math.min(idx, 10) * 0.035}s` }}
                    className={`rise flex flex-wrap items-center gap-2.5 p-3.5 [--di-l:5.375rem] [--di-r:0.875rem] [content-visibility:auto] [contain-intrinsic-block-size:auto_64px] ${
                      idx < filteredWarga.length - 1 ? 'divide-inset' : ''
                    }`}
                  >
                    {/* No */}
                    <span className="text-micro text-ink-faint dark:text-gray-400 font-medium w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    {/* Avatar */}
                    <div className={`icon-tile w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-caption font-bold ${ava}`}>
                      {w.nama.charAt(0)}
                    </div>
                    {/* Nama */}
                    <p className="flex-1 text-body font-semibold text-gray-900 dark:text-gray-100 potong-lentur">{w.nama}</p>
                    {/* Badge — hadir / titip (iuran masuk) / tidak hadir */}
                    {!lastTarikan ? (
                      <Tag tone="neutral" className="shrink-0">—</Tag>
                    ) : st === 'hadir' ? (
                      <Tag tone="success" className="shrink-0"><Check className="w-3 h-3" strokeWidth={2.5} />Hadir</Tag>
                    ) : st === 'titip' ? (
                      <Tag tone="info" className="shrink-0"><Coins className="w-3 h-3" />Titip</Tag>
                    ) : (
                      <Tag tone="danger" className="shrink-0"><X className="w-3 h-3" strokeWidth={2.5} />Tidak</Tag>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Sub-tab: Jadwal Hadiran */}
      {subTab === 'jadwal' && (
        <div className="space-y-3" role="tabpanel" id="panel-jadwal" aria-labelledby="subtab-jadwal">
          {/* Header with PDF button */}
          <SectionTitle
            action={
              <button
                onClick={cetakJadwal}
                disabled={allTarikan.length === 0}
                aria-busy={pdfSibuk || undefined}
                className="press flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-white dark:bg-gray-800 border border-control dark:border-control-dark text-caption font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {pdfSibuk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                PDF Jadwal
              </button>
            }
          >
            Semua Tarikan
          </SectionTitle>

          {/* Stat cards — StatRow bersama (dialek "N kartu terpisah" yang tersisa di sini) */}
          <StatRow
            items={[
              { label: 'Selesai', value: selesaiCount },
              { label: 'Terjadwal', value: terjadwalCount, tone: 'pos' },
              { label: 'Total', value: allTarikan.length },
            ]}
          />

          {/* List */}
          {allTarikan.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Belum ada jadwal" subtitle="Jadwal tarikan akan muncul di sini." />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift overflow-hidden">
              {allTarikan.map((t, idx) => {
                const isSelesai = t.status === 'selesai';
                const isLast = idx === allTarikan.length - 1;
                return (
                  <div
                    key={t.id}
                    /* Stagger masuk — dialek gerak bersama (lihat Jadwal.tsx). */
                    style={{ animationDelay: `${Math.min(idx, 10) * 0.035}s` }}
                    className={`rise flex items-center gap-2 px-4 py-4 [--di-l:4rem] ${!isLast ? 'divide-inset' : ''}`}
                  >
                    {/* Badge nomor = IDENTITAS, netral. Statusnya dulu ter-encode
                        tiga kali di baris ini: fill badge (brand vs abu), redupnya
                        nama, dan pill status. Sandi yang dibuang = fill badge,
                        karena nomor tarikan bukan status. Redupnya nama DIPERTAHANKAN
                        (itu hierarki lampau vs mendatang, bukan status), dan pill
                        tetap satu-satunya yang menyebut status dengan kata. */}
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-body bg-gray-100 dark:bg-gray-800 text-ink-sub dark:text-gray-300">
                      {t.nomor}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-body font-semibold truncate ${isSelesai ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {t.sohibul_bait?.nama ?? '—'}
                      </p>
                      <p className="text-caption text-ink-faint dark:text-gray-400 mt-0.5">
                        {formatTanggal(t.tanggal)}
                        {t.sohibul_bait && t.sohibul_bait.status_aktif === false && (
                          <span className="text-rose-500 dark:text-rose-400 font-semibold"> · Sohibul nonaktif</span>
                        )}
                      </p>
                    </div>

                    {/* Status pakai komponen Tag bersama — pill ini dulu ditulis
                        tangan (border+bg sendiri) padahal Tag sudah jadi sumber
                        tunggal pill status se-app (tone + ring "tercetak"). */}
                    <Tag tone={isSelesai ? 'neutral' : 'success'} className="shrink-0">
                      {isSelesai ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      {isSelesai ? 'Selesai' : 'Terjadwal'}
                    </Tag>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
