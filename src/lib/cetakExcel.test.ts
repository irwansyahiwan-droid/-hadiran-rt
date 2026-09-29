/**
 * Penjaga ISI dua ekspor EXCEL — Kas RT & Kas Hadiran.
 *
 * Lebih tegas daripada penjaga PDF, dan itu keuntungan formatnya: `exceljs`
 * menyimpan NILAI SEL yang sesungguhnya, jadi perbandingannya ANGKA lawan
 * ANGKA — bukan cocok-cocokan string yang bisa buta tanda.
 *
 * Invarian utamanya LINTAS-SHEET: satu workbook menyebut totalnya dua kali —
 * di sheet Ringkasan, dan sebagai kolom rincian di sheet mutasi/rekap.
 * Menuntut keduanya ada = menuntut keduanya SEPAKAT. Kalau berselisih,
 * bendahara yang membuka sheet berbeda mendapat jawaban berbeda dari SATU
 * berkas.
 *
 * Jebakan fixture yang sudah memakan korban dua kali & dicatat di sini: bentuk
 * `Stats` BERBEDA antar-modul — PDF Kas Hadiran memakai `saldoAktif`,
 * Excel-nya memakai `saldo`. Cast `as never`/`as unknown as` menyembunyikan
 * ketidakcocokan itu dan menghasilkan sel KOSONG yang lolos diam-diam. Jangan
 * pakai cast di fixture Stats.
 */
import { describe, it, expect } from 'vitest';
import type { Worksheet } from 'exceljs';
import { buildKasRTExcel } from './generateKasRTExcel';
import { buildKasHadiranExcel } from './generateKasHadiranExcel';
import { hitungSaldoHadiran } from './utils';
import type { KasRT, Tarikan } from './types';

/** Cari indeks kolom lewat NAMA di baris header — bukan indeks yang dipaku.
 *  Nama kolom uang MEMBAWA satuan (`Masuk (Rp)`): aturan app menaruh satuan di
 *  header, bukan di sel. Kalau uji ini merah dgn "kolom tak ada", periksa dulu
 *  apakah headernya memang berubah — 5 Sep 2026 ia menangkap persis itu. */
function kolom(ws: Worksheet, headerRow: number, nama: string): number {
  const v = ws.getRow(headerRow).values as unknown[];
  const i = v.findIndex((x) => String(x).trim() === nama);
  if (i < 1) throw new Error(`kolom "${nama}" tak ada di sheet ${ws.name}`);
  return i;
}
const angka = (ws: Worksheet, row: number, col: number): number => Number(ws.getCell(row, col).value ?? 0);
/** Jumlahkan satu kolom mulai dari baris pertama data. */
function jumlahKolom(ws: Worksheet, headerRow: number, col: number): number {
  let s = 0;
  for (let r = headerRow + 1; r <= ws.rowCount; r++) s += angka(ws, r, col);
  return s;
}

const b = (i: number, tipe: 'masuk' | 'keluar', n: number, kategori: string, ket: string): KasRT => ({
  id: `x${i}`, tipe, nominal: n, keterangan: ket, tanggal: '2026-08-01',
  tarikan_id: null, kategori, saldo_setelah: 0, created_at: '2026-08-01T00:00:00Z',
});
const tk = (n: number, terkumpul: number): Tarikan => ({
  id: `t${n}`, nomor: n, tanggal: `2026-0${n}-10`, jumlah_per_orang: 50_000,
  total_hadir: 60, total_warga: 69, sohibul_bait_id: `w${n}`, status: 'selesai',
  total_terkumpul: terkumpul, created_at: `2026-0${n}-10T00:00:00Z`,
  sohibul_bait: { id: `w${n}`, nama: `Warga ${n}` } as Tarikan['sohibul_bait'],
});

