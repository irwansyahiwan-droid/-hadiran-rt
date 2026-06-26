import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { haptic } from '../lib/utils';

interface InfoTipProps {
  /** Istilah yang dijelaskan (jadi judul popover + label a11y). */
  label: string;
  /** Penjelasan singkat. */
  children: ReactNode;
  /** onDark = ikon putih (untuk dipasang di kartu hero/gradient). */
  tone?: 'default' | 'onDark';
  /** Arah popover relatif tombol bila muat (kiri = tepi kiri sejajar tombol). */
  align?: 'left' | 'right';
  className?: string;
}

const EDGE = 10;     // jarak aman minimal ke tepi layar (px)
const POP_W = 240;   // lebar popover ideal (= w-60)
const GAP = 6;       // jarak popover ke tombol

/**
 * Tooltip istilah ketuk-sekali (mobile-first).
 *
 * Anti-kepotong: popover dirender lewat PORTAL ke <body> dengan position:fixed,
 * sehingga TIDAK terpotong oleh kartu ber-`overflow:hidden` (mis. .hero-card di
 * halaman warga) maupun tepi layar. Posisi diukur dari tombol lalu di-clamp ke
 * viewport (horizontal) & di-flip ke atas bila mepet bawah.
 */
export default function InfoTip({ label, children, tone = 'default', align = 'left', className = '' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);

  // Escape menutup popover (keyboard).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Hitung posisi fixed dari tombol; clamp horizontal & flip vertikal.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const place = () => {
      const b = btnRef.current?.getBoundingClientRect();
      if (!b) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(POP_W, vw - EDGE * 2);
      // Horizontal: default sejajar tombol (kiri/kanan), lalu clamp ke layar.
      let left = align === 'right' ? b.right - width : b.left;
      left = Math.max(EDGE, Math.min(left, vw - width - EDGE));
      // Vertikal: di bawah tombol; flip ke atas bila tak muat & atas cukup.
      let top = b.bottom + GAP;
      const h = popRef.current?.offsetHeight ?? 0;
      if (h && top + h > vh - EDGE && b.top - GAP - h >= EDGE) top = b.top - GAP - h;
      setPos({ top, left, width });
    };
    place();
    const raf = requestAnimationFrame(place); // ukur ulang setelah tinggi diketahui
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

  const trigger =
    tone === 'onDark'
      ? 'text-white/70 hover:text-white'
      : 'text-ink-faint dark:text-gray-400 hover:text-ink dark:hover:text-gray-200';

  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); haptic(); setOpen((o) => !o); }}
        aria-label={`Apa itu ${label}?`}
        aria-expanded={open}
        className={`press inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors ${trigger}`}
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.25} />
      </button>
      {open && createPortal(
        <>
          <span className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <span
            ref={popRef}
            role="tooltip"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? 0,
              width: pos?.width ?? POP_W,
              opacity: pos ? 1 : 0,
            }}
            className="pop-menu z-[61] p-3 rounded-2xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800 float text-left normal-case tracking-normal"
          >
            <span className="block text-caption font-bold text-ink dark:text-gray-100 mb-0.5">{label}</span>
            <span className="block text-caption font-normal text-ink-sub dark:text-gray-300 leading-relaxed">{children}</span>
          </span>
        </>,
        document.body,
      )}
    </span>
  );
}
