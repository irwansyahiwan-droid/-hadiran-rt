import type { ReactNode } from 'react';

/**
 * Tag — label status kecil yang seragam (radius, ukuran, warna).
 * Ganti badge inline yang sebelumnya di-`style`-hardcode di tiap halaman.
 * tone = bahasa warna semantik; pakai `info` utk "Setor ke Kas RT" agar selaras donut.
 */
type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-500/[0.12] text-slate-600 dark:bg-slate-400/15 dark:text-slate-300',
  success: 'bg-emerald-500/[0.12] text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  danger:  'bg-rose-500/[0.10] text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
  warning: 'bg-amber-500/[0.14] text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  info:    'bg-blue-500/[0.12] text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
};

interface TagProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export default function Tag({ tone = 'neutral', children, className = '' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
