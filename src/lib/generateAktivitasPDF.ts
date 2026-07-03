import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import { TABLE, drawMasthead, drawFooter, fmtNum, alignHeadFoot } from './pdfTheme';
import { formatAktivitas, formatWaktu } from './aktivitas';
import type { AktivitasLog } from './types';

/** Ekspor daftar riwayat aktivitas (audit log) ke PDF untuk arsip / lampiran LPJ. */
export function generateAktivitasPDF(rows: AktivitasLog[], filterLabel = 'Semua') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const docCode = `RA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const Y = drawMasthead(doc, {
    W, M, docCode, tanggalCetak,
    title: 'Riwayat Aktivitas',
    subtitle: `Kategori: ${filterLabel} · ${rows.length} aktivitas tercatat`,
  });

  type Row = [string, string, string, string, string];
  const body: Row[] = rows.map((r, i) => {
    const v = formatAktivitas(r);
    const aktivitas = v.detail ? `${v.title}\n${v.detail}` : v.title;
    return [
      String(i + 1),
      formatWaktu(r.created_at),
      aktivitas,
      v.actor,
      v.amount != null && v.amount !== 0 ? fmtNum(Math.abs(v.amount)) : '—',
    ];
  });

  const AKT_COL = {
    0: { cellWidth: 8, halign: 'center' as const },
    1: { cellWidth: 34 },
    2: { cellWidth: 'auto' as const },
    3: { cellWidth: 28 },
    4: { cellWidth: 26, halign: 'right' as const },
  };
  autoTable(doc, {
    ...TABLE,
    startY: Y + 7,
    head: [['NO', 'WAKTU', 'AKTIVITAS', 'OLEH', 'NILAI (Rp)']],
    body,
    margin: { left: M, right: M },
    bodyStyles: { ...TABLE.bodyStyles, valign: 'top' },
    columnStyles: AKT_COL,
    didParseCell: (data) => alignHeadFoot(data, AKT_COL),
  });

  const H = doc.internal.pageSize.getHeight();
  drawFooter(doc, W, H, tanggalCetak);

  return outputPdf(doc, `Riwayat-Aktivitas-${docCode}.pdf`);
}
