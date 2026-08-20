import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { haptic } from '../../lib/utils';

/**
 * Header satu-baris untuk halaman OVERLAY (Riwayat Aktivitas, Kelola Anggota,
 * Tutup Buku Triwulan, Backup & Restore, Tentang Aplikasi).
 *
 * Lima halaman dulu menyalin markup ini utuh — pekerjaan sama, lima salinan —
 * dan sudah mulai menyimpang: `text-balance` nempel di judul yang juga
 * `truncate` (efeknya mati), ikon judul tak konsisten `aria-hidden`, dan
 * tombol aksi distyle ulang per halaman. Yang paling penting: kelima salinan
 * MELEWATKAN kunci lapisan GPU, padahal sticky + backdrop-filter "melompat" di
 * iPhone Safari saat address bar muncul/sembunyi — fix yang sudah dipasang di
 * Header/BottomNav/Toaster. Sekarang satu tempat, satu perilaku.
 *
 * SATU sumber kebenaran — jangan salin markup header overlay lagi.
 * Aksi kanan pakai `OverlayAction` (jarak ke tepi diurus di sini).
 */
export default function OverlayHeader({
  icon: Icon,
  title,
  onBack,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  onBack: () => void;
  actions?: ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-line dark:border-gray-800"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        /* Paksa layer GPU stabil — sticky ber-backdrop-filter melompat di iOS
           Safari (fix sama Header/BottomNav). Aman di sini: header overlay tak
           punya descendant `fixed` (tak ada menu/scrim ber-portal). */
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      <div className="flex items-center gap-2 max-w-lg mx-auto px-4 py-3">
        <button
          onClick={() => { haptic(); onBack(); }}
          className="press w-11 h-11 flex items-center justify-center -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 potong-lentur">{title}</h1>
        </div>
        {actions && <div className="flex items-center -mr-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

/** Tombol ikon 44px di kanan header overlay. `spinning` utk ikon muat-ulang. */
export function OverlayAction({
  icon: Icon,
  label,
  onClick,
  spinning = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  spinning?: boolean;
}) {
  return (
    <button
      onClick={() => { haptic(); onClick(); }}
      className="press w-11 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={label}
      aria-label={label}
      /* `spinning` selalu berarti "sedang bekerja" — beritahukan juga ke pembaca
         layar. Tombolnya sengaja tidak di-`disabled`: penjaga ketukan gandanya
         ada di latch sinkron `useAksiBerat()`, dan menonaktifkan tombol yang
         sedang difokus melempar fokus ke <body>. */
      aria-busy={spinning || undefined}
    >
      <Icon className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${spinning ? 'animate-spin' : ''}`} aria-hidden="true" />
    </button>
  );
}
