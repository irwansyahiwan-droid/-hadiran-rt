import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import {
  TABLE, drawMasthead, drawStatStrip, sectionLabel, drawSummary, drawSignatures, drawFooter, C, fmtNum, alignHeadFoot,
} from './pdfTheme';
import type { KasRT } from './types';
import { KATEGORI_MASUK, KATEGORI_KELUAR } from './kategoriKasRt';

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
const HEAD = ['NO', 'TANGGAL', 'KETERANGAN', 'JUMLAH (Rp)', 'SALDO (Rp)'];

export function generateKasRTPDF(list: KasRT[], stats: KasRTStats) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  const docCode  = `KASRT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let Y = drawMasthead(doc, {
    W, M, docCode, tanggalCetak,
    title: 'Laporan Kas Besar RT 004/006',
    subtitle: 'Rekapitulasi kas masuk dan keluar RT 004/006 Tanah Baru, Beji, Kota Depok',
  });

  Y = drawStatStrip(doc, Y, [
    { label: 'Saldo Bersih Kas', value: rp(stats.saldo) },
    { label: 'Total Masuk',      value: `+${rp(stats.totalMasuk)}`,  tone: 'pos' },
    { label: 'Total Keluar',     value: `-${rp(stats.totalKeluar)}`, tone: 'neg' },
  ], W, M);

  // ── Bagian per jenis transaksi ────────────────────────────────
  const sorted = [...list].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  const saldoAwalList = sorted.filter(k => k.keterangan === 'Saldo Awal Kas RT');
  const masukList     = sorted.filter(k => k.tipe === 'masuk' && k.keterangan !== 'Saldo Awal Kas RT');
  const keluarList    = sorted.filter(k => k.tipe === 'keluar');

  Y = sectionLabel(doc, Y + 7, 'Saldo Awal', W, M);
  autoTable(doc, {
    ...TABLE,
    startY: Y,
    head: [HEAD],
    body: saldoAwalList.map((k, i) => [
      String(i + 1), fmtDate(k.tanggal), k.keterangan, fmtNum(k.nominal), fmtNum(k.saldo_setelah),
    ]),
    margin: { left: M, right: M },
    columnStyles: COL,
    didParseCell: (data) => alignHeadFoot(data, COL),
  });
  Y = getY(doc);

  // Satu sub-bagian per kategori (label "PENERIMAAN/PENGELUARAN — <kategori>" +
  // subtotal + tabel) → laporan berkelompok untuk pertanggungjawaban.
  const renderKategori = (
    startY: number, prefix: string, label: string, rows: KasRT[],
    tone: 'pos' | 'neg', sign: '+' | '-',
  ): number => {
    if (rows.length === 0) return startY;
    const sub = rows.reduce((s, k) => s + k.nominal, 0);
    const y = sectionLabel(doc, startY + 6, `${prefix} — ${label}`, W, M, { text: `${sign}${rp(sub)}`, tone });
    autoTable(doc, {
      ...TABLE,
      startY: y,
      head: [HEAD],
      body: rows.map((k, i) => [
        String(i + 1), fmtDate(k.tanggal), k.keterangan, `${sign}${fmtNum(k.nominal)}`, fmtNum(k.saldo_setelah),
      ]),
      margin: { left: M, right: M },
      columnStyles: COL,
      didParseCell(data) {
        alignHeadFoot(data, COL);
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.styles.textColor = tone === 'pos' ? C.pos : C.neg;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    return getY(doc);
  };

  for (const kat of KATEGORI_MASUK) {
    Y = renderKategori(Y, 'PENERIMAAN', kat.label, masukList.filter((k) => (k.kategori ?? 'lainnya') === kat.key), 'pos', '+');
  }
  for (const kat of KATEGORI_KELUAR) {
    Y = renderKategori(Y, 'PENGELUARAN', kat.label, keluarList.filter((k) => (k.kategori ?? 'lainnya') === kat.key), 'neg', '-');
  }

  // ── Ringkasan tutup buku ──────────────────────────────────────
  Y = drawSummary(doc, Y + 6, [
    { label: 'Saldo Awal',        value: rp(stats.saldoAwal) },
    { label: 'Total Pemasukan',   value: `+${rp(stats.totalMasuk)}`,  tone: 'pos' },
    { label: 'Total Pengeluaran', value: `-${rp(stats.totalKeluar)}`, tone: 'neg' },
  ], { label: 'Saldo Bersih', value: rp(stats.saldo) }, W, M);

  drawSignatures(doc, Y + 14, W, M);

  const H = doc.internal.pageSize.getHeight();
  drawFooter(doc, W, H, tanggalCetak);

  return outputPdf(doc, `Laporan-Kas-RT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
}
