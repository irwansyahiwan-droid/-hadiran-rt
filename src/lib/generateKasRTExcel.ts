import ExcelJS from 'exceljs';
import type { KasRT } from './types';
import { formatTanggal } from './utils';
import { border, titleBlock, headerRow, downloadWorkbook, stamp, stampLong, ZEBRA } from './excelStyle';

interface Stats {
  saldo: number;
  totalMasuk: number;
  totalKeluar: number;
  saldoAwal: number;
}

const CUR = '#,##0';

export async function generateKasRTExcel(list: KasRT[], stats: Stats): Promise<void> {
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
  ws.columns = [{ width: 18 }, { width: 10 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 18 }];
  titleBlock(ws, 'Kas Besar RT 004/006', `Mutasi · ${tgl}`, 6);
  headerRow(ws, 4, ['Tanggal', 'Tipe', 'Keterangan', 'Masuk', 'Keluar', 'Saldo']);

  list.forEach((k, i) => {
    const r = ws.addRow([
      formatTanggal(k.tanggal),
      k.tipe === 'masuk' ? 'Masuk' : 'Keluar',
      k.keterangan ?? '',
      k.tipe === 'masuk' ? k.nominal : null,
      k.tipe === 'keluar' ? k.nominal : null,
      k.saldo_setelah,
    ]);
    [4, 5, 6].forEach((ci) => {
      r.getCell(ci).numFmt = CUR;
      r.getCell(ci).alignment = { horizontal: 'right' };
    });
    if (i % 2 === 1) r.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }));
    r.eachCell((c) => (c.border = border));
  });

  await downloadWorkbook(wb, `Kas-RT-${stamp()}.xlsx`);
}
