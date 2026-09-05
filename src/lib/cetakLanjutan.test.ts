/**
 * Penjaga IDENTITAS HALAMAN LANJUTAN — tiap halaman ≥ 2 wajib menyebut
 * dokumen apa ia.
 *
 * `drawContinuationHeader` sudah ada sejak lama, berikut komentar yang menyebut
 * alasannya: "halaman yang memuat tanda tangan TIDAK boleh anonim… siapa pun
 * bisa menukarnya dengan lampiran lain". Janji itu TIDAK ditepati, dan tak ada
 * yang memeriksanya. Ia dipanggil hanya kalau blok TANDA TANGAN sendiri yang
 * terlempar ke halaman baru; kalau yang meluap TABELNYA dan tanda tangan ikut
 * mendarat di halaman itu, syaratnya tak pernah benar — dan itu justru kasus
 * yang lebih sering.
 *
 * Terukur 5 Sep 2026 dgn data nyata: KETIGA dokumen multi-halaman mencetak
 * tiga tanda tangan di lembar tanpa judul, kode dokumen, maupun periode.
 *
 * Invariannya karena itu BUKAN "halaman tanda tangan" melainkan tiap halaman
 * ≥ 2 — halaman kedua tabel kas yang terlepas dari berkasnya juga tak bisa
 * dipertanggungjawabkan. Diuji dari POSISI teks (`geometriPdf` menyebut nomor
 * halaman tiap run), bukan dari apakah fungsinya dipanggil.
 */
import { describe, it, expect } from 'vitest';
import jsPDF from 'jspdf';
import { geometriPdf } from './pdfTeksUji';
import { buildAbsensiPDF } from './generateAbsensiPDF';
import { buildAktivitasPDF } from './generateAktivitasPDF';
import { buildJadwalPDF } from './generateJadwalPDF';
import { buildKasHadiranPDF } from './generateKasHadiranPDF';
import { buildKasRTPDF } from './generateKasRTPDF';
import { buildLaporanTriwulanPDF } from './generateLaporanTriwulanPDF';
import { buildPendapatanPDF } from './generatePendapatanPDF';
import { hitungSaldoHadiran } from './utils';
import { KATEGORI_MASUK, KATEGORI_KELUAR } from './kategoriKasRt';
import type { RekapTriwulan } from './laporan';
import type { KasRT, Tarikan, Warga, AbsensiStatus, AktivitasLog } from './types';

const nama = (i: number) => `Warga Nomor ${String(i).padStart(2, '0')}`;

/* Fixture SENGAJA besar: penjaga ini cuma berarti kalau dokumennya benar-benar
   menumpahkan halaman. Populasi "nol halaman lanjutan" = PROBE CACAT, ditagih
   di uji terakhir. */
const kas = (i: number): KasRT => ({
  id: `x${i}`, tipe: i % 3 === 0 ? 'masuk' : 'keluar', nominal: 100_000 + i * 25_000,
  keterangan: `Transaksi kas nomor ${i} untuk keperluan warga RT 004/006`,
  tanggal: `2026-0${(i % 9) + 1}-1${i % 9}`, tarikan_id: null,
  kategori: (i % 3 === 0 ? KATEGORI_MASUK : KATEGORI_KELUAR)[i % 4]?.key ?? 'lainnya',
  saldo_setelah: 0, created_at: '2026-08-01T00:00:00Z',
});
const KAS = Array.from({ length: 40 }, (_, i) => kas(i + 1));

const tk = (n: number): Tarikan => ({
  id: `t${n}`, nomor: n, tanggal: `2026-0${(n % 9) + 1}-15`, jumlah_per_orang: 50_000,
  total_hadir: 60, total_warga: 69, sohibul_bait_id: `w${n}`, status: 'selesai',
  total_terkumpul: 3_000_000 + n * 10_000, created_at: '2026-01-01T00:00:00Z',
  sohibul_bait: { id: `w${n}`, nama: nama(n) } as Tarikan['sohibul_bait'],
});
const TARIKAN = Array.from({ length: 45 }, (_, i) => tk(i + 1));

const wg = (i: number): Warga => ({
  id: `w${i}`, nama: nama(i), no_rumah: `B${i}`, no_hp: '08123', role: 'warga',
  status_aktif: true, created_at: '2026-01-01T00:00:00Z',
});
const WARGA = Array.from({ length: 70 }, (_, i) => wg(i + 1));
const ABS: Record<string, AbsensiStatus> = {};
WARGA.forEach((w, i) => { ABS[w.id] = i % 9 === 3 ? 'tidak_hadir' : i % 7 === 2 ? 'titip' : 'hadir'; });

