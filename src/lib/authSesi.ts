import { pesanError } from './utils';

/** Penanda internal: percobaan masuk melewati batas sabar (lihat `batasWaktu`). */
export const WAKTU_HABIS = 'auth-waktu-habis';

/**
 * Batas sabar tombol "Masuk". Bukan sekadar rapi — `fetch` yang MENGGANTUNG di
 * sinyal buruk tidak pernah reject sendiri, jadi tanpa batas ini tombol bisa
 * memutar selamanya dan bendahara buntu total. 20 detik longgar untuk 400 kbps
 * (chunk klien Supabase 34 KB gzip + satu request auth).
 */
export const BATAS_MASUK_MS = 20_000;

/**
 * Balap `janji` melawan jam. Janji aslinya sengaja TIDAK dibatalkan: kalau
 * server akhirnya menjawab setelah pesan tampil, efek samping di dalamnya
 * (setState sesi) tetap jalan dan bendahara masuk sendiri.
 */
export function batasWaktu<T>(janji: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(WAKTU_HABIS)), ms);
    janji.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * Ubah kegagalan masuk jadi satu kalimat yang menunjuk tindakan yang benar.
 *
 * Kenapa tidak semua kegagalan dianggap "password salah": bendahara di sinyal
 * jelek akan mengira sandinya yang keliru, lalu mengganti-ganti sandi yang
 * sebenarnya sudah benar. Sebab jaringan dan sebab kredensial butuh tindakan
 * berbeda, jadi pesannya wajib berbeda.
 */
export function pesanLogin(error: unknown): string {
  const e = error as { status?: number; code?: string; message?: string } | null | undefined;

  if (e?.message === WAKTU_HABIS) return 'Server lama tak menjawab. Cek koneksi lalu coba lagi.';

  if (e?.status === 429 || e?.code === 'over_request_rate_limit') {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }

  // Diperiksa sebelum jatuh ke "password salah": kalau HP-nya jelas luring,
  // sandi sama sekali bukan penyebabnya.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Tidak ada internet. Sambungkan lalu coba lagi.';
  }

  // `pesanError` sudah menangkap pola "failed to fetch" — termasuk chunk klien
  // yang gagal diunduh ("Failed to fetch dynamically imported module: ...").
  return pesanError(error, 'Email atau password salah.');
}

/** Kunci sesi Supabase di localStorage: `sb-<ref>-auth-token`. */
const KUNCI_SESI = /^sb-.+-auth-token$/;

/**
 * Apakah ADA sesi bendahara tersimpan? Dibaca langsung dari localStorage supaya
 * pertanyaan "sudah login atau belum" bisa dijawab TANPA memuat klien Supabase.
 *
 * Kenapa penting: klien Supabase 34 KB gzip, dan sebelum ini ia duduk di jalur
 * KRITIS boot — diukur di 400 kbps/CPU 4×, chunk-nya baru selesai di 3369 ms
 * dari 4138 ms total sampai kolom sandi bisa dipakai. Padahal gate warga
 * sepenuhnya lokal, dan hampir semua pengguna app ini adalah warga: mereka
 * menunggu unduhan yang tak pernah mereka perlukan di layar itu.
 */
export function adaSesiTersimpan(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && KUNCI_SESI.test(k)) return true;
    }
  } catch { /* storage diblokir → anggap tak ada */ }
  return false;
}

/**
 * Buang sesi tersimpan tanpa lewat klien Supabase. Dipakai sebagai jaring
 * terakhir saat "Keluar" gagal menghubungi server: menekan Keluar lalu
 * ditinggali token aktif di HP adalah kegagalan yang lebih buruk daripada
 * token yang belum dicabut di sisi server.
 */
export function hapusSesiLokal(): void {
  try {
    const kunci: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && KUNCI_SESI.test(k)) kunci.push(k);
    }
    kunci.forEach((k) => localStorage.removeItem(k));
  } catch { /* storage diblokir → tak ada yang perlu dibuang */ }
}
