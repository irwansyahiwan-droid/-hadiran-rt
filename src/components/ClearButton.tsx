import { X } from 'lucide-react';

interface ClearButtonProps {
  onClick: () => void;
  /** Label a11y — default cocok untuk bilah cari. */
  label?: string;
}

/**
 * Tombol "×" bersihkan untuk bilah cari. Target sentuh 44px PENUH (WCAG 2.5.5 /
 * Apple HIG) — sebelumnya ikon telanjang ~16px (`press-icon` + `w-4 h-4`) tersebar
 * di banyak halaman & sulit dipencet di HP. SATU sumber: posisi (absolute kanan),
 * ukuran target, ikon, & feedback tekan. Pasangkan dengan input ber-`pr-11` agar
 * teks tak menabrak tombol. Feedback via `press-icon` (opacity, transform-safe →
 * tidak menimpa -translate-y-1/2 yang memusatkan tombol secara vertikal).
 */
export default function ClearButton({ onClick, label = 'Bersihkan pencarian' }: ClearButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press-icon absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center"
    >
      <X className="w-4 h-4 text-gray-400" />
    </button>
  );
}
