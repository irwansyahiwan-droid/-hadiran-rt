import type { LabelHari as Label } from '../lib/utils';

/** Tinta label waktu tarikan (lihat `labelHariTarikan`). Hijau untuk yang
 *  akan datang, amber untuk yang lewat & belum dicatat — keluarga warna yang
 *  sama dgn "Talangan" se-app. Bobot semibold: ia NILAI di baris meta.
 *  `whitespace-nowrap` + `.label-hari` WAJIB (20 Okt 2026): WebKit @320px
 *  menghitung lebar bagian `MetaPisah` yang memuatnya 0,25px LEBIH SEMPIT dari
 *  isinya (62,58 lawan 62,83px; Chromium 62,83) — kembaran `eee911a` "Tarikan
 *  / #30" — jadi labelnya patah ("Hari / ini") atau terlempar ke baris kedua DI
 *  DALAM bagiannya ("Sab, 24 Okt 2026 ·" / "Hari ini" rata kanan). Nowrap di
 *  span saja tak cukup: titik patahnya ada di antara titik `::before` & label,
 *  jadi bagian induknya ikut dikunci lewat `:has(.label-hari)` di index.css. */
export default function LabelHari({ label }: { label: Label }) {
  const tinta = label.nada === 'warn' ? 'text-warn dark:text-amber-400' : 'text-pos dark:text-pos-dark';
  return <span className={`label-hari whitespace-nowrap font-semibold ${tinta}`}>{label.teks}</span>;
}
