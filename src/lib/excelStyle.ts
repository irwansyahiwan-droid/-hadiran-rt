import type { Workbook, Worksheet, Borders } from 'exceljs';
import { CETAK, argb } from './warnaCetak';

/* Excel ikut `warnaCetak.ts` (4 Agu 2026, susulan pass cetak).
   Pass sebelumnya menyatukan PDF & kartu PNG lalu berhenti di tiga berkas yang
   ter-grep — Excel tak ikut, padahal ia keluaran juga. Yang tertinggal di sini
   persis kelas nilai yang sudah dibuang dari permukaan lain:
     ZEBRA  #F1F5F9 → kanvas app #ECF1F7
     border #E2E8F0 → token `line` #B8C4D3 (yg lama lebih terang dari hairline app)
     subjudul #94A3B8 → `muted` #475569 — #94A3B8 cuma 2,50:1 di atas putih,
       dan lembar ini yang dibuka bendahara di layar laptop lalu dicetak.
   `BRAND` sudah benar sejak dulu; kini ia pun tak lagi ditulis tangan. */
export const BRAND = argb(CETAK.brand);
export const ZEBRA = argb(CETAK.canvas);

const thin = { style: 'thin' as const, color: { argb: argb(CETAK.line) } };
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
  s.font = { size: 10, color: { argb: argb(CETAK.muted) } };
  ws.getRow(2).height = 16;
}

/** Header tabel berwarna brand di baris `rowIndex`. */
export function headerRow(ws: Worksheet, rowIndex: number, headers: string[]): void {
  const r = ws.getRow(rowIndex);
  headers.forEach((h, i) => {
    const c = r.getCell(i + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    c.font = { bold: true, color: { argb: argb(CETAK.surface) }, size: 11 };
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
