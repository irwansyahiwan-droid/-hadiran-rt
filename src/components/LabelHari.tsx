import type { LabelHari as Label } from '../lib/utils';

/** Tinta label waktu tarikan (lihat `labelHariTarikan`). Hijau untuk yang
 *  akan datang, amber untuk yang lewat & belum dicatat — keluarga warna yang
 *  sama dgn "Talangan" se-app. Bobot semibold: ia NILAI di baris meta. */
export default function LabelHari({ label }: { label: Label }) {
  const tinta = label.nada === 'warn' ? 'text-warn dark:text-amber-400' : 'text-pos dark:text-pos-dark';
  return <span className={`font-semibold ${tinta}`}>{label.teks}</span>;
}
