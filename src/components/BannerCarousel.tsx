import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Target, Coins,
  ChevronRight, Crown, Check, X,
  type LucideIcon,
} from 'lucide-react';
import { haptic } from '../lib/utils';
import { heroRingkas, useUkuranLayar } from '../lib/hooks';
import rtBendahara from '../assets/rt-bendahara.jpg';
import dashboardPhone from '../assets/dashboard-phone.jpg';

/* Geometri kartu 3D. Lebar/spacing dihitung dari lebar viewport carousel (responsif).
   Tinggi: maksimum tetap (300) agar tumpukan kartu konsisten di HP normal, TAPI
   menyusut di layar pendek (mis. iPhone SE 667px) supaya hero tak menelan >½ layar
   pertama & seksi di bawahnya tetap mengintip (lihat cardHeight()). */
const CARD_H = 300;     // tinggi kartu maksimum (px)
const TOP = 8;          // offset atas kartu di dalam viewport
const CARD_GAP = 18;    // sisa tinggi viewport di luar kartu (TOP + napas bawah)

/** Tinggi kartu efektif menurut tinggi viewport. ≥740px → 300 persis (HP modern).
 *  700–739 → skala ~41% tinggi layar. <700 → mode ringkas: kaki stat sudah lepas
 *  (~82px), jadi lantainya boleh jauh lebih rendah tanpa bikin isi bertumpuk.
 *
 *  Loncatan di ambang 700 memang besar, dan itu memang MAKSUDNYA: yang hilang
 *  persis setinggi kaki stat yang ikut dilepas di titik yang sama. Satu HP punya
 *  satu tinggi layar, jadi loncatan ini tak pernah terlihat sebagai animasi.
 *
 *  ── Kenapa diturunkan (5 Agu 2026) ────────────────────────────────────────
 *  Angka lama (344 / 46,5% / 35%) membuat blok carousel memakan ~51–53% layar
 *  pertama di SEMUA ukuran. Diukur lawan build sungguhan:
 *
 *      360×640  blok 290px (51%)  → konten berikutnya mengintip cuma  50px
 *      390×844  blok 408px (53%)  → mengintip 136px
 *
 *  50px itu KURANG DARI SATU BARIS DAFTAR (±72px): warga membuka app dan tak
 *  dapat sinyal apa pun bahwa masih ada isi di bawah — persis masalah yang dulu
 *  `heroRingkas` dibuat untuk mencegah, dan ternyata belum tuntas.
 *
 *  Sekarang (dipilih user dari tiga varian yang dirender sungguhan):
 *      360×640  blok 269px (47%)  → mengintip  71px
 *      390×844  blok 364px (47%)  → mengintip 180px
 *
 *  Kalau angka ini disetel lagi: UKUR, jangan kira-kira — dan RESTART server
 *  `vite preview` tiap build, karena ia menahan `dist` sejak dinyalakan
 *  sehingga tiga varian berbeda bisa terbaca identik (kejadian 5 Agu). */
/** Mode ringkas: tinggi yang ISINYA butuh, bukan persentase layar.
 *  Begitu kaki stat dilepas, isi kartu tinggal eyebrow + nominal + delta —
 *  dan itu TETAP, tak tumbuh mengikuti layar. Diukur di build sungguhan:
 *  isi butuh 176px @640 dan 180px @667, sementara rumus 32% memberi 205 dan
 *  213 → 29–33px ruang kosong menganga di bawah nominal, justru di HP yang
 *  paling sempit. 184 = 180 + satu napas kecil; `Math.min` menjaga layar yang
 *  lebih pendek lagi tetap proporsional. */
const CARD_H_RINGKAS = 184;

/* `vw` ikut ditimbang sejak 24 Agu 2026 — ringkas bisa dipicu sumbu LEBAR
   juga (lihat `heroRingkas`). Urutan cabangnya sengaja tak berubah kecuali
   satu hal: cek `vh >= 740` TIDAK boleh lagi memintas lebih dulu, karena
   layar 320x800 memenuhi syarat itu sementara kaki statnya justru dilepas —
   memberi kartu 300px penuh untuk isi yang tinggal ~180px akan menganga. */
function cardHeight(vh: number, vw: number): number {
  if (heroRingkas(vh, vw)) return Math.min(CARD_H_RINGKAS, Math.round(vh * 0.32));
  if (vh >= 740) return CARD_H;
  return Math.max(264, Math.round(vh * 0.41));
}

/** Tinggi viewport carousel (kartu + napas bawah), TANPA baris indikator. */
function bannerViewportHeight(vh: number, vw: number): number {
  return cardHeight(vh, vw) + CARD_GAP;
}

/** Tinggi baris indikator story: tombol minHeight 44 + pt-0.5 (2). */
const INDICATOR_H = 46;

/** Tinggi TOTAL blok (viewport kartu + baris indikator). `bannerViewportHeight`
 *  saja TIDAK cukup untuk skeleton — indikator ada di luar viewport, jadi memakai
 *  viewport-height bikin lompatan 46px saat skeleton → konten (terukur 18 Jul). */
function bannerBlockHeight(vh: number, vw: number): number {
  return bannerViewportHeight(vh, vw) + INDICATOR_H;
}

