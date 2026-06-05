import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_DATA_URL } from './logoBase64';
import { outputPdf } from './pdfOut';
import { formatAktivitas, formatWaktu } from './aktivitas';
import { formatRupiahPlain } from './utils';
import type { AktivitasLog } from './types';

/** Ekspor daftar riwayat aktivitas (audit log) ke PDF untuk arsip / lampiran LPJ. */
export function generateAktivitasPDF(rows: AktivitasLog[], filterLabel = 'Semua') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const docCode = `RA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

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
  doc.text('Riwayat Aktivitas', M, 47);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
  doc.text(`Kategori: ${filterLabel} · ${rows.length} aktivitas tercatat`, M, 53);

  // ── Tabel ─────────────────────────────────────────────────
  type Row = [string, string, string, string, string];
  const body: Row[] = rows.map((r, i) => {
    const v = formatAktivitas(r);
    const aktivitas = v.detail ? `${v.title}\n${v.detail}` : v.title;
    return [
      String(i + 1),
      formatWaktu(r.created_at),
      aktivitas,
      v.actor,
      v.amount != null && v.amount !== 0 ? formatRupiahPlain(v.amount) : '—',
    ];
  });

  autoTable(doc, {
    startY: 59,
    head: [['NO', 'WAKTU', 'AKTIVITAS', 'OLEH', 'NILAI']],
    body,
    margin: { left: M, right: M },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55], valign: 'top' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 34 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 28 },
      4: { cellWidth: 26, halign: 'right' },
    },
  });

  // ── Footer ────────────────────────────────────────────────
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(156, 163, 175);
  doc.text(`Dicetak: ${tanggalCetak} · Hadiran RT Digital System`, W / 2, H - 8, { align: 'center' });

  return outputPdf(doc, `Riwayat-Aktivitas-${docCode}.pdf`);
}
