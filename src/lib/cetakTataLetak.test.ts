/**
 * Penjaga TATA LETAK dokumen cetak — sumbu yang selama ini diakui terbuka.
 *
 * Dua puluh tiga penjaga isi membaca APA yang tercetak. Tak satu pun membaca
 * DI MANA. Bedanya bukan akademis: teks yang meluber ke luar halaman atau
 * jatuh di bawah batas bawah tetap ADA di aliran isi PDF — jadi seluruh
 * penjaga teks tetap hijau — tapi HILANG dari kertas waktu dicetak. Itu
 * kegagalan paling sunyi yang bisa dialami dokumen bertanda tangan.
 *
 * Yang dijaga: tak satu pun teks boleh keluar dari KOTAK HALAMAN, dan tepi
 * kanannya tak boleh melewati margin. Ambang toleransi 0,5pt (≈0,18mm) untuk
 * pembulatan float — bukan kelonggaran tata letak.
 *
 * Ini sekaligus menagih janji yang selama ini cuma tertulis di komentar
 * `generateLaporanTriwulanPDF`: "tinggi halaman menyesuaikan isi sehingga
 * tidak ada yang terpotong". Sekarang ada yang memeriksanya.
 *
 * BATAS ini DITUTUP 5 Sep 2026 oleh `cetakNonTeks.test.ts`: garis, kotak &
 * gambar kini punya populasinya sendiri, berikut vonis tumpang tindih lawan
 * teks. Berkas ini tetap mengurus SATU pertanyaan — apakah teks muat di
 * halaman & margin — dan tak perlu ikut tumbuh.
 */
import { describe, it, expect } from 'vitest';
import jsPDF from 'jspdf';
import { geometriPdf } from './pdfTeksUji';
import { barisH, seksiMinH, LANSIA } from './pdfTheme';
import { buildLaporanTriwulanPDF } from './generateLaporanTriwulanPDF';
import { buildKasRTPDF } from './generateKasRTPDF';
import { buildKasHadiranPDF } from './generateKasHadiranPDF';
import { buildAbsensiPDF } from './generateAbsensiPDF';
import { buildJadwalPDF } from './generateJadwalPDF';
import { buildPendapatanPDF } from './generatePendapatanPDF';
import { hitungSaldoHadiran } from './utils';
import type { RekapTriwulan } from './laporan';
import type { KasRT, Tarikan, Warga, AbsensiStatus } from './types';

const MM = 72 / 25.4;
const TOL = 0.5;   // pt — pembulatan float, bukan kelonggaran tata letak

const kasrt = (i: number, tipe: 'masuk' | 'keluar', n: number, kategori: string, ket: string): KasRT => ({
  id: `x${i}`, tipe, nominal: n, keterangan: ket, tanggal: '2026-08-01',
  tarikan_id: null, kategori, saldo_setelah: 0, created_at: '2026-08-01T00:00:00Z',
});
const tk = (n: number, terkumpul: number, nama = `Warga ${n}`): Tarikan => ({
  id: `t${n}`, nomor: n, tanggal: `2026-0${n}-10`, jumlah_per_orang: 50_000,
  total_hadir: 60, total_warga: 69, sohibul_bait_id: `w${n}`, status: 'selesai',
  total_terkumpul: terkumpul, created_at: `2026-0${n}-10T00:00:00Z`,
  sohibul_bait: { id: `w${n}`, nama } as Tarikan['sohibul_bait'],
});
const wg = (i: number): Warga => ({
  id: `w${i}`, nama: `Warga ${i}`, no_rumah: `A${i}`, no_hp: '08123',
  role: 'warga', status_aktif: true, created_at: '2026-01-01T00:00:00Z',
});

const REKAP = {
  key: '2026-Q3', tahun: 2026, triwulan: 3, romawi: 'III', label: 'Triwulan III 2026',
  rentang: 'Jul–Sep 2026', hadiranMasuk: 9_350_000, hadiranSetor: 2_500_000,
  hadiranBelumSetor: 11_100_000, hadiranTalangan: 150_000, rtSaldoAwal: 8_000_000,
  rtMasuk: 6_250_000, rtKeluar: 2_750_000, rtSaldoAkhir: 16_352_000,
  tarikanSelesai: 3, talanganLunas: 2, jumlahTransaksi: 12,
} as RekapTriwulan;

