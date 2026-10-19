import { describe, it, expect, vi } from 'vitest';

// Perhitungan murni — klien Supabase tak dipakai, tapi modulnya diimpor dan
// membutuhkan env yang tak ada di mesin uji.
vi.mock('./supabase', () => ({ supabase: {} }));
import { susunKartu, type TarikanRingkas } from './kartuWarga';

/**
 * Aturan Kartu Warga. Tiap uji memuat kasus PENYANGKALNYA (tarikan belum
 * selesai, talangan lunas, Sohibul Bait warga lain) — data yang hanya berisi
 * kasus benar meluluskan perhitungan yang salah.
 */

const T = (nomor: number, status: TarikanRingkas['status'], sohibul: string | null): TarikanRingkas => ({
  id: `t${nomor}`,
  nomor,
  tanggal: `2026-0${nomor}-10`,
  status,
  sohibul_bait_id: sohibul,
  sohibul_bait: sohibul ? { nama: `Nama ${sohibul}` } : null,
});

const tarikan: TarikanRingkas[] = [
  T(1, 'selesai', 'w9'),
  T(2, 'selesai', 'w1'),
  T(3, 'selesai', 'w9'),
  T(4, 'dijadwalkan', 'w9'),
  T(5, 'dijadwalkan', 'w1'),
];

describe('susunKartu', () => {
  it('menghitung kehadiran hanya dari tarikan SELESAI', () => {
    const k = susunKartu('w1', tarikan, [
      { tarikan_id: 't1', status: 'hadir' },
      { tarikan_id: 't2', status: 'hadir' },
      { tarikan_id: 't3', status: 'titip' },
      { tarikan_id: 't4', status: 'tidak_hadir' },   // belum final → diabaikan
    ], []);
    expect(k).toMatchObject({ hadir: 2, titip: 1, tidakHadir: 0 });
  });

  it('talangan: hanya yang BELUM lunas, diurut nomor, dijumlah', () => {
    const k = susunKartu('w1', tarikan, [], [
      { tarikan_id: 't3', nominal: 50000, status_lunas: false },
      { tarikan_id: 't1', nominal: 50000, status_lunas: false },
      { tarikan_id: 't2', nominal: 50000, status_lunas: true },
    ]);
    expect(k.tunggakan.map((t) => t.nomor)).toEqual([1, 3]);
    expect(k.totalTunggakan).toBe(100000);
  });

  it('talangan membawa nama PENARIK tarikannya (Sohibul Bait), bukan nama warga ini', () => {
    const k = susunKartu('w1', [...tarikan, { ...T(6, 'selesai', null), sohibul_bait: null }], [], [
      { tarikan_id: 't3', nominal: 50000, status_lunas: false },
      { tarikan_id: 't6', nominal: 50000, status_lunas: false },
    ]);
    expect(k.tunggakan.map((t) => t.penarik)).toEqual(['Nama w9', null]);   // t6 tanpa penarik → null, bukan nama palsu
  });

  it('talangan ke tarikan yang tak dikenal dilewati, bukan salah hitung', () => {
    const k = susunKartu('w1', tarikan, [], [{ tarikan_id: 'hantu', nominal: 50000, status_lunas: false }]);
    expect(k.tunggakan).toEqual([]);
    expect(k.totalTunggakan).toBe(0);
  });

  it('giliran: tarikan belum selesai terdekat milik warga ini + sisa sebelumnya', () => {
    const k = susunKartu('w1', tarikan, [], []);
    expect(k.giliran).toEqual({ nomor: 5, tanggal: '2026-05-10', sisaSebelum: 1 });   // t4 milik w9 masih di depan
    expect(k.sudahMenerima).toEqual([{ nomor: 2, tanggal: '2026-02-10', pendapatanKotor: null }]);   // total tak ada → null, bukan 0
  });

  it('giliran 0 sisa = tarikan berikutnya', () => {
    const k = susunKartu('w9', tarikan, [], []);
    expect(k.giliran).toMatchObject({ nomor: 4, sisaSebelum: 0 });
    expect(k.sudahMenerima.map((t) => t.nomor)).toEqual([3, 1]);   // terbaru di depan
  });

  it('tanpa jadwal tersisa → giliran null', () => {
    expect(susunKartu('w-lain', tarikan, [], []).giliran).toBeNull();
  });

  it('jejak: satu titik per tarikan SELESAI, urut nomor — penerima = sohibul, tanpa catatan = kosong', () => {
    const k = susunKartu('w1', tarikan, [
      { tarikan_id: 't1', status: 'tidak_hadir' },
      { tarikan_id: 't2', status: 'hadir' },        // w1 penerima t2 → 'sohibul', bukan 'hadir'
      { tarikan_id: 't4', status: 'hadir' },        // belum selesai → tak masuk jejak
    ], []);
    expect(k.jejak).toEqual([
      { nomor: 1, tanggal: '2026-01-10', status: 'tidak_hadir', penarik: 'Nama w9' },
      { nomor: 2, tanggal: '2026-02-10', status: 'sohibul', penarik: 'Nama w1' },
      { nomor: 3, tanggal: '2026-03-10', status: 'kosong', penarik: 'Nama w9' },
    ]);
  });

  it('pendapatan kotor Sohibul Bait = pembayar (total_terkumpul ÷ 5.000) × 45.000', () => {
    const k = susunKartu('w9', tarikan.map((t) => (t.nomor === 3 ? { ...t, total_terkumpul: 345000 } : t)), [], []);
    expect(k.sudahMenerima).toEqual([
      { nomor: 3, tanggal: '2026-03-10', pendapatanKotor: 69 * 45000 },   // 69 pembayar → Rp3.105.000
      { nomor: 1, tanggal: '2026-01-10', pendapatanKotor: null },        // total tak dimuat → tak dikarang
    ]);
  });

  it('talangan lunas jadi RIWAYAT (terbaru di depan), tak ikut total tunggakan', () => {
    const k = susunKartu('w1', tarikan, [], [
      { tarikan_id: 't1', nominal: 50000, status_lunas: true, tanggal_lunas: '2026-01-20' },
      { tarikan_id: 't3', nominal: 50000, status_lunas: true, tanggal_lunas: null },
      { tarikan_id: 't2', nominal: 50000, status_lunas: false },
    ]);
    expect(k.talanganLunas.map((t) => [t.nomor, t.tanggalLunas])).toEqual([[3, null], [1, '2026-01-20']]);
    expect(k.tunggakan.map((t) => t.nomor)).toEqual([2]);
    expect(k.totalTunggakan).toBe(50000);
  });
});
