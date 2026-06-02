import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_DATA_URL } from './logoBase64';
import type { Tarikan } from './types';

interface TalanganInfo { count: number; total: number; }

interface Stats {
  totalKasTerkumpul: number;
  totalTalanganBelum: number;
  totalSetor: number;
  saldoAktif: number;
}

function rp(n: number) { return `Rp${n.toLocaleString('id-ID')}`; }

export function generateKasHadiranPDF(
  tarikanList: Tarikan[],
  talanganMap: Record<string, TalanganInfo>,
  stats: Stats,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  const docCode = `KAS-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

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
  doc.text('Laporan Alur Kas Hadiran', M, 47);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
  doc.text('Rekapitulasi kas masuk, talangan, dan saldo RT 004/006 Tanah Baru, Beji, Kota Depok', M, 53);

  // ── 3 Stat cards ─────────────────────────────────────────
  const cardY = 59; const cardH = 22; const gap = 4;
  const cardW = (W - 2 * M - gap * 2) / 3;
  const cards: [string, string, [number, number, number]][] = [
    ['KAS HADIRAN TERKUMPUL', rp(stats.totalKasTerkumpul), [6, 95, 70]],
    ['TALANGAN BELUM LUNAS',  `-${rp(stats.totalTalanganBelum)}`, [185, 28, 28]],
    ['SALDO BERSIH KAS',      rp(stats.saldoAktif), stats.saldoAktif < 0 ? [127, 29, 29] : [6, 78, 59]],
  ];
  cards.forEach(([label, value, fill], i) => {
    const x = M + i * (cardW + gap);
    doc.setFillColor(...fill); doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 240, 220);
    doc.text(label, x + 4, cardY + 7);
    doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
    doc.text(value, x + 4, cardY + 16);
  });

  // ── Table ─────────────────────────────────────────────────
  const sorted = [...tarikanList].sort((a, b) => a.nomor - b.nomor);

  const rows = sorted.map((t, i) => {
    const tal = talanganMap[t.id] ?? { count: 0, total: 0 };
    const kasIn = t.total_terkumpul ?? 0;
    const net   = kasIn - tal.total;
    return [
      String(i + 1),
      `#${t.nomor} · ${new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      t.sohibul_bait?.nama ?? '—',
      `${t.total_hadir}/${t.total_warga}`,
      rp(kasIn),
      tal.total > 0 ? `-${rp(tal.total)}` : 'Rp0',
      'Rp0',
      net < 0 ? `-${rp(Math.abs(net))}` : rp(net),
    ];
  });

  autoTable(doc, {
    startY: cardY + cardH + 6,
    head: [['NO', 'TARIKAN', 'SOHIBUL BAIT', 'HADIR', 'KAS MASUK', 'TALANGAN', 'SETOR', 'NET KAS']],
    body: rows,
    margin: { left: M, right: M },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 16, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const row = sorted[data.row.index];
      if (!row) return;
      const tal = talanganMap[row.id] ?? { count: 0, total: 0 };
      if (data.column.index === 5 && tal.total > 0) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 7) {
        const net = (row.total_terkumpul ?? 0) - tal.total;
        data.cell.styles.textColor = net < 0 ? [185, 28, 28] : [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Ringkasan ─────────────────────────────────────────────
  const afterY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const sumX = W - M - 75; const sumW = 75;

  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3);
  doc.roundedRect(sumX, afterY, sumW, 42, 2, 2, 'S');

  const sumLines: [string, string, [number, number, number]?][] = [
    ['Total Kas Terkumpul',   rp(stats.totalKasTerkumpul)],
    ['Total Talangan Belum Lunas', `-${rp(stats.totalTalanganBelum)}`, [185, 28, 28]],
    ['Total Setor ke Kas RT', `-${rp(stats.totalSetor)}`, [120, 53, 15]],
  ];
  sumLines.forEach(([label, value, color], i) => {
    const y = afterY + 9 + i * 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text(label, sumX + 4, y);
    doc.setTextColor(...(color ?? [31, 41, 55] as [number, number, number]));
    doc.text(value, sumX + sumW - 4, y, { align: 'right' });
  });
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(sumX, afterY + 31, sumW, 11, 1, 1, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('Saldo Bersih Kas', sumX + 4, afterY + 38.5);
  const saldoText = (stats.saldoAktif < 0 ? '-' : '') + rp(Math.abs(stats.saldoAktif));
  doc.text(saldoText, sumX + sumW - 4, afterY + 38.5, { align: 'right' });

  // ── TTD ───────────────────────────────────────────────────
  const sigY = afterY + 57;
  [{ role: 'Ketua RT 004/006', name: "Saman Ma'arif" },
   { role: 'Sekretaris', name: 'M. Aryanto' },
   { role: 'Bendahara', name: 'Irwansyah' }].forEach((p, i) => {
    const cx = M + ((W - 2 * M) / 3) * i + (W - 2 * M) / 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text(p.role, cx, sigY, { align: 'center' });
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4);
    doc.line(cx - 28, sigY + 16, cx + 28, sigY + 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(17, 24, 39);
    doc.text(p.name, cx, sigY + 22, { align: 'center' });
  });

  // ── Footer ────────────────────────────────────────────────
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(156, 163, 175);
  doc.text(`Dicetak: ${tanggalCetak} · Hadiran RT Digital System`, W / 2, H - 8, { align: 'center' });

  doc.save(`Laporan-Kas-Hadiran-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
}