describe('Excel Kas RT — isi workbook', () => {
  const LIST = [
    b(1, 'masuk', 5_000_000, 'hadiran', 'Setoran kas Hadiran'),
    b(2, 'masuk', 1_250_000, 'iuran_warga', 'Iuran warga'),
    b(3, 'keluar', 750_000, 'sosial', 'Santunan'),
  ];
  const MASUK = 5_000_000 + 1_250_000, KELUAR = 750_000;
  const wbOf = () => buildKasRTExcel(LIST, { saldo: MASUK - KELUAR, totalMasuk: MASUK, totalKeluar: KELUAR, saldoAwal: 0 }).wb;

  /* Sejak 5 Sep 2026 nilai Ringkasan BERTANDA, jadi invariannya naik dari
     "awal + masuk − keluar = akhir" (rumus yang cuma kita yang tahu) menjadi
     "=SUM() ketiga baris = baris terakhir" — yaitu hal yang bisa diperiksa
     bendahara SENDIRI di dalam Excel, tanpa memercayai kita. */
  it('RINGKASAN rekonsiliasi sendiri: =SUM(baris atas) = Saldo Akhir', () => {
    const ws = wbOf().getWorksheet('Ringkasan')!;
    const [awal, masuk, keluar, akhir] = [5, 6, 7, 8].map((r) => angka(ws, r, 2));
    expect(awal + masuk + keluar, 'kolom Ringkasan tak menjumlah ke Saldo Akhir').toBe(akhir);
  });

  it('ARAH UANG dibawa TANDA, bukan cuma warna', () => {
    const ws = wbOf().getWorksheet('Ringkasan')!;
    /* Kolomnya tunggal (`Nominal (Rp)`) dan headernya tak membawa arah apa pun,
       jadi tanpa tanda satu-satunya pembeda masuk/keluar adalah WARNA — dan
       warna saja bukan penyandian yang sah. PDF untuk angka yang sama sudah
       lama mencetak `-Rp…`. */
    expect(angka(ws, 7, 2), 'Total Keluar wajib NEGATIF di kolom bernilai campur').toBeLessThan(0);
    expect(angka(ws, 6, 2), 'Total Masuk wajib positif').toBeGreaterThan(0);
  });

  it('LINTAS-SHEET: kolom Mutasi menjumlah tepat ke Ringkasan', () => {
    const wb = wbOf();
    const sum = wb.getWorksheet('Ringkasan')!, mut = wb.getWorksheet('Mutasi')!;
    const H = 4;
    expect(jumlahKolom(mut, H, kolom(mut, H, 'Masuk (Rp)')), 'Σ kolom Masuk ≠ Total Masuk di Ringkasan').toBe(angka(sum, 6, 2));
    /* Mutasi menyimpan MAGNITUDO positif — di sana arah dibawa NAMA KOLOM
       (Masuk/Keluar), jadi tanda akan mubazir & merusak filter/pivot. Ringkasan
       menyimpan BERTANDA karena kolomnya tunggal. Keduanya benar untuk
       tempatnya masing-masing; yang menghubungkan mereka tanda minus di sini. */
    expect(jumlahKolom(mut, H, kolom(mut, H, 'Keluar (Rp)')), 'Σ kolom Keluar ≠ |Total Keluar| di Ringkasan').toBe(-angka(sum, 7, 2));
    expect(mut.rowCount - H, 'jumlah baris mutasi ≠ jumlah transaksi').toBe(LIST.length);
  });

  /* 29 Sep 2026: fixture di atas TAK PERNAH memuat baris "Saldo Awal Kas RT",
     padahal data nyata memuatnya — dan baris itu dulu ditulis sbg MASUK
     berkategori "Belum dikategorikan", jadi Σ kolom Masuk (30.155.000) ≠ Total
     Masuk Ringkasan (22.021.000). Saldo awal = saldo PEMBUKA, bukan pemasukan
     periode ini (sama dgn Ringkasan, PDF & app). */
  it('SALDO AWAL: baris pembuka tak ikut kolom Masuk, Mutasi tetap = Ringkasan', () => {
    const AWAL = 8_000_000;
    const awal = { ...b(0, 'masuk', AWAL, 'lainnya', 'Saldo Awal Kas RT'), saldo_setelah: AWAL };
    const wb = buildKasRTExcel([...LIST, awal], { saldo: AWAL + MASUK - KELUAR, totalMasuk: MASUK, totalKeluar: KELUAR, saldoAwal: AWAL }).wb;
    const sum = wb.getWorksheet('Ringkasan')!, mut = wb.getWorksheet('Mutasi')!;
    const H = 4;
    expect(jumlahKolom(mut, H, kolom(mut, H, 'Masuk (Rp)')), 'Σ kolom Masuk ikut menghitung Saldo Awal').toBe(angka(sum, 6, 2));
    const baris = mut.getRow(mut.rowCount);
    expect(String(baris.getCell(kolom(mut, H, 'Tipe')).value), 'Saldo Awal tertulis sbg transaksi masuk').toBe('Saldo Awal');
    expect(angka(mut, mut.rowCount, kolom(mut, H, 'Saldo (Rp)')), 'saldo pembuka hilang dari kolom Saldo').toBe(AWAL);
  });
});

