import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_DATA_URL } from './logoBase64';
import type { RekapTriwulan } from './laporan';

function rp(n: number) {
  const s = `Rp${Math.abs(n).toLocaleString('id-ID')}`;
  return n < 0 ? `-${s}` : s;
}

/** Laporan keuangan tutup buku satu triwulan → unduh PDF. */
export function generateLaporanTriwulanPDF(r: RekapTriwulan) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();
  const docCode = `LK-TW${r.triwulan}-${r.tahun}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const hadiranNet = r.hadiranMasuk - r.hadiranKeluar;
  const rtNet = r.rtMasuk - r.rtKeluar;

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
  doc.text(`Laporan Keuangan ${r.label}`, M, 47);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
  doc.text(`Periode ${r.rentang} · Tutup buku triwulan`, M, 53);

  // ── 3 Stat cards ─────────────────────────────────────────
  const cardY = 59, cardH = 22, gap = 4;
  const cardW = (W - 2 * M - gap * 2) / 3;
  const cards: [string, string, [number, number, number]][] = [
    ['SALDO KAS HADIRAN', rp(r.hadiranSaldoAkhir), [6, 78, 59]],
    ['SALDO KAS RT', rp(r.rtSaldoAkhir), [5, 150, 105]],
    ['TARIKAN SELESAI', String(r.tarikanSelesai), [120, 53, 15]],
  ];
  cards.forEach(([label, value, fill], i) => {
    const x = M + i * (cardW + gap);
    doc.setFillColor(...fill); doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 240, 220);
    doc.text(label, x + 4, cardY + 7);
    doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text(value, x + 4, cardY + 16);
  });

  // ── Tabel rincian ─────────────────────────────────────────
  type Row = [string, string];
  const rows: Row[] = [
    ['— KAS HADIRAN —', ''],
    ['Pemasukan (iuran & pelunasan talangan)', rp(r.hadiranMasuk)],
    ['Pengeluaran (setor Kas RT & lainnya)', `-${rp(r.hadiranKeluar)}`],
    ['Selisih triwulan', rp(hadiranNet)],
    ['Saldo akhir Kas Hadiran', rp(r.hadiranSaldoAkhir)],
    ['— KAS RT —', ''],
    ['Pemasukan', rp(r.rtMasuk)],
    ['Pengeluaran', `-${rp(r.rtKeluar)}`],
    ['Selisih triwulan', rp(rtNet)],
    ['Saldo akhir Kas RT', rp(r.rtSaldoAkhir)],
    ['— AKTIVITAS —', ''],
    ['Tarikan selesai', `${r.tarikanSelesai}`],
    ['Talangan lunas', `${r.talanganLunas}`],
    ['Jumlah transaksi tercatat', `${r.jumlahTransaksi}`],
  ];

  autoTable(doc, {
    startY: cardY + cardH + 6,
    head: [['KETERANGAN', 'NILAI']],
    body: rows,
    margin: { left: M, right: M },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const label = rows[data.row.index]?.[0] ?? '';
      const isHeader = label.startsWith('—');
      const isSaldo = label.startsWith('Saldo akhir');
      if (isHeader) {
        data.cell.styles.fillColor = [6, 78, 59];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 7.5;
      } else if (isSaldo) {
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [5, 150, 105];
      }
    },
  });

  // ── TTD ───────────────────────────────────────────────────
  const afterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
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

  doc.save(`Laporan-Keuangan-TW${r.triwulan}-${r.tahun}.pdf`);
}
