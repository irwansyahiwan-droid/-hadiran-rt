import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Jaring pengaman jalur TULIS: Supabase TIDAK melempar saat gagal — ia
 * mengembalikan `{ data: null, error }`. Kalau `recomputeTarikan()` mengabaikan
 * `error`, fungsi tetap PULANG NORMAL dan pemanggilnya (Kelola Anggota → tambah
 * anggota susulan) menampilkan toast "…lunas N tarikan · Kas +Rp…" padahal buku
 * kas tidak bergerak sama sekali. Uji ini mengunci perilaku yang benar: gagal =
 * melempar, supaya `catch` di UI memasang toast error.
 */

type Res = { data: unknown; error: unknown };

/** Antrean jawaban per-langkah; tiap panggilan mengambil satu. */
let antrean: Res[] = [];
const ambil = (): Res => antrean.shift() ?? { data: [], error: null };

// Query builder palsu: semua method mengembalikan `this`, dan hasilnya diambil
// saat di-`await` (thenable) — meniru bentuk PostgrestFilterBuilder.
function builder(): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'order']) {
    b[m] = () => b;
  }
  b.single = () => Promise.resolve(ambil());
  b.maybeSingle = () => Promise.resolve(ambil());
  b.then = (resolve: (v: Res) => unknown) => Promise.resolve(ambil()).then(resolve);
  return b;
}

vi.mock('./supabase', () => ({
  supabase: { from: () => builder() },
}));

const { recomputeTarikan, jadwalSohibulMendatang } = await import('./anggota');

const TARIKAN = { data: { id: 't1', nomor: 3, tanggal: '2026-07-01', sohibul_bait_id: 'w1' }, error: null };
const WARGA = { data: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }], error: null };
const ABSENSI = { data: [{ warga_id: 'w2', status: 'hadir' }, { warga_id: 'w3', status: 'tidak_hadir' }], error: null };
const TALANGAN_ADA = { data: [], error: null };
const KAS_ROW = { data: null, error: null };
/* Tulis yang berhasil mengembalikan BARIS-nya — jalur tulis memakai
   `.select('id')` agar "0 baris" bisa dibedakan dari "1 baris". */
const OK = { data: [{ id: 'ok' }], error: null };

beforeEach(() => { antrean = []; });

describe('recomputeTarikan — kegagalan tulis tidak boleh diam', () => {
  it('melempar saat INSERT talangan gagal', async () => {
    antrean = [
      TARIKAN, WARGA, ABSENSI, TALANGAN_ADA,
      { data: null, error: { message: 'insert talangan gagal' } }, // insert talangan
    ];
    await expect(recomputeTarikan('t1')).rejects.toBeTruthy();
  });

  it('melempar saat UPDATE ringkasan tarikan gagal (langkah terakhir)', async () => {
    antrean = [
      TARIKAN, WARGA, ABSENSI, TALANGAN_ADA,
      OK,        // insert talangan
      KAS_ROW,   // maybeSingle kas_masuk → belum ada
      OK,        // insert kas_masuk
      { data: null, error: { message: 'update tarikan gagal' } }, // update tarikan
    ];
    await expect(recomputeTarikan('t1')).rejects.toBeTruthy();
  });

  it('melempar saat BACA absensi gagal (hitungan tak boleh jalan di atas data kosong palsu)', async () => {
    antrean = [
      TARIKAN, WARGA,
      { data: null, error: { message: 'baca absensi gagal' } },
    ];
    await expect(recomputeTarikan('t1')).rejects.toBeTruthy();
  });

  it('pulang normal ketika semua langkah sukses', async () => {
    antrean = [TARIKAN, WARGA, ABSENSI, TALANGAN_ADA, OK, KAS_ROW, OK, OK];
    const r = await recomputeTarikan('t1');
    expect(r.nomor).toBe(3);
    // w1 = Sohibul (di luar akuntansi) → pembayar = w2 & w3
    expect(r.pembayarCount).toBe(2);
    expect(r.talanganCount).toBe(1); // hanya w3 'tidak_hadir'
  });
});

/**
 * Penjaga "anggota ini masih Sohibul Bait di tarikan mendatang". Ia harus
 * gagal-TERTUTUP: kalau querynya gagal dan hasilnya dianggap daftar kosong,
 * penjaga diam-diam mati dan anggota yang masih dijadwalkan MENERIMA arisan
 * tetap dinonaktifkan — tarikan itu lalu kehilangan penerimanya.
 */
describe('jadwalSohibulMendatang — penjaga nonaktif harus gagal-tertutup', () => {
  it('MELEMPAR saat query gagal, bukan mengembalikan daftar kosong', async () => {
    antrean = [{ data: null, error: { message: 'network' } }];
    await expect(jadwalSohibulMendatang('w9')).rejects.toBeTruthy();
  });

  it('daftar kosong hanya berarti benar-benar tak ada jadwal mendatang', async () => {
    antrean = [{ data: [], error: null }];
    await expect(jadwalSohibulMendatang('w9')).resolves.toEqual([]);
  });

  it('mengembalikan nomor tarikan yang menahan penonaktifan', async () => {
    antrean = [{ data: [{ nomor: 8 }, { nomor: 12 }], error: null }];
    await expect(jadwalSohibulMendatang('w9')).resolves.toEqual([8, 12]);
  });
});
