import type { ReactNode } from 'react';

interface SectionTitleProps {
  /** Teks judul — boleh diikuti chip/badge inline (mis. jumlah). */
  children: ReactNode;
  /** Aksi kanan, mis. tombol "Lihat semua →". */
  action?: ReactNode;
  /** 'muted' untuk section yang sengaja diredam (mis. "Sudah Lunas"). */
  tone?: 'default' | 'muted';
  className?: string;
}

/**
 * Judul section seragam se-aplikasi — accent bar gradient + bobot konsisten.
 * Satu sumber: ubah di sini → semua halaman ikut.
 */
export default function SectionTitle({ children, action, tone = 'default', className = '' }: SectionTitleProps) {
  return (
    <div className={`flex items-center justify-between gap-2 mb-3 px-1 ${className}`}>
      <h2 className={`flex items-center gap-2 text-base font-bold ${tone === 'muted' ? 'text-ink-sub dark:text-gray-400' : 'text-ink dark:text-gray-100'}`}>
        <span className={`w-1 h-4 rounded-full shrink-0 ${tone === 'muted' ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gradient-to-b from-emerald-400 to-teal-600'}`} />
        {children}
      </h2>
      {action}
    </div>
  );
}
