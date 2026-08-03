import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Ringkasan Beranda (`fetchDashboardSummary`) — angka yang PALING sering dilihat
 * di app ini: saldo hero, total talangan, jumlah tarikan. Sebelum berkas ini,
 * seluruh perhitungannya tak punya satu pun uji, padahal isinya lima aturan
 * bisnis yang semuanya bisa rusak tanpa suara:
 *
 *   1. talangan hanya dijumlah bila BELUM lunas
 *   2. setoran hanya baris bertipe `setor_kas_rt`
 *   3. kas terkumpul hanya dari tarikan berstatus `selesai`
 *   4. saldo = terkumpul − talangan − setor (lewat helper tunggal)
 *   5. `tarikan_terakhir` = baris pertama (query sudah urut nomor menurun)
 *
 * Sebuah salah-hitung di sini tidak menampilkan error apa pun — ia menampilkan
 * ANGKA LAIN yang tampak sah. Karena itu tiap aturan diuji lewat data yang
 * memuat kasus penyangkalnya (ada yang lunas, ada tipe lain, ada yang belum
 * selesai), bukan lewat data yang kebetulan hanya berisi kasus benar.
 *
 * Lapis kedua: `.select()` Supabase TIDAK melempar saat gagal — ia memulangkan
 * `{ data: null, error }`. Tanpa cek, satu query gagal berubah jadi ringkasan
 * Rp0 yang terpampang sebagai fakta di hero. Keempat query diuji satu per satu.
 *
 * Mock di-dispatch per NAMA TABEL, bukan antrean panggilan: `Promise.all`
 * membuat urutan penyelesaian tak dijamin, dan mock berantai akan lulus/gagal
 * mengikuti hal yang bukan urusan uji ini.
 */

type Res = { data: unknown; error: unknown; count?: number };

let meja: Record<string, Res>;

function builder(nama: string): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.order = () => b;
  b.then = (resolve: (v: Res) => unknown) =>
    Promise.resolve(meja[nama] ?? { data: [], error: null, count: 0 }).then(resolve);
  return b;
}

vi.mock('./supabase', () => ({ supabase: { from: (nama: string) => builder(nama) } }));

const { fetchDashboardSummary } = await import('./dashboard');

const tarikan = (nomor: number, status: string, total_terkumpul: number | null | undefined) =>
  ({ id: `t${nomor}`, nomor, status, total_terkumpul });

beforeEach(() => {
  meja = {
    warga: { data: [], error: null, count: 0 },
    tarikan: { data: [], error: null },
    talangan: { data: [], error: null },
    transaksi_kas: { data: [], error: null },
  };
});

