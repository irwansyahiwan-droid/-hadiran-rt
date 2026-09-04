/**
 * Penjaga TUMPANG TINDIH NON-TEKS — batas yang `cetakTataLetak.test.ts` dan
 * `pdfTeksUji.ts` sama-sama akui sejak 4 Sep 2026: *"hanya TEKS. Garis, kotak,
 * dan latar tabel tak ikut diukur."*
 *
 * Kenapa itu lubang, bukan kelengkapan yang belum sempat: seluruh 35 penjaga
 * cetak memungut populasinya dari blok `BT … ET`. Ruas garis, kotak, dan logo
 * TIDAK punya blok itu — jadi ia bukan "lolos", ia tak pernah masuk populasi
 * sekali pun, di dokumen mana pun. Kelas yang sama sudah dibayar tiga kali di
 * sapuan layar: `::placeholder` (tak punya text node), Odometer (angka lewat
 * kolom), dan glyph `select`/`input[date]` (pseudo shadow UA). **Apa pun yang
 * tak berbentuk seperti populasi yang dipungut alat akan hilang dari alat.**
 *
 * Yang bisa rusak diam-diam, dan tak satu pun terlihat penjaga teks:
 *   1. rule seksi / baris tabel jatuh MENYILANG teks — dicoret sendiri;
 *   2. nominal melewati PEMISAH TEGAK strip statistik — dan justru ini yang
 *      barusan dipersempit: Daftar Hadir naik 3 → 4 kolom (TITIP), colW turun
 *      dari 60,7mm ke 45,5mm;
 *   3. teks menimpa LOGO kepala surat;
 *   4. garisnya sendiri keluar halaman / melewati margin.
 *
 * Vonisnya TUMPANG TINDIH NYATA (< 0), bukan "jarak minimum" — ambang rasa
 * akan jadi angka karangan. Toleransi 0,25pt murni pembulatan float.
 *
 * Kotak teks memakai metrik Helvetica yang DITERBITKAN (AFM: Ascender 718,
 * Descender −207 per 1000 em), bukan taksiran. Ruas garis memakai tebalnya
 * sendiri (±w/2) — hairline 0,85pt memang mengecat 0,425pt ke tiap sisi.
 *
 * KONTROL (`describe` terakhir) berjalan di SETIAP eksekusi, bukan di balik
 * flag: tanpa itu "dokumen bersih" dan "detektorku tak pernah menyentuh
 * apa-apa" mencetak angka yang sama — pelajaran `audit:gestur` G1. Ia menuntut
 * ketiga detektor MENGGIGIT pada dokumen yang sengaja dirusak, DAN diam pada
 * kembarannya yang bersih.
 */
import { describe, it, expect } from 'vitest';
import jsPDF from 'jspdf';
import { geometriPdf, nonTeksPdf, type TeksGeo, type Segmen, type Kotak } from './pdfTeksUji';
import { LOGO_DATA_URL } from './logoBase64';
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
const TOL = 0.25;            // pt — pembulatan float, bukan kelonggaran
const ATAS = 0.718, BAWAH = 0.207;   // Helvetica AFM Ascender/Descender per em

/* Kotak tinta satu teks: baseline + naik ke ascender, turun ke descender. */
const pita = (r: TeksGeo) => ({ b: r.y - BAWAH * r.size, a: r.y + ATAS * r.size });
const datar = (s: Segmen) => Math.abs(s.y1 - s.y2) < 0.01;
const tegak = (s: Segmen) => Math.abs(s.x1 - s.x2) < 0.01;
const z = (r: TeksGeo) => `"${r.teks.slice(0, 26)}"`;