/**
 * Skeleton carousel — SATU SUMBER dgn kartu asli (dipakai Beranda saat loading).
 * Sengaja ditaruh di file ini supaya geometri (lebar/tinggi/radius/padding/offset
 * + tinggi indikator) tak bisa drift dari carousel-nya. Meniru bukan cuma ukuran
 * tapi juga ANATOMI kartu saldo (eyebrow, nominal, footer 3 kolom) — slab abu polos
 * seukuran layar adalah dialek skeleton "malas" yang tak sejalan dgn skeleton daftar
 * & statistik yang sudah berstruktur.
 */
export function BannerSkeleton({ vh, vw }: { vh: number; vw: number }) {
  /* Bar isian di atas permukaan HERO: putih beralpha + kilau, bukan abu
     `.skeleton-bar` (#D6DADE) yang nadanya lahir untuk permukaan putih.
     Kilau pindah dari PERMUKAAN ke BAR — sekarang permukaannya gradient
     hero yang sesungguhnya, dan menyapukan shimmer di atasnya akan
     terbaca kilatan di kartu saldo, bukan tanda memuat. Pola ini sama
     persis dgn skeleton hero KasRT/KasHadiran/Talangan. */
  const bar = 'rounded-full skeleton skeleton-hero';
  /* Indikator story duduk DI LUAR kartu, di atas kanvas app — jadi ia
     TIDAK boleh ikut nada hero. Putih beralpha .16 di atas #ECF1F7
     praktis tak terlihat; nadanya tetap `.skeleton-bar` seperti semula. */
  const barKanvas = 'rounded-full skeleton-bar';
  return (
    <div style={{ height: bannerBlockHeight(vh, vw) }}>
      <div
        /* Permukaannya = permukaan kartu saldo yang sedang dimuat, bukan slab
           abu. Komponen ini sudah menyamakan SEGALANYA dgn kartu asli —
           lebar, tinggi, radius (--hero-radius), padding, offset, anatomi —
           justru karena drift geometri bikin layar meloncat; satu-satunya
           yang tak ikut adalah WARNA, sehingga layar pertama tiap warga
           memudar dari abu ke hijau tua. */
        className="mx-auto hero-emerald relative overflow-hidden flex flex-col"
        style={{
          // Rumus lebar IDENTIK dgn cardW: min(viewport - 44, 326).
          width: 'min(calc(100% - 44px), 326px)',
          height: cardHeight(vh, vw),
          marginTop: TOP,
          borderRadius: 'var(--hero-radius)',
          padding: 24,
          boxSizing: 'border-box',
          boxShadow: 'var(--hero-shadow)',
        }}
      >
        {/* eyebrow: titik status + label */}
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 shrink-0 ${bar}`} />
          <span className={`h-2.5 w-32 ${bar}`} />
        </div>
        {/* nominal besar. Placeholder sub-teks DILEPAS bersama baris delta di
            kartu aslinya (lihat heroSlide di Beranda) — skeleton yang lebih
            tinggi dari isinya justru bikin layar meloncat saat data datang,
            cacat yang komponen ini ada untuk mencegah. */}
        <div className="flex flex-1 flex-col justify-center">
          <span className="h-8 w-3/4 rounded-xl skeleton skeleton-hero" />
        </div>
        {/* footer 3 kolom (Terkumpul / Talangan / Setor Kas RT) — ikut lepas di
            layar pendek, PERSIS seperti kartu aslinya. Kalau syarat ini beda dgn
            kartu, skeleton jadi lebih tinggi dari isinya → layar meloncat saat
            data datang, cacat yang justru mau dicegah komponen ini. */}
        {/* Pemisah kaki ikut garis HERO (`border-white/15`, sama dgn HeroSaldo)
            — bukan `control` (#64748B, token BATAS KONTROL yang terbaca jauh
            lebih tegas dari isi yang diwakilinya) dan bukan lagi nada skeleton
            abu, yang lahir untuk permukaan putih. */}
        {!heroRingkas(vh, vw) && (
          <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-lg skeleton skeleton-hero" />
                <span className={`h-2 w-11 ${bar}`} />
                <span className={`h-2.5 w-14 ${bar}`} />
              </div>
            ))}
          </div>
        )}
      </div>
      {/* baris indikator story: satu pill aktif + dot sisanya */}
      {/* mx-[9px] + gap 0 = geometri PERSIS indikator asli (kotak sentuh 24px). */}
      <div className="flex items-center justify-center" style={{ height: INDICATOR_H }}>
        <span className={`h-1 w-[26px] mx-[9px] ${barKanvas}`} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-1 w-[7px] mx-[9px] ${barKanvas}`} />
        ))}
      </div>
    </div>
  );
}

/** Satu easing untuk semua transisi kartu/sheen/indikator → tak drift antar-tempat. */
const EASE = 'cubic-bezier(.22,.61,.36,1)';
/** Drop-shadow gelap halus untuk teks putih di atas gradient/foto — jaga kontras AA tanpa glow berwarna. */
const TEXT_SHADOW = '0 1px 3px rgba(2,12,8,.34)';

/** Slide promo/panduan (kartu non-saldo). Kartu saldo masuk lewat prop `heroSlide`. */
interface PromoSlide {
  id: string;
  kind: 'target' | 'app' | 'absensi' | 'tarikan' | 'talangan' | 'kasrt';
  eyebrow: string;
  judul: string;
  desc?: string;
  icon: LucideIcon;
  grad: string;
  glow: string;
  cta?: { label: string; tab: string };
}