const LOG = Array.from({ length: 60 }, (_, i) => ({
  id: `a${i}`, table_name: 'kas_rt', record_id: `x${i}`, action: 'INSERT',
  actor_name: 'Irwansyah', old_data: null, new_data: { nominal: 100_000 + i },
  created_at: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T09:00:00Z`,
})) as unknown as AktivitasLog[];

const REKAP = {
  key: '2026-Q3', tahun: 2026, triwulan: 3, romawi: 'III', label: 'Triwulan III 2026',
  rentang: 'Jul–Sep 2026', hadiranMasuk: 9_350_000, hadiranSetor: 2_500_000,
  hadiranBelumSetor: 6_850_000, hadiranTalangan: 300_000, rtSaldoAwal: 8_000_000,
  rtMasuk: 10_510_000, rtKeluar: 7_700_000, rtSaldoAkhir: 10_810_000,
  tarikanSelesai: 5, talanganLunas: 4, jumlahTransaksi: 40,
} as RekapTriwulan;

const kasTotal = TARIKAN.reduce((s, t) => s + t.total_terkumpul, 0);

/** `judul` = potongan yang WAJIB muncul lagi di tiap halaman lanjutan. */
const DOK: { nama: string; judul: string; doc: unknown }[] = [
  { nama: 'Kas RT', judul: 'Laporan Pertanggungjawaban Kas RT',
    doc: buildKasRTPDF(KAS, { saldo: 5_000_000, totalMasuk: 9_000_000, totalKeluar: 4_000_000, saldoAwal: 0 }).doc },
  { nama: 'Kas Hadiran', judul: 'Laporan Alur Kas Hadiran',
    doc: buildKasHadiranPDF(TARIKAN, {}, {},
      { totalKasTerkumpul: kasTotal, totalTalanganBelum: 0, totalSetor: 0, saldoAktif: hitungSaldoHadiran(kasTotal, 0, 0) }).doc },
  { nama: 'Daftar Hadir', judul: 'Daftar Hadir Tarikan ke-18',
    doc: buildAbsensiPDF(tk(18), WARGA.slice(0, 50).map((w) => ({ nama: w.nama })),
      WARGA.slice(50, 60).map((w) => ({ nama: w.nama, lunas: true })), WARGA.slice(60).map((w) => ({ nama: w.nama }))).doc },
  { nama: 'Jadwal', judul: 'Jadwal Tarikan Arisan', doc: buildJadwalPDF(TARIKAN).doc },
  { nama: 'Pendapatan', judul: 'Rincian Pendapatan Tarikan ke-18',
    doc: buildPendapatanPDF(tk(18), WARGA, ABS, new Set(['w4'])).doc },
  { nama: 'Riwayat Aktivitas', judul: 'Riwayat Aktivitas', doc: buildAktivitasPDF(LOG, 'Semua').doc },
];

const halaman = (doc: unknown) => {
  const { runs } = geometriPdf(doc, jsPDF);
  return [...new Set(runs.map((r) => r.hal))].sort((a, b) => a - b);
};

describe('Identitas halaman lanjutan', () => {
  for (const { nama: nm, judul, doc } of DOK) {
    it(`${nm}: tiap halaman >= 2 menyebut dokumennya`, () => {
      const { runs } = geometriPdf(doc, jsPDF);
      const hal = halaman(doc);
      expect(hal.length, `${nm}: fixture tak menumpahkan halaman — penjaga ini tak menguji apa pun`)
        .toBeGreaterThan(1);
      const telanjang = hal.filter((p) => p >= 2).filter(
        (p) => !runs.some((r) => r.hal === p && r.teks.includes(judul)),
      );
      expect(telanjang, `${nm}: halaman ANONIM (tanpa judul dokumen) — lepas dari berkasnya tak bisa dipertanggungjawabkan`)
        .toEqual([]);
    });

    it(`${nm}: kepala lanjutan tak menimpa isi`, () => {
      /* Pita 0..24mm dipesan lewat `LANJUT_TOP`. Kalau ada teks LAIN yang
         mendarat di dalamnya, ruangnya tak benar-benar dipesan dan kepala
         lanjutan mencetak di atas isi. */
      const { H, runs } = geometriPdf(doc, jsPDF);
      const PITA = 24 * (72 / 25.4);            // pt, dari atas halaman
      const bentrok = runs
        .filter((r) => r.hal >= 2 && H - r.y < PITA)
        .filter((r) => !r.teks.includes(judul) && r.teks !== 'lanjutan' && !r.teks.includes('·'));
      expect(bentrok.map((r) => `hal${r.hal} "${r.teks.slice(0, 30)}"`),
        `${nm}: isi mendarat di dalam pita kepala lanjutan`).toEqual([]);
    });
  }

  it('Laporan Triwulan tetap SATU halaman — tingginya menyesuaikan isi', () => {
    /* Janji yang tertulis di generatornya. Ia tak punya kepala lanjutan, dan
       itu sah SELAMA janji ini benar. Kalau uji ini merah, ia butuh kepala
       lanjutan seperti enam lainnya. */
    expect(halaman(buildLaporanTriwulanPDF(REKAP).doc)).toEqual([1]);
  });
});
