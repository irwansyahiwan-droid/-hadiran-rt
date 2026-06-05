import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_DATA_URL } from './logoBase64';
import { outputPdf } from './pdfOut';
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

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, W, 36, 'F');
  doc.addImage(LOGO_DATA_URL, 'JPEG', M, 6, 15, 15);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('RT 004 / RW 006 — Tanah Baru', M + 18, 13);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(167, 243, 208);
  doc.text('Beji, Kota Depok · Sistem Hadiran Digital', M + 18, 20);
  doc.setFontSize(7.5);
  doc.text(docCode, W - M, 13, { align: 'right' });
  doc.text(tanggalCetak, W - M, 20, { align: 'right' });

  // ── Title ─────────────────────────────────────────────────
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
  doc.text('Jadwal Tarikan Arisan', M, 47);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
  doc.text(`${sorted.length} tarikan · ${selesai} selesai · ${terjadwal} terjadwal`, M, 53);

  // ── Table ─────────────────────────────────────────────────
  const rows = sorted.map((t) => [
    String(t.nomor),
    t.sohibul_bait?.nama ?? '—',
    tgl(t.tanggal),
    STATUS[t.status] ?? t.status,
  ]);

  autoTable(doc, {
    startY: 59,
    head: [['NO', 'SOHIBUL BAIT', 'TANGGAL', 'STATUS']],
    body: rows,
    margin: { left: M, right: M },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
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
        if (s === 'Selesai') { data.cell.styles.textColor = [5, 150, 105]; data.cell.styles.fontStyle = 'bold'; }
        else if (s === 'Dijadwalkan') { data.cell.styles.textColor = [180, 83, 9]; }
      }
    },
  });

  // ── TTD ───────────────────────────────────────────────────
  const afterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  [{ role: 'Ketua RT 004/006', name: "Saman Ma'arif" },
   { role: 'Sekretaris', name: 'M. Aryanto' },
   { role: 'Bendahara', name: 'Irwansyah' }].forEach((p, i) => {
    const cx = M + ((W - 2 * M) / 3) * i + (W - 2 * M) / 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text(p.role, cx, afterY, { align: 'center' });
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4);
    doc.line(cx - 28, afterY + 16, cx + 28, afterY + 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(17, 24, 39);
    doc.text(p.name, cx, afterY + 22, { align: 'center' });
  });

  // ── Footer ────────────────────────────────────────────────
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(156, 163, 175);
  doc.text(`Dicetak: ${tanggalCetak} · Hadiran RT Digital System`, W / 2, H - 8, { align: 'center' });

  return outputPdf(doc, `Jadwal-Tarikan-${now.getFullYear()}.pdf`);
}
