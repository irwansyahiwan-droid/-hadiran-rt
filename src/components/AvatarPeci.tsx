interface AvatarPeciProps {
  nama: string;
  className?: string;
  /**
   * Sorot "honor" — cincin emas songket. Dipakai untuk Sohibul Bait giliran
   * berikutnya di Beranda.
   *
   * WAJIB lewat prop, JANGAN lewat `className`. Di Tailwind semua utility
   * `ring-*` menulis ke variabel yang sama (`--tw-ring-color` / `--tw-ring-offset-*`),
   * jadi yang menang adalah urutan di BERKAS CSS, bukan urutan di atribut class.
   * Beranda dulu mengirim `ring-2 ring-[var(--gold-songket)] ring-offset-2` lewat
   * className dan diam-diam kalah oleh `ring-1 ring-black/[0.05]` di baris bawah
   * ini: lebarnya ikut jadi 2px, tapi WARNANYA tetap hitam-5% — terukur di DOM
   * sebagai `rgba(0,0,0,.05) 0 0 0 4px`. Hasilnya avatar giliran berikutnya
   * tampil sebagai kotak pucat berhalo putih, tanpa satu piksel pun emas.
   *
   * Karena cincinnya kini dipilih DI DALAM komponen, tak ada lagi dua utility
   * ring yang beradu — satu elemen, satu cincin.
   */
  sorot?: boolean;
  /**
   * Ukuran tile (satuan Tailwind: 8 = 32px … 12 = 48px).
   *
   * Alasan yang SAMA dengan `sorot` di atas: waktu ukuran & radius dikirim
   * lewat `className`, satu komponen yang sama tampil dengan EMPAT bentuk
   * sudut berbeda di app — `w-8 rounded-lg`, `w-9 rounded-xl`,
   * `w-10 rounded-xl`, `w-11 rounded-2xl` — dan inisialnya selalu 18px,
   * jadi avatar 32px terlihat penuh sesak sementara avatar 48px terlihat
   * kosong. Tak satu pun pemanggil salah; yang salah adalah keputusan itu
   * boleh diambil di tempat pemanggil.
   *
   * Sekarang bentuk & ukuran inisial DITURUNKAN dari satu angka ini:
   * satu avatar, satu bentuk.
   */
  ukuran?: Ukuran;
}

type Ukuran = 8 | 9 | 10 | 11 | 12;

/* Tangga radius: tile 28–44px → `rounded-xl` (12), 48–72px → `rounded-2xl`
   (16). Radius ±30% dari sisi — di bawah itu tile terbaca kaku, di atasnya
   mulai terbaca sebagai pil. Nama kelas ditulis UTUH (bukan `rounded-${x}`)
   karena Tailwind memindai teks mentah, bukan hasil evaluasi. */
const BENTUK: Record<Ukuran, string> = {
  8:  'w-8 h-8 rounded-xl',
  9:  'w-9 h-9 rounded-xl',
  10: 'w-10 h-10 rounded-xl',
  11: 'w-11 h-11 rounded-xl',
  12: 'w-12 h-12 rounded-2xl',
};

/* Inisial ±40% sisi tile — dulu SELALU `text-subtitle` (18px) di semua ukuran. */
const INISIAL: Record<Ukuran, string> = {
  8: 'text-caption', 9: 'text-body', 10: 'text-body', 11: 'text-subtitle', 12: 'text-subtitle',
};

/**
 * Avatar inisial — SATU warna netral (slate) untuk semua anggota.
 * Sebelumnya 8 gradient warna-warni (hash nama) → ramai & terasa "indie".
 * Netral tenang ala Linear/Mercury: fokus ke data, bukan ke avatar.
 */
export default function AvatarPeci({ nama, className = '', sorot = false, ukuran = 12 }: AvatarPeciProps) {
  const initial = (nama || '?').charAt(0).toUpperCase();

  /* Cincin sorot TANPA ring-offset. Offset putih dulu dipakai untuk memisahkan
     cincin dari latar, tapi baris giliran-berikutnya berlatar emerald-50/50 —
     jadi celah putih 2px itu justru terbaca sebagai stiker yang ditempel, bukan
     bezel. Emas langsung menempel di tepi tile: satu bentuk, satu tepi. */
  const ring = sorot
    ? 'ring-2 ring-[var(--gold-songket)]'
    : 'ring-1 ring-black/[0.05] dark:ring-white/[0.06]';

  // MATERIAL-FLAT: inset top-light dihapus (sheen icon-tile sudah dipensiunkan
  // app-wide 2 Jul — tile ini sempat luput). Tint + ring hairline saja.
  return (
    <div className={`bg-gray-100 dark:bg-gray-800 ${ring} ${BENTUK[ukuran]} ${className} flex items-center justify-center shrink-0`}>
      <span className={`${INISIAL[ukuran]} font-bold text-gray-600 dark:text-gray-300`}>{initial}</span>
    </div>
  );
}
