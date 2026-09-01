import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hitungSaldoHadiran } from './utils';

/**
 * Matematika uang di balik TUTUP BUKU — dokumen yang ditandatangani tiga
 * pengurus (PDF Laporan Pertanggungjawaban + kartu PNG yang dibagikan bendahara
 * ke grup WA). Sebelum berkas ini, `laporan.ts` (231 baris) tak punya satu pun
 * uji, padahal ia pernah salah persis di titik paling halus: talangan tidak
 * ikut dikurangi dari Kas Hadiran.
 *
 * Yang dikunci di sini adalah ATURANNYA, bukan implementasinya:
 *  1. Pendapatan hadiran = SUM(tarikan.total_terkumpul) tarikan selesai —
 *     BUKAN transaksi_kas.kas_masuk (baris manual/basi tak boleh ikut).
 *  2. Talangan BELUM lunas dibebankan ke triwulan TARIKANNYA (bukan triwulan
 *     berjalan) — tapi HANYA sbg field informasional `hadiranTalangan`.
 *  3. Talangan LUNAS = uang sudah balik; hanya menambah hitungan badge.
 *  4. hadiranBelumSetor = masuk − setor SAJA, kumulatif dari triwulan terlama.
 *     Talangan TIDAK mengurangi — itu beda `laporan.ts` (hasil akhir "sudah
 *     disetor / belum disetor") dari `hitungSaldoHadiran` (saldo Kas Hadiran
 *     app-wide, yang MEMANG mengurangi talangan; diuji terpisah di bawah).
 *  5. Query gagal WAJIB melempar — laporan nol yang "terlihat sah" jauh lebih
 *     berbahaya daripada layar error, karena angka nol itu ikut ke PDF & WA.
 */

type Res = { data: unknown; error: unknown };

/** Jawaban per NAMA TABEL (bukan antrean urutan) → uji tak rapuh saat urutan
 *  query di dalam Promise.all berubah. */
let jawab: Record<string, Res> = {};

function builder(table: string): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'not', 'order', 'limit']) b[m] = () => b;
  b.then = (resolve: (v: Res) => unknown) =>
    Promise.resolve(jawab[table] ?? { data: [], error: null }).then(resolve);
  return b;
}

vi.mock('./supabase', () => ({
  supabase: { from: (t: string) => builder(t) },
}));

const { fetchRekapTriwulan, fetchSnapshotKas } = await import('./laporan');

const ok = (data: unknown): Res => ({ data, error: null });
const kosong = () => { jawab = {}; };

beforeEach(kosong);
afterEach(() => vi.useRealTimers());

// ── fetchRekapTriwulan ──────────────────────────────────────────────

describe('Rekap triwulan — sumber pendapatan', () => {
  it('pendapatan hadiran dari total_terkumpul, kas_masuk manual DIABAIKAN', async () => {
    jawab = {
      tarikan: ok([{ tanggal: '2026-05-10', total_terkumpul: 345_000 }]),
      // Baris kas_masuk sengaja ada & bernilai beda: kalau ikut terhitung,
      // hadiranMasuk jadi 345.000 + 999.000 dan laporan drift dari Beranda.
      transaksi_kas: ok([{ tipe: 'kas_masuk', nominal: 999_000, tanggal: '2026-05-10' }]),
    };
    const [q2] = await fetchRekapTriwulan();
    expect(q2.hadiranMasuk).toBe(345_000);
    expect(q2.hadiranSetor).toBe(0);
    expect(q2.hadiranTalangan).toBe(0);
  });

  it('hanya setor_kas_rt dihitung sbg setoran; kas_keluar diabaikan (selaras Beranda & Kas Hadiran)', async () => {
    jawab = {
      transaksi_kas: ok([
        { tipe: 'setor_kas_rt', nominal: 1_380_000, tanggal: '2026-05-31' },
        // kas_keluar tak pernah ditulis satu jalur pun di app (selalu 0 nyata),
        // dan hitungSaldoHadiran (Beranda & Kas Hadiran) juga tak menghitungnya —
        // kalau baris ini masih ikut menambah hadiranSetor, itu sumber drift.
        { tipe: 'kas_keluar', nominal: 20_000, tanggal: '2026-05-31' },
      ]),
    };
    const [q2] = await fetchRekapTriwulan();
    expect(q2.hadiranSetor).toBe(1_380_000);
  });
});