describe('fetchDashboardSummary — aturan bisnis angka Beranda', () => {
  it('talangan: hanya yang BELUM lunas dijumlah', async () => {
    meja.talangan = {
      data: [
        { nominal: 50_000, status_lunas: false },
        { nominal: 50_000, status_lunas: true },   // lunas → tidak dihitung
        { nominal: 25_000, status_lunas: false },
      ],
      error: null,
    };
    const r = await fetchDashboardSummary();
    expect(r.total_talangan_belum_lunas).toBe(75_000);
  });

  it('setoran: hanya baris bertipe `setor_kas_rt`', async () => {
    meja.transaksi_kas = {
      data: [
        { tipe: 'setor_kas_rt', nominal: 1_000_000 },
        { tipe: 'iuran_warga', nominal: 500_000 },  // tipe lain → tidak dihitung
        { tipe: 'setor_kas_rt', nominal: 380_000 },
      ],
      error: null,
    };
    const r = await fetchDashboardSummary();
    expect(r.total_setor_kas_rt).toBe(1_380_000);
  });

  /* `total_terkumpul` KOSONG wajib dipakai `undefined`, bukan `null`, untuk
     menguji penjaga `?? 0`: di JS `angka + null` = angka (null jadi 0 sendiri),
     jadi data null LULUS meski penjaganya dicopot — uji versi pertama berkas ini
     memang begitu, dan uji mutasi yang membongkarnya. Yang benar-benar bikin
     seluruh hero jadi "RpNaN" adalah kolom yang HILANG dari baris. */
  it('kas terkumpul: hanya tarikan `selesai`; kolom kosong dihitung 0, bukan NaN', async () => {
    meja.tarikan = {
      data: [
        tarikan(4, 'selesai', undefined),    // kolom hilang → 0
        tarikan(3, 'dijadwalkan', 999_999),  // belum selesai → tidak dihitung
        tarikan(2, 'selesai', null),         // null → 0
        tarikan(1, 'selesai', 3_450_000),
      ],
      error: null,
    };
    const r = await fetchDashboardSummary();
    expect(r.total_kas_terkumpul).toBe(3_450_000);
  });

  it('saldo = terkumpul − talangan belum lunas − setoran', async () => {
    meja.tarikan = { data: [tarikan(1, 'selesai', 5_000_000)], error: null };
    meja.talangan = { data: [{ nominal: 750_000, status_lunas: false }], error: null };
    meja.transaksi_kas = { data: [{ tipe: 'setor_kas_rt', nominal: 1_000_000 }], error: null };
    const r = await fetchDashboardSummary();
    expect(r.saldo_aktif).toBe(3_250_000);
  });

  it('saldo boleh MINUS — talangan ditutup penuh dari kas, itu memang modelnya', async () => {
    meja.tarikan = { data: [tarikan(1, 'selesai', 100_000)], error: null };
    meja.talangan = { data: [{ nominal: 500_000, status_lunas: false }], error: null };
    const r = await fetchDashboardSummary();
    expect(r.saldo_aktif).toBe(-400_000);
  });

  it('cacah tarikan: `selesai` dan `dijadwalkan` dihitung terpisah', async () => {
    meja.tarikan = {
      data: [
        tarikan(4, 'dijadwalkan', 0),
        tarikan(3, 'dijadwalkan', 0),
        tarikan(2, 'selesai', 100_000),
        tarikan(1, 'dibatalkan', 0),   // bukan keduanya → tak masuk cacah mana pun
      ],
      error: null,
    };
    const r = await fetchDashboardSummary();
    expect(r.jumlah_tarikan).toBe(1);
    expect(r.jumlah_dijadwalkan).toBe(2);
  });

  it('`tarikan_terakhir` = baris pertama (query sudah urut nomor menurun)', async () => {
    meja.tarikan = { data: [tarikan(9, 'selesai', 10), tarikan(8, 'selesai', 10)], error: null };
    const r = await fetchDashboardSummary();
    expect(r.tarikan_terakhir?.nomor).toBe(9);
  });

  it('tanpa tarikan sama sekali → `tarikan_terakhir` null, bukan undefined', async () => {
    const r = await fetchDashboardSummary();
    expect(r.tarikan_terakhir).toBeNull();
  });

  it('jumlah anggota diambil dari `count`, bukan panjang data', async () => {
    meja.warga = { data: [], error: null, count: 69 };
    const r = await fetchDashboardSummary();
    expect(r.jumlah_anggota).toBe(69);
  });
});

/* Jaring "gagal diam-diam": tiap query diuji sendiri-sendiri. Kalau salah satu
   cek `res.error` dilepas, satu-satunya test yang jatuh adalah miliknya — jadi
   pesan kegagalannya langsung menunjuk query mana yang kehilangan penjaga. */
describe('fetchDashboardSummary — kegagalan tidak boleh jadi Rp0', () => {
  for (const tabel of ['warga', 'tarikan', 'talangan', 'transaksi_kas']) {
    it(`query ${tabel} gagal → melempar, bukan memulangkan angka kosong`, async () => {
      meja[tabel] = { data: null, error: { message: `boom ${tabel}` }, count: undefined };
      await expect(fetchDashboardSummary()).rejects.toBeTruthy();
    });
  }
});