describe('Excel Kas Hadiran — isi workbook', () => {
  const LIST = [tk(1, 3_000_000), tk(2, 3_450_000)];
  const KAS = LIST.reduce((s, t) => s + t.total_terkumpul, 0);
  const TAL = 100_000, SET = 1_000_000;
  const wbOf = () => buildKasHadiranExcel(LIST, { t1: { count: 2, total: TAL } },
    { totalKasTerkumpul: KAS, totalTalanganBelum: TAL, totalSetor: SET, saldo: hitungSaldoHadiran(KAS, TAL, SET) }).wb;

  it('RINGKASAN memakai rumus saldo yang SAMA dengan app', () => {
    const ws = wbOf().getWorksheet('Ringkasan')!;
    const [kas, tal, setor, saldo] = [5, 6, 7, 8].map((r) => angka(ws, r, 2));
    /* Sel talangan & setoran kini BERTANDA (negatif), jadi rumus app dipanggil
       dgn magnitudonya — `hitungSaldoHadiran` = kas − talangan − setor. */
    expect(saldo, 'saldo di Excel ≠ hitungSaldoHadiran(kas, talangan, setor)').toBe(hitungSaldoHadiran(kas, -tal, -setor));
    expect(kas + tal + setor, 'kolom Ringkasan tak menjumlah ke Saldo Kas Hadiran').toBe(saldo);
    expect(saldo, 'sel saldo kosong — periksa nama field Stats (saldo vs saldoAktif)').not.toBeNaN();
  });

  it('ARAH UANG dibawa TANDA: talangan & setoran negatif', () => {
    const ws = wbOf().getWorksheet('Ringkasan')!;
    expect(angka(ws, 6, 2), 'Talangan Belum Lunas wajib negatif').toBeLessThan(0);
    expect(angka(ws, 7, 2), 'Setoran ke Kas Besar RT wajib negatif').toBeLessThan(0);
  });

  it('LINTAS-SHEET: kolom Kas Terkumpul menjumlah tepat ke Ringkasan', () => {
    const wb = wbOf();
    const sum = wb.getWorksheet('Ringkasan')!, rek = wb.getWorksheet('Rekap Tarikan')!;
    const H = 4;
    expect(jumlahKolom(rek, H, kolom(rek, H, 'Kas Terkumpul (Rp)')), 'Σ Kas Terkumpul ≠ Ringkasan').toBe(angka(sum, 5, 2));
    expect(rek.rowCount - H, 'jumlah baris rekap ≠ jumlah tarikan').toBe(LIST.length);
  });
});

/* ── SATUAN & ARAH UANG ────────────────────────────────────────────────────
   Dua aturan app yang sampai 5 Sep 2026 hanya ditegakkan di PDF, sehingga
   lembar yang paling sering dibuka bendahara justru satu-satunya permukaan
   yang membuangnya:

   (1) SATUAN di header kolom, angkanya polos (aturan user 11 Jun 2026).
       Tanpa itu kolom cacah `Talangan` dan kolom rupiah `Kas Terkumpul` cuma
       bisa dibedakan dari besarnya angka.
   (2) ARAH UANG diberi warna (`pos`/`neg`/`warn`) — PDF & app melakukannya,
       Excel mencetak semuanya hitam. Ini bukan perbedaan MEDIA: Excel
       mendukung warna dgn baik.

   Diuji dari WORKBOOK, bukan dari pemanggilan — jadi generator baru yang lupa
   gagal di sini. */
