import type { ReactNode } from 'react';

/**
 * Tag — label status kecil yang seragam (radius, ukuran, warna).
 * Ganti badge inline yang sebelumnya di-`style`-hardcode di tiap halaman.
 * tone = bahasa warna semantik; pakai `info` utk "Setor ke Kas RT" agar selaras donut.
 */
type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

// Tiap tone punya fill tint + hairline ring sewarna (ring-inset) → badge "tercetak"
// selaras pass Etched Premium (26 Jul 2026, sama dgn pill status Beranda), bukan
// tint datar. Ring dekoratif (bukan latar teks) → tak menyentuh kontras AA.
const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-500/[0.12] text-slate-600 ring-slate-500/20 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/25',
  success: 'bg-emerald-500/[0.12] text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/25',
  danger:  'bg-rose-500/[0.10] text-rose-700 ring-rose-600/20 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-400/25',
  warning: 'bg-amber-500/[0.14] text-amber-800 ring-amber-600/25 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25',
  info:    'bg-blue-500/[0.12] text-blue-700 ring-blue-600/20 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/25',
};

interface TagProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export default function Tag({ tone = 'neutral', children, className = '' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-semibold leading-tight whitespace-nowrap ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
