import { useEffect, useRef, useState } from 'react';
import {
  Target, Palmtree, ClipboardCheck, HandCoins, Coins, Building2,
  ChevronRight, CalendarClock, PartyPopper, type LucideIcon,
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
}

const ROTATE_MS = 5500;
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
}

export default function BannerCarousel({ kasRT = 0, onNavigate }: Props) {
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
      grad: 'linear-gradient(135deg, #0F4C2E 0%, #1B7249 100%)',
      glow: 'rgba(110,231,183,0.6)',
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
      id: 'panduan-absensi',
      label: 'Panduan · Absensi',
      judul: 'Hadir dicatat setiap tarikan',
      isi: 'Bendahara menandai daftar hadir per tarikan. Yang tidak hadir otomatis kena talangan.',
      icon: ClipboardCheck,
      grad: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
      glow: 'rgba(96,165,250,0.55)',
      cta: { label: 'Buka Jadwal', tab: 'jadwal' },
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
    },
  ];

  const count = slides.length;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Jaga index tetap valid bila jumlah slide berubah (Wisata muncul/hilang).
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Auto-rotate — berhenti saat ≤1 slide, reduced-motion, sedang disentuh, atau tab tak terlihat.
  useEffect(() => {
    if (count <= 1 || reduced || startX.current !== null) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, reduced, index]);

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
      <div className="relative overflow-hidden rounded-3xl lift">
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
          {slides.map((s, i) => {
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
                aria-label={`${i + 1} dari ${count}`}
                aria-hidden={i !== index}
              >
                <div
                  className="relative h-full min-h-[104px] overflow-hidden px-5 py-[18px] text-white flex flex-col justify-center"
                  style={{ background: s.grad }}
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
                  {/* Sheen tepi atas — kilau kaca tipis */}
                  <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/30 pointer-events-none" />
                  {/* Veil bawah — jaga kontras teks kecil di ujung gradient terang */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 pointer-events-none"
                    style={{ height: '70%', background: 'linear-gradient(to top, rgba(0,0,0,0.28), transparent)' }}
                  />

                  <div className="relative flex items-center gap-3">
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

      {/* Dots */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Ke slide ${i + 1}: ${s.judul}`}
              aria-current={i === index}
              className="press py-1.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? 'w-5 bg-brand dark:bg-brand-linkDark'
                    : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
