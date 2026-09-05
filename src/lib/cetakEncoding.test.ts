/**
 * Penjaga ENCODING dokumen cetak — kelas cacat yang lolos ke-35 penjaga isi
 * karena fixture mereka ASCII semua.
 *
 * Satu karakter di luar WinAnsi membuat jsPDF mengalihkan SELURUH string ke
 * UTF-16BE, dan font standarnya tak punya CMap-nya — jadi yang hilang bukan
 * satu glyph melainkan seluruh baris, berikut kata-kata yang sudah benar.
 * Tanda tangannya di aliran isi: byte NUL di dalam literal string.
 *
 * Tiap generator diberi masukan BERMUSUHAN — persis yang bisa diketik
 * bendahara dari HP-nya (emoji, ✓, panah) — lalu KELUARANNYA yang diperiksa,
 * bukan panggilannya. Generator yang lupa memanggil `amankanPdf` karena itu
 * gagal di sini tanpa perlu ada yang mengingatnya.
 *
 * KONTROL di bawah berjalan tiap eksekusi, bukan di balik flag: ia membangun
 * dokumen TANPA penjaga dan menuntut detektor ini MENEMUKAN kerusakannya.
 * Tanpa itu "app patuh" dan "detektorku tak menyentuh apa-apa" mencetak angka
 * yang sama.
 */
import { describe, it, expect } from 'vitest';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { teksPdf } from './pdfTeksUji';
import { amanWinAnsi } from './pdfTeks';
import { buildAbsensiPDF } from './generateAbsensiPDF';
import { buildAktivitasPDF } from './generateAktivitasPDF';
import { buildJadwalPDF } from './generateJadwalPDF';
import { buildKasHadiranPDF } from './generateKasHadiranPDF';
import { buildKasRTPDF } from './generateKasRTPDF';
import { buildLaporanTriwulanPDF } from './generateLaporanTriwulanPDF';
import { buildPendapatanPDF } from './generatePendapatanPDF';
import { hitungSaldoHadiran } from './utils';
import type { RekapTriwulan } from './laporan';
import type { KasRT, Tarikan, Warga, AbsensiStatus, AktivitasLog } from './types';

/** Yang benar-benar bisa diketik warga/bendahara dari papan ketik HP. */
const RACUN = 'Iuran \u{1F64F} lunas ✓ — warga → kas RT';
const NAMA_RACUN = 'Bpk. Sulaeman \u{1F3E0} (B8)';

const kas = (i: number, ket: string): KasRT => ({
  id: `x${i}`, tipe: i % 2 ? 'masuk' : 'keluar', nominal: 250_000 * i, keterangan: ket,
  tanggal: '2026-08-01', tarikan_id: null, kategori: i % 2 ? 'iuran_warga' : 'sosial',
  saldo_setelah: 0, created_at: '2026-08-01T00:00:00Z',
});
const tk = (nama: string): Tarikan => ({
  id: 't18', nomor: 18, tanggal: '2026-08-21', jumlah_per_orang: 50_000,
  total_hadir: 63, total_warga: 69, sohibul_bait_id: 'w0', status: 'selesai',
  total_terkumpul: 3_450_000, created_at: '2026-08-21T00:00:00Z',
  sohibul_bait: { id: 'w0', nama } as Tarikan['sohibul_bait'],
});
const wg = (i: number, nama: string): Warga => ({
  id: `w${i}`, nama, no_rumah: `B${i}`, no_hp: '08123', role: 'warga',
  status_aktif: true, created_at: '2026-01-01T00:00:00Z',
});
const LOG = [{
  id: 'a1', table_name: 'tarikan', record_id: 't18', action: 'UPDATE', actor_name: NAMA_RACUN,
  old_data: { nomor: 18, status: 'dijadwalkan' },
  new_data: { nomor: 18, status: 'selesai', total_terkumpul: 3_450_000 },
  created_at: '2026-08-28T20:05:00Z',
}] as unknown as AktivitasLog[];
const REKAP = {
  key: '2026-Q3', tahun: 2026, triwulan: 3, romawi: 'III', label: 'Triwulan III 2026 ✓',
  rentang: 'Jul–Sep 2026 → tutup', hadiranMasuk: 9_350_000, hadiranSetor: 2_500_000,
  hadiranBelumSetor: 6_850_000, hadiranTalangan: 300_000, rtSaldoAwal: 8_000_000,
  rtMasuk: 10_510_000, rtKeluar: 7_700_000, rtSaldoAkhir: 10_810_000,
  tarikanSelesai: 5, talanganLunas: 4, jumlahTransaksi: 12,
} as RekapTriwulan;
const ABS: Record<string, AbsensiStatus> = { w0: 'hadir', w1: 'hadir', w2: 'titip', w3: 'tidak_hadir' };
const WARGA = [wg(0, NAMA_RACUN), wg(1, 'Budi ✓'), wg(2, 'Cecep \u{1F64F}'), wg(3, 'Dedi → Kurniawan')];