const ABSENSI: Record<string, AbsensiStatus> = { w1: 'hadir', w2: 'hadir', w3: 'titip', w4: 'tidak_hadir', w5: 'tidak_hadir' };

/* Margin per dokumen — angka yang dipakai generatornya sendiri. */
const DOK: { nama: string; doc: unknown; M: number }[] = [
  { nama: 'Laporan Triwulan', doc: buildLaporanTriwulanPDF(REKAP).doc, M: 14 },
  { nama: 'Kas RT', M: 14, doc: buildKasRTPDF(
      [kasrt(1, 'masuk', 5_000_000, 'hadiran', 'Setoran kas Hadiran bulan Agustus'), kasrt(2, 'keluar', 750_000, 'sosial', 'Santunan warga sakit')],
      { saldo: 4_250_000, totalMasuk: 5_000_000, totalKeluar: 750_000, saldoAwal: 0 }).doc },
  { nama: 'Kas Hadiran', M: 14, doc: buildKasHadiranPDF(
      [tk(1, 3_000_000), tk(2, 3_450_000, 'Saman Suryadi ( Mono )')], { t1: { count: 2, total: 100_000 } }, { t1: 1_000_000 },
      { totalKasTerkumpul: 6_450_000, totalTalanganBelum: 100_000, totalSetor: 1_000_000, saldoAktif: hitungSaldoHadiran(6_450_000, 100_000, 1_000_000) }).doc },
  { nama: 'Daftar Hadir', M: 14, doc: buildAbsensiPDF(tk(18, 400_000, 'Karta Saleh'),
      [{ nama: 'Ahmad' }, { nama: 'Budi' }], [{ nama: 'Fajar', lunas: true }], [{ nama: 'Hendra' }]).doc },
  { nama: 'Jadwal', M: 14, doc: buildJadwalPDF([tk(1, 3_000_000), tk(2, 3_450_000, 'Saman Suryadi ( Mono )')]).doc },
  { nama: 'Pendapatan', M: 14, doc: buildPendapatanPDF(
      { ...tk(18, 250_000, 'Karta Saleh'), sohibul_bait_id: 'w0' },
      [{ ...wg(0), nama: 'Karta Saleh' }, wg(1), wg(2), wg(3), wg(4), wg(5)], ABSENSI, new Set(['w4'])).doc },
];

/* IZIN BERBATAS — daftar ini KOSONG, dan mekanismenya sengaja dipertahankan.
   Satu-satunya penghuninya (subtitle masthead Kas Hadiran, luber 0,43mm)
   DIPERBAIKI 4 Sep 2026 dgn membuang kata "Kota", jadi izinnya dicabut —
   izin mati yang dibiarkan hidup akan memaafkan luapan BARU yang kebetulan
   berawalan sama.

   Kalau nanti ada luapan yang memang diputuskan diterima, taruh di sini dgn
   PLAFON-nya sendiri (bukan dgn melonggarkan `TOL`, yang akan membutakan
   seluruh dokumen sekaligus) — pola yang sama dgn `data-susut` di
   `audit:huruf`.

   CATATAN, karena aku sempat salah menamainya: run yang luber dulu berukuran
   10,5pt = subtitle MASTHEAD halaman 1, bukan header lanjutan (`lanjutSub`
   hanya 7pt). Kalau ada luapan baru, periksa UKURAN FONT-nya dulu sebelum
   menyimpulkan baris mana yang bersalah. */
const IZIN: { dok: string; awalan: string; maksPt: number }[] = [];
const z0 = (r: { teks: string }) => r.teks.slice(0, 30);

/* ── GEOMETRI SEKSI ────────────────────────────────────────────────────────
   `seksiMinH` menggantikan angka mati `38` yang dulu menentukan apakah sebuah
   seksi boleh dimulai di halaman berjalan. Angka itu tak tahu SKALA (Kas RT
   dicetak LANSIA, enam laporan lain RAPAT) maupun ISI, jadi ia melempar seksi
   ke halaman baru padahal muat — Kas RT contohnya 4 halaman, sekarang 3.

   Yang dijaga di sini rumusnya BERPIJAK pada geometri nyata, bukan cocok
   dengan dirinya sendiri: jarak baris diukur dari DOKUMEN JADI lalu dibanding
   dgn `barisH`. Kalau jsPDF mengubah lineHeightFactor atau autoTable mengubah
   cara menghitung sel, uji ini yang memberitahu — bukan laporan 4 halaman yang
   diam-diam kembali. Pola yang sama dgn `signH`. */
