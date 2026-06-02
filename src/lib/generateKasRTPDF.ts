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

function rp(n: number) { return `Rp${n.toLocaleString('id-ID')}`; }

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

type DocWithTable = { lastAutoTable: { finalY: number } };
function getY(doc: jsPDF): number {
  return (doc as unknown as DocWithTable).lastAutoTable.finalY;
}

const COL = {
  0: { cellWidth: 8,    halign: 'center' as const },
  1: { cellWidth: 22 },
  2: { cellWidth: 'auto' as const },
  3: { cellWidth: 30,   halign: 'right' as const },
  4: { cellWidth: 30,   halign: 'right' as const },
};
const HEAD = ['NO', 'TANGGAL', 'KETERANGAN', 'JUMLAH', 'SALDO'];

export function generateKasRTPDF(list: KasRT[], stats: KasRTStats) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  const docCode  = `KASRT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Header bar ────────────────────────────────────────────────
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

  // ── Title ─────────────────────────────────────────────────────
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
  doc.text('Laporan Kas Besar RT 004/006', M, 47);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
  doc.text('Rekapitulasi kas masuk dan keluar RT 004/006 Tanah Baru, Beji, Kota Depok', M, 53);

  // ── 3 Stat cards ──────────────────────────────────────────────
  const cardY = 59; const cardH = 22; const gap = 4;
  const cardW = (W - 2 * M - gap * 2) / 3;
  const cards: [string, string, [number,number,number]][] = [
    ['SALDO BERSIH KAS', rp(stats.saldo),          [6, 95, 70]],
    ['TOTAL MASUK',      `+${rp(stats.totalMasuk)}`, [16, 185, 129]],
    ['TOTAL KELUAR',     `-${rp(stats.totalKeluar)}`, [185, 28, 28]],
  ];
  cards.forEach(([label, value, fill], i) => {
    const x = M + i * (cardW + gap);
    doc.setFillColor(...fill); doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(210, 240, 230);
    doc.text(label, x + 4, cardY + 7);
    doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
    doc.text(value, x + 4, cardY + 16);
  });

  // ── Prepare sections ──────────────────────────────────────────
  const sorted = [...list].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  const saldoAwalList = sorted.filter(k => k.keterangan === 'Saldo Awal Kas RT');
  const masukList     = sorted.filter(k => k.tipe === 'masuk' && k.keterangan !== 'Saldo Awal Kas RT');
  const keluarList    = sorted.filter(k => k.tipe === 'keluar');

  // Draw section banner (color: hijau gelap default, atau custom)
  type RGB = [number, number, number];
  const banner = (y: number, label: string, extra?: string, fill: RGB = [6, 78, 59]): number => {
    doc.setFillColor(...fill);
    doc.rect(M, y, W - 2 * M, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
    doc.text(label, M + 4, y + 5.5);
    if (extra) doc.text(extra, W - M - 4, y + 5.5, { align: 'right' });
    return y + 8;
  };

  const headGreen: object = { fillColor: [5, 95, 60],  textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 };
  const headRed:   object = { fillColor: [153, 27, 27], textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 };

  // ── BAGIAN 1: SALDO AWAL ──────────────────────────────────────
  let Y = banner(cardY + cardH + 6, 'SALDO AWAL');

  autoTable(doc, {
    startY: Y,
    head: [HEAD],
    body: saldoAwalList.map((k, i) => [
      String(i + 1), fmtDate(k.tanggal), k.keterangan, rp(k.nominal), rp(k.saldo_setelah),
    ]),
    margin: { left: M, right: M },
    headStyles: headGreen,
    bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55] },
    columnStyles: COL,
  });
  Y = getY(doc) + 5;

  // ── BAGIAN 2: PEMASUKAN (hijau) ───────────────────────────────
  Y = banner(Y, 'PEMASUKAN', `+${rp(stats.totalMasuk)}`);

  autoTable(doc, {
    startY: Y,
    head: [HEAD],
    body: masukList.map((k, i) => [
      String(i + 1), fmtDate(k.tanggal), k.keterangan, `+${rp(k.nominal)}`, rp(k.saldo_setelah),
    ]),
    margin: { left: M, right: M },
    headStyles: headGreen,
    bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: COL,
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.textColor = [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  Y = getY(doc) + 5;

  // ── BAGIAN 3: PENGELUARAN (merah) ─────────────────────────────
  Y = banner(Y, 'PENGELUARAN', `-${rp(stats.totalKeluar)}`, [153, 27, 27]);

  autoTable(doc, {
    startY: Y,
    head: [HEAD],
    body: keluarList.map((k, i) => [
      String(i + 1), fmtDate(k.tanggal), k.keterangan, `-${rp(k.nominal)}`, rp(k.saldo_setelah),
    ]),
    margin: { left: M, right: M },
    headStyles: headRed,
    bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: COL,
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  Y = getY(doc) + 8;

  // ── BAGIAN 4: RINGKASAN ───────────────────────────────────────
  const sumX = W - M - 75; const sumW = 75;
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3);
  doc.roundedRect(sumX, Y, sumW, 42, 2, 2, 'S');

  const sumLines: [string, string, [number,number,number]?][] = [
    ['Saldo Awal',        rp(stats.saldoAwal)],
    ['Total Pemasukan',   `+${rp(stats.totalMasuk)}`,  [5, 150, 105]],
    ['Total Pengeluaran', `-${rp(stats.totalKeluar)}`, [185, 28, 28]],
  ];
  sumLines.forEach(([label, value, color], i) => {
    const ly = Y + 9 + i * 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text(label, sumX + 4, ly);
    doc.setTextColor(...(color ?? [31, 41, 55] as [number,number,number]));
    doc.text(value, sumX + sumW - 4, ly, { align: 'right' });
  });

  doc.setFillColor(6, 78, 59);
  doc.roundedRect(sumX, Y + 31, sumW, 11, 1, 1, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('Saldo Bersih', sumX + 4, Y + 38.5);
  doc.text(rp(stats.saldo), sumX + sumW - 4, Y + 38.5, { align: 'right' });

  // ── TTD ───────────────────────────────────────────────────────
  const sigY = Y + 55;
  const colW = (W - 2 * M) / 3;
  [
    { role: 'Ketua RT 004/006', name: "Saman Ma'arif" },
    { role: 'Sekretaris',       name: 'M. Aryanto' },
    { role: 'Bendahara',        name: 'Irwansyah' },
  ].forEach((p, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text(p.role, cx, sigY, { align: 'center' });
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4);
    doc.line(cx - 28, sigY + 16, cx + 28, sigY + 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(17, 24, 39);
    doc.text(p.name, cx, sigY + 22, { align: 'center' });
  });

  // ── Footer ────────────────────────────────────────────────────
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(156, 163, 175);
  doc.text(`Dicetak: ${tanggalCetak} · Hadiran RT Digital System`, W / 2, H - 8, { align: 'center' });

  doc.save(`Laporan-Kas-RT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
}
