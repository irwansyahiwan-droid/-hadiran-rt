import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_DATA_URL } from './logoBase64';
import { outputPdf } from './pdfOut';
import type { Tarikan, Warga } from './types';

function rp(n: number) { return `Rp${n.toLocaleString('id-ID')}`; }
const DASH = '—';

export function generatePendapatanPDF(
  tarikan: Tarikan,
  wargaList: Warga[],
  absensiMap: Record<string, 'hadir' | 'tidak_hadir'>,
  talanganLunasSet: Set<string>,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  const nStr = String(tarikan.nomor).padStart(3, '0');
  const docCode = `PDP-${nStr}-${now.getFullYear()}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Derived stats ─────────────────────────────────────────
  const sohibulId = tarikan.sohibul_bait_id ?? '';
  const hadirList  = wargaList.filter(w => w.id !== sohibulId && absensiMap[w.id] === 'hadir');
  const lunaslist  = wargaList.filter(w => w.id !== sohibulId && absensiMap[w.id] === 'tidak_hadir' && talanganLunasSet.has(w.id));
  const talanganList = wargaList.filter(w => w.id !== sohibulId && absensiMap[w.id] === 'tidak_hadir' && !talanganLunasSet.has(w.id));
  const sohibul    = wargaList.find(w => w.id === sohibulId);

  // Per pembayar: Rp45.000 → Sohibul, Rp5.000 → Kas (total Rp50.000)
  const SOHIBUL_PER = 45000, KAS_PER = 5000, TOTAL_PER = 50000;
  // Pembayar = SEMUA anggota kecuali Sohibul Bait (termasuk yang talangan belum lunas)
  const payingCount      = wargaList.filter(w => w.id !== sohibulId).length; // mis. 68
  const pendapatanKotor  = payingCount * SOHIBUL_PER;   // 3.060.000
  const potonganAdmin    = 60000;                       // ke kantong penulis, bukan kas
  const pendapatanBersih = pendapatanKotor - potonganAdmin; // 3.000.000
  const kasHadiran       = tarikan.total_terkumpul ?? 0;    // 340.000 (sinkron alur kas)

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
  doc.text(`Rincian Pendapatan Tarikan ke-${tarikan.nomor}`, M, 47);
  const tglTarikan = new Date(tarikan.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
  doc.text(`${tglTarikan} · Sohibul Bait: ${tarikan.sohibul_bait?.nama ?? '—'}`, M, 53);

  // ── 3 Stat cards ─────────────────────────────────────────
  const cardY = 59; const cardH = 22; const gap = 4;
  const cardW = (W - 2 * M - gap * 2) / 3;
  const cards: [string, string, [number, number, number]][] = [
    ['TOTAL ANGGOTA',      String(wargaList.length),    [6, 78, 59]],
    ['PENDAPATAN KOTOR SB', rp(pendapatanKotor), [5, 150, 105]],
    ['KAS HADIRAN',        rp(kasHadiran),       [120, 53, 15]],
  ];
  cards.forEach(([label, value, fill], i) => {
    const x = M + i * (cardW + gap);
    doc.setFillColor(...fill); doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 240, 220);
    doc.text(label, x + 4, cardY + 7);
    doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
    doc.text(value, x + 4, cardY + 16);
  });

  // ── Table rows ────────────────────────────────────────────
  type Row = [string, string, string, string, string, string];
  const tableRows: Row[] = [];

  // Row 1: Sohibul Bait
  if (sohibul) {
    tableRows.push(['1', sohibul.nama, 'SOHIBUL BAIT', DASH, DASH, DASH]);
  }

  let rowNum = sohibul ? 2 : 1;

  // Hadir (membayar langsung)
  hadirList.sort((a, b) => a.nama.localeCompare(b.nama)).forEach(w => {
    tableRows.push([String(rowNum++), w.nama, '', rp(SOHIBUL_PER), rp(KAS_PER), rp(TOTAL_PER)]);
  });
  // Tidak hadir tapi talangan SUDAH lunas — di bawah, tetap dihitung
  lunaslist.sort((a, b) => a.nama.localeCompare(b.nama)).forEach(w => {
    tableRows.push([String(rowNum++), w.nama, '✓ Lunas', rp(SOHIBUL_PER), rp(KAS_PER), rp(TOTAL_PER)]);
  });
  // Tidak hadir, talangan BELUM lunas — paling bawah, tetap dihitung
  talanganList.sort((a, b) => a.nama.localeCompare(b.nama)).forEach(w => {
    tableRows.push([String(rowNum++), w.nama, 'Talangan', rp(SOHIBUL_PER), rp(KAS_PER), rp(TOTAL_PER)]);
  });

  autoTable(doc, {
    startY: cardY + cardH + 6,
    head: [['NO', 'NAMA ANGGOTA', 'STATUS', 'SOHIBUL BAIT', 'KAS', 'TOTAL']],
    body: tableRows,
    margin: { left: M, right: M },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const status = tableRows[data.row.index]?.[2] ?? '';

      // Row 0 (Sohibul Bait) — highlighted
      if (data.row.index === 0 && sohibul) {
        data.cell.styles.fillColor = [236, 253, 245];
        if (data.column.index === 2) {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // STATUS badge colors
      if (data.column.index === 2) {
        if (status === '✓ Lunas') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'Talangan') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Zero amounts for talangan row
      if (status === 'Talangan' && data.column.index >= 3) {
        data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  // ── Footer: Rincian Pendapatan Sohibul Bait ───────────────
  const afterY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const footW = 85; const footX = W - M - footW;

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3);
  doc.roundedRect(footX, afterY, footW, 42, 2, 2, 'FD');

  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
  doc.text('Rincian Pendapatan Sohibul Bait', footX + 4, afterY + 8);

  const footLines: [string, string, [number, number, number]?][] = [
    ['Pendapatan Kotor', rp(pendapatanKotor), [5, 150, 105]],
    ['Potongan Admin',   `-${rp(potonganAdmin)}`, [185, 28, 28]],
  ];
  footLines.forEach(([label, value, color], i) => {
    const y = afterY + 17 + i * 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text(label, footX + 4, y);
    doc.setTextColor(...(color ?? [31, 41, 55] as [number, number, number]));
    doc.text(value, footX + footW - 4, y, { align: 'right' });
  });

  // Pendapatan Bersih highlight
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(footX, afterY + 31, footW, 11, 1, 1, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('Pendapatan Bersih', footX + 4, afterY + 38.5);
  doc.text(rp(pendapatanBersih), footX + footW - 4, afterY + 38.5, { align: 'right' });

  // ── TTD ───────────────────────────────────────────────────
  const sigY = afterY + 56;
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

  return outputPdf(doc, `Rincian-Pendapatan-Tarikan-${tarikan.nomor}-${now.getFullYear()}.pdf`);
}
