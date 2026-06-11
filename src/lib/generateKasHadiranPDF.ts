import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import {
  TABLE, drawMasthead, drawStatStrip, drawSummary, drawSignatures, drawFooter, C, fmtNum,
} from './pdfTheme';
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
  setorMap: Record<string, number>,
  stats: Stats,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  const docCode = `KAS-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let Y = drawMasthead(doc, {
    W, M, docCode, tanggalCetak,
    title: 'Laporan Alur Kas Hadiran',
    subtitle: 'Rekapitulasi kas masuk, talangan, dan saldo RT 004/006 Tanah Baru, Beji, Kota Depok',
  });

  Y = drawStatStrip(doc, Y, [
    { label: 'Kas Hadiran Terkumpul', value: rp(stats.totalKasTerkumpul) },
    { label: 'Talangan Belum Lunas',  value: `-${rp(stats.totalTalanganBelum)}`, tone: 'neg' },
    { label: 'Saldo Bersih Kas',      value: rp(stats.saldoAktif), tone: stats.saldoAktif < 0 ? 'neg' : 'ink' },
  ], W, M);

  // ── Tabel per tarikan ─────────────────────────────────────
  const sorted = [...tarikanList].sort((a, b) => a.nomor - b.nomor);

  const totalKas  = sorted.reduce((s, t) => s + (t.total_terkumpul ?? 0), 0);
  const totalTal  = Object.values(talanganMap).reduce((s, v) => s + v.total, 0);
  const totalSetor = Object.values(setorMap).reduce((s, v) => s + v, 0);
  const totalNet  = totalKas - totalTal - totalSetor;

  const rows = sorted.map((t, i) => {
    const tal = talanganMap[t.id] ?? { count: 0, total: 0 };
    const kasIn = t.total_terkumpul ?? 0;
    const setor = setorMap[t.id] ?? 0;
    const net   = kasIn - tal.total - setor;
    return [
      String(i + 1),
      `#${t.nomor} · ${new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      t.sohibul_bait?.nama ?? '—',
      `${t.total_hadir}/${t.total_warga}`,
      fmtNum(kasIn),
      tal.total > 0 ? `-${fmtNum(tal.total)}` : '0',
      setor > 0 ? `-${fmtNum(setor)}` : '0',
      net < 0 ? `-${fmtNum(Math.abs(net))}` : fmtNum(net),
    ];
  });

  autoTable(doc, {
    ...TABLE,
    startY: Y + 7,
    head: [['NO', 'TARIKAN', 'SOHIBUL BAIT', 'HADIR', 'KAS MASUK (Rp)', 'TALANGAN (Rp)', 'SETOR (Rp)', 'NET KAS (Rp)']],
    body: rows,
    foot: [[
      '', 'TOTAL', '', '',
      fmtNum(totalKas),
      totalTal > 0 ? `-${fmtNum(totalTal)}` : '0',
      totalSetor > 0 ? `-${fmtNum(totalSetor)}` : '0',
      totalNet < 0 ? `-${fmtNum(Math.abs(totalNet))}` : fmtNum(totalNet),
    ]],
    showFoot: 'lastPage',
    margin: { left: M, right: M },
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
      if (data.section === 'foot') {
        if (data.column.index === 5 && totalTal > 0) data.cell.styles.textColor = C.neg;
        if (data.column.index === 6 && totalSetor > 0) data.cell.styles.textColor = C.warn;
        if (data.column.index === 7) {
          data.cell.styles.textColor = totalNet < 0 ? C.neg : C.pos;
          data.cell.styles.fontSize = 8;
        }
        return;
      }
      if (data.section !== 'body') return;
      const row = sorted[data.row.index];
      if (!row) return;
      const tal = talanganMap[row.id] ?? { count: 0, total: 0 };
      const setor = setorMap[row.id] ?? 0;
      if (data.column.index === 5 && tal.total > 0) {
        data.cell.styles.textColor = C.neg;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 6 && setor > 0) {
        data.cell.styles.textColor = C.warn;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 7) {
        const net = (row.total_terkumpul ?? 0) - tal.total - setor;
        data.cell.styles.textColor = net < 0 ? C.neg : C.pos;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Ringkasan tutup buku ──────────────────────────────────
  const afterY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const saldoText = (stats.saldoAktif < 0 ? '-' : '') + rp(Math.abs(stats.saldoAktif));

  const sumY = drawSummary(doc, afterY + 6, [
    { label: 'Total Kas Terkumpul',        value: rp(stats.totalKasTerkumpul) },
    { label: 'Total Talangan Belum Lunas', value: `-${rp(stats.totalTalanganBelum)}`, tone: 'neg' },
    { label: 'Total Setor ke Kas RT',      value: `-${rp(stats.totalSetor)}`, tone: 'warn' },
  ], { label: 'Saldo Bersih Kas', value: saldoText, tone: stats.saldoAktif < 0 ? 'neg' : 'ink' }, W, M);

  drawSignatures(doc, sumY + 14, W, M);

  const H = doc.internal.pageSize.getHeight();
  drawFooter(doc, W, H, tanggalCetak);

  return outputPdf(doc, `Laporan-Kas-Hadiran-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
}