describe('Rekap triwulan — talangan', () => {
  it('talangan BELUM lunas dibebankan ke triwulan TARIKANNYA, bukan triwulan berjalan', async () => {
    jawab = {
      tarikan: ok([{ tanggal: '2026-02-08', total_terkumpul: 345_000 }]),
      talangan: ok([
        { nominal: 50_000, status_lunas: false, tanggal_lunas: null, tarikan: { tanggal: '2026-02-08' } },
        { nominal: 50_000, status_lunas: false, tanggal_lunas: null, tarikan: { tanggal: '2026-02-15' } },
      ]),
    };
    const hasil = await fetchRekapTriwulan();
    expect(hasil).toHaveLength(1);            // dua-duanya jatuh di Triwulan I
    expect(hasil[0].triwulan).toBe(1);
    expect(hasil[0].hadiranTalangan).toBe(100_000);
  });

  it('talangan LUNAS net NOL — tak menambah keluar, hanya hitungan', async () => {
    jawab = {
      tarikan: ok([{ tanggal: '2026-02-08', total_terkumpul: 345_000 }]),
      talangan: ok([
        { nominal: 50_000, status_lunas: true, tanggal_lunas: '2026-02-20', tarikan: { tanggal: '2026-02-08' } },
      ]),
    };
    const [q1] = await fetchRekapTriwulan();
    expect(q1.hadiranTalangan).toBe(0);
    expect(q1.talanganLunas).toBe(1);
    expect(q1.hadiranBelumSetor).toBe(345_000);
  });

  it('talangan lunas dihitung di triwulan PELUNASAN, bukan triwulan tarikan', async () => {
    jawab = {
      tarikan: ok([{ tanggal: '2026-02-08', total_terkumpul: 345_000 }]),
      talangan: ok([
        { nominal: 50_000, status_lunas: true, tanggal_lunas: '2026-04-02', tarikan: { tanggal: '2026-02-08' } },
      ]),
    };
    const hasil = await fetchRekapTriwulan();     // terbaru dulu → [Q2, Q1]
    const q1 = hasil.find((r) => r.triwulan === 1)!;
    const q2 = hasil.find((r) => r.triwulan === 2)!;
    expect(q1.talanganLunas).toBe(0);
    expect(q2.talanganLunas).toBe(1);
  });
});

describe('Rekap triwulan — saldo kumulatif & urutan', () => {
  it('saldo triwulan berikutnya membawa sisa triwulan sebelumnya', async () => {
    jawab = {
      tarikan: ok([
        { tanggal: '2026-02-08', total_terkumpul: 300_000 },   // Q1
        { tanggal: '2026-05-08', total_terkumpul: 200_000 },   // Q2
      ]),
      transaksi_kas: ok([{ tipe: 'setor_kas_rt', nominal: 100_000, tanggal: '2026-05-31' }]), // Q2
      kas_rt: ok([
        { tipe: 'masuk', nominal: 100_000, tanggal: '2026-02-10' },
        { tipe: 'keluar', nominal: 40_000, tanggal: '2026-05-10' },
      ]),
    };
    const hasil = await fetchRekapTriwulan();
    expect(hasil.map((r) => r.key)).toEqual(['2026-Q2', '2026-Q1']);  // terbaru dulu
    const q1 = hasil[1], q2 = hasil[0];
    expect(q1.hadiranBelumSetor).toBe(300_000);
    expect(q2.hadiranBelumSetor).toBe(300_000 + 200_000 - 100_000);   // kumulatif
    expect(q1.rtSaldoAkhir).toBe(100_000);
    expect(q2.rtSaldoAkhir).toBe(60_000);
  });

  it('hadiranBelumSetor TIDAK ikut minus akibat talangan — talangan cuma dilaporkan, bukan pengurang', async () => {
    // Beda kunci dgn `hitungSaldoHadiran` (dipakai Beranda & Kas Hadiran, uji di
    // bawah): rumus itu MEMANG mengurangi talangan dan hasilnya minus untuk
    // input yang sama (lihat 'boleh minus' di bawah). `hadiranBelumSetor`
    // sengaja tidak — talangan itu bagian alur proses tarikan, bukan bagian
    // "sudah/belum disetor" yang dilaporkan tutup buku.
    jawab = {
      tarikan: ok([{ tanggal: '2026-07-04', total_terkumpul: 45_000 }]),
      talangan: ok([
        { nominal: 50_000, status_lunas: false, tanggal_lunas: null, tarikan: { tanggal: '2026-07-04' } },
        { nominal: 50_000, status_lunas: false, tanggal_lunas: null, tarikan: { tanggal: '2026-07-04' } },
      ]),
    };
    const [q3] = await fetchRekapTriwulan();
    expect(q3.hadiranTalangan).toBe(100_000);   // tetap dilaporkan (informasional)
    expect(q3.hadiranBelumSetor).toBe(45_000);  // TIDAK minus — beda dgn hitungSaldoHadiran(45_000, 100_000, 0) = -55_000
  });

  it('hadiranBelumSetor boleh minus kalau setor melebihi yang terkumpul triwulan ini', async () => {
    jawab = {
      tarikan: ok([{ tanggal: '2026-07-04', total_terkumpul: 45_000 }]),
      transaksi_kas: ok([{ tipe: 'setor_kas_rt', nominal: 60_000, tanggal: '2026-07-05' }]),
    };
    const [q3] = await fetchRekapTriwulan();
    expect(q3.hadiranBelumSetor).toBe(-15_000);
  });
});

