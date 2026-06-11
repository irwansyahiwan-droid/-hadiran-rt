import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import {
  TABLE, drawMasthead, drawStatStrip, drawSummary, drawSignatures, drawFooter, C, fmtNum,
} from './pdfTheme';
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

  const tglTarikan = new Date(tarikan.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let Y = drawMasthead(doc, {
    W, M, docCode, tanggalCetak,
    title: `Rincian Pendapatan Tarikan ke-${tarikan.nomor}`,
    subtitle: `${tglTarikan} · Sohibul Bait: ${tarikan.sohibul_bait?.nama ?? '—'}`,
  });

  Y = drawStatStrip(doc, Y, [
    { label: 'Total Anggota',       value: String(wargaList.length) },
    { label: 'Pendapatan Kotor SB', value: rp(pendapatanKotor), tone: 'pos' },
    { label: 'Kas Hadiran',         value: rp(kasHadiran), tone: 'warn' },
  ], W, M);

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
    tableRows.push([String(rowNum++), w.nama, '', fmtNum(SOHIBUL_PER), fmtNum(KAS_PER), fmtNum(TOTAL_PER)]);
  });
  // Tidak hadir tapi talangan SUDAH lunas — di bawah, tetap dihitung
  // (teks polos tanpa "✓": glyph itu tidak ada di Helvetica jsPDF → kotak rusak)
  lunaslist.sort((a, b) => a.nama.localeCompare(b.nama)).forEach(w => {
    tableRows.push([String(rowNum++), w.nama, 'Lunas', fmtNum(SOHIBUL_PER), fmtNum(KAS_PER), fmtNum(TOTAL_PER)]);
  });
  // Tidak hadir, talangan BELUM lunas — paling bawah, tetap dihitung
  talanganList.sort((a, b) => a.nama.localeCompare(b.nama)).forEach(w => {
    tableRows.push([String(rowNum++), w.nama, 'Talangan', fmtNum(SOHIBUL_PER), fmtNum(KAS_PER), fmtNum(TOTAL_PER)]);
  });

  // Baris TOTAL (foot) — jumlah seluruh pembayar; selalu di bawah semua nama.
  const totalSohibul = payingCount * SOHIBUL_PER;
  const totalKas     = payingCount * KAS_PER;
  const totalSemua   = payingCount * TOTAL_PER;

  autoTable(doc, {
    ...TABLE,
    startY: Y + 7,
    head: [['NO', 'NAMA ANGGOTA', 'STATUS', 'SOHIBUL BAIT (Rp)', 'KAS (Rp)', 'TOTAL (Rp)']],
    body: tableRows,
    foot: [['', `TOTAL · ${payingCount} pembayar`, '', rp(totalSohibul), rp(totalKas), rp(totalSemua)]],
    showFoot: 'lastPage',
    margin: { left: M, right: M },
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

      // Row 0 (Sohibul Bait) — ditebalkan, tanpa blok fill
      if (data.row.index === 0 && sohibul) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 2) data.cell.styles.textColor = C.pos;
      }
      // STATUS badge colors
      if (data.column.index === 2) {
        if (status === 'Lunas') {
          data.cell.styles.textColor = C.pos;
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'Talangan') {
          data.cell.styles.textColor = C.neg;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Nominal baris talangan ikut merah (belum disetor tunai)
      if (status === 'Talangan' && data.column.index >= 3) {
        data.cell.styles.textColor = C.neg;
      }
    },
  });

  // ── Rincian pendapatan Sohibul Bait (gaya tutup buku) ─────
  const afterY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
  doc.setTextColor(C.faint[0], C.faint[1], C.faint[2]);
  doc.text('RINCIAN PENDAPATAN SOHIBUL BAIT', W - M, afterY + 1, { align: 'right', charSpace: 0.4 });

  const sumY = drawSummary(doc, afterY + 2, [
    { label: 'Pendapatan Kotor', value: rp(pendapatanKotor), tone: 'pos' },
    { label: 'Potongan Admin',   value: `-${rp(potonganAdmin)}`, tone: 'neg' },
  ], { label: 'Pendapatan Bersih', value: rp(pendapatanBersih) }, W, M);

  drawSignatures(doc, sumY + 14, W, M);

  const H = doc.internal.pageSize.getHeight();
  drawFooter(doc, W, H, tanggalCetak);

  return outputPdf(doc, `Rincian-Pendapatan-Tarikan-${tarikan.nomor}-${now.getFullYear()}.pdf`);
}
