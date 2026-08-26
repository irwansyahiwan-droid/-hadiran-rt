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
    /* `flex-wrap` = katup pengaman, bukan perubahan tata letak: di 360px judul
       dan aksinya muat berdampingan, jadi tampilan normal tak bergerak sama
       sekali. Ia baru bekerja saat teks dasar browser 200%, di mana judul +
       tombol aksi tak lagi muat — dan karena tak ada leluhur yang meng-clip,
       tombolnya dulu meluber sampai x=458 pada viewport 360 dan menyeret
       SELURUH halaman geser samping. Diukur di Beranda: tombol "Lihat semua"
       adalah elemen yang menentukan `scrollWidth`, bukan carousel di
       belakangnya (kartu promo yang tampak jauh di luar layar semuanya sudah
       ter-clip dan tak menambah apa pun). Karena SectionTitle dipakai di tiap
       layar, satu perbaikan di sini menutup polanya di semua tempat. */
    <div className={`flex flex-wrap items-center justify-between gap-2 mb-3 ${className}`}>
      <h2 className={`flex min-w-0 items-center gap-2 text-balance text-subtitle font-bold ${
        tone === 'muted' ? 'text-ink-sub dark:text-gray-400'
        : tone === 'warn' ? 'text-warn dark:text-warn-dark'
        : 'text-ink dark:text-gray-100'
      }`}>
        {children}
        {count != null && count > 0 && (
          /* Penghitung "tercetak", bukan gumpalan abu.
             Versi lama memakai FILL (`bg-gray-100`) — permukaan penuh untuk
             memuat satu-dua digit. Karena judul seksi muncul di tiap layar,
             gumpalan itu jadi bentuk paling sering diulang di app, dan ia
             satu-satunya elemen yang memakai abu sebagai LATAR padahal kanon
             warna app menaruh abu di satu tempat saja: kontrol inaktif. Angka
             yang aktif duduk di atas fill "inaktif" = sinyal yang bertabrakan.

             Ganti fill dengan hairline ring-inset — bahasa yang sama dengan
             pil Tag & chip "Mode Warga" (pass Etched Premium): tepi tipis
             mendefinisikan bentuk, isinya dibiarkan kanvas. Ring dekoratif
             (angkanya sendiri yang membawa informasi), jadi tak menyentuh
             §1.4.11 — persis alasan ring Tag tak dihitung.

             `min-w` + `text-center` supaya "5" dan "103" sama-sama bulat rapi:
             tanpa itu satu digit menghasilkan kapsul yang lebih sempit dari
             tingginya dan terbaca gepeng. */
          <span className={`font-display text-micro font-bold tabular-nums rounded-full ring-1 ring-inset min-w-[1.375rem] px-1.5 py-0.5 text-center ${
            tone === 'warn'
              ? 'text-warn dark:text-amber-300 ring-amber-600/30 dark:ring-amber-400/30'
              : 'text-ink-faint dark:text-gray-400 ring-line dark:ring-gray-700'
          }`}>{count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}