const DOK: [string, () => { doc: unknown }][] = [
  ['Kas RT', () => buildKasRTPDF([kas(1, RACUN), kas(2, `Santunan ${NAMA_RACUN}`)],
    { saldo: 250_000, totalMasuk: 250_000, totalKeluar: 500_000, saldoAwal: 500_000 })],
  ['Kas Hadiran', () => buildKasHadiranPDF([tk(NAMA_RACUN)], { t18: { count: 2, total: 100_000 } }, { t18: 1_000_000 },
    {
      totalKasTerkumpul: 3_450_000, totalTalanganBelum: 100_000, totalSetor: 1_000_000,
      saldoAktif: hitungSaldoHadiran(3_450_000, 100_000, 1_000_000),
    })],
  ['Laporan Triwulan', () => buildLaporanTriwulanPDF(REKAP)],
  ['Daftar Hadir', () => buildAbsensiPDF(tk(NAMA_RACUN), [{ nama: 'Budi ✓' }],
    [{ nama: 'Cecep \u{1F64F}', lunas: true }], [{ nama: 'Dedi → K' }])],
  ['Jadwal', () => buildJadwalPDF([tk(NAMA_RACUN)])],
  ['Pendapatan', () => buildPendapatanPDF(tk(NAMA_RACUN), WARGA, ABS, new Set(['w3']))],
  ['Riwayat Aktivitas', () => buildAktivitasPDF(LOG, 'Semua ✓')],
];

/** Literal yang membawa byte NUL = string yang jsPDF alihkan ke UTF-16BE. */
/* Ditulis sbg ESCAPE: byte NUL harfiah di kode sumber tak bisa ditinjau
   siapa pun — kritik yang sama yang dipakai `pdfTeks.ts` pada dirinya. */
const rusak = (doc: unknown): string[] => teksPdf(doc).filter((s) => s.includes('\u0000'));

describe('Encoding teks dokumen cetak', () => {
  for (const [nama, buat] of DOK) {
    it(`${nama}: masukan bermusuhan tak merusak satu baris pun`, () => {
      const t = teksPdf(buat().doc);
      expect(t.length, `${nama}: nol teks terbaca — probe tak mendarat`).toBeGreaterThan(8);
      expect(
        rusak(buat().doc).map((s) => JSON.stringify(s.slice(0, 40))),
        `${nama}: baris beralih ke UTF-16 (di kertas tercetak sbg sampah)`,
      ).toEqual([]);
    });
  }

  it('kata yang sudah benar SELAMAT, bukan sekadar tak-rusak', () => {
    /* Tanpa ini "nol NUL" bisa dicapai dgn membuang seluruh teksnya. */
    const t = teksPdf(buildKasRTPDF([kas(1, RACUN)], { saldo: 0, totalMasuk: 250_000, totalKeluar: 0, saldoAwal: 0 }).doc);
    const baris = t.find((s) => s.includes('Iuran'));
    expect(baris, 'keterangan hilang sama sekali').toBeTruthy();
    for (const kata of ['lunas', 'warga', 'kas RT']) expect(baris).toContain(kata);
  });

  it('panah Riwayat Aktivitas terbaca di kertas', () => {
    const t = teksPdf(buildAktivitasPDF(LOG, 'Semua').doc);
    expect(
      t.some((s) => s.includes('Dijadwalkan') && s.includes('Selesai')),
      'judul ganti-status tak utuh di kertas',
    ).toBe(true);
  });
});

describe('amanWinAnsi', () => {
  it('mentransliterasi yang bisa, membuang yang tidak, menjaga yang sah', () => {
    expect(amanWinAnsi('a → b')).toBe('a -> b');
    expect(amanWinAnsi('Perbaikan ✓ selesai'), 'centang DIBUANG — maknanya utuh tanpanya')
      .toBe('Perbaikan selesai');
    expect(amanWinAnsi('Atap ✗ selesai'), 'silang DIPERTAHANKAN — membuangnya MEMBALIK makna')
      .toBe('Atap x selesai');
    expect(amanWinAnsi('Iuran \u{1F64F} terima kasih'), 'emoji dibuang, spasi ganda dirapikan').toBe('Iuran terima kasih');
    expect(amanWinAnsi('Rp1.250.000 – Rp2.000.000'), 'en-dash SAH di cp1252').toBe('Rp1.250.000 – Rp2.000.000');
    expect(amanWinAnsi('Lomba — juara “1” · A'), 'em-dash, kutip lengkung & middot SAH')
      .toBe('Lomba — juara “1” · A');
    expect(amanWinAnsi('Ma’arif'), 'apostrof lengkung SAH').toBe('Ma’arif');
    expect(amanWinAnsi('Malmö café'), 'Latin-1 SAH apa adanya').toBe('Malmö café');
    expect(amanWinAnsi('Ārya'), 'aksen di luar Latin-1 diuraikan, bukan dibuang').toBe('Arya');
  });
});

/* ── KONTROL — tiap eksekusi, bukan di balik flag ────────────────────────── */
describe('KONTROL detektor encoding', () => {
  const bikin = (dijaga: boolean) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const t = dijaga ? amanWinAnsi(RACUN) : RACUN;
    doc.text(t, 10, 10);
    autoTable(doc, { head: [['KETERANGAN']], body: [[t]], startY: 20 });
    return doc;
  };

  it('MENGGIGIT pada dokumen TANPA penjaga', () => {
    expect(rusak(bikin(false)).length, 'teks bermusuhan tanpa penjaga HARUS terdeteksi rusak').toBeGreaterThan(0);
  });

  it('DIAM pada kembarannya yang dijaga', () => {
    expect(rusak(bikin(true)), 'teks yang sudah diamankan tak boleh dilaporkan').toEqual([]);
  });
});
