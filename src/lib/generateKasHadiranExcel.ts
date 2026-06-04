import ExcelJS from 'exceljs';
import type { Tarikan } from './types';
import { formatTanggal } from './utils';
import { border, titleBlock, headerRow, downloadWorkbook, stamp, stampLong, ZEBRA } from './excelStyle';

interface TalanganInfo { count: number; total: number }
interface Stats {
  totalKasTerkumpul: number;
  totalTalanganBelum: number;
  totalSetor: number;
  saldo: number;
}

const CUR = '#,##0';

export async function generateKasHadiranExcel(
  tarikan: Tarikan[],
  talanganMap: Record<string, TalanganInfo>,
  stats: Stats,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hadiran RT';
  wb.created = new Date();
  const tgl = stampLong();

  // ── Sheet 1: Ringkasan ──
  const sum = wb.addWorksheet('Ringkasan');
  sum.columns = [{ width: 28 }, { width: 20 }];
  titleBlock(sum, 'Kas Hadiran RT 004/006', `Ringkasan · ${tgl}`, 2);
  headerRow(sum, 4, ['Keterangan', 'Nominal']);
  const ringkasan: [string, number][] = [
    ['Kas Hadiran Terkumpul', stats.totalKasTerkumpul],
    ['Talangan Belum Lunas', stats.totalTalanganBelum],
    ['Setoran ke Kas Besar RT', stats.totalSetor],
    ['Saldo Kas Hadiran', stats.saldo],
  ];
  ringkasan.forEach(([label, val], i) => {
    const r = sum.addRow([label, val]);
    r.getCell(2).numFmt = CUR;
    r.getCell(2).alignment = { horizontal: 'right' };
    r.eachCell((c) => (c.border = border));
    if (i === ringkasan.length - 1) r.font = { bold: true };
  });

  // ── Sheet 2: Rekap Tarikan ──
  const ws = wb.addWorksheet('Rekap Tarikan', { views: [{ state: 'frozen', ySplit: 4 }] });
  ws.columns = [
    { width: 8 }, { width: 18 }, { width: 26 }, { width: 8 }, { width: 12 },
    { width: 16 }, { width: 16 }, { width: 12 }, { width: 16 },
  ];
  titleBlock(ws, 'Kas Hadiran RT 004/006', `Rekap per Tarikan · ${tgl}`, 9);
  headerRow(ws, 4, ['No', 'Tanggal', 'Sohibul Bait', 'Hadir', 'Total Warga', 'Kas Terkumpul', 'Sohibul Terima', 'Talangan', 'Talangan (Rp)']);

  tarikan.forEach((t, i) => {
    const info = talanganMap[t.id] ?? { count: 0, total: 0 };
    const r = ws.addRow([
      t.nomor,
      formatTanggal(t.tanggal),
      t.sohibul_bait?.nama ?? '-',
      t.total_hadir,
      t.total_warga,
      t.total_terkumpul ?? 0,
      (t.total_terkumpul ?? 0) * 9,
      info.count,
      info.total,
    ]);
    [6, 7, 9].forEach((ci) => {
      r.getCell(ci).numFmt = CUR;
      r.getCell(ci).alignment = { horizontal: 'right' };
    });
    [1, 4, 5, 8].forEach((ci) => (r.getCell(ci).alignment = { horizontal: 'center' }));
    if (i % 2 === 1) r.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }));
    r.eachCell((c) => (c.border = border));
  });

  await downloadWorkbook(wb, `Kas-Hadiran-${stamp()}.xlsx`);
}
