import { useEffect, useRef, useState } from 'react';
import {
  Target, Palmtree, ClipboardCheck, HandCoins, Coins, Building2,
  ChevronRight, CalendarClock, PartyPopper, Smartphone, Check, X, Star,
  type LucideIcon,
} from 'lucide-react';
import { formatRupiahPlain, haptic } from '../lib/utils';

/** Target Kas RT yang dipromosikan di carousel (info, terpisah dari widget editable). */
const TARGET_NOMINAL = 25_000_000;
const TARGET_DEADLINE = '2026-12-31';

/** Satu kartu di carousel. */
interface BannerSlide {
  id: string;
  label: string;       // kapsul kecil uppercase
  judul: string;
  isi: string;
  icon: LucideIcon;
  grad: string;        // gradien latar
  glow: string;        // warna glow di balik ikon
  cta?: { label: string; tab: string };
  /** Bila ada → render progress bar (Target Kas RT) menggantikan teks isi. */
  progress?: { value: number; max: number; deadline: string };
  /** Pita kecil di pojok (mis. "Tercapai!"). */
  ribbon?: string;
  /** Bila true → render mockup iPhone mengintip di kanan (slide promo aplikasi). */
  phone?: boolean;
  /** Motif dekoratif mengintip di kanan (slide panduan) — memperkuat makna slide. */
  art?: 'absensi' | 'tarikan' | 'talangan' | 'kas-rt';
}

/** Mockup iPhone kecil yang mengintip dari kanan banner — cuplikan dashboard
 *  yang distylisasi (mini hero + baris stat + transaksi), bukan screenshot. */
function PhoneMock() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-2 top-3 z-[1] w-[78px] rotate-[-8deg]"
      style={{ filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.45))' }}
    >
      {/* Glow di balik HP — beri kedalaman & kesan "menyala" */}
      <div
        className="absolute -inset-4 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(45,212,150,0.45) 0%, transparent 70%)' }}
      />
      {/* Bezel */}
      <div className="banner-art-float relative rounded-[17px] bg-gray-900 p-[2.5px] ring-1 ring-white/15" style={{ animationDelay: '0.8s' }}>
        {/* Layar */}
        <div className="relative h-[120px] overflow-hidden rounded-[14px] bg-gray-50">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-[5px] z-10 h-[3.5px] w-[22px] -translate-x-1/2 rounded-full bg-gray-900/90" />
          <div className="px-[5px] pt-3">
            {/* Mini hero (emerald, identik tema saldo) */}
            <div className="h-[30px] rounded-[7px]" style={{ background: 'linear-gradient(135deg,#0D5B36,#1C9A5C)' }} />
            {/* Mini stat row 3-kolom */}
            <div className="mt-[5px] flex gap-[3px]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[13px] flex-1 rounded-[3px] bg-white ring-1 ring-gray-200/80" />
              ))}
            </div>
            {/* Mini baris transaksi */}
            <div className="mt-[5px] space-y-[3px]">
              <div className="h-[6px] rounded-full bg-gray-200" />
              <div className="h-[6px] w-2/3 rounded-full bg-gray-200" />
              <div className="h-[6px] w-5/6 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bingkai bersama motif dekoratif kanan — peek + glow + drop-shadow + float halus.
 *  Elemen luar menahan peek/rotate; wrapper-dalam yang mengambang (banner-art-float)
 *  agar rotate tak bentrok dengan animasi naik-turun. */
