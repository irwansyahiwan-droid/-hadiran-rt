import type { Workbook, Worksheet, Borders } from 'exceljs';

export const BRAND = 'FF0F4C2E';
export const ZEBRA = 'FFF1F5F9';

const thin = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };
export const border: Partial<Borders> = { top: thin, left: thin, bottom: thin, right: thin };

/** Judul + subjudul (baris 1–2) yang di-merge selebar tabel. */
export function titleBlock(ws: Worksheet, title: string, subtitle: string, cols: number): void {
  ws.mergeCells(1, 1, 1, cols);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { bold: true, size: 14, color: { argb: BRAND } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, cols);
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { size: 10, color: { argb: 'FF94A3B8' } };
  ws.getRow(2).height = 16;
}

/** Header tabel berwarna brand di baris `rowIndex`. */
export function headerRow(ws: Worksheet, rowIndex: number, headers: string[]): void {
  const r = ws.getRow(rowIndex);
  headers.forEach((h, i) => {
    const c = r.getCell(i + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = border;
  });
  r.height = 18;
}

/** Tulis workbook ke file .xlsx dan picu unduhan. */
export async function downloadWorkbook(wb: Workbook, filename: string): Promise<void> {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function stampLong(): string {
  return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
