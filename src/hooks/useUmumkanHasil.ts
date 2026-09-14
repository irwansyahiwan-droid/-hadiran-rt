import { useEffect, useRef } from 'react';
import { umumkanSaja } from '../lib/toast';

/**
 * Umumkan hasil PENCARIAN / FILTER ke pembaca layar (WCAG §4.1.3 Status
 * Messages, AA) lewat region live `polite` milik Toaster — tanpa toast terlihat.
 *
 * Sampai 14 Sep 2026 enam kolom cari & semua chip filter app mengubah daftar
 * tanpa satu suara pun: yang melihat layar membaca "Tidak ada hasil", yang
 * tidak mengetik nama warga lalu tak tahu hasilnya 12 atau nol. Dijaga
 * `audit:umumkan`.
 *
 * Kata disetujui user: ada hasil → "Menampilkan {N} {benda}"; kosong →
 * JUDUL + KETERANGAN layar kosong yang SAMA dgn yang tampil (bukan kalimat
 * kedua yang bisa melenceng dari layarnya) — halaman memberikannya lewat
 * `kosong`, dari konstanta yang juga dipakai `EmptyState`-nya.
 *
 * Tiga keputusan, masing-masing menahan satu kegagalan:
 * - Hanya saat `pemicu` BERUBAH (kata kunci / chip), tidak saat muat awal dan
 *   tidak saat data disegarkan diam-diam — region yang bicara tiap muat
 *   dilatih untuk diabaikan (`audit:umumkan` U1).
 * - Jeda 500 ms sesudah perubahan TERAKHIR: per huruf, pembaca layar menyela
 *   dirinya sendiri dan yang terdengar cuma potongan angka (U2).
 * - Jumlah & kalimat kosong dibaca dari ref SAAT jeda habis, bukan saat
 *   ketikan — daftar yang disaring ulang di render yang sama sudah final.
 */
export function useUmumkanHasil(
  jumlah: number,
  benda: string,
  pemicu: readonly unknown[],
  kosong: string,
) {
  const kunci = JSON.stringify(pemicu);
  const awal = useRef(kunci);
  const terbaru = useRef({ jumlah, benda, kosong });
  terbaru.current = { jumlah, benda, kosong };

  useEffect(() => {
    if (kunci === awal.current) return;
    awal.current = kunci;
    const t = setTimeout(() => {
      const { jumlah: n, benda: b, kosong: k } = terbaru.current;
      umumkanSaja(n === 0 ? k : `Menampilkan ${n} ${b}`);
    }, 500);
    return () => clearTimeout(t);
  }, [kunci]);
}