function ArtFrame({
  children, glow, rotate = -6, delay = '0s', width = 76,
}: { children: React.ReactNode; glow: string; rotate?: number; delay?: string; width?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-2 top-1/2 z-[1]"
      style={{ transform: `translateY(-50%) rotate(${rotate}deg)`, width }}
    >
      {/* Glow di balik motif — kedalaman & kesan "menyala" senada hero card */}
      <div
        className="absolute -inset-5 rounded-full"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`, opacity: 0.65 }}
      />
      <div
        className="banner-art-float relative"
        style={{ animationDelay: delay, filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.4))' }}
      >
        {children}
      </div>
    </div>
  );
}

/** Mini daftar hadir — dua hadir (✓) satu absen (✗) → "hadir dicatat, absen kena talangan". */
function AbsensiArt() {
  const rows = [true, true, false];
  return (
    <div className="rounded-[13px] bg-white/14 p-[7px] ring-1 ring-inset ring-white/25">
      <div className="space-y-[5px]">
        {rows.map((ok, i) => (
          <div key={i} className="flex items-center gap-[5px]">
            <span className="h-[13px] w-[13px] shrink-0 rounded-full bg-white/40" />
            <span className="h-[5px] flex-1 rounded-full bg-white/30" />
            <span className={`grid h-[14px] w-[14px] shrink-0 place-items-center rounded-full ${ok ? 'bg-emerald-400' : 'bg-white/20'}`}>
              {ok
                ? <Check className="h-[9px] w-[9px] text-emerald-950" strokeWidth={3.5} />
                : <X className="h-[9px] w-[9px] text-white/80" strokeWidth={3} />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tumpukan koin + bintang → iuran terkumpul untuk satu Sohibul Bait (penerima). */
function TarikanArt() {
  return (
    <div className="relative mx-auto h-[62px] w-[52px]">
      <Star
        className="absolute left-1/2 top-0 h-[18px] w-[18px] -translate-x-1/2 text-amber-200"
        fill="currentColor" strokeWidth={0}
        style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.7))' }}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute left-1/2 h-[12px] w-[50px] -translate-x-1/2 rounded-full ring-1 ring-inset ring-white/40"
          style={{ bottom: `${i * 11}px`, background: 'linear-gradient(180deg,#FDE68A,#F59E0B)' }}
        />
      ))}
    </div>
  );
}

/** Nota "Rp50.000" → nominal talangan untuk yang tidak hadir. */
function TalanganArt() {
  return (
    <div className="rounded-[12px] bg-white/15 px-[9px] py-[8px] ring-1 ring-inset ring-white/25">
      <div className="flex items-center gap-1">
        <span className="h-[6px] w-[6px] rounded-full bg-amber-300" style={{ boxShadow: '0 0 6px rgba(251,191,36,0.85)' }} />
        <span className="text-[0.5rem] font-bold uppercase tracking-wider text-white/70">Talangan</span>
      </div>
      <p className="mt-[3px] font-display text-[0.95rem] font-extrabold leading-tight text-white">
        Rp50<span className="text-white/70">.000</span>
      </p>
    </div>
  );
}

/** Dua tumpukan koin dipisah garis → Kas RT (besar) terpisah dari Kas Hadiran. */
function KasRtArt() {
  return (
    <div className="flex items-end justify-center gap-[7px]">
      <div className="flex flex-col-reverse gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-[7px] w-[30px] rounded-full bg-white/35 ring-1 ring-inset ring-white/25" />
        ))}
      </div>
      <span className="h-[34px] w-px bg-white/25" />
      <div className="flex flex-col-reverse gap-[3px]">
        {[0, 1].map((i) => (
          <span key={i} className="h-[7px] w-[26px] rounded-full bg-white/[0.22] ring-1 ring-inset ring-white/20" />
        ))}
      </div>
    </div>
  );
}

/** Pilih motif sesuai jenis slide panduan. */
const ART = {
  absensi:  { Motif: AbsensiArt,  rotate: -7, delay: '0s',   width: 76 },
  tarikan:  { Motif: TarikanArt,  rotate: 0,  delay: '1.1s', width: 60 },
  talangan: { Motif: TalanganArt, rotate: -9, delay: '0.5s', width: 80 },
  'kas-rt': { Motif: KasRtArt,    rotate: 0,  delay: '1.6s', width: 78 },
} as const;

function SlideArt({ art, glow }: { art: NonNullable<BannerSlide['art']>; glow: string }) {
  const { Motif, rotate, delay, width } = ART[art];
  return <ArtFrame glow={glow} rotate={rotate} delay={delay} width={width}><Motif /></ArtFrame>;
}

const ROTATE_MS = 5000;       // dwell slide promo
const HERO_MS = 6800;         // dwell slide saldo (rumah) — ditahan lebih lama
const SWIPE_THRESHOLD = 48; // px geser minimal untuk pindah slide

/** Hitung "31 Des 2026 · N hari lagi". */
function fmtDeadline(iso: string): string {
  const d = new Date(iso);
  const hari = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return hari >= 0 ? `${tgl} · ${hari} hari lagi` : `${tgl} · lewat`;
}

interface Props {
  /** Saldo Kas RT terkini → progress Target Kas RT & syarat slide Wisata. */
  kasRT?: number;
  /** Pindah tab saat tombol CTA slide ditekan. */
  onNavigate?: (tab: string) => void;
  /** Bila ada → jadi slide PERTAMA (kartu saldo hero). Carousel jadi satu
   *  permukaan "saldo + promo": saldo = rumah (dwell lebih lama lalu balik). */
  heroSlide?: React.ReactNode;
}

export default function BannerCarousel({ kasRT = 0, onNavigate, heroSlide }: Props) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0); // offset geser sementara (px) saat menyentuh
  const startX = useRef<number | null>(null);
  const widthRef = useRef(1);
  const trackRef = useRef<HTMLDivElement>(null);

  const tercapai = kasRT >= TARGET_NOMINAL;

  // Susun slide. Slide "Wisata Bareng" hanya tampil bila target tercapai.
  const slides: BannerSlide[] = [
    {
      id: 'target-kas-rt',
      label: 'Target Kas RT',
      judul: 'Bersama menuju Rp25 juta',
      isi: '',
      icon: Target,
      // Teal-cyan, sengaja BEDA keluarga dari hero emerald — slide ini kini tepat
      // di bawah hero, hijau-di-atas-hijau bikin dua kartu menyatu jadi satu blok.
      grad: 'linear-gradient(135deg, #0D4F5C 0%, #119AAB 100%)',
      glow: 'rgba(45,212,191,0.58)',
      progress: { value: kasRT, max: TARGET_NOMINAL, deadline: TARGET_DEADLINE },
      cta: { label: 'Lihat Kas RT', tab: 'kas-rt' },
    },
    ...(tercapai
      ? [{
          id: 'wisata-bareng',
          label: 'Tercapai!',
          judul: 'Saatnya wisata bareng warga 🎉',
          isi: 'Target Kas RT tercapai — yuk rencanakan jalan-jalan seru bersama satu RT!',
          icon: Palmtree,
          grad: 'linear-gradient(135deg, #C2410C 0%, #F59E0B 100%)',
          glow: 'rgba(245,158,11,0.55)',
          ribbon: 'Tercapai',
          cta: { label: 'Lihat Kas RT', tab: 'kas-rt' },
        } as BannerSlide]
      : []),
    {
      id: 'app-hp',
      label: 'Aplikasi',
      judul: 'Pantau kas RT dari HP',
      isi: 'Saldo, jadwal & talangan dalam satu genggaman.',
      icon: Smartphone,
      grad: 'linear-gradient(135deg, #0F172A 0%, #1F2937 100%)',
      glow: 'rgba(45,212,150,0.5)',
      phone: true,
    },
    {
      id: 'panduan-absensi',
      label: 'Panduan · Absensi',
      judul: 'Hadir dicatat setiap tarikan',
      isi: 'Bendahara menandai daftar hadir per tarikan. Yang tidak hadir otomatis kena talangan.',
      icon: ClipboardCheck,
      grad: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
      glow: 'rgba(96,165,250,0.55)',
      cta: { label: 'Buka Jadwal', tab: 'jadwal' },
      art: 'absensi',
    },
    {
      id: 'panduan-tarikan',
      label: 'Panduan · Tarikan',
      judul: 'Satu Sohibul Bait per tarikan',
      isi: 'Setiap tarikan ada satu penerima. Iuran semua anggota yang hadir terkumpul untuknya.',
      icon: Coins,
      grad: 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)',
      glow: 'rgba(167,139,250,0.55)',
      cta: { label: 'Buka Jadwal', tab: 'jadwal' },
      art: 'tarikan',
    },
    {
      id: 'panduan-talangan',
      label: 'Panduan · Talangan',
      judul: 'Tidak hadir = talangan Rp50.000',
      isi: 'Talangan wajib dilunasi sebelum tarikan berikutnya agar kas tetap sehat.',
      icon: HandCoins,
      grad: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)',
      glow: 'rgba(251,191,36,0.55)',
      cta: { label: 'Lihat Talangan', tab: 'talangan' },
      art: 'talangan',
    },
    {
      id: 'panduan-kas-rt',
      label: 'Panduan · Kas RT',
      judul: 'Kas besar RT yang terpisah',
      isi: 'Sebagian setoran masuk ke Kas RT — terpisah dari Kas Hadiran, untuk kebutuhan warga.',
      icon: Building2,
      grad: 'linear-gradient(135deg, #0F766E 0%, #10B981 100%)',
      glow: 'rgba(16,185,129,0.55)',
      cta: { label: 'Lihat Kas RT', tab: 'kas-rt' },
      art: 'kas-rt',
    },
  ];

  const hasHero = heroSlide != null;
  const count = slides.length + (hasHero ? 1 : 0);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Jaga index tetap valid bila jumlah slide berubah (Wisata muncul/hilang).
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Auto-rotate dgn dwell per-slide: saldo (hero, index 0) ditahan lebih lama lalu
  // kembali jadi "rumah"; promo lebih singkat. Berhenti saat ≤1 slide, reduced-motion,
  // atau sedang disentuh. Saat tab tersembunyi → tunda, jangan lompat.
  useEffect(() => {
    if (count <= 1 || reduced || startX.current !== null) return;
    const dwell = hasHero && index === 0 ? HERO_MS : ROTATE_MS;
    let id: number;
    const schedule = () => {
      id = window.setTimeout(() => {
        if (document.hidden) { schedule(); return; }
        setIndex((i) => (i + 1) % count);
      }, dwell);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, [count, reduced, index, hasHero]);

  if (count === 0) return null;

  function goTo(i: number) {
    haptic();
    setIndex(((i % count) + count) % count);
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    widthRef.current = trackRef.current?.clientWidth || 1;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    setDrag(e.touches[0].clientX - startX.current);
  }
  function onTouchEnd() {
    if (startX.current === null) return;
    const d = drag;
    startX.current = null;
    setDrag(0);
    if (d <= -SWIPE_THRESHOLD) goTo(index + 1);
    else if (d >= SWIPE_THRESHOLD) goTo(index - 1);
  }

  const dragging = startX.current !== null;
  const pct = (drag / widthRef.current) * 100;

  return (
    <section aria-roledescription="carousel" aria-label="Info, target & panduan" className="select-none">
      <div className="relative overflow-hidden rounded-3xl lift" style={hasHero ? { boxShadow: 'var(--hero-shadow)' } : undefined}>
        <div
          ref={trackRef}
          className="flex items-stretch"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${pct}%))`,
            transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.22,1,0.36,1)',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {hasHero && (
            <div
              className="w-full shrink-0"
              aria-roledescription="slide"
              aria-label={`1 dari ${count}`}
              aria-hidden={index !== 0}
            >
              {heroSlide}
            </div>
          )}
          {slides.map((s, i) => {
            const slideIndex = hasHero ? i + 1 : i;
            const Icon = s.icon;
            const prog = s.progress;
            const ratio = prog && prog.max > 0 ? Math.min(100, Math.max(0, (prog.value / prog.max) * 100)) : 0;
            const sisa = prog ? Math.max(0, prog.max - prog.value) : 0;
            const done = prog ? prog.value >= prog.max : false;
            return (
              <div
                key={s.id}
                className="w-full shrink-0"
                aria-roledescription="slide"
                aria-label={`${slideIndex + 1} dari ${count}`}
                aria-hidden={slideIndex !== index}
              >
                <div
                  className={`hero-noise relative h-full min-h-[104px] overflow-hidden px-5 py-[18px] text-white flex flex-col justify-center${s.phone ? ' pr-[92px]' : s.art ? ' pr-[88px]' : ''}`}
                  style={{
                    background: s.grad,
                    // Glass edge (SATU box-shadow, hindari bentrok dgn ring Tailwind):
                    // (1) highlight tepi-atas "kaca disinari" + (2) inset hairline ring
                    // tipis keliling → tepi kartu "tercetak", bahasa elevasi sama dgn
                    // --hero-shadow & .lift.
                    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Blob ambient sudut kanan-atas — beri kedalaman ala banner promo bank */}
                  <div
                    aria-hidden
                    className="absolute -top-10 -right-8 w-36 h-36 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`, opacity: 0.5 }}
                  />
                  {/* Blob terang sudut kiri-bawah */}
                  <div
                    aria-hidden
                    className="absolute -bottom-12 -left-10 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)' }}
                  />
                  {/* Specular sheen kaca — cahaya kiri-atas + bayang kanan-bawah (SATU
                      sumber dgn hero card, .hero-sheen) → permukaan melengkung "kaca",
                      bukan gradient datar. Di bawah konten (z-0). */}
                  <div aria-hidden className="hero-sheen absolute inset-0 z-0 pointer-events-none" />
                  {/* Veil bawah — jaga kontras teks kecil di ujung gradient terang */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 pointer-events-none"
                    style={{ height: '70%', background: 'linear-gradient(to top, rgba(0,0,0,0.28), transparent)' }}
                  />

                  {/* Mockup iPhone mengintip — hanya slide promo aplikasi */}
                  {s.phone && <PhoneMock />}
                  {/* Motif dekoratif mengintip — slide panduan */}
                  {s.art && <SlideArt art={s.art} glow={s.glow} />}

                  <div className="relative z-10 flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/25"
                      style={{ boxShadow: `0 0 16px 1px ${s.glow}` }}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-micro font-bold uppercase tracking-[0.14em] text-white/75 truncate">{s.label}</p>
                        {s.ribbon && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase shrink-0">
                            <PartyPopper className="w-2.5 h-2.5" /> {s.ribbon}
                          </span>
                        )}
                      </div>
                      <p className="text-body font-bold leading-snug break-words">{s.judul}</p>
                    </div>
                    {s.cta && onNavigate && (
                      <button
                        onClick={() => { haptic(); onNavigate(s.cta!.tab); }}
                        aria-label={s.cta.label}
                        className="press shrink-0 -mr-1 w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-colors ring-1 ring-inset ring-white/15"
                      >
                        <ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  {prog ? (
                    <div className="relative mt-2">
                      <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-micro">
                        <span className="font-bold tabular-nums">
                          {done ? 'Target tercapai 🎉' : `${Math.round(ratio)}% · kurang ${formatRupiahPlain(sisa)}`}
                        </span>
                        <span className="inline-flex items-center gap-1 text-white/75">
                          <CalendarClock className="w-3 h-3" /> {fmtDeadline(prog.deadline)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    s.isi && <p className="relative text-caption text-white/90 leading-snug mt-1.5 break-words line-clamp-2">{s.isi}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots — termasuk slide saldo (rumah) di posisi pertama */}
      {count > 1 && (
        <div className="flex items-center justify-center mt-1.5">
          {Array.from({ length: count }).map((_, i) => {
            const judul = hasHero
              ? (i === 0 ? 'Saldo' : slides[i - 1]?.judul ?? '')
              : (slides[i]?.judul ?? '');
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ke slide ${i + 1}: ${judul}`}
                aria-current={i === index}
                className="press grid place-items-center min-h-[40px] px-2"
              >
                <span
                  className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                    i === index
                      ? 'w-5 bg-brand dark:bg-brand-linkDark'
                      : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
