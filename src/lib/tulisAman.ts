/**
 * Penjaga jalur TULIS Supabase.
 *
 * Dua kegagalan yang sama-sama DIAM, dan keduanya pernah nyata di app ini:
 *
 * 1. `.update()/.delete()/.insert()` TIDAK melempar saat gagal — ia
 *    mengembalikan `{ data: null, error }`. Tiap pemanggilan tanpa cek
 *    `res.error` mengubah kegagalan jadi "berhasil". → `wajibSukses`
 *
 * 2. Tanpa `.select()`, tulis yang mengubah NOL BARIS mengembalikan 204
 *    kosong — jawaban yang IDENTIK dengan tulis yang mengubah satu baris.
 *    App secara struktural tak bisa membedakannya, jadi ia bilang
 *    "tersimpan" untuk sesuatu yang tak pernah tersimpan. → `wajibBerubah`
 *
 * Cacat ke-2 terukur 23 Agu 2026: PATCH `warga` dibalas 204 (persis jawaban
 * PostgREST saat tak ada baris cocok) dan app tetap menoast "Data anggota
 * diperbarui". Dua pemicunya bukan karangan — RT ini punya dua admin aktif
 * (baris bisa sudah dihapus/diubah dari HP lain), dan policy RLS yang hilang
 * membuat UPDATE kena nol baris tanpa error sama sekali.
 *
 * KAPAN TIDAK DIPAKAI: hapus-bersih yang idempoten (mis. menghapus catatan kas
 * pasangan saat membatalkan pelunasan — kalau catatannya memang tak ada, itu
 * hasil yang benar, bukan kegagalan) dan self-heal yang jalan sendiri di tiap
 * muat. Memaksakan `wajibBerubah` di sana melahirkan galat palsu.
 */

/** Lempar bila Supabase membalas error. Kembalikan `res` apa adanya. */
export function wajibSukses<T extends { error: unknown }>(res: T, langkah: string): T {
  if (res.error) throw res.error instanceof Error ? res.error : new Error(`Gagal ${langkah}`);
  return res;
}

/**
 * Lempar bila error ATAU bila tak ada satu baris pun yang berubah.
 * Pemanggilnya WAJIB memakai `.select(...)` — tanpa itu `data` selalu null
 * dan penjaga ini akan salah menuduh tiap tulis yang sebenarnya berhasil.
 */
export function wajibBerubah<T>(
  res: { data: T[] | null; error: unknown },
  langkah: string,
): T[] {
  wajibSukses(res, langkah);
  const baris = res.data ?? [];
  if (baris.length === 0) {
    throw new Error(
      `Gagal ${langkah} — tak ada baris yang berubah. Datanya mungkin sudah ` +
        'diubah atau dihapus dari perangkat lain, atau izin tulis belum aktif. ' +
        'Muat ulang halaman lalu coba lagi.',
    );
  }
  return baris;
}