describe('Rekap triwulan — Saldo Awal Kas RT', () => {
  // "Saldo Awal Kas RT" adalah baris seed SATU KALI (kas RT sebelum app ini
  // mulai mencatat) — bukan pemasukan periode manapun. Sebelum ini ia lumat
  // ke `rtMasuk`, jadi "Masuk" tutup buku selalu lebih besar dari uang yang
  // BENAR dikumpulkan periode itu. Dikenali lewat `keterangan` PERSIS,
  // selaras `KasRT.tsx` & `generateKasRTPDF.ts` — BUKAN `kategori IS NULL`
  // (kategori NULL juga berarti "belum dikategorikan" pada transaksi nyata).
  it('dikecualikan dari rtMasuk, ditampung terpisah di rtSaldoAwal', async () => {
    jawab = {
      kas_rt: ok([
        { tipe: 'masuk', kategori: null, nominal: 8_134_000, tanggal: '2026-01-01', keterangan: 'Saldo Awal Kas RT' },
        { tipe: 'masuk', kategori: 'iuran_warga', nominal: 500_000, tanggal: '2026-01-15', keterangan: 'Iuran warga' },
      ]),
    };
    const [q1] = await fetchRekapTriwulan();
    expect(q1.rtSaldoAwal).toBe(8_134_000);
    expect(q1.rtMasuk).toBe(500_000);          // TIDAK ikut 8.134.000
    expect(q1.rtSaldoAkhir).toBe(8_634_000);   // saldoAwal + masuk − keluar
  });

  it('kategori NULL tanpa keterangan cocok TETAP dihitung sbg masuk nyata (bukan Saldo Awal)', async () => {
    // Baris manual yg lupa dikategorikan (kategori NULL) bukan "Saldo Awal" —
    // menyaring lewat kategori NULL akan salah menelan baris ini.
    jawab = {
      kas_rt: ok([
        { tipe: 'masuk', kategori: null, nominal: 250_000, tanggal: '2026-05-10', keterangan: 'Sumbangan warga' },
      ]),
    };
    const [q2] = await fetchRekapTriwulan();
    expect(q2.rtSaldoAwal).toBe(0);
    expect(q2.rtMasuk).toBe(250_000);
  });

  it('rtSaldoAwal ikut kumulatif ke triwulan berikutnya (bukan diulang tiap triwulan)', async () => {
    jawab = {
      kas_rt: ok([
        { tipe: 'masuk', nominal: 8_134_000, tanggal: '2026-01-01', keterangan: 'Saldo Awal Kas RT' },
        { tipe: 'masuk', nominal: 500_000, tanggal: '2026-05-10', keterangan: 'Iuran warga' },   // Q2
      ]),
    };
    const hasil = await fetchRekapTriwulan();
    const q1 = hasil.find((r) => r.triwulan === 1)!;
    const q2 = hasil.find((r) => r.triwulan === 2)!;
    expect(q1.rtSaldoAwal).toBe(8_134_000);
    expect(q2.rtSaldoAwal).toBe(0);             // TIDAK diulang
    expect(q2.rtSaldoAkhir).toBe(8_634_000);    // tapi tetap terbawa kumulatif
  });
});

describe('Rekap triwulan — kegagalan query tidak boleh jadi laporan nol', () => {
  for (const tabel of ['transaksi_kas', 'kas_rt', 'tarikan', 'talangan']) {
    it(`melempar saat query ${tabel} gagal`, async () => {
      jawab = { [tabel]: { data: null, error: { message: `${tabel} 500` } } };
      await expect(fetchRekapTriwulan()).rejects.toBeTruthy();
    });
  }
});

// ── fetchSnapshotKas ────────────────────────────────────────────────