describe('Excel — satuan & arah uang', () => {
  const rt = buildKasRTExcel(
    [b(1, 'masuk', 5_000_000, 'hadiran', 'Setoran'), b(2, 'keluar', 750_000, 'sosial', 'Santunan')],
    { saldo: 4_250_000, totalMasuk: 5_000_000, totalKeluar: 750_000, saldoAwal: 0 },
  ).wb;
  const hd = buildKasHadiranExcel([tk(1, 3_000_000)], { t1: { count: 2, total: 100_000 } },
    { totalKasTerkumpul: 3_000_000, totalTalanganBelum: 100_000, totalSetor: 500_000,
      saldo: hitungSaldoHadiran(3_000_000, 100_000, 500_000) }).wb;

  const hdr = (ws: Worksheet, baris: number) =>
    (ws.getRow(baris).values as unknown[]).slice(1).map((v) => String(v ?? ''));
  const tinta = (ws: Worksheet, r: number, c: number) =>
    (ws.getCell(r, c).font?.color?.argb ?? '').slice(-6).toUpperCase();

  it('tiap kolom UANG menyebut satuannya di header', () => {
    /* Dicocokkan PERSIS, bukan lewat awalan — percobaan pertama memakai
       `startsWith('Talangan')` dan menangkap kolom CACAH `Talangan` lebih dulu
       daripada kolom rupiah `Talangan (Rp)`, lalu melaporkan kegagalan palsu.
       Dua kolom bertetangga yang namanya berawalan sama memang ada di sini,
       dan itu justru alasan aturan satuan ini dibuat. */
    const uang = [
      ['Kas RT/Ringkasan', hdr(rt.getWorksheet('Ringkasan')!, 4), ['Nominal (Rp)']],
      ['Kas RT/Mutasi', hdr(rt.getWorksheet('Mutasi')!, 4), ['Masuk (Rp)', 'Keluar (Rp)', 'Saldo (Rp)']],
      ['Hadiran/Ringkasan', hdr(hd.getWorksheet('Ringkasan')!, 4), ['Nominal (Rp)']],
      ['Hadiran/Rekap', hdr(hd.getWorksheet('Rekap Tarikan')!, 4),
        ['Kas Terkumpul (Rp)', 'Pendapatan Kotor SB (Rp)', 'Talangan (Rp)']],
    ] as const;
    const telanjang: string[] = [];
    for (const [sheet, head, wajib] of uang) {
      for (const h of wajib) if (!head.includes(h)) telanjang.push(`${sheet} "${h}"`);
    }
    expect(telanjang, 'kolom uang tanpa satuan di header').toEqual([]);
  });

  it('kolom CACAH sengaja TANPA satuan — supaya kontrasnya bermakna', () => {
    /* Kalau semua kolom diberi (Rp), aturan di atas berhenti membedakan apa
       pun. `Hadir` & `Total Warga` orang, bukan rupiah. */
    const head = hdr(hd.getWorksheet('Rekap Tarikan')!, 4);
    for (const c of ['Hadir', 'Total Warga']) expect(head).toContain(c);
  });

  it('arah uang diberi warna, mencermin PDF', () => {
    const mut = rt.getWorksheet('Mutasi')!;
    expect(tinta(mut, 5, 5), 'kolom Masuk = pos').toBe('05543E');
    expect(tinta(mut, 5, 6), 'kolom Keluar = neg').toBe('941136');
    const sum = hd.getWorksheet('Ringkasan')!;
    /* Sama dgn PDF & layar: talangan amber (`warn`), setoran NETRAL (`ink`).
       Uji ini dulu mengunci kebalikannya — ikut tertinggal saat PDF diperbaiki. */
    expect(tinta(sum, 6, 2), 'Talangan Belum Lunas = warn').toBe('75320B');
    expect(tinta(sum, 7, 2), 'Setoran ke Kas Besar RT = netral').toBe('07160D');
  });

  it('KONTROL: kolom bukan-uang TIDAK diwarnai', () => {
    /* Tanpa ini "semuanya berwarna" lolos sbg "arah uang dijaga". */
    const mut = rt.getWorksheet('Mutasi')!;
    for (const c of [1, 2, 3, 4]) expect(tinta(mut, 5, c), `kolom ${c} tak boleh berwarna`).toBe('');
  });
});

/* ── SIAP DIPAKAI DI EXCEL (29 Sep 2026) ───────────────────────────────────
   Tiga cacat yang hanya terlihat begitu berkasnya dibuka/dicetak di Excel
   sungguhan — nilai selnya selama ini benar, jadi uji isi di atas hijau:
   (1) tanggal berupa TEKS → urut kolom Tanggal menyusun menurut nama hari;
   (2) tanpa `pageSetup` → Mutasi tercetak 3 halaman MENYAMPING di kertas
       Letter, kolom Saldo sendirian; kepala tabel tak diulang;
   (3) sel kosong (Masuk/Keluar) tanpa garis & zebra, kepala kolom terpotong. */
