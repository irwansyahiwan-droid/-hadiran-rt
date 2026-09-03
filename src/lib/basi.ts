/**
 * Penanda DATA BASI — penyegaran diam-diam yang GAGAL, sementara angka lama
 * masih terpampang.
 *
 * Kenapa ada (3 Sep 2026): `audit:kembali` sifat 4 sudah lama mencatat sebuah
 * CATATAN yang tak pernah dibayar — app memang MENGAKU gagal menyegarkan, tapi
 * pengakuannya SEMENTARA (toast ~2,6 dtk) sementara basinya PERMANEN. Warga
 * yang kembali dari WhatsApp lalu melewatkan toast itu tinggal berhadapan dgn
 * nominal yang terlihat persis seperti angka sekarang. Untuk app kas, angka
 * yang mungkin basi wajib mengaku SELAMA ia masih basi, bukan 2,6 detik saja.
 *
 * Presedennya sudah ada di app dan sengaja ditiru: strip LURING di `Header`.
 * Bedanya cuma SEBAB — di sana sinyalnya hilang, di sini sinyalnya ada tapi
 * server menolak. Akibatnya identik, jadi klausa keduanya pun identik
 * ("angka yang tampil salinan terakhir"): warga yang pernah melihat strip
 * luring langsung tahu artinya sama.
 *
 * Store mungil sendiri, BUKAN context: Header duduk di luar tiap halaman, dan
 * pemberi kabarnya ada di 6 halaman berbeda. Context berarti menaikkan state
 * ke `App` lalu menurunkannya lewat prop ke enam tempat — jauh lebih banyak
 * sambungan untuk satu boolean.
 */
import { useSyncExternalStore } from 'react';

let basi = false;
const pendengar = new Set<() => void>();
const siar = () => pendengar.forEach((f) => f());

/** Penyegaran diam-diam GAGAL — angka di layar sudah tak dipercaya app. */
export function tandaiBasi(): void {
  if (basi) return;
  basi = true;
  siar();
}

/** Penyegaran BERHASIL — apa pun yang tampil kini benar-benar terkini. */
export function tandaiSegar(): void {
  if (!basi) return;
  basi = false;
  siar();
}

export function useBasi(): boolean {
  return useSyncExternalStore(
    (f) => { pendengar.add(f); return () => pendengar.delete(f); },
    () => basi,
    () => false,
  );
}
