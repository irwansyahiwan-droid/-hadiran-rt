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
  /* TINTA GELAP `-300` → `-200` (30 Agu 2026). Diukur oleh seksi AAA yang baru
     dipasang: KELIMA sampel app yang tersisa di bawah ambang AAA 7:1 berasal
     dari komponen INI — `danger` 6,55 ("belum bayar", di kartu), `success` 6,91
     & `neutral` 6,94 (pil peran BENDAHARA/WARGA, di Header). Ketiganya lolos AA
     dgn nyaman, jadi tak satu pun sapuan lama pernah menyebutnya.

     Yang dinaikkan TINTANYA, bukan isiannya. Menurunkan isian `/15` → `/10`
     juga menutup `danger`, tapi cuma sampai 7,02 — margin 0,02 dari ambang, dan
     perubahan permukaan berikutnya akan menjatuhkannya lagi (pelajaran ke-30
     persis begitu: seluruh tabel remap gugur waktu kartu gelap bergerak).
     Dgn `-200`: 8,79 · 8,21 · 8,25 — ketiganya mendarat berdekatan, jadi
     keluarga nada tetap terbaca sebagai satu keluarga.

     Diukur di latar yang BENAR-BENAR terukur sapuan (kartu #192920 utk badan,
     Header utk pil peran), bukan di satu permukaan yang diasumsikan — pil yang
     sama duduk di dua permukaan berbeda, dan itu yang membuat `success` gagal
     di Header padahal aman di kartu.

     `warning` & `info` ikut naik walau keduanya sudah lolos: nada Tag dirancang
     sebagai SATU keluarga, dan menaikkan tiga dari lima akan membuat dua sisanya
     terbaca lebih redup tanpa alasan. Sisi TERANG tak disentuh sama sekali.

     slate -> gray (24 Agu 2026): `slate` bukan bagian dari skala app dan tak
     ikut pindah rona, jadi Tag netral tampil BIRU dingin di seluruh app yang
     sudah hijau — dan Tag netral ada di mana-mana ("Terjadwal", "—", status
     baris). `gray` kini keluarga Hutan dgn L yang sama persis, jadi rasionya
     tak bergerak. */
  neutral: 'bg-gray-500/[0.12] text-gray-600 ring-gray-500/20 dark:bg-gray-400/15 dark:text-gray-200 dark:ring-gray-400/25',
  success: 'bg-emerald-500/[0.12] text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/15 dark:text-emerald-200 dark:ring-emerald-400/25',
  danger:  'bg-rose-500/[0.10] text-rose-700 ring-rose-600/20 dark:bg-rose-400/15 dark:text-rose-200 dark:ring-rose-400/25',
  warning: 'bg-amber-500/[0.14] text-amber-800 ring-amber-600/25 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-400/25',
  info:    'bg-blue-500/[0.12] text-blue-700 ring-blue-600/20 dark:bg-blue-400/15 dark:text-blue-200 dark:ring-blue-400/25',
};

interface TagProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/* `font-bold`, BUKAN `font-semibold` — KOMPENSASI OPTIS, bukan pelanggaran
   tangga (2 Sep 2026). Tangga tebal menempatkan kontrol & badge di `semibold`,
   dan itu benar untuk badge seukuran tombol. Di `text-micro` (11px) tidak:
   diukur pra/pasca tangga, 22 badge turun 700 -> 600 dan user membacanya
   "font kecilnya jadi PUDAR" — di ukuran itu selisih satu anak tangga terbaca
   sbg memudar, bukan sbg hierarki. Prinsipnya sudah jadi kanon di sumbu lain:
   tangga IKON menurunkan stroke dari UKURAN. Tebal badge kini mengikuti hal
   yang sama, dan `audit:tebal` menegakkannya (badge/tombol `text-micro` WAJIB
   bold) — jadi ini aturan, bukan izin sekali pakai. */
export default function Tag({ tone = 'neutral', children, className = '' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-bold leading-tight whitespace-nowrap ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