/** Tiap pasangan teks × garis yang benar-benar SALING MENIMPA. */
function silang(runs: TeksGeo[], segmen: Segmen[]): string[] {
  const out: string[] = [];
  for (const r of runs) {
    const { a, b } = pita(r);
    for (const s of segmen) {
      if (s.hal !== r.hal) continue;
      const t = s.tebal / 2;
      if (datar(s)) {
        const sx0 = Math.min(s.x1, s.x2), sx1 = Math.max(s.x1, s.x2);
        const dx = Math.min(r.kanan, sx1) - Math.max(r.x, sx0);
        const dy = Math.min(a, s.y1 + t) - Math.max(b, s.y1 - t);
        if (dx > TOL && dy > TOL) out.push(`${z(r)} disilang rule MENDATAR y=${s.y1.toFixed(1)} (tembus ${dy.toFixed(2)}pt)`);
      } else if (tegak(s)) {
        const sy0 = Math.min(s.y1, s.y2), sy1 = Math.max(s.y1, s.y2);
        const dy = Math.min(a, sy1) - Math.max(b, sy0);
        const dx = Math.min(r.kanan, s.x1 + t) - Math.max(r.x, s.x1 - t);
        if (dx > TOL && dy > TOL) out.push(`${z(r)} melewati pemisah TEGAK x=${s.x1.toFixed(1)} (tembus ${dx.toFixed(2)}pt)`);
      }
    }
  }
  return out;
}

/**
 * Tiap teks yang duduk di atas GAMBAR.
 *
 * Sengaja HANYA `jenis: 'gambar'`. Teks di atas KOTAK TERISI bukan cacat — itu
 * justru gunanya sebuah fill (latar baris tabel, chip status), jadi memvonisnya
 * akan melahirkan temuan palsu pada hari pertama seseorang menambah zebra
 * stripe. Pertanyaan yang benar untuk fill adalah KONTRAS tinta di atasnya,
 * dan itu wilayah `warnaCetak`, bukan tumpang tindih. Kotak tetap DIPUNGUT
 * (lihat uji populasi) supaya kehadirannya terlihat, bukan hilang diam-diam.
 */
function timpaKotak(runs: TeksGeo[], kotak: Kotak[]): string[] {
  const out: string[] = [];
  for (const r of runs) {
    const { a, b } = pita(r);
    for (const k of kotak.filter((q) => q.jenis === 'gambar')) {
      if (k.hal !== r.hal) continue;
      const dx = Math.min(r.kanan, k.x + k.w) - Math.max(r.x, k.x);
      const dy = Math.min(a, k.y + k.h) - Math.max(b, k.y);
      if (dx > TOL && dy > TOL) out.push(`${z(r)} menimpa ${k.jenis} (${dx.toFixed(1)}×${dy.toFixed(1)}pt)`);
    }
  }
  return out;
}

/* ── Fixture: sama persis dgn `cetakTataLetak.test.ts` ────────────────────── */
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

/* `garis` & `tegakN` = populasi TERUKUR 5 Sep 2026, dipakai sbg LANTAI.
   Keluarannya deterministik dari fixture tetap, jadi turun di bawahnya berarti
   probe-nya yang buta — bukan dokumen yang menyusut. `tegakN` PERSIS karena ia
   memuat jumlah kolom strip statistik: Daftar Hadir 3 pemisah = 4 kolom, yaitu
   perubahan TITIP yang baru mendarat. Kalau kolomnya berubah lagi, angka ini
   yang pertama protes. */
