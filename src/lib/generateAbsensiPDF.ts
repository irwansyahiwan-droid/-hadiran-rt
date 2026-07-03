import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import {
  TABLE, drawMasthead, drawStatStrip, drawSignatures, drawFooter, C, alignHeadFoot,
} from './pdfTheme';
import type { Tarikan } from './types';

interface Hadir { nama: string }
interface Tidak { nama: string; lunas: boolean }

/** Daftar hadir (absensi) satu tarikan → unduh PDF. */
export function generateAbsensiPDF(tarikan: Tarikan, hadir: Hadir[], tidak: Tidak[], titip: Hadir[] = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const docCode = `ABS-${String(tarikan.nomor).padStart(3, '0')}-${now.getFullYear()}`;

  const hadirS = [...hadir].sort((a, b) => a.nama.localeCompare(b.nama));
  const titipS = [...titip].sort((a, b) => a.nama.localeCompare(b.nama));
  const tidakS = [...tidak].sort((a, b) => a.nama.localeCompare(b.nama));
  const lunasCount = tidakS.filter((t) => t.lunas).length;
  const total = hadirS.length + titipS.length + tidakS.length;

  const tglTarikan = tarikan.tanggal
    ? new Date(tarikan.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  let Y = drawMasthead(doc, {
    W, M, docCode, tanggalCetak,
    title: `Daftar Hadir Tarikan ke-${tarikan.nomor}`,
    subtitle: `${tglTarikan} · Sohibul Bait: ${tarikan.sohibul_bait?.nama ?? '—'}`,
  });

  Y = drawStatStrip(doc, Y, [
    { label: 'Hadir',          value: String(hadirS.length), tone: 'pos' },
    { label: 'Tidak Hadir',    value: String(tidakS.length), tone: tidakS.length > 0 ? 'neg' : 'ink' },
    { label: 'Talangan Lunas', value: String(lunasCount) },
  ], W, M);

  // ── Tabel kehadiran ───────────────────────────────────────
  type Row = [string, string, string];
  const rows: Row[] = [];
  let n = 1;
  hadirS.forEach((h) => rows.push([String(n++), h.nama, 'Hadir']));
  titipS.forEach((t) => rows.push([String(n++), t.nama, 'Titip']));
  tidakS.forEach((t) => rows.push([String(n++), t.nama, t.lunas ? 'Talangan Lunas' : 'Talangan']));

  const ABS_COL = {
    0: { cellWidth: 12, halign: 'center' as const },
    1: { cellWidth: 'auto' as const },
    2: { cellWidth: 40, halign: 'center' as const },
  };
  autoTable(doc, {
    ...TABLE,
    startY: Y + 7,
    head: [['NO', 'NAMA ANGGOTA', 'STATUS']],
    body: rows,
    margin: { left: M, right: M },
    columnStyles: ABS_COL,
    didParseCell(data) {
      alignHeadFoot(data, ABS_COL);
      if (data.section !== 'body' || data.column.index !== 2) return;
      const s = rows[data.row.index]?.[2] ?? '';
      if (s === 'Hadir') { data.cell.styles.textColor = C.pos; data.cell.styles.fontStyle = 'bold'; }
      else if (s === 'Titip') { data.cell.styles.fontStyle = 'bold'; }
      else if (s === 'Talangan Lunas') { data.cell.styles.textColor = C.pos; }
      else if (s === 'Talangan') { data.cell.styles.textColor = C.neg; data.cell.styles.fontStyle = 'bold'; }
    },
  });

  // ── Total + TTD ───────────────────────────────────────────
  const afterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
  doc.text(`Total Anggota Tercatat: ${total}`, M, afterY);

  drawSignatures(doc, afterY + 16, W, M);

  const H = doc.internal.pageSize.getHeight();
  drawFooter(doc, W, H, tanggalCetak);

  return outputPdf(doc, `Daftar-Hadir-Tarikan-${tarikan.nomor}.pdf`);
}
