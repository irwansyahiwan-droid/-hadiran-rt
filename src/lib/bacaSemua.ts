import { supabase } from './supabase';

/**
 * Baca SELURUH baris sebuah tabel, berhalaman (19 Okt 2026).
 *
 * PostgREST (Supabase) memotong TIAP jawaban di `max_rows` — 1000 baris —
 * TANPA galat dan tanpa tanda apa pun di `data`. Terukur hari itu: `absensi`
 * 1680 baris, `select('*')` polos menjawab tepat 1000. Akibatnya:
 *   · file Backup hanya memuat 1000 baris absensi, dan Restore ("ganti TOTAL
 *     data") akan menghapus 680 catatan kehadiran;
 *   · saldo Kas Hadiran, total talangan & laporan triwulan menjumlah tabel
 *     utuh — `transaksi_kas` 341 & `talangan` 304 baris, ±14 & ±13 per
 *     tarikan, jadi sekitar setahun lagi angkanya salah TANPA tanda.
 *
 * Aturan berhenti memakai HITUNGAN server (`count: 'exact'`), bukan "halaman
 * tak penuh": kalau `max_rows` suatu hari diturunkan di bawah ukuran halaman,
 * halaman yang tak penuh BUKAN akhir data — berhenti di sana mengembalikan
 * persis bug ini. Tanpa hitungan (tiruan uji), baru jatuh ke aturan halaman.
 *
 * Urutan pemutus WAJIB stabil: baris bertanggal sama bisa bertukar tempat
 * antar-halaman lalu terbaca ganda / hilang. Karena itu `urut` (default `id`)
 * selalu ditambahkan SESUDAH urutan milik pemanggil.
 */
export const UKURAN_HALAMAN = 1000;

export interface Halaman<T> {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
}

/** INTI murni — teruji tanpa Supabase. `ambil(dari, sampai)` = satu halaman
 *  (indeks inklusif, gaya `.range()`). */
export async function kumpulkanHalaman<T>(
  ambil: (dari: number, sampai: number) => PromiseLike<Halaman<T>>,
  { ketat = false, ukuran = UKURAN_HALAMAN, nama = 'data' }: { ketat?: boolean; ukuran?: number; nama?: string } = {},
): Promise<T[]> {
  const semua: T[] = [];
  let total: number | null = null;
  for (let dari = 0; ; ) {
    const { data, error, count } = await ambil(dari, dari + ukuran - 1);
    if (error) throw new Error(`Gagal membaca ${nama}: ${error.message}`);
    const baris = data ?? [];
    if (typeof count === 'number') total = count;
    semua.push(...baris);
    dari += baris.length;
    if (baris.length === 0) break;
    if (total !== null ? semua.length >= total : baris.length < ukuran) break;
  }
  if (ketat) {
    if (total === null) throw new Error(`Gagal membaca ${nama}: jumlah baris dari server tak tersedia.`);
    if (semua.length !== total) {
      throw new Error(`Gagal membaca ${nama}: terbaca ${semua.length} dari ${total} baris — data berubah saat dibaca. Coba lagi.`);
    }
  }
  return semua;
}

/* Antarmuka STRUKTURAL, bukan tipe pembangun supabase-js: kolom dinamis
   (`select(kolom)`) membuat tipe aslinya meledak ("excessively deep") di tsc
   proyek app. Yang dibutuhkan pemanggil cuma saringan & urutan. */
export interface Kueri {
  eq(kolom: string, nilai: unknown): Kueri;
  order(kolom: string, opsi?: { ascending?: boolean }): Kueri;
  range(dari: number, sampai: number): PromiseLike<Halaman<unknown>>;
}

/** Seluruh baris `tabel`. `saring` menambah filter/urutan milik pemanggil;
 *  `ketat` (Backup) menolak hasil yang jumlahnya tak sama dgn hitungan server. */
export function bacaSemua<T>(
  tabel: string,
  kolom: string,
  { saring, urut = 'id', ketat = false }: { saring?: (q: Kueri) => Kueri; urut?: string; ketat?: boolean } = {},
): Promise<T[]> {
  return kumpulkanHalaman<T>((dari, sampai) => {
    let q = supabase.from(tabel).select(kolom, { count: 'exact' }) as unknown as Kueri;
    if (saring) q = saring(q);
    return q.order(urut, { ascending: true }).range(dari, sampai) as PromiseLike<Halaman<T>>;
  }, { ketat, nama: tabel });
}

/** Bentuk jawaban Supabase (`{ data, error }`) — pengganti LANGSUNG
 *  `supabase.from(t).select(k)` di `Promise.all` yang sudah memeriksa
 *  `.error`. Tak pernah melempar; galat pulang di `error`. */
export async function bacaSemuaRes<T>(
  tabel: string,
  kolom: string,
  opsi: Parameters<typeof bacaSemua>[2] = {},
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    return { data: await bacaSemua<T>(tabel, kolom, opsi), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