const DOK: { nama: string; doc: unknown; M: number; garis: number; tegakN: number; gambar: number }[] = [
  { nama: 'Laporan Triwulan', M: 6, garis: 9, tegakN: 0, gambar: 0, doc: buildLaporanTriwulanPDF(REKAP).doc },
  { nama: 'Kas RT', M: 14, garis: 25, tegakN: 0, gambar: 1, doc: buildKasRTPDF(
      [kasrt(1, 'masuk', 5_000_000, 'hadiran', 'Setoran kas Hadiran bulan Agustus'), kasrt(2, 'keluar', 750_000, 'sosial', 'Santunan warga sakit')],
      { saldo: 4_250_000, totalMasuk: 5_000_000, totalKeluar: 750_000, saldoAwal: 0 }).doc },
  { nama: 'Kas Hadiran', M: 14, garis: 33, tegakN: 0, gambar: 1, doc: buildKasHadiranPDF(
      [tk(1, 3_000_000), tk(2, 3_450_000, 'Saman Suryadi ( Mono )')], { t1: { count: 2, total: 100_000 } }, { t1: 1_000_000 },
      { totalKasTerkumpul: 6_450_000, totalTalanganBelum: 100_000, totalSetor: 1_000_000, saldoAktif: hitungSaldoHadiran(6_450_000, 100_000, 1_000_000) }).doc },
  { nama: 'Daftar Hadir', M: 14, garis: 23, tegakN: 3, gambar: 1, doc: buildAbsensiPDF(tk(18, 400_000, 'Karta Saleh'),
      [{ nama: 'Ahmad' }, { nama: 'Budi' }], [{ nama: 'Fajar', lunas: true }], [{ nama: 'Hendra' }]).doc },
  { nama: 'Jadwal', M: 14, garis: 16, tegakN: 0, gambar: 1, doc: buildJadwalPDF([tk(1, 3_000_000), tk(2, 3_450_000, 'Saman Suryadi ( Mono )')]).doc },
  { nama: 'Pendapatan', M: 14, garis: 58, tegakN: 2, gambar: 1, doc: buildPendapatanPDF(
      { ...tk(18, 250_000, 'Karta Saleh'), sohibul_bait_id: 'w0' },
      [{ ...wg(0), nama: 'Karta Saleh' }, wg(1), wg(2), wg(3), wg(4), wg(5)], ABSENSI, new Set(['w4'])).doc },
];

describe('Tumpang tindih non-teks dokumen cetak', () => {
  for (const { nama, doc, M, garis, tegakN, gambar } of DOK) {
    it(`${nama}: populasi non-teks terbaca`, () => {
      const { segmen, kotak } = nonTeksPdf(doc);
      expect(segmen.length, `${nama}: ruas garis terbaca (lantai ${garis})`).toBeGreaterThanOrEqual(garis);
      expect(segmen.filter(tegak).length, `${nama}: pemisah TEGAK — angka ini = jumlah kolom strip statistik`).toBe(tegakN);
      expect(kotak.filter((k) => k.jenis === 'gambar').length, `${nama}: logo kepala surat`).toBe(gambar);
      /* Papan penunjuk, bukan larangan: kalau ini merah berarti ada LATAR
         TERISI baru di dokumen cetak. Yang perlu diperiksa KONTRAS tinta di
         atasnya (`warnaCetak`), bukan tumpang tindihnya — teks memang boleh
         duduk di atas fill. */
      expect(kotak.filter((k) => k.jenis === 'kotak').length, `${nama}: latar terisi (hari ini NOL)`).toBe(0);
    });

    it(`${nama}: tak ada teks yang tersilang garis`, () => {
      const { runs } = geometriPdf(doc, jsPDF);
      const { segmen } = nonTeksPdf(doc);
      expect(silang(runs, segmen), `${nama}: teks & garis saling menimpa`).toEqual([]);
    });

    it(`${nama}: tak ada teks yang menimpa logo`, () => {
      const { runs } = geometriPdf(doc, jsPDF);
      const { kotak } = nonTeksPdf(doc);
      expect(timpaKotak(runs, kotak), `${nama}: teks duduk di atas gambar`).toEqual([]);
    });

    it(`${nama}: garis & gambar tak keluar halaman atau margin`, () => {
      const { W, H, segmen, kotak } = nonTeksPdf(doc);
      const b = M * MM;
      const luar: string[] = [];
      for (const s of segmen) {
        for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) {
          if (x < b - TOL || x > W - b + TOL) luar.push(`garis x=${x.toFixed(2)} di luar margin [${b.toFixed(1)}, ${(W - b).toFixed(1)}]`);
          if (y < -TOL || y > H + TOL) luar.push(`garis y=${y.toFixed(2)} di luar halaman`);
        }
      }
      for (const k of kotak) {
        if (k.x < b - TOL || k.x + k.w > W - b + TOL) luar.push(`${k.jenis} x=[${k.x.toFixed(1)}, ${(k.x + k.w).toFixed(1)}] di luar margin`);
        if (k.y < -TOL || k.y + k.h > H + TOL) luar.push(`${k.jenis} y di luar halaman`);
      }
      expect([...new Set(luar)], `${nama}: non-teks melewati batas`).toEqual([]);
    });
  }
});

