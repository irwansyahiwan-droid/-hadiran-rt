/**
 * Penjaga ISI PDF Laporan Triwulan — dokumen tutup buku bertanda tangan.
 *
 * Bentuknya BEDA dari dua penjaga cetak lain, dan itu disengaja: di sini
 * "computed lawan given" BUKAN invarian. Tipe `RekapTriwulan` menyatakannya
 * sendiri — `hadiranBelumSetor` dan `rtSaldoAkhir` KUMULATIF (lintas triwulan),
 * sedangkan `Selisih triwulan` yang dihitung generator hanya periode ini.
 * Menuntut keduanya sama akan melahirkan temuan PALSU; dibaca dulu di
 * `laporan.ts` sebelum menulis uji ini.
 *
 * Yang dijaga karena itu:
 *  1. RUMUS yang benar-benar milik generator — `Selisih triwulan` wajib sama
 *     dgn masuk − keluar untuk KEDUA kas.
 *  2. BARIS BERSYARAT `Saldo Awal` — hanya muncul saat `rtSaldoAwal > 0`
 *     (seed sekali, bukan pemasukan periode ini). Perilaku yang sengaja, jadi
 *     wajib dipatok dua arah.
 *  3. KELENGKAPAN. Tinggi halaman DIHITUNG dari isi (`H += ...`), jadi baris
 *     yang luput tidak "meluber" — ia HILANG tanpa jejak. Tiap nilai yang
 *     dijanjikan wajib benar-benar tercetak.
 */
import { describe, it, expect } from 'vitest';
import { buildLaporanTriwulanPDF } from './generateLaporanTriwulanPDF';
import type { RekapTriwulan } from './laporan';
import { teksPdf } from './pdfTeksUji';

const REKAP: RekapTriwulan = {
  key: '2026-Q3', tahun: 2026, triwulan: 3, romawi: 'III',
  label: 'Triwulan III 2026', rentang: 'Jul–Sep 2026',
  hadiranMasuk: 9_350_000, hadiranSetor: 2_500_000,
  hadiranBelumSetor: 11_100_000,   // KUMULATIF — sengaja ≠ masuk − setor
  hadiranTalangan: 150_000,
  rtSaldoAwal: 0, rtMasuk: 6_250_000, rtKeluar: 2_750_000,
  rtSaldoAkhir: 16_352_000,        // KUMULATIF — sengaja ≠ masuk − keluar
  tarikanSelesai: 3, talanganLunas: 2, jumlahTransaksi: 12,
};
/* Nilai dicetak sbg SATU string utuh berikut tandanya (`-Rp2.500.000`), jadi
   pemeriksaan WAJIB kesamaan persis pada elemen — bukan substring pada teks
   gabungan. Ketahuan lewat mutasi: rumus `Selisih triwulan` dibalik menjadi
   `-Rp3.500.000`, dan `toContain('Rp3.500.000')` tetap HIJAU karena cocok di
   dalamnya. Assertion yang buta tanda bukan penjaga di dokumen keuangan. */
const rp = (n: number) => `Rp${Math.abs(n).toLocaleString('id-ID')}`;
const neg = (n: number) => `-${rp(n)}`;
const punya = (t: string[], s: string) => t.includes(s);

describe('PDF Laporan Triwulan — isi dokumen', () => {
  it('mencetak SELISIH TRIWULAN sesuai rumusnya, untuk kedua kas', () => {
    const t = teksPdf(buildLaporanTriwulanPDF(REKAP).doc);
    expect(punya(t, rp(REKAP.hadiranMasuk - REKAP.hadiranSetor)), 'selisih Kas Hadiran salah/tak tercetak').toBe(true);
    expect(punya(t, rp(REKAP.rtMasuk - REKAP.rtKeluar)), 'selisih Kas RT salah/tak tercetak').toBe(true);
  });

  it('KELENGKAPAN: tiap nilai yang dijanjikan benar-benar tercetak', () => {
    const t = teksPdf(buildLaporanTriwulanPDF(REKAP).doc);
    const gab = t.join(' | ');
    /* Tanda IKUT diperiksa: yang dicetak negatif wajib bertanda minus. */
    for (const [nama, s] of [
      ['kas terkumpul', rp(REKAP.hadiranMasuk)], ['setor', neg(REKAP.hadiranSetor)],
      ['belum disetor', rp(REKAP.hadiranBelumSetor)], ['talangan', neg(REKAP.hadiranTalangan)],
      ['pemasukan RT', rp(REKAP.rtMasuk)], ['pengeluaran RT', neg(REKAP.rtKeluar)],
      ['saldo akhir RT', rp(REKAP.rtSaldoAkhir)],
    ] as const) {
      expect(nama.length, 'fixture cacat').toBeGreaterThan(2);
      expect(punya(t, s), `${nama} hilang dari kertas (harap "${s}")`).toBe(true);
    }
    expect(gab, 'label periode hilang').toContain(REKAP.label);
    expect(t.length, 'terlalu sedikit string — dokumen kemungkinan kosong').toBeGreaterThan(30);
  });

  it('BARIS BERSYARAT: "Saldo Awal" muncul HANYA saat rtSaldoAwal > 0', () => {
    const tanpa = teksPdf(buildLaporanTriwulanPDF(REKAP).doc).join(' | ');
    expect(tanpa, 'Saldo Awal muncul padahal nilainya 0').not.toContain('Saldo Awal');

    const dengan = teksPdf(buildLaporanTriwulanPDF({ ...REKAP, rtSaldoAwal: 8_000_000 }).doc).join(' | ');
    expect(dengan, 'Saldo Awal hilang padahal nilainya > 0').toContain('Saldo Awal');
    expect(punya(teksPdf(buildLaporanTriwulanPDF({ ...REKAP, rtSaldoAwal: 8_000_000 }).doc), rp(8_000_000))).toBe(true);
  });
});