describe('Geometri seksi cetak', () => {
  it('barisH cocok dgn jarak baris yang TERUKUR di dokumen jadi', () => {
    const doc = buildKasRTPDF(
      Array.from({ length: 12 }, (_, i) => kasrt(i, 'masuk', 500_000 + i * 1000, 'hadiran', `Setoran ke-${i + 1}`)),
      { saldo: 6_066_000, totalMasuk: 6_066_000, totalKeluar: 0, saldoAwal: 0 },
    ).doc;
    const { H, runs } = geometriPdf(doc, jsPDF);
    /* Baseline sel TANGGAL — satu run per baris data, jaraknya = tinggi baris. */
    const y = (runs as { teks: string; y: number }[])
      .filter((r) => /^\d{2} \w{3} \d{2}$/.test(r.teks))
      .map((r) => (H - r.y) / MM).sort((a, b) => a - b);
    expect(y.length, 'nol baris tanggal terbaca — probe tak mendarat').toBeGreaterThan(6);
    const jarak = y.slice(1, 7).map((v, i) => v - y[i]);
    const rata = jarak.reduce((a, b) => a + b, 0) / jarak.length;
    expect(rata, `jarak baris terukur ${rata.toFixed(2)}mm ≠ barisH(LANSIA) ${barisH(LANSIA).toFixed(2)}mm`)
      .toBeCloseTo(barisH(LANSIA), 1);
  });

  it('seksiMinH tak pernah menuntut lebih dari tinggi seksinya sendiri', () => {
    /* Cabang yang dulu tak ada: seksi 1 baris dilempar ke halaman baru karena
       diminta 38mm, padahal seluruhnya cuma ±25mm. */
    const satu = seksiMinH(LANSIA, 1), dua = seksiMinH(LANSIA, 2), banyak = seksiMinH(LANSIA, 40);
    expect(satu, 'seksi 1 baris menuntut lebih dari seksi 2 baris').toBeLessThan(dua);
    expect(banyak, 'seksi panjang menuntut lebih dari ambang minimum').toBe(dua);
    expect(dua, 'ambang minimum melampaui angka mati lama (38mm) — bukan perbaikan')
      .toBeLessThan(38);
  });
});

describe('Tata letak dokumen cetak', () => {
  for (const { nama, doc, M } of DOK) {
    it(`${nama}: tak ada teks yang keluar dari halaman`, () => {
      const { W, H, runs } = geometriPdf(doc, jsPDF);
      expect(runs.length, 'nol teks terbaca — probe tak mendarat').toBeGreaterThan(10);
      const luar = runs.filter((r) => r.x < -TOL || r.kanan > W + TOL || r.y < -TOL || r.y > H + TOL);
      expect(
        luar.map((r) => `"${r.teks.slice(0, 28)}" x=${r.x.toFixed(1)} kanan=${r.kanan.toFixed(1)} y=${r.y.toFixed(1)}`),
        `${nama}: teks di luar kotak halaman ${W.toFixed(1)}×${H.toFixed(1)}pt`,
      ).toEqual([]);
    });

    it(`${nama}: tepi kanan tak melewati margin`, () => {
      const { W, runs } = geometriPdf(doc, jsPDF);
      const batas = W - M * MM;
      const luber = runs
        .filter((r) => r.kanan > batas + TOL)
        .filter((r) => {
          const izin = IZIN.find((z) => z.dok === nama && r.teks.startsWith(z.awalan));
          if (!izin) return true;
          /* Izin BERBATAS, bukan pengecualian bebas: kalau luapannya tumbuh
             melewati batas yang tercatat, ia kembali jadi temuan. */
          expect(r.kanan - batas, `${nama}: luapan "${z0(r)}" TUMBUH melewati izin ${izin.maksPt}pt`)
            .toBeLessThanOrEqual(izin.maksPt);
          return false;
        });
      expect(
        luber.map((r) => `"${r.teks.slice(0, 28)}" kanan=${r.kanan.toFixed(1)} > ${batas.toFixed(1)}`),
        `${nama}: teks melewati margin kanan (${M}mm)`,
      ).toEqual([]);
    });
  }
});
