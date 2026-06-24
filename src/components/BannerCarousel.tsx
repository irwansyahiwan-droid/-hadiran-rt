import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Target, ClipboardCheck, HandCoins, Coins, Building2, Smartphone,
  ChevronRight, Crown, Check, X, CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import { formatRupiahPlain, haptic } from '../lib/utils';
import rtBendahara from '../assets/rt-bendahara.jpg';

/** Target Kas RT yang dipromosikan di carousel (info, terpisah dari widget editable). */
const TARGET_NOMINAL = 25_000_000;
const TARGET_DEADLINE = '2026-12-31';

/* Geometri kartu 3D. Lebar/spacing dihitung dari lebar viewport carousel (responsif);
   tinggi tetap agar tumpukan kartu konsisten antar-slide. */
const CARD_H = 344;     // tinggi kartu (px)
const TOP = 8;          // offset atas kartu di dalam viewport
const VIEWPORT_H = 362; // tinggi area carousel — rapat di bawah kartu (8px sisa), bayangan toh ter-clip

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
      <div className="absolute right-0 top-0 h-full w-[68%]" style={{ background: 'linear-gradient(180deg, rgba(31,138,126,.24), rgba(14,95,87,.46))', mixBlendMode: 'multiply' }} />
      <div className="absolute right-0 top-0 h-full w-[68%]" style={{ background: 'linear-gradient(180deg, rgba(190,240,214,.12), transparent 42%)', mixBlendMode: 'soft-light' }} />
      {/* Fade kiri → lebur ke gradient kartu (judul tetap terbaca). */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #1c8576 0%, rgba(28,133,118,.80) 32%, rgba(28,133,118,0) 64%)' }} />
      {/* Scrim bawah → progress & tanggal tetap legibel di atas foto.
          Lebih tinggi & pekat: dua perhentian agar transisi halus tapi teks tegas. */}
      <div className="absolute inset-x-0 bottom-0 h-[58%]" style={{ background: 'linear-gradient(to top, rgba(6,34,28,.82), rgba(6,34,28,.34) 46%, transparent)' }} />
    </div>
  );
}

