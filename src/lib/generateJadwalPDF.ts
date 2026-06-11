import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import { TABLE, drawMasthead, drawSignatures, drawFooter, C } from './pdfTheme';
import type { Tarikan } from './types';

const STATUS: Record<string, string> = {
  dijadwalkan: 'Dijadwalkan',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
};

function tgl(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Jadwal tarikan arisan (semua tarikan + Sohibul Bait) → unduh PDF. */
export function generateJadwalPDF(list: Tarikan[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const docCode = `JDW-${now.getFullYear()}`;

  const sorted = [...list].sort((a, b) => a.nomor - b.nomor);
  const selesai = sorted.filter((t) => t.status === 'selesai').length;
  const terjadwal = sorted.filter((t) => t.status === 'dijadwalkan' || t.status === 'berlangsung').length;

  const Y = drawMasthead(doc, {
    W, M, docCode, tanggalCetak,
    title: 'Jadwal Tarikan Arisan',
    subtitle: `${sorted.length} tarikan · ${selesai} selesai · ${terjadwal} terjadwal`,
  });

  const rows = sorted.map((t) => [
    String(t.nomor),
    t.sohibul_bait?.nama ?? '—',
    tgl(t.tanggal),
    STATUS[t.status] ?? t.status,
  ]);

  autoTable(doc, {
    ...TABLE,
    startY: Y + 7,
    head: [['NO', 'SOHIBUL BAIT', 'TANGGAL', 'STATUS']],
    body: rows,
    margin: { left: M, right: M },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 48 },
      3: { cellWidth: 28, halign: 'center' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      if (data.column.index === 3) {
        const s = rows[data.row.index]?.[3] ?? '';
        if (s === 'Selesai') { data.cell.styles.textColor = C.pos; data.cell.styles.fontStyle = 'bold'; }
        else if (s === 'Dijadwalkan') { data.cell.styles.textColor = C.warn; }
      }
    },
  });

  const afterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  drawSignatures(doc, afterY, W, M);

  const H = doc.internal.pageSize.getHeight();
  drawFooter(doc, W, H, tanggalCetak);

  return outputPdf(doc, `Jadwal-Tarikan-${now.getFullYear()}.pdf`);
}