/* ------------------------------------------------------------------ */
/* Dekorasi per-jenis kartu — motif tematik yang mengintip di kanan/   */
/* bawah, memperkuat makna slide (port dari mockup desain).            */
/* ------------------------------------------------------------------ */

/** Foto Pak RT & Bendahara menatap ke horizon → wajah "Bersama menuju target".
 *  Membleed dari sisi kanan, di-tint teal & di-fade ke gradient kartu agar judul
 *  + progress di kiri tetap tajam. Lapisan ini di bawah konten (teks) & di bawah
 *  glass overlay (sheen/vignette/noise) → grain ikut menyatukan foto dgn kartu. */
function TargetPhoto() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <img
        src={rtBendahara}
        alt=""
        width={859}
        height={760}
        loading="lazy"
        className="absolute right-0 top-0 h-full w-[68%] object-cover"
        style={{ objectPosition: '72% center', filter: 'saturate(.9) contrast(1.03)' }}
      />
      {/* Duotone teal — selaraskan cast biru foto dgn gradient slide. */}
      <div className="absolute right-0 top-0 h-full w-[68%]" style={{ background: 'linear-gradient(180deg, rgba(20,118,107,.34), rgba(8,72,64,.60))', mixBlendMode: 'multiply' }} />
      <div className="absolute right-0 top-0 h-full w-[68%]" style={{ background: 'linear-gradient(180deg, rgba(190,240,214,.12), transparent 42%)', mixBlendMode: 'soft-light' }} />
      {/* Fade kiri → lebur ke gradient kartu (judul tetap terbaca). */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #0f786c 0%, rgba(15,120,108,.84) 34%, rgba(15,120,108,0) 64%)' }} />
      {/* Scrim bawah → progress & tanggal tetap legibel di atas foto.
          Lebih tinggi & pekat: dua perhentian agar transisi halus tapi teks tegas. */}
      <div className="absolute inset-x-0 bottom-0 h-[58%]" style={{ background: 'linear-gradient(to top, rgba(6,34,28,.82), rgba(6,34,28,.34) 46%, transparent)' }} />
    </div>
  );
}

/** iPhone mengambang berisi screenshot dashboard asli (Beranda) → "pantau dari HP" yang konkret.
 *  Bingkai titanium gelap + dynamic island + sheen kaca tipis; sedikit miring & membleed
 *  ke kanan-bawah agar terasa melayang. */