/** Mockup HP mengambang — cuplikan dashboard distylisasi (mini hero + stat + transaksi). */
function AppPhone() {
  return (
    <div
      aria-hidden
      className="banner-art-float absolute right-[-2px] top-[6px] h-[128px] w-[98px] overflow-hidden rounded-[20px] bg-[#080c09] p-[5px]"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18), 0 22px 36px -16px rgba(0,0,0,.75)' }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-gray-50">
        <div className="absolute left-1/2 top-[5px] z-10 h-[3.5px] w-[22px] -translate-x-1/2 rounded-full bg-gray-900/90" />
        <div className="px-[6px] pt-3">
          <div className="h-[34px] rounded-[8px]" style={{ background: 'linear-gradient(135deg,#0D5B36,#1C9A5C)' }} />
          <div className="mt-[6px] flex gap-[3px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[15px] flex-1 rounded-[3px] bg-white ring-1 ring-gray-200/80" />
            ))}
          </div>
          <div className="mt-[6px] space-y-[4px]">
            <div className="h-[6px] rounded-full bg-gray-200" />
            <div className="h-[6px] w-2/3 rounded-full bg-gray-200" />
            <div className="h-[6px] w-5/6 rounded-full bg-gray-200" />
          </div>
        </div>
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
        className="rounded-[14px] px-[16px] py-[11px] text-[#b25e00]"
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
      grad: 'linear-gradient(150deg,#1f8a7e 0%,#0e5f57 100%)', glow: 'rgba(45,212,191,0.55)',
      cta: { label: 'Lihat Kas RT', tab: 'kas-rt' },
    },
    {
      id: 'app-hp', kind: 'app', eyebrow: 'APLIKASI',
      judul: 'Pantau kas RT dari HP', desc: 'Saldo, jadwal & talangan dalam satu genggaman.',
      icon: Smartphone, grad: 'linear-gradient(160deg,#1b2620 0%,#0e1512 100%)', glow: 'rgba(45,212,150,0.5)',
    },
    {
      id: 'panduan-absensi', kind: 'absensi', eyebrow: 'PANDUAN · ABSENSI',
      judul: 'Hadir dicatat setiap tarikan', desc: 'Bendahara menandai daftar hadir per tarikan. Yang tidak hadir otomatis kena talangan.',
      icon: ClipboardCheck, grad: 'linear-gradient(150deg,#2d5fda 0%,#16399f 100%)', glow: 'rgba(96,165,250,0.55)',
      cta: { label: 'Buka Jadwal', tab: 'jadwal' },
    },
    {
      id: 'panduan-tarikan', kind: 'tarikan', eyebrow: 'PANDUAN · TARIKAN',
      judul: 'Satu Sohibul Bait per tarikan', desc: 'Setiap tarikan ada satu penerima. Iuran semua anggota yang hadir terkumpul untuknya.',
      icon: Coins, grad: 'linear-gradient(150deg,#7140d4 0%,#421f96 100%)', glow: 'rgba(167,139,250,0.55)',
      cta: { label: 'Buka Jadwal', tab: 'jadwal' },
    },
    {
      id: 'panduan-talangan', kind: 'talangan', eyebrow: 'PANDUAN · TALANGAN',
      judul: 'Tidak hadir kena talangan', desc: 'Talangan wajib dilunasi sebelum tarikan berikutnya agar kas tetap sehat.',
      icon: HandCoins, grad: 'linear-gradient(150deg,#c67414 0%,#954908 100%)', glow: 'rgba(251,191,36,0.5)',
      cta: { label: 'Lihat Talangan', tab: 'talangan' },
    },
    {
      id: 'panduan-kas-rt', kind: 'kasrt', eyebrow: 'PANDUAN · KAS RT',
      judul: 'Kas besar RT yang terpisah', desc: 'Sebagian setoran masuk ke Kas RT — terpisah dari Kas Hadiran, untuk kebutuhan warga.',
      icon: Building2, grad: 'linear-gradient(150deg,#177f40 0%,#095d3c 100%)', glow: 'rgba(16,185,129,0.55)',
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

  // Refs untuk loop autoplay tanpa stale closure.
  const idxRef = useRef(0);
  const dirRef = useRef(1);
  const progRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const pressedRef = useRef(false);

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
    if (reduced || count <= 1) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!draggingRef.current && !pressedRef.current && !document.hidden) {
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
  }, [count, reduced, hasHero]);

  if (count === 0) return null;

  function goTo(i: number) {
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
    let ni = index;
    if (draggingRef.current) ni = Math.max(0, Math.min(count - 1, index + Math.round(-d / spacing)));
    setDrag(0);
    setDragging(false); draggingRef.current = false;
    setPressed(false); pressedRef.current = false;
    if (ni !== index) { haptic(); setIndex(ni); }
  }

  const currentFloat = index - drag / spacing;
  const pf = reduced ? 0 : 1;

  return (
    <section aria-roledescription="carousel" aria-label="Saldo, target & panduan" className="select-none">
      <div
        ref={viewportRef}
        className="relative w-full overflow-hidden"
        style={{ height: VIEWPORT_H, perspective: '1500px', perspectiveOrigin: '50% 42%', touchAction: 'pan-y' }}
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
          const opacity = Number((1 - c1 * 0.5).toFixed(3));
          const ty = (c1 * 10).toFixed(2);
          const x = (d * spacing).toFixed(2);
          const ry = (Math.max(-1, Math.min(1, d)) * -7).toFixed(2);
          const z = Math.round(50 - ad * 10);
          const grad = isSaldo
            ? 'linear-gradient(150deg,#1a8848 0%,#0a5c2f 55%,#06351d 100%)'
            : promo!.grad;
          const Icon = promo?.icon;
          // Lebar kolom teks (judul+desc) per kartu → selalu bersih dari dekorasi kanan.
          const tw = isSaldo ? '' : ({
            target: 'max-w-[56%]', app: 'max-w-[60%]', absensi: 'max-w-[74%]',
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
                top: TOP, width: cardW, height: CARD_H, marginLeft: -cardW / 2,
                borderRadius: 30, padding: 24, boxSizing: 'border-box', background: grad, color: '#fff',
                transform: `translateX(${x}px) translateY(${ty}px) scale(${scale.toFixed(3)}) rotateY(${ry}deg)`,
                opacity, zIndex: z, willChange: 'transform, opacity',
                transition: dragging ? 'none' : 'transform 0.62s cubic-bezier(.22,.61,.36,1), opacity 0.45s ease, box-shadow 0.45s ease',
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
                  transition: dragging ? 'none' : 'transform 0.62s cubic-bezier(.22,.61,.36,1)',
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
              <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 30, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.20), inset 0 1px 0 rgba(255,255,255,.26)' }} />
              <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 30, background: 'linear-gradient(to top, rgba(0,0,0,.20), rgba(0,0,0,0) 40%)' }} />

              {/* ---------- KONTEN ---------- */}
              {isSaldo ? (
                <div className="relative z-[3] flex h-full flex-col">{heroSlide}</div>
              ) : (
                <div className="relative z-[3] flex h-full flex-col">
                  {/* Chevron CTA mid-kanan (slide dengan tujuan navigasi). */}
                  {promo!.cta && onNavigate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); haptic(); onNavigate(promo!.cta!.tab); }}
                      aria-label={promo!.cta.label}
                      className="press absolute right-[-4px] top-1/2 z-10 grid h-[38px] w-[38px] -translate-y-1/2 place-items-center rounded-full bg-white/20 ring-1 ring-inset ring-white/15"
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
                    <div className={`mt-[10px] text-[0.85rem] font-medium leading-relaxed text-white ${tw}`}>{promo!.desc}</div>
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
                            transition: reduced ? 'none' : 'width 0.95s cubic-bezier(.22,.61,.36,1)',
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
        <div className="flex items-center justify-center gap-1.5 pt-2">
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
                style={{ minHeight: 28, paddingTop: 8, paddingBottom: 8 }}
              >
                <span
                  className="block h-1 overflow-hidden rounded-full bg-brand/20 dark:bg-brand-linkDark/25"
                  style={{ width: isActive ? 26 : 7, transition: 'width 0.42s cubic-bezier(.22,.61,.36,1)' }}
                >
                  {isActive && !reduced && (
                    <span ref={progressBarRef} className="block h-full rounded-full bg-brand dark:bg-brand-linkDark" style={{ width: '0%' }} />
                  )}
                  {(past || (isActive && reduced)) && (
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
