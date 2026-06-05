import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_DATA_URL } from './logoBase64';
import type { Tarikan } from './types';

interface Hadir { nama: string }
interface Tidak { nama: string; lunas: boolean }

/** Daftar hadir (absensi) satu tarikan → unduh PDF. */
export function generateAbsensiPDF(tarikan: Tarikan, hadir: Hadir[], tidak: Tidak[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const docCode = `ABS-${String(tarikan.nomor).padStart(3, '0')}-${now.getFullYear()}`;

  const hadirS = [...hadir].sort((a, b) => a.nama.localeCompare(b.nama));
  const tidakS = [...tidak].sort((a, b) => a.nama.localeCompare(b.nama));
  const lunasCount = tidakS.filter((t) => t.lunas).length;
  const total = hadirS.length + tidakS.length;

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
  doc.text(`Daftar Hadir Tarikan ke-${tarikan.nomor}`, M, 47);
  const tglTarikan = tarikan.tanggal
    ? new Date(tarikan.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
  doc.text(`${tglTarikan} · Sohibul Bait: ${tarikan.sohibul_bait?.nama ?? '—'}`, M, 53);

  // ── 3 Stat cards ─────────────────────────────────────────
  const cardY = 59, cardH = 22, gap = 4;
  const cardW = (W - 2 * M - gap * 2) / 3;
  const cards: [string, string, [number, number, number]][] = [
    ['HADIR', String(hadirS.length), [6, 78, 59]],
    ['TIDAK HADIR', String(tidakS.length), [120, 53, 15]],
    ['TALANGAN LUNAS', String(lunasCount), [5, 150, 105]],
  ];
  cards.forEach(([label, value, fill], i) => {
    const x = M + i * (cardW + gap);
    doc.setFillColor(...fill); doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 240, 220);
    doc.text(label, x + 4, cardY + 7);
    doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text(value, x + 4, cardY + 16);
  });

  // ── Table ─────────────────────────────────────────────────
  type Row = [string, string, string];
  const rows: Row[] = [];
  let n = 1;
  hadirS.forEach((h) => rows.push([String(n++), h.nama, 'Hadir']));
  tidakS.forEach((t) => rows.push([String(n++), t.nama, t.lunas ? 'Talangan Lunas' : 'Talangan']));

  autoTable(doc, {
    startY: cardY + cardH + 6,
    head: [['NO', 'NAMA ANGGOTA', 'STATUS']],
    body: rows,
    margin: { left: M, right: M },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, halign: 'center' },
    },
    didParseCell(data) {
      if (data.section !== 'body' || data.column.index !== 2) return;
      const s = rows[data.row.index]?.[2] ?? '';
      if (s === 'Hadir') { data.cell.styles.textColor = [5, 150, 105]; data.cell.styles.fontStyle = 'bold'; }
      else if (s === 'Talangan Lunas') { data.cell.styles.textColor = [5, 150, 105]; }
      else if (s === 'Talangan') { data.cell.styles.textColor = [185, 28, 28]; data.cell.styles.fontStyle = 'bold'; }
    },
  });

  // ── Total + TTD ───────────────────────────────────────────
  let afterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
  doc.text(`Total Anggota Tercatat: ${total}`, M, afterY);

  afterY += 16;
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

  doc.save(`Daftar-Hadir-Tarikan-${tarikan.nomor}.pdf`);
}
