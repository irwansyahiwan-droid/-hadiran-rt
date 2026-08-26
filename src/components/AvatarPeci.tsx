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
}

/**
 * Avatar inisial — SATU warna netral (slate) untuk semua anggota.
 * Sebelumnya 8 gradient warna-warni (hash nama) → ramai & terasa "indie".
 * Netral tenang ala Linear/Mercury: fokus ke data, bukan ke avatar.
 */
export default function AvatarPeci({ nama, className = 'w-12 h-12 rounded-xl', sorot = false }: AvatarPeciProps) {
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
    <div className={`bg-gray-100 dark:bg-gray-800 ${ring} ${className} flex items-center justify-center shrink-0`}>
      <span className="text-subtitle font-bold text-gray-600 dark:text-gray-300">{initial}</span>
    </div>
  );
}
