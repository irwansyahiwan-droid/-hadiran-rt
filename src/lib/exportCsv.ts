// Ekspor CSV yang ramah Excel Indonesia: delimiter ';' + BOM UTF-8 + CRLF.
// File .csv terbuka langsung di Excel / Google Sheets.

function escapeCell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const sep = ';';
  const lines = [headers, ...rows].map((r) => r.map(escapeCell).join(sep));
  const content = '﻿' + lines.join('\r\n'); // BOM agar Excel baca UTF-8 benar
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Tanggal hari ini utk nama file: YYYY-MM-DD. */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
