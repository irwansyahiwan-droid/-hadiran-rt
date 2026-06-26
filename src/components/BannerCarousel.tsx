import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Target, ClipboardCheck, HandCoins, Coins, Building2, Smartphone,
  ChevronRight, Crown, Check, X, CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import { formatRupiahPlain, haptic } from '../lib/utils';
import rtBendahara from '../assets/rt-bendahara.jpg';
import dashboardPhone from '../assets/dashboard-phone.jpg';

/** Target Kas RT yang dipromosikan di carousel (info, terpisah dari widget editable). */
const TARGET_NOMINAL = 25_000_000;
const TARGET_DEADLINE = '2026-12-31';

/* Geometri kartu 3D. Lebar/spacing dihitung dari lebar viewport carousel (responsif).
   Tinggi: maksimum tetap (344) agar tumpukan kartu konsisten di HP normal, TAPI
   menyusut di layar pendek (mis. iPhone SE 667px) supaya hero tak menelan >½ layar
   pertama & seksi di bawahnya tetap mengintip (lihat cardHeight()). */
const CARD_H = 344;     // tinggi kartu maksimum (px)
const TOP = 8;          // offset atas kartu di dalam viewport
const CARD_GAP = 18;    // sisa tinggi viewport di luar kartu (TOP + napas bawah)

/** Tinggi kartu efektif menurut tinggi viewport. ≥740px → 344 persis (HP modern,
 *  desain tak berubah). Di bawah itu skala ~46.5% tinggi layar, lantai 300px. */
