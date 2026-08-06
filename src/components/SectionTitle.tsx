import type { ReactNode } from 'react';

interface SectionTitleProps {
  /** Teks judul — boleh diikuti chip/badge inline (mis. jumlah). */
  children: ReactNode;
  /** Jumlah item di section → tampil sbg chip kecil (info scent, "suara angka"). */
  count?: number;
  /** Aksi kanan, mis. tombol "Lihat semua →". */
  action?: ReactNode;
  /** 'muted' untuk section yang sengaja diredam (mis. "Sudah Lunas");
      'warn' untuk section perhatian (mis. "Tunggakan Berganda") — bar & chip amber. */
  tone?: 'default' | 'muted' | 'warn';
  className?: string;
}

/**
 * Judul section seragam se-aplikasi. Satu sumber: ubah di sini → semua ikut.
 *
 * TANPA accent bar. Versi lama memasang `w-1 h-4` (4px) ber-GRADIENT
 * emerald-400→teal-600, dan itu melanggar kanon sendiri dua kali sekaligus:
 * §7 melarang stripe aksen >1px, dan §2 menetapkan SATU aksen — teal keluarga
 * hijau kedua, di app yang selain ini rata flat tanpa satu pun gradient
 * dekoratif. Ia juga satu-satunya ornamen yang muncul di TIAP layar, jadi
 * justru dia yang paling keras bilang "template".
 *
 * Hierarki sekarang datang dari yang kanon §3 memang tunjuk: berat + warna
 * tinta + satu langkah ukuran (16 → 18px Sora 700), bukan dari hiasan. Ruang
 * yang ditinggalkan bar (4px + gap 8px) kira-kira sama dengan tambahan lebar
 * teksnya, jadi baris judul tak melar di 360px.
 *
 * Nada `warn` DULU cuma hidup di warna bar. Karena barnya hilang, sinyalnya
 * pindah ke tinta judul — kalau tidak, "Tunggakan Berganda" jadi kehilangan
 * penanda perhatiannya diam-diam.
 */
export default function SectionTitle({ children, count, action, tone = 'default', className = '' }: SectionTitleProps) {
  return (
    /* TANPA px-1. Kartu, header, dan bar nav semuanya bertepi 16px (main px-4);
       `px-1` menaruh judul seksi di 20px — tak sejajar tepi kartu (16) MAUPUN isi
       kartu (36). Selisih 4px itu terbaca "hampir sejajar", cacat yang paling
       gampang tertangkap mata. Satu tepi teks halaman = 16px. */
    <div className={`flex items-center justify-between gap-2 mb-3 ${className}`}>
      <h2 className={`flex items-center gap-2 text-balance text-lg font-bold ${
        tone === 'muted' ? 'text-ink-sub dark:text-gray-400'
        : tone === 'warn' ? 'text-warn dark:text-warn-dark'
        : 'text-ink dark:text-gray-100'
      }`}>
        {children}
        {count != null && count > 0 && (
          <span className={`font-display text-micro font-bold tabular-nums rounded-full px-2 py-0.5 ${
            tone === 'warn'
              ? 'text-warn dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30'
              : 'text-ink-faint dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
          }`}>{count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}