describe('Snapshot tutup buku — batas hari ini', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T10:00:00+07:00'));
  });

  it('baris bertanggal SESUDAH hari ini diabaikan', async () => {
    jawab = {
      tarikan: ok([
        { tanggal: '2026-07-11', total_terkumpul: 345_000 },   // sudah lewat
        { tanggal: '2026-07-25', total_terkumpul: 345_000 },   // belum terjadi
      ]),
      kas_rt: ok([
        { tipe: 'masuk', nominal: 100_000, tanggal: '2026-07-01' },
        { tipe: 'masuk', nominal: 900_000, tanggal: '2026-08-01' },  // masa depan
      ]),
    };
    const snap = await fetchSnapshotKas();
    expect(snap.tarikanSelesai).toBe(1);
    expect(snap.hadiranMasuk).toBe(345_000);
    expect(snap.rtMasuk).toBe(100_000);
  });

  it('talangan HANYA field informasional; tanggal tarikan yg BELUM terjadi tak ikut dihitung', async () => {
    jawab = {
      tarikan: ok([{ tanggal: '2026-07-11', total_terkumpul: 345_000 }]),
      talangan: ok([
        { nominal: 50_000, status_lunas: false, tanggal_lunas: null, tarikan: { tanggal: '2026-07-11' } },
        { nominal: 50_000, status_lunas: false, tanggal_lunas: null, tarikan: { tanggal: '2026-07-25' } },
      ]),
    };
    const snap = await fetchSnapshotKas();
    expect(snap.hadiranTalangan).toBe(50_000);       // hanya yg tarikannya sudah lewat
    expect(snap.hadiranBelumSetor).toBe(345_000);    // talangan TIDAK mengurangi (masuk − setor SAJA)
  });

  it('hadiranBelumSetor = masuk − setor, rtSaldoAkhir = masuk − keluar', async () => {
    jawab = {
      tarikan: ok([{ tanggal: '2026-07-04', total_terkumpul: 345_000 }]),
      transaksi_kas: ok([{ tipe: 'setor_kas_rt', nominal: 300_000, tanggal: '2026-07-05' }]),
      kas_rt: ok([
        { tipe: 'masuk', nominal: 300_000, tanggal: '2026-07-05' },
        { tipe: 'keluar', nominal: 70_000, tanggal: '2026-07-06' },
      ]),
    };
    const snap = await fetchSnapshotKas();
    expect(snap.hadiranBelumSetor).toBe(45_000);
    expect(snap.rtSaldoAkhir).toBe(230_000);
  });

  it('Saldo Awal Kas RT dikecualikan dari rtMasuk, tetap masuk rtSaldoAkhir', async () => {
    jawab = {
      kas_rt: ok([
        { tipe: 'masuk', nominal: 8_134_000, tanggal: '2026-01-01', keterangan: 'Saldo Awal Kas RT' },
        { tipe: 'masuk', nominal: 500_000, tanggal: '2026-07-05', keterangan: 'Iuran warga' },
        { tipe: 'keluar', nominal: 70_000, tanggal: '2026-07-06', keterangan: 'Pemeliharaan' },
      ]),
    };
    const snap = await fetchSnapshotKas();
    expect(snap.rtSaldoAwal).toBe(8_134_000);
    expect(snap.rtMasuk).toBe(500_000);           // TIDAK ikut Saldo Awal
    expect(snap.rtSaldoAkhir).toBe(8_564_000);    // 8.134.000 + 500.000 − 70.000
  });

  for (const tabel of ['transaksi_kas', 'kas_rt', 'tarikan', 'talangan']) {
    it(`melempar saat query ${tabel} gagal`, async () => {
      jawab = { [tabel]: { data: null, error: { message: `${tabel} 500` } } };
      await expect(fetchSnapshotKas()).rejects.toBeTruthy();
    });
  }
});

// ── helper saldo tunggal ────────────────────────────────────────────

describe('hitungSaldoHadiran — sumber tunggal rumus saldo', () => {
  it('kas − talangan belum lunas − setor', () => {
    expect(hitungSaldoHadiran(1_000_000, 150_000, 400_000)).toBe(450_000);
  });
  it('boleh minus (talangan ditutup penuh dari kas)', () => {
    expect(hitungSaldoHadiran(45_000, 100_000, 0)).toBe(-55_000);
  });
  it('talangan yang sudah lunas tidak lagi mengurangi (dilewatkan sbg 0)', () => {
    expect(hitungSaldoHadiran(1_000_000, 0, 0)).toBe(1_000_000);
  });
});