/* ── KONTROL — berjalan tiap eksekusi, bukan di balik flag ────────────────── */
describe('KONTROL detektor non-teks', () => {
  const bikin = (rusak: boolean) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.setLineWidth(0.3);
    // 1. rule MENDATAR: menyilang baseline saat rusak, 6mm di bawahnya saat sehat
    doc.text('SALDO KAS BESAR RT', 20, 60);
    doc.line(15, rusak ? 59 : 66, 120, rusak ? 59 : 66);
    // 2. pemisah TEGAK: di tengah teks saat rusak, jauh di kanannya saat sehat
    doc.text('Rp16.352.000', 20, 100);
    doc.line(rusak ? 30 : 90, 96, rusak ? 30 : 90, 104);
    // 3. GAMBAR: teks duduk di atas logo saat rusak
    doc.addImage(LOGO_DATA_URL, 'JPEG', 20, 140, 20, 20);
    doc.text('HADIRAN RT', rusak ? 22 : 50, 150);
    // 4. KOTAK TERISI: teks SELALU duduk di atasnya — terpungut, sengaja tak divonis
    doc.setFillColor(230, 240, 235); doc.rect(20, 180, 60, 10, 'F');
    doc.text('Baris berlatar', 22, 187);
    return doc;
  };
  const baca = (rusak: boolean) => {
    const doc = bikin(rusak);
    const { runs } = geometriPdf(doc, jsPDF);
    const { segmen, kotak } = nonTeksPdf(doc);
    expect(runs.length, 'kontrol: teks terbaca').toBe(4);
    expect(segmen.length, 'kontrol: ruas garis terbaca').toBe(2);
    expect(kotak.filter((k) => k.jenis === 'gambar'), 'kontrol: gambar terbaca').toHaveLength(1);
    expect(kotak.filter((k) => k.jenis === 'kotak'), 'kontrol: kotak terisi terbaca (`re`)').toHaveLength(1);
    return { garis: silang(runs, segmen), gambar: timpaKotak(runs, kotak) };
  };

  it('MENGGIGIT pada dokumen yang sengaja disilang', () => {
    const { garis, gambar } = baca(true);
    expect(garis.filter((s) => s.includes('MENDATAR')), 'rule mendatar di atas baseline').toHaveLength(1);
    expect(garis.filter((s) => s.includes('TEGAK')), 'pemisah tegak di tengah nominal').toHaveLength(1);
    expect(gambar, 'teks di atas logo').toHaveLength(1);
  });

  it('DIAM pada kembarannya yang bersih', () => {
    const { garis, gambar } = baca(false);
    expect([...garis, ...gambar], 'kontrol bersih tak boleh melapor apa pun').toEqual([]);
  });

  it('kotak TERISI terpungut tapi sengaja TIDAK divonis', () => {
    /* "Baris berlatar" duduk penuh di atas fill di KEDUA varian. Kalau suatu
       hari ini merah, seseorang memperluas vonis ke fill — dan itu akan
       memerahkan zebra stripe pertama yang ditambahkan ke laporan. */
    for (const rusak of [true, false]) expect(baca(rusak).gambar, `varian rusak=${rusak}`).not.toContain(expect.stringContaining('kotak'));
  });
});
