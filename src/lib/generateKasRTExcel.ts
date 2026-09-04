import ExcelJS from 'exceljs';
import type { KasRT } from './types';
import { formatTanggal } from './utils';
import { border, titleBlock, headerRow, downloadWorkbook, stamp, stampLong, ZEBRA } from './excelStyle';
import { labelKategori } from './kategoriKasRt';

interface Stats {
  saldo: number;
  totalMasuk: number;
  totalKeluar: number;
  saldoAwal: number;
}

const CUR = '#,##0';

/* Seam `build*` — pola sama dgn generator PDF (4 Sep 2026). SINKRON: yang async
   hanya pengunduhannya, bukan penyusunan workbook-nya. Murni ekstraksi. */
export function buildKasRTExcel(list: KasRT[], stats: Stats): { wb: ExcelJS.Workbook; filename: string } {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hadiran RT';
  wb.created = new Date();
  const tgl = stampLong();

  // ── Sheet 1: Ringkasan ──
  const sum = wb.addWorksheet('Ringkasan');
  sum.columns = [{ width: 24 }, { width: 20 }];
  titleBlock(sum, 'Kas Besar RT 004/006', `Ringkasan · ${tgl}`, 2);
  headerRow(sum, 4, ['Keterangan', 'Nominal']);
  const ringkasan: [string, number][] = [
    ['Saldo Awal', stats.saldoAwal],
    ['Total Masuk', stats.totalMasuk],
    ['Total Keluar', stats.totalKeluar],
    ['Saldo Akhir', stats.saldo],
  ];
  ringkasan.forEach(([label, val], i) => {
    const r = sum.addRow([label, val]);
    r.getCell(2).numFmt = CUR;
    r.getCell(2).alignment = { horizontal: 'right' };
    r.eachCell((c) => (c.border = border));
    if (i === ringkasan.length - 1) r.font = { bold: true };
  });

  // ── Sheet 2: Mutasi ──
  const ws = wb.addWorksheet('Mutasi', { views: [{ state: 'frozen', ySplit: 4 }] });
  /* Kolom KATEGORI (5 Agu 2026). Pengelompokan pertanggungjawaban sudah ada di
     form, rekap in-app, dan PDF — tapi TIDAK di Excel, padahal justru di sinilah
     bendahara menyortir, memfilter, dan mem-pivot. Tanpa kolom ini kategori jadi
     kerja yang hasilnya tak bisa dipakai di alat yang paling dipakai.
     Label PANJANG (bukan `short`) karena kolom spreadsheet dipakai untuk
     memfilter — "Belum dikategorikan" pun berguna: itu justru filter untuk
     mencari transaksi yang masih perlu dirapikan. */
  ws.columns = [{ width: 18 }, { width: 10 }, { width: 30 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 18 }];
  titleBlock(ws, 'Kas Besar RT 004/006', `Mutasi · ${tgl}`, 7);
  headerRow(ws, 4, ['Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Masuk', 'Keluar', 'Saldo']);
  /* Baris kepala jadi filter — kolom kategori tak ada gunanya kalau harus
     disaring manual. Rentangnya baris kepala saja; Excel meluaskan sendiri ke
     data di bawahnya. */
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 7 } };

  list.forEach((k, i) => {
    const r = ws.addRow([
      formatTanggal(k.tanggal),
      k.tipe === 'masuk' ? 'Masuk' : 'Keluar',
      labelKategori(k.tipe, k.kategori),
      k.keterangan ?? '',
      k.tipe === 'masuk' ? k.nominal : null,
      k.tipe === 'keluar' ? k.nominal : null,
      k.saldo_setelah,
    ]);
    [5, 6, 7].forEach((ci) => {
      r.getCell(ci).numFmt = CUR;
      r.getCell(ci).alignment = { horizontal: 'right' };
    });
    if (i % 2 === 1) r.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }));
    r.eachCell((c) => (c.border = border));
  });

  return { wb, filename: `Kas-RT-${stamp()}.xlsx` };
}

export async function generateKasRTExcel(list: KasRT[], stats: Stats): Promise<void> {
  const { wb, filename } = buildKasRTExcel(list, stats);
  await downloadWorkbook(wb, filename);
}
