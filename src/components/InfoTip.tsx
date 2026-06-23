import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { haptic } from '../lib/utils';

interface InfoTipProps {
  /** Istilah yang dijelaskan (jadi judul popover + label a11y). */
  label: string;
  /** Penjelasan singkat. */
  children: ReactNode;
  /** onDark = ikon putih (untuk dipasang di kartu hero/gradient). */
  tone?: 'default' | 'onDark';
  /** Arah popover relatif tombol (hindari kepotong di tepi layar). */
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Tooltip istilah ketuk-sekali (mobile-first). Semua elemen <span> agar valid
 * disisipkan di dalam <p>. Penangkap klik-luar menutup popover.
 */
export default function InfoTip({ label, children, tone = 'default', align = 'left', className = '' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const trigger =
    tone === 'onDark'
      ? 'text-white/70 hover:text-white'
      : 'text-ink-faint dark:text-gray-400 hover:text-ink dark:hover:text-gray-200';

  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); haptic(); setOpen((o) => !o); }}
        aria-label={`Apa itu ${label}?`}
        aria-expanded={open}
        className={`press inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors ${trigger}`}
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.25} />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <span
            role="tooltip"
            onClick={(e) => e.stopPropagation()}
            className={`pop-menu absolute top-full mt-1.5 z-50 w-60 max-w-[78vw] p-3 rounded-2xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800 float text-left normal-case tracking-normal ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
          >
            <span className="block text-caption font-bold text-ink dark:text-gray-100 mb-0.5">{label}</span>
            <span className="block text-caption font-normal text-ink-sub dark:text-gray-300 leading-relaxed">{children}</span>
          </span>
        </>
      )}
    </span>
  );
}
