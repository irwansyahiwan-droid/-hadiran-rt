import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_DATA_URL } from './logoBase64';
import type { KasRT } from './types';

interface KasRTStats {
  saldo: number;
  totalMasuk: number;
  totalKeluar: number;
  saldoAwal: number;
}

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`;
}

export function generateKasRTPDF(list: KasRT[], stats: KasRTStats) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14; // margin

  const now = new Date();
  const docCode = `KASRT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Header bar ───────────────────────────────────────────────
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, W, 36, 'F');

  // Logo RT
  doc.addImage(LOGO_DATA_URL, 'JPEG', M, 6, 15, 15);

  // RT name
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('RT 004 / RW 006 — Tanah Baru', M + 18, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208);
  doc.text('Beji, Kota Depok · Sistem Hadiran Digital', M + 18, 20);

  // Doc code & date (top right)
  doc.setFontSize(7.5);
  doc.setTextColor(167, 243, 208);
  doc.text(docCode, W - M, 13, { align: 'right' });
  doc.text(tanggalCetak, W - M, 20, { align: 'right' });

  // ── Title ────────────────────────────────────────────────────
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Laporan Kas Besar RT 004/006', M, 47);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(
    'Rekapitulasi kas masuk dan keluar RT 004/006 Tanah Baru, Beji, Kota Depok',
    M, 53,
  );

  // ── 3 Stat cards ────────────────────────────────────────────
  const cardY = 59;
  const cardH = 22;
  const gap = 4;
  const cardW = (W - 2 * M - gap * 2) / 3;

  const cards = [
    { label: 'SALDO BERSIH KAS', value: rp(stats.saldo), fill: [6, 95, 70] as [number,number,number], prefix: '' },
    { label: 'TOTAL MASUK', value: `+${rp(stats.totalMasuk)}`, fill: [16, 185, 129] as [number,number,number] },
    { label: 'TOTAL KELUAR', value: `-${rp(stats.totalKeluar)}`, fill: [185, 28, 28] as [number,number,number] },
  ];

  cards.forEach((c, i) => {
    const x = M + i * (cardW + gap);
    doc.setFillColor(...c.fill);
    doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'F');
    doc.setTextColor(210, 240, 230);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(c.label, x + 4, cardY + 7);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9.5);
    doc.text(c.value, x + 4, cardY + 16);
  });

  // ── Table ────────────────────────────────────────────────────
  const sorted = [...list].sort(
    (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime(),
  );

  const rows = sorted.map((k, idx) => {
    const isSaldoAwal = k.keterangan === 'Saldo Awal Kas RT';
    const jenis = isSaldoAwal ? 'SALDO AWAL' : k.tipe === 'masuk' ? 'MASUK' : 'KELUAR';
    const jumlahPrefix = isSaldoAwal ? '' : k.tipe === 'masuk' ? '+' : '-';
    return [
      String(idx + 1),
      new Date(k.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }),
      k.keterangan || (k.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran'),
      jenis,
      `${jumlahPrefix}${rp(k.nominal)}`,
      rp(k.saldo_setelah),
    ];
  });

  autoTable(doc, {
    startY: cardY + cardH + 6,
    head: [['NO', 'TANGGAL', 'KETERANGAN', 'JENIS', 'JUMLAH', 'SALDO']],
    body: rows,
    margin: { left: M, right: M },
    headStyles: {
      fillColor: [6, 78, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const row = sorted[data.row.index];
      if (!row) return;
      const isSaldoAwal = row.keterangan === 'Saldo Awal Kas RT';

      if (data.column.index === 3) {
        if (isSaldoAwal) {
          data.cell.styles.textColor = [107, 114, 128];
          data.cell.styles.fillColor = [243, 244, 246];
          data.cell.styles.fontStyle = 'bold';
        } else if (row.tipe === 'masuk') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fillColor = [236, 253, 245];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.column.index === 4) {
        if (!isSaldoAwal) {
          data.cell.styles.textColor = row.tipe === 'masuk' ? [5, 150, 105] : [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ── Ringkasan ────────────────────────────────────────────────
  const afterTableY: number = (doc as any).lastAutoTable.finalY + 8;
  const sumX = W - M - 72;
  const sumW = 72;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(sumX, afterTableY, sumW, 36, 2, 2, 'S');

  const lines: { label: string; value: string; bold?: boolean; color?: [number,number,number] }[] = [
    { label: 'Saldo Awal',       value: rp(stats.saldoAwal) },
    { label: 'Total Pemasukan',  value: `+${rp(stats.totalMasuk)}`,  color: [5,150,105] },
    { label: 'Total Pengeluaran',value: `-${rp(stats.totalKeluar)}`, color: [185,28,28] },
  ];

  lines.forEach((l, i) => {
    const ly = afterTableY + 8 + i * 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(l.label, sumX + 4, ly);
    doc.setTextColor(...(l.color ?? [31, 41, 55] as [number,number,number]));
    doc.text(l.value, sumX + sumW - 4, ly, { align: 'right' });
  });

  // Saldo Bersih highlight row
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(sumX, afterTableY + 26, sumW, 10, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Saldo Bersih', sumX + 4, afterTableY + 33);
  doc.text(rp(stats.saldo), sumX + sumW - 4, afterTableY + 33, { align: 'right' });

  // ── TTD ──────────────────────────────────────────────────────
  const sigY = afterTableY + 50;
  const sigPeople = [
    { role: 'Ketua RT 004/006', name: "Saman Ma'arif" },
    { role: 'Sekretaris',       name: 'M. Aryanto' },
    { role: 'Bendahara',        name: 'Irwansyah' },
  ];
  const colW = (W - 2 * M) / 3;

  sigPeople.forEach((p, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(p.role, cx, sigY, { align: 'center' });
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(cx - 28, sigY + 16, cx + 28, sigY + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(p.name, cx, sigY + 22, { align: 'center' });
  });

  // ── Footer ───────────────────────────────────────────────────
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Dicetak: ${tanggalCetak} · Hadiran RT Digital System`,
    W / 2, H - 8, { align: 'center' },
  );

  doc.save(`Laporan-Kas-RT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
}