function AppPhone() {
  return (
    <div
      aria-hidden
      className="banner-art-float absolute right-[-6px] top-[20px] h-[196px] w-[96px] rotate-[6deg] rounded-[26px] bg-[#0a0e0c] p-[3px]"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.24), 0 26px 44px -16px rgba(0,0,0,.72)' }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[23px] bg-black">
        <img
          src={dashboardPhone}
          alt=""
          width={360}
          height={779}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-top"
          draggable={false}
        />
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-[7px] z-10 h-[13px] w-[38px] -translate-x-1/2 rounded-full bg-black/95" />
        {/* Sheen kaca diagonal tipis di layar. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(132deg, rgba(255,255,255,.18), rgba(255,255,255,0) 36%)' }}
        />
      </div>
    </div>
  );
}

/** Mini daftar hadir — dua hadir (✓) satu absen (✗) → hadir dicatat, absen kena talangan. */
function AbsensiArt() {
  const rows = [true, true, false];
  return (
    <div className="pointer-events-none absolute bottom-[24px] right-[-6px] flex w-[142px] flex-col gap-[9px]">
      {rows.map((ok, i) => (
        <div key={i} className={`flex items-center gap-[9px] rounded-[11px] px-[10px] py-[8px] ${ok ? 'bg-white/14' : 'bg-white/10'}`}>
          <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ${ok ? 'bg-white' : 'bg-white/40'}`}>
            {ok
              ? <Check className="h-[11px] w-[11px] text-emerald-600" strokeWidth={3.5} />
              : <X className="h-[9px] w-[9px] text-white/90" strokeWidth={3} />}
          </span>
          <span className={`h-[6px] flex-1 rounded-full ${ok ? 'bg-white/50' : 'bg-white/30'}`} />
        </div>
      ))}
    </div>
  );
}

/** Penerima bermahkota + tumpukan koin → iuran terkumpul untuk satu Sohibul Bait. */
function TarikanArt() {
  return (
    <>
      <div
        className="absolute right-[14px] top-[18px] h-[60px] w-[60px] rounded-full p-[3px]"
        style={{ background: 'linear-gradient(135deg,#ffe27a,#e9a900)', boxShadow: '0 12px 22px -8px rgba(0,0,0,.55)' }}
      >
        <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-white/15 ring-1 ring-inset ring-white/40">
          <Coins className="h-6 w-6 text-white" strokeWidth={1.8} />
        </div>
        <Crown
          className="absolute left-1/2 top-[-9px] h-[18px] w-[18px] -translate-x-1/2 -rotate-[8deg] text-amber-200"
          fill="currentColor" strokeWidth={0}
          style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.4))' }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-[28px] right-[10px] flex flex-col gap-[5px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[16px] w-[78px] rounded-full"
            style={{ background: i === 2 ? 'linear-gradient(180deg,#ffe27a,#f0b520)' : 'linear-gradient(180deg,#ffd84d,#e9a900)', boxShadow: '0 4px 10px -3px rgba(0,0,0,.4)' }}
          />
        ))}
      </div>
    </>
  );
}

/** Nota miring "Rp50.000" → nominal talangan bagi yang tidak hadir. */
function TalanganArt() {
  return (
    <div className="pointer-events-none absolute bottom-[22px] right-[-18px] rotate-[8deg]">
      <div
        className="rounded-[14px] px-[16px] py-[11px] text-[#6e3700]"
        style={{ background: 'linear-gradient(135deg,#fff5e0,#ffe2a8)', boxShadow: '0 12px 24px -10px rgba(0,0,0,.5)' }}
      >
        <div className="flex items-center gap-[5px] text-[9px] font-extrabold uppercase tracking-[0.12em]">
          <span className="h-[6px] w-[6px] rounded-full bg-[#e9a900]" />Talangan
        </div>
        <div className="font-display text-[23px] font-extrabold tracking-[-.02em]">Rp50.000</div>
      </div>
    </div>
  );
}

/** Batang grafik → Kas RT besar yang terpisah dari Kas Hadiran. */
function KasrtArt() {
  const bars = [30, 48, 38, 62];
  return (
    <div className="pointer-events-none absolute bottom-[30px] right-0 flex items-end gap-[7px] opacity-85">
      {bars.map((h, i) => (
        <div key={i} className="w-[11px] rounded-[5px]" style={{ height: h, background: i === bars.length - 1 ? '#fff' : `rgba(255,255,255,${0.35 + i * 0.05})` }} />
      ))}
    </div>
  );
}


interface Props {
  /** Saldo Kas RT terkini → progress Target Kas RT. */
  /** Pindah tab saat CTA / kartu panduan ditekan. */
  onNavigate?: (tab: string) => void;
  /** Konten kartu SALDO (rumah) — dibangun di Beranda agar tetap memegang data
   *  live, Odometer, hide-amount & refresh. Carousel hanya membungkusnya dengan
   *  bingkai kartu 3D + dekorasi kaca. */
  heroSlide?: React.ReactNode;
  /** Sapuan sheen sekali-muat pada kartu saldo (kunjungan pertama sesi). */
  heroSweep?: boolean;
}

export default function BannerCarousel({ onNavigate, heroSlide, heroSweep }: Props) {
  const promos: PromoSlide[] = [
    {
      /* Judul TANPA nominal. "Bersama menuju Rp25 juta" mengulang angka target
         yang aslinya hidup di DB & bisa diubah bendahara lewat widget Target —
         begitu diubah, kartu ini diam-diam mempromosikan angka lama. */
      id: 'target-kas-rt', kind: 'target', eyebrow: 'TARGET KAS RT',
      judul: 'Bersama menabung untuk warga', desc: 'Lihat progres target kas RT tahun ini.', icon: Target,
      grad: 'linear-gradient(150deg,#2cb8a5 0%,#0a564e 100%)', glow: 'rgba(45,212,191,0.55)',
      cta: { label: 'Lihat Kas RT', tab: 'kas-rt' },
    },
    /* LIMA slide promo DIBUANG (24 Agu 2026) — 7 titik jadi 2.
       Empat "PANDUAN" (absensi / tarikan / talangan / kas-rt) mengulang isi
       TentangApp kata per kata, dan WelcomeSheet sudah menyambut pendatang
       baru. Ia materi ONBOARDING yang duduk permanen di hero: warga yang
       sudah 6 bulan memakai app tetap menggeserinya tiap hari. Slide kelima
       ('app-hp' — "Pantau kas RT dari HP") mengiklankan app kepada orang
       yang SEDANG membuka app itu.
       Yang tersisa satu, dan ia satu-satunya yang membawa keadaan HIDUP
       (progres target kas RT), bukan penjelasan yang tak pernah berubah. */
  ];

  const hasHero = heroSlide != null;
  const count = promos.length + (hasHero ? 1 : 0);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pressed, setPressed] = useState(false);
  // Autoplay berhenti permanen setelah user navigasi manual (swipe / tap indikator):
  // di HP tak ada hover/fokus utk menjeda, jadi "ambil kendali" = mekanisme stop
  // yang disyaratkan WCAG 2.2.2 (Pause, Stop, Hide). Sekali berhenti, tetap berhenti.
  const [stopped, setStopped] = useState(false);
  /* `onScreen` + IntersectionObserver-nya DIBUANG bersama shimmer (6 Agu):
     keduanya ada HANYA untuk menggerbang kilau kaca agar tak berputar di luar
     layar. Begitu loop-nya hilang, penjaganya jadi observer yang mengamati
     tanpa ada yang diamati. Autoplay punya gerbangnya sendiri (document.hidden
     + `stopped`), jadi tak ada yang kehilangan pelindung. */

  // Lebar viewport → lebar & spacing kartu (responsif, mobile-first).
  const viewportRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(340);
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setVw(el.clientWidth || 340);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cardW = Math.min(vw - 44, 326);
  const spacing = Math.round(cardW * 0.82);

  /* Ukuran LAYAR → tinggi kartu (menyusut di HP pendek/sempit). Lacak
     resize/rotasi.

     NAMANYA `lebarLayar`, bukan `vw`, dan itu bukan selera: `vw` di atas
     sudah dipakai untuk lebar ELEMEN viewport carousel (clientWidth lewat
     ResizeObserver), yang nilainya lebar layar DIKURANGI padding halaman
     (~32px). Memakai yang keliru menggeser ambang `heroRingkas` sejauh
     padding itu — persis 320 vs 352, cukup untuk membuat penjaga menyala di
     layar yang salah tanpa satu pun error. */
  const { vh, vw: lebarLayar } = useUkuranLayar();
  const cardH = cardHeight(vh, lebarLayar);
  const viewportH = cardH + CARD_GAP;

  // Refs untuk loop autoplay tanpa stale closure.
  const idxRef = useRef(0);
  const dirRef = useRef(1);
  const progRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const pressedRef = useRef(false);
  // Jeda autoplay saat pointer hover (mouse) atau fokus keyboard masuk (WCAG 2.2.2).
  const hoverRef = useRef(false);
  const focusRef = useRef(false);

  // Drag pointer.
  const startX = useRef(0);
  const startY = useRef(0);
  const activeRef = useRef(false);
  const movedRef = useRef(false);

  // Jaga index valid bila jumlah kartu berubah; reset progress saat slide ganti.
  useEffect(() => {
    if (index >= count) { setIndex(0); return; }
    idxRef.current = index;
    progRef.current = 0;
    if (progressBarRef.current) progressBarRef.current.style.transform = 'scaleX(0)';
  }, [index, count]);

  // Autoplay ping-pong + isi bar progress indikator aktif. Berhenti saat
  // reduced-motion, disentuh, atau tab tersembunyi.
  useEffect(() => {
    if (reduced || count <= 1 || stopped) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!draggingRef.current && !pressedRef.current && !hoverRef.current && !focusRef.current && !document.hidden) {
        const interval = idxRef.current === 0 && hasHero ? 6.5 : 4.8;
        progRef.current += dt / interval;
        if (progRef.current >= 1) {
          progRef.current = 0;
          // advance ping-pong
          const lastI = count - 1;
          let d = dirRef.current;
          let ni = idxRef.current + d;
          if (ni > lastI) { d = -1; ni = idxRef.current - 1; }
          else if (ni < 0) { d = 1; ni = idxRef.current + 1; }
          dirRef.current = d;
          setIndex(Math.max(0, Math.min(lastI, ni)));
        }
      }
      if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${progRef.current})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, reduced, hasHero, stopped]);

  if (count === 0) return null;

  function goTo(i: number) {
    setStopped(true); // navigasi manual → hentikan autoplay (WCAG 2.2.2)
    const ni = Math.max(0, Math.min(count - 1, i));
    if (ni !== index) haptic();
    setIndex(ni);
  }

  /* --- pointer drag (mouse + touch) --- */
  function onDown(e: React.PointerEvent) {
    activeRef.current = true;
    movedRef.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    setPressed(true); pressedRef.current = true;
    // Sengaja TIDAK setPointerCapture di sini — capture sejak sentuh bisa menelan
    // klik tombol di dalam kartu (Terkumpul/Talangan/Setor Kas RT, chevron CTA).
    // Capture baru dipasang saat drag benar-benar mulai (di onMove).
  }
  function onMove(e: React.PointerEvent) {
    if (!activeRef.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!draggingRef.current) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        setDragging(true); draggingRef.current = true; movedRef.current = true;
        // Tangkap pointer hanya untuk gerak drag → tetap mulus walau jari keluar kartu.
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
      } else return;
    }
    let ndx = dx;
    // Damping di tepi — geser melewati kartu pertama/terakhir terasa "kenyal".
    if ((index === 0 && ndx > 0) || (index === count - 1 && ndx < 0)) ndx *= 0.35;
    setDrag(ndx);
  }
  function onUp() {
    if (!activeRef.current) return;
    activeRef.current = false;
    const d = drag;
    const didDrag = draggingRef.current;
    let ni = index;
    if (didDrag) ni = Math.max(0, Math.min(count - 1, index + Math.round(-d / spacing)));
    setDrag(0);
    setDragging(false); draggingRef.current = false;
    setPressed(false); pressedRef.current = false;
    if (didDrag) setStopped(true); // swipe = ambil kendali → hentikan autoplay (WCAG 2.2.2)
    if (ni !== index) { haptic(); setIndex(ni); }
  }

  const currentFloat = index - drag / spacing;
  const pf = reduced ? 0 : 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Saldo, target & panduan"
      className="select-none"
      onFocusCapture={() => { focusRef.current = true; }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focusRef.current = false;
      }}
    >
      <div
        ref={viewportRef}
        className="relative w-full overflow-hidden"
        style={{
          height: viewportH, perspective: '1500px', perspectiveOrigin: '50% 42%', touchAction: 'pan-y',
          // Fade halus di tepi kiri/kanan → kartu tetangga yang mengintip MELEBUR
          // di tepi layar, bukan terpotong garis keras (teks tak lagi "kepotong").
          //
          // 16px, DIPERSEMPIT dari 28px (5 Agu). Peek tetangga cuma selebar ~22px
          // (tepi kartu aktif 352 → 374 di layar 390); ramp 28px memakan lebih dari
          // separuhnya, jadi bagian paling terang peek pun cuma 1,47:1 lawan kanvas.
          // Yang dulu dijaga ramp lebar = fragmen TEKS kartu tetangga, dan itu kini
          // nol lewat `contentOpacity` — sisa yang di-mask cuma tepi BERWARNA. Ramp
          // menyempit hanya menggeser titik lebur ke luar, tak pernah mendekati kartu
          // aktif: jaraknya 22px di 390px DAN di 360px (kartu ikut menyempit).
          maskImage: 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)',
        }}
        onMouseEnter={() => { hoverRef.current = true; }}
        onMouseLeave={() => { hoverRef.current = false; }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        /* Cegah swipe carousel bubbling ke useSwipeNavigate (App) → tak pindah tab. */
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {Array.from({ length: count }).map((_, i) => {
          const promo = hasHero ? (i === 0 ? null : promos[i - 1]) : promos[i];
          const isSaldo = promo === null;
          const d = i - currentFloat;
          const ad = Math.abs(d);
          const c1 = Math.min(ad, 1);
          const active = i === index;
          const scale = (1 - c1 * 0.12) * (pressed && active && !dragging ? 0.985 : 1);
          // Falloff opacity kartu tetangga. 0.45 (tetangga → 0.55), turun dari 0.72.
          //
          // Nilai 0.72 dipasang untuk meredam FRAGMEN TEKS kartu tetangga (mask tepi
          // 28px tak boleh dilebarkan — akan melarutkan tepi kartu aktif di HP sempit).
          // Tapi pekerjaan itu kini dipikul `contentOpacity` di bawah, yang sudah
          // menyentuh NOL tepat di posisi tetangga (c1=1 → 1-1.35 < 0). Dua rem untuk
          // satu tujuan, dan yang lebih tua menagih ongkosnya ke peek: diukur di
          // produksi (5 Agu) piksel tetangga rgb(229,236,242) lawan kanvas
          // rgb(236,241,247) = 1,05:1 di terang dan 1,02:1 di gelap — tumpukan 3D-nya
          // praktis LENYAP saat diam, dan seluruh isyarat "ada 6 kartu lagi" jatuh ke
          // titik indikator 7×4px di bawahnya. 0.55 mengembalikan peek sbg KARTU
          // (tepi berwarna), teks tetap dijaga contentOpacity.
          const opacity = Number((1 - c1 * 0.45).toFixed(3));
          // Konten (eyebrow/judul/desc/nominal) memudar LEBIH CEPAT dari kartunya:
          // kartu tetangga menyisakan tepi warna bersih (peek "ada lagi") TANPA
          // fragmen kata yang terbaca — memenuhi niat asli di komentar opacity di
          // atas. Teks menyingkap mulus saat kartu maju (feel wallet bertumpuk).
          const contentOpacity = Number(Math.max(0, 1 - c1 * 1.35).toFixed(3));
          const ty = (c1 * 10).toFixed(2);
          const x = (d * spacing).toFixed(2);
          const ry = (Math.max(-1, Math.min(1, d)) * -7).toFixed(2);
          const z = Math.round(50 - ad * 10);
          // Saldo: gradient dari util .hero-emerald (satu sumber, index.css) → background inline kosong.
          const grad = isSaldo ? '' : promo!.grad;
          const Icon = promo?.icon;
          // Lebar kolom teks (judul+desc) per kartu → selalu bersih dari dekorasi kanan.
          const tw = isSaldo ? '' : ({
            target: 'max-w-[56%]', app: 'max-w-[54%]', absensi: 'max-w-[74%]',
            tarikan: 'max-w-[66%]', talangan: 'max-w-[64%]', kasrt: 'max-w-[76%]',
          } as const)[promo!.kind];

          return (
            <div
              key={isSaldo ? 'saldo' : promo!.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} dari ${count}`}
              aria-hidden={!active}
              onClick={() => {
                if (movedRef.current) { movedRef.current = false; return; }
                if (!active) goTo(i);
              }}
              className={`absolute left-1/2 overflow-hidden text-white${isSaldo ? ' hero-emerald' : ''}${isSaldo && heroSweep ? ' sheen-sweep' : ''}`}
              style={{
                top: TOP, width: cardW, height: cardH, marginLeft: -cardW / 2,
                /* --hero-radius (24px), BUKAN 30 tulis-tangan: hero saldo di
                   Jadwal/Hadiran/Kas RT semuanya 24px, jadi kartu paling terlihat
                   di app justru satu-satunya yang menyimpang — dan DESIGN.stitch
                   §7 melarang radius kartu di atas 24px. Enam lapis kartu ini
                   (kartu, dua scrim, ring dalam, songket, skeleton) HARUS memakai
                   nilai yang sama; kalau salah satu tertinggal, sudutnya bertingkat. */
                borderRadius: 'var(--hero-radius)', padding: 24, boxSizing: 'border-box', background: grad, color: '#fff',
                transform: `translateX(${x}px) translateY(${ty}px) scale(${scale.toFixed(3)}) rotateY(${ry}deg)`,
                opacity, zIndex: z, willChange: 'transform, opacity',
                transition: dragging ? 'none' : `transform 0.62s ${EASE}, opacity 0.45s ${EASE}, box-shadow 0.45s ${EASE}`,
                boxShadow: active
                  ? '0 18px 40px -22px rgba(15,40,30,.40), 0 6px 16px -12px rgba(0,0,0,.28)'
                  : '0 10px 24px -18px rgba(0,0,0,.32)',
                cursor: dragging ? 'grabbing' : 'grab', WebkitFontSmoothing: 'antialiased',
              }}
            >
              {/* Sorot lembut tunggal di kanan-atas, ikut parallax tipis saat swipe →
                  dimensi halus tanpa kesan "berbayang". (Gaya flat/tegas ala BYOND.) */}
              <div
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  inset: '-12%',
                  transform: `translateX(${(-d * 16 * pf).toFixed(2)}px) translateY(${(-d * 4 * pf).toFixed(2)}px)`,
                  transition: dragging ? 'none' : `transform 0.62s ${EASE}`,
                }}
              >
                <div className="absolute" style={{ top: '-26%', right: '-16%', width: '76%', height: '76%', background: 'radial-gradient(circle at 62% 38%, rgba(255,255,255,.18), rgba(255,255,255,0) 62%)' }} />
                {promo?.kind === 'app' && (
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.10) 1.2px, transparent 1.2px)', backgroundSize: '17px 17px', opacity: 0.6 }} />
                )}
              </div>

              {/* Foto Pak RT & Bendahara — kartu target. Di bawah overlay & teks. */}
              {promo?.kind === 'target' && <TargetPhoto />}

              {/* Permukaan bersih & tegas: hanya hairline tepi tipis + scrim bawah ringan
                  agar teks legibel. Tanpa gloss/noise/vignette berat. */}
              <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 'var(--hero-radius)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.26), inset 0 1px 0 rgba(255,255,255,.36), inset 0 -1px 0 rgba(0,0,0,.18)' }} />
              <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 'var(--hero-radius)', background: 'linear-gradient(to top, rgba(0,0,0,.28), rgba(0,0,0,0) 46%)' }} />
              {/* Scrim ATAS — simetris dgn scrim bawah. Gradient stop teratas (mis.
                  saldo #2CC06E, target #2cb8a5) terlalu terang utk teks putih
                  (eyebrow 11px & desc 14px < 4.5:1). Scrim ini menarik kontras
                  eyebrow/judul/desc ke ≥4.5:1 tanpa mengubah warna brand gradient. */}
              <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 'var(--hero-radius)', background: 'linear-gradient(to bottom, rgba(0,0,0,.30), rgba(0,0,0,0) 56%)' }} />

              {/* Motif anyaman ketupat (songket) — identitas RT, HANYA kartu saldo.
                  Di bawah konten z-[3]; di-mask ke sudut kanan-atas → nominal kiri bersih. */}
              {isSaldo && <div aria-hidden className="songket-weave pointer-events-none absolute inset-0" style={{ borderRadius: 'var(--hero-radius)' }} />}

              {/* ---------- KONTEN ---------- */}
              {isSaldo ? (
                /* Kartu saldo non-aktif: tombol Eye/Refresh/stat di dalam heroSlide
                   dibangun di Beranda → tak ikut tabIndex per-slide. Tandai `inert`
                   saat kartu tak aktif agar fokus & a11y-tree-nya benar-benar mati,
                   selaras dgn aria-hidden kartu (tak ada focusable di dalam aria-hidden). */
                <div
                  className="relative z-[3] flex h-full flex-col"
                  style={{ opacity: contentOpacity, transition: dragging ? 'none' : `opacity 0.42s ${EASE}` }}
                  {...(!active ? ({ inert: '' } as Record<string, string>) : {})}
                >
                  {heroSlide}
                </div>
              ) : (
                <div className="relative z-[3] flex h-full flex-col" style={{ textShadow: TEXT_SHADOW, opacity: contentOpacity, transition: dragging ? 'none' : `opacity 0.42s ${EASE}` }}>
                  {/* Chevron CTA mid-kanan (slide dengan tujuan navigasi). */}
                  {promo!.cta && onNavigate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); haptic(); onNavigate(promo!.cta!.tab); }}
                      aria-label={promo!.cta.label}
                      tabIndex={active ? 0 : -1}
                      className="press absolute right-[-4px] top-1/2 z-10 grid h-[38px] w-[38px] -translate-y-1/2 place-items-center rounded-full bg-white/20 ring-1 ring-inset ring-white/15 before:absolute before:-inset-[3px] before:content-['']"
                    >
                      <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    </button>
                  )}

                  {/* Eyebrow: tile ikon + label. */}
                  <div className="flex items-center gap-2">
                    <div
                      className="grid h-[44px] w-[44px] place-items-center rounded-2xl bg-white/15"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22)' }}
                    >
                      {Icon && <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />}
                    </div>
                    <span className="text-overline font-bold uppercase text-white">{promo!.eyebrow}</span>
                  </div>

                  {/* Judul + deskripsi — lebar di-clamp per kartu agar tak tertimpa dekorasi kanan. */}
                  <div className={`mt-4 text-balance text-title font-extrabold ${tw}`}>{promo!.judul}</div>
                  {promo!.desc && (
                    <div className={`mt-3 text-pretty text-body font-medium leading-relaxed text-white ${tw}`}>{promo!.desc}</div>
                  )}

                  {/* Kartu target = AJAKAN, bukan laporan (5 Agu 2026).

                      Dulu di sini ada bar progress + "18% · kurang Rp20.530.000".
                      Angkanya SALAH: ia dihitung dari `total_setor_kas_rt`
                      (setoran Kas Hadiran → Kas RT, Rp4,47jt), bukan SALDO Kas
                      RT (Rp17,16jt). Kartu Target di halaman Kas RT membaca
                      saldo & target yang benar dari DB dan menampilkan 69%.
                      Jadi layar depan menyatakan 18% ke setiap warga untuk
                      pencapaian yang sebenarnya 69% — mengecilkannya ~4×.

                      Beranda memang TAK PUNYA angkanya: `summary` cuma membawa
                      `saldo_aktif` (itu saldo Kas HADIRAN), setoran, & talangan.
                      Saldo Kas RT maupun baris target tak pernah diambil di
                      layar ini, dan menambah query di layar ber-FCP terjaga cuma
                      demi mengulang angka yang sudah punya rumah = ongkos tanpa
                      manfaat.

                      Maka progresnya DIHAPUS, bukan diperbaiki: satu fakta satu
                      suara — target hidup di halaman Kas RT, kartu ini cukup
                      mengantar ke sana lewat CTA-nya. Jangan pasang ulang bar/
                      persen di sini tanpa membawa saldo & target ASLI dari DB. */}

                  {/* Dekorasi tematik per jenis. */}
                  {promo!.kind === 'app' && <AppPhone />}
                  {promo!.kind === 'absensi' && <AbsensiArt />}
                  {promo!.kind === 'tarikan' && <TarikanArt />}
                  {promo!.kind === 'talangan' && <TalanganArt />}
                  {promo!.kind === 'kasrt' && <KasrtArt />}
                </div>
              )}

              {/* Kilau kaca DIBUANG (6 Agu). Ia menyapu SELURUH kartu aktif —
                  termasuk slide saldo — jadi kilau kaca putih 16% lewat di atas
                  angka uang tiap 5,5 detik, selamanya. Dua alasan, keduanya
                  sudah tertulis di tempat lain: permukaan carousel ini sengaja
                  FLAT & tegas (glass/glow/noise DITOLAK), dan kanon §7 melarang
                  loop dekoratif abadi. Kartu tetap "hidup" lewat autoplay,
                  tumpukan 3D, drag, dan indikator — bukan lewat kilau. */}
            </div>
          );
        })}
      </div>

      {/* Indikator "story" tersegmen — aktif melebar + bar progress mengisi;
          yang sudah lewat terisi penuh. */}
      {count > 1 && (
        <div className="flex items-center justify-center pt-0.5">
          {/* Dot inaktif 7px + 2×19 = 45px (lolos ambang app 44). Di atas 3
              slide, deretannya jadi terlalu lebar → balik ke 9px & pengecualian
              §2.5.8-nya yang lama (lihat catatan panjang di bawah). */}
          {Array.from({ length: count }).map((_, i) => {
            const padX = count <= 3 ? 19 : 9;
            const isActive = i === index;
            const past = i < index;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ke slide ${i + 1}`}
                aria-current={isActive}
                className="press grid place-items-center"
                // padding-x 8.5 + gap 0 di baris → kotak sentuh 24px persis dan
                // BERSINGGUNGAN, tidak bertumpuk (WCAG 2.5.8 AA). Dulu lebar
                // tombol = lebar dot (7px) → praktis tak bisa diketuk (audit
                // 30 Jul). Dot-nya sendiri tetap 7px: yang tumbuh cuma ruang.
                //
                // Ruang samping IKUT jumlah slide (24 Agu 2026). Sampai hari ini
                // nilainya tetap 9px, dan `audit:sentuh` melaporkan 25×45 — di
                // bawah ambang APP 44px — sebagai pengecualian yang disengaja.
                // Alasannya tertulis apa adanya: "menaikkannya ke 44 berarti
                // 7 × 44 = 308px, deretan ini berubah jadi bilah navigasi
                // selebar layar".
                //
                // Alasan itu SUDAH TIDAK BERLAKU. Slide promo dipangkas 6 → 1,
                // jadi count = 2 dan 2 × 45 = 90px: masih terbaca sebagai
                // kelompok rapat di bawah kartu 326px. Pengecualiannya lahir
                // dari jumlah slide, bukan dari sifat indikatornya — maka
                // gerbangnya sekarang jumlah slide juga, dan kompromi lamanya
                // kembali sendiri kalau carousel tumbuh lagi. Jangan dijadikan
                // 19 tetap: pada 7 slide ia mengulang persis masalah yang dulu.
                style={{
                  minHeight: 44, paddingTop: 16, paddingBottom: 16,
                  paddingLeft: padX, paddingRight: padX,
                }}
              >
                {/* Rel indikator = token `control` (abu kontrol inaktif), BUKAN
                    brand beralpha. `bg-brand/20` di atas kanvas mist terukur
                    rgb(192,208,207) = 1,4:1 (5 Agu) — segmen "belum lewat" praktis
                    tak terlihat, padahal ia yang memberi tahu ADA BERAPA kartu.
                    Alpha tak bisa menolong: brand/70 pun cuma 2,53:1. `control`
                    (#64748B / dark #6B7280) = 4,19:1 & 4,17:1, dan justru MENAJAMKAN
                    beda keadaan — abu = belum dilihat, hijau = aktif/sudah lewat.
                    Nilainya token yang sama dgn batas kolom isian, bukan hex baru.
                    Rel abu ini juga bikin bar progress autoplay akhirnya terbaca. */}
                <span
                  className="block h-1 overflow-hidden rounded-full bg-control dark:bg-control-dark"
                  style={{ width: isActive ? 26 : 7, transition: reduced ? 'none' : `width 0.42s ${EASE}` }}
                >
                  {isActive && !reduced && !stopped && (
                    <span ref={progressBarRef} className="block h-full w-full origin-left rounded-full bg-brand dark:bg-brand-linkDark" style={{ transform: 'scaleX(0)' }} />
                  )}
                  {(past || (isActive && (reduced || stopped))) && (
                    <span className="block h-full w-full rounded-full bg-brand dark:bg-brand-linkDark" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