describe('Excel — siap dipakai & dicetak', () => {
  const LIST: KasRT[] = [
    { ...b(1, 'masuk', 900_000, 'hadiran', 'Setoran'), tanggal: '2026-09-27' },
    { ...b(2, 'keluar', 50_000, 'sosial', 'Santunan'), tanggal: '2026-08-28' },
    { ...b(3, 'keluar', 70_000, 'sosial', 'Santunan'), tanggal: '2026-01-31' },
  ];
  const rt = buildKasRTExcel(LIST, { saldo: 780_000, totalMasuk: 900_000, totalKeluar: 120_000, saldoAwal: 0 }).wb;
  const hd = buildKasHadiranExcel([tk(1, 3_000_000), tk(2, 3_000_000)], {},
    { totalKasTerkumpul: 6_000_000, totalTalanganBelum: 0, totalSetor: 0, saldo: 6_000_000 }).wb;

  it('TANGGAL disimpan sbg tanggal Excel, urut menurut WAKTU — bukan nama hari', () => {
    const mut = rt.getWorksheet('Mutasi')!;
    const sel = [5, 6, 7].map((r) => mut.getCell(r, 1));
    for (const c of sel) {
      expect(c.value, 'sel tanggal berupa teks — urut & filter bulan di Excel patah').toBeInstanceOf(Date);
      expect(c.numFmt, 'format tanggal hilang — Excel menampilkan nomor seri').toMatch(/d mmm yyyy/);
      /* Nama hari ditulis tabel lokal Excel ("Mgg"), bukan app ("Min") —
         keputusan user 29 Sep 2026: tanpa nama hari. */
      expect(c.numFmt, 'nama hari kembali ke sel tanggal').not.toMatch(/ddd/);
    }
    /* Tengah malam UTC → nomor seri BULAT; tengah malam WIB akan jatuh ke
       hari sebelumnya di Excel. */
    const iso = sel.map((c) => (c.value as Date).toISOString().slice(0, 10));
    expect(iso).toEqual(['2026-09-27', '2026-08-28', '2026-01-31']);
    const rek = hd.getWorksheet('Rekap Tarikan')!;
    expect(rek.getCell(5, kolom(rek, 4, 'Tanggal')).value).toBeInstanceOf(Date);
  });

  it('tiap sheet A4, selebar kertas, tinggi bebas; tabel lebar LANSKAP & kepala diulang', () => {
    const lebar = new Set(['Mutasi', 'Rekap Tarikan']);
    for (const wb of [rt, hd]) {
      for (const ws of wb.worksheets) {
        const ps = ws.pageSetup;
        expect([ws.name, ps.paperSize, ps.fitToPage, ps.fitToWidth, ps.fitToHeight])
          .toEqual([ws.name, 9, true, 1, 0]);
        if (lebar.has(ws.name)) {
          expect(ps.orientation, `${ws.name} tegak — 7–9 kolom menyusut ke ±7pt`).toBe('landscape');
          expect(ps.printTitlesRow, `${ws.name}: kepala tabel tak diulang di halaman 2`).toBe('4:4');
        }
      }
    }
  });

  it('sel KOSONG di Mutasi tetap bergaris & berzebra', () => {
    const mut = rt.getWorksheet('Mutasi')!;
    /* Baris 6 = indeks 1 (zebra), transaksi KELUAR → sel Masuk (5) kosong. */
    const kosong = mut.getCell(6, kolom(mut, 4, 'Masuk (Rp)'));
    expect(kosong.value ?? null).toBeNull();
    expect(kosong.border?.top, 'sel kosong tanpa garis').toBeTruthy();
    expect((kosong.fill as { fgColor?: { argb?: string } } | undefined)?.fgColor?.argb, 'sel kosong memutus zebra').toBeTruthy();
  });

  it('kepala kolom yang lebih lebar dari kolomnya MELIPAT, bukan terpotong', () => {
    const rek = hd.getWorksheet('Rekap Tarikan')!;
    const c = rek.getCell(4, kolom(rek, 4, 'Pendapatan Kotor SB (Rp)'));
    expect(c.alignment?.wrapText).toBe(true);
    expect(rek.getRow(4).height, 'baris kepala dipaku 1 baris — kepala 2 baris terpotong').toBeGreaterThan(18);
    /* KONTROL: sheet yang kepalanya muat tetap setinggi satu baris. */
    expect(rt.getWorksheet('Mutasi')!.getRow(4).height).toBe(18);
  });
});