function cardHeight(vh: number): number {
  return vh >= 740 ? CARD_H : Math.max(300, Math.round(vh * 0.465));
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

/** Hitung "31 Des 2026 · N hari lagi". */
function fmtDeadline(iso: string): string {
  const d = new Date(iso);
  const hari = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return hari >= 0 ? `${tgl} · ${hari} hari lagi` : `${tgl} · lewat`;
}

interface Props {
  /** Saldo Kas RT terkini → progress Target Kas RT. */
  kasRT?: number;
  /** Pindah tab saat CTA / kartu panduan ditekan. */
  onNavigate?: (tab: string) => void;
  /** Konten kartu SALDO (rumah) — dibangun di Beranda agar tetap memegang data
   *  live, Odometer, hide-amount & refresh. Carousel hanya membungkusnya dengan
   *  bingkai kartu 3D + dekorasi kaca. */
  heroSlide?: React.ReactNode;
  /** Sapuan sheen sekali-muat pada kartu saldo (kunjungan pertama sesi). */
  heroSweep?: boolean;
}

export default function BannerCarousel({ kasRT = 0, onNavigate, heroSlide, heroSweep }: Props) {
  const promos: PromoSlide[] = [
    {
      id: 'target-kas-rt', kind: 'target', eyebrow: 'TARGET KAS RT',
      judul: 'Bersama menuju Rp25 juta', icon: Target,
      grad: 'linear-gradient(150deg,#2cb8a5 0%,#0a564e 100%)', glow: 'rgba(45,212,191,0.55)',
      cta: { label: 'Lihat Kas RT', tab: 'kas-rt' },
    },
    {
      id: 'app-hp', kind: 'app', eyebrow: 'APLIKASI',
      judul: 'Pantau kas RT dari HP', desc: 'Saldo, jadwal & talangan dalam satu genggaman.',
      icon: Smartphone, grad: 'linear-gradient(160deg,#33503f 0%,#0e1c15 100%)', glow: 'rgba(45,212,150,0.5)',
    },
    {
      id: 'panduan-absensi', kind: 'absensi', eyebrow: 'PANDUAN · ABSENSI',
      judul: 'Hadir dicatat setiap tarikan', desc: 'Bendahara menandai daftar hadir per tarikan. Yang tidak hadir otomatis kena talangan.',
      icon: ClipboardCheck, grad: 'linear-gradient(150deg,#4a7cf6 0%,#173dac 100%)', glow: 'rgba(96,165,250,0.55)',
      cta: { label: 'Buka Jadwal', tab: 'jadwal' },
    },
    {
      id: 'panduan-tarikan', kind: 'tarikan', eyebrow: 'PANDUAN · TARIKAN',
      judul: 'Satu Sohibul Bait per tarikan', desc: 'Setiap tarikan ada satu penerima. Iuran semua anggota yang hadir terkumpul untuknya.',
      icon: Coins, grad: 'linear-gradient(150deg,#9059f2 0%,#4825a8 100%)', glow: 'rgba(167,139,250,0.55)',
      cta: { label: 'Buka Jadwal', tab: 'jadwal' },
    },
    {
      id: 'panduan-talangan', kind: 'talangan', eyebrow: 'PANDUAN · TALANGAN',
      judul: 'Tidak hadir kena talangan', desc: 'Talangan wajib dilunasi sebelum tarikan berikutnya agar kas tetap sehat.',
      icon: HandCoins, grad: 'linear-gradient(150deg,#ef9120 0%,#9a4c07 100%)', glow: 'rgba(251,191,36,0.5)',
      cta: { label: 'Lihat Talangan', tab: 'talangan' },
    },
    {
      id: 'panduan-kas-rt', kind: 'kasrt', eyebrow: 'PANDUAN · KAS RT',
      judul: 'Kas besar RT yang terpisah', desc: 'Sebagian setoran masuk ke Kas RT — terpisah dari Kas Hadiran, untuk kebutuhan warga.',
      icon: Building2, grad: 'linear-gradient(150deg,#22a957 0%,#0a5e3d 100%)', glow: 'rgba(16,185,129,0.55)',
      cta: { label: 'Lihat Kas RT', tab: 'kas-rt' },
    },
  ];

  const hasHero = heroSlide != null;
  const count = promos.length + (hasHero ? 1 : 0);
  const heroOffset = hasHero ? 1 : 0;
  const targetIdx = promos.findIndex((p) => p.kind === 'target') + heroOffset;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const ratio = TARGET_NOMINAL > 0 ? Math.min(100, Math.max(0, (kasRT / TARGET_NOMINAL) * 100)) : 0;
  const sisa = Math.max(0, TARGET_NOMINAL - kasRT);
  const done = kasRT >= TARGET_NOMINAL;

  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pressed, setPressed] = useState(false);
  // Autoplay berhenti permanen setelah user navigasi manual (swipe / tap indikator):
  // di HP tak ada hover/fokus utk menjeda, jadi "ambil kendali" = mekanisme stop
  // yang disyaratkan WCAG 2.2.2 (Pause, Stop, Hide). Sekali berhenti, tetap berhenti.
  const [stopped, setStopped] = useState(false);
  // Bar progress target "ditarik" 0→ratio tiap kali kartu target jadi aktif.
  const [targetFill, setTargetFill] = useState(0);

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

  // Tinggi layar → tinggi kartu (shrink di HP pendek). Lacak resize/rotasi.
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const cardH = cardHeight(vh);
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
    if (progressBarRef.current) progressBarRef.current.style.width = '0%';
    // Kartu target → tarik ulang bar dari 0.
    if (index === targetIdx) {
      setTargetFill(0);
      const id = window.setTimeout(() => setTargetFill(ratio), 60);
      return () => window.clearTimeout(id);
    }
    setTargetFill(0);
  }, [index, count, targetIdx, ratio]);

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
      if (progressBarRef.current) progressBarRef.current.style.width = `${progRef.current * 100}%`;
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
        style={{ height: viewportH, perspective: '1500px', perspectiveOrigin: '50% 42%', touchAction: 'pan-y' }}
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
          const opacity = Number((1 - c1 * 0.62).toFixed(3));
          const ty = (c1 * 10).toFixed(2);
          const x = (d * spacing).toFixed(2);
          const ry = (Math.max(-1, Math.min(1, d)) * -7).toFixed(2);
          const z = Math.round(50 - ad * 10);
          const grad = isSaldo
            ? 'linear-gradient(150deg,#24ad5c 0%,#0c6c3a 52%,#064a28 100%)'
            : promo!.grad;
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
              className={`absolute left-1/2 overflow-hidden text-white${isSaldo && heroSweep ? ' sheen-sweep' : ''}`}
              style={{
                top: TOP, width: cardW, height: cardH, marginLeft: -cardW / 2,
                borderRadius: 30, padding: 24, boxSizing: 'border-box', background: grad, color: '#fff',
                transform: `translateX(${x}px) translateY(${ty}px) scale(${scale.toFixed(3)}) rotateY(${ry}deg)`,
                opacity, zIndex: z, willChange: 'transform, opacity',
                transition: dragging ? 'none' : `transform 0.62s ${EASE}, opacity 0.45s ease, box-shadow 0.45s ease`,
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
              <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 30, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.26), inset 0 1px 0 rgba(255,255,255,.36), inset 0 -1px 0 rgba(0,0,0,.18)' }} />
              <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 30, background: 'linear-gradient(to top, rgba(0,0,0,.28), rgba(0,0,0,0) 46%)' }} />
              {/* Scrim ATAS — simetris dgn scrim bawah. Gradient stop teratas (mis.
                  saldo #24ad5c, target #2cb8a5) terlalu terang utk teks putih
                  (eyebrow 11px & desc 14px < 4.5:1). Scrim ini menarik kontras
                  eyebrow/judul/desc ke ≥4.5:1 tanpa mengubah warna brand gradient. */}
              <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 30, background: 'linear-gradient(to bottom, rgba(0,0,0,.30), rgba(0,0,0,0) 56%)' }} />

              {/* Motif anyaman ketupat (songket) — identitas RT, HANYA kartu saldo.
                  Di bawah konten z-[3]; di-mask ke sudut kanan-atas → nominal kiri bersih. */}
              {isSaldo && <div aria-hidden className="songket-weave pointer-events-none absolute inset-0" style={{ borderRadius: 30 }} />}

              {/* ---------- KONTEN ---------- */}
              {isSaldo ? (
                /* Kartu saldo non-aktif: tombol Eye/Refresh/stat di dalam heroSlide
                   dibangun di Beranda → tak ikut tabIndex per-slide. Tandai `inert`
                   saat kartu tak aktif agar fokus & a11y-tree-nya benar-benar mati,
                   selaras dgn aria-hidden kartu (tak ada focusable di dalam aria-hidden). */
                <div
                  className="relative z-[3] flex h-full flex-col"
                  {...(!active ? ({ inert: '' } as Record<string, string>) : {})}
                >
                  {heroSlide}
                </div>
              ) : (
                <div className="relative z-[3] flex h-full flex-col" style={{ textShadow: TEXT_SHADOW }}>
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
                  <div className="flex items-center gap-[9px]">
                    <div
                      className="grid h-[44px] w-[44px] place-items-center rounded-[14px] bg-white/15"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22)' }}
                    >
                      {Icon && <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />}
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">{promo!.eyebrow}</span>
                  </div>

                  {/* Judul + deskripsi — lebar di-clamp per kartu agar tak tertimpa dekorasi kanan. */}
                  <div className={`mt-[16px] text-[1.5rem] font-extrabold leading-[1.16] tracking-[-.02em] ${tw}`}>{promo!.judul}</div>
                  {promo!.desc && (
                    <div className={`mt-[10px] text-[0.9rem] font-medium leading-relaxed text-white ${tw}`}>{promo!.desc}</div>
                  )}

                  {/* Progress target → kartu target Kas RT. */}
                  {promo!.kind === 'target' && (
                    <div className="mt-auto">
                      <div className="relative h-[9px] overflow-hidden rounded-full bg-white/20">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full"
                          style={{
                            width: `${targetFill}%`,
                            background: 'linear-gradient(90deg,#bff0d6,#ffffff)',
                            boxShadow: '0 0 12px rgba(255,255,255,.5)',
                            transition: reduced ? 'none' : `width 0.95s ${EASE}`,
                          }}
                        />
                      </div>
                      <div
                        className="mt-[12px] flex items-center justify-between text-[0.78rem] text-white"
                        style={{ textShadow: '0 1px 4px rgba(4,28,22,.55)' }}
                      >
                        <span className="font-extrabold tabular-nums">
                          {done ? 'Target tercapai 🎉' : <>{Math.round(ratio)}% · <span className="font-semibold text-white/90">kurang {formatRupiahPlain(sisa)}</span></>}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-white/90">
                          <CalendarClock className="h-3 w-3" /> {fmtDeadline(TARGET_DEADLINE)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dekorasi tematik per jenis. */}
                  {promo!.kind === 'app' && <AppPhone />}
                  {promo!.kind === 'absensi' && <AbsensiArt />}
                  {promo!.kind === 'tarikan' && <TarikanArt />}
                  {promo!.kind === 'talangan' && <TalanganArt />}
                  {promo!.kind === 'kasrt' && <KasrtArt />}
                </div>
              )}

              {/* Kilau kaca menyapu — hanya kartu aktif. */}
              {active && !reduced && <div aria-hidden className="banner-shimmer" />}
            </div>
          );
        })}
      </div>

      {/* Indikator "story" tersegmen — aktif melebar + bar progress mengisi;
          yang sudah lewat terisi penuh. */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {Array.from({ length: count }).map((_, i) => {
            const isActive = i === index;
            const past = i < index;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ke slide ${i + 1}`}
                aria-current={isActive}
                className="press grid place-items-center"
                style={{ minHeight: 44, paddingTop: 16, paddingBottom: 16 }}
              >
                <span
                  className="block h-1 overflow-hidden rounded-full bg-brand/20 dark:bg-brand-linkDark/25"
                  style={{ width: isActive ? 26 : 7, transition: reduced ? 'none' : `width 0.42s ${EASE}` }}
                >
                  {isActive && !reduced && !stopped && (
                    <span ref={progressBarRef} className="block h-full rounded-full bg-brand dark:bg-brand-linkDark" style={{ width: '0%' }} />
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
