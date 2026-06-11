import jsPDF from 'jspdf';
import { outputPdf } from './pdfOut';
import { C, SIGNERS } from './pdfTheme';
import type { RekapTriwulan } from './laporan';

function rp(n: number) {
  const s = `Rp${Math.abs(n).toLocaleString('id-ID')}`;
  return n < 0 ? `-${s}` : s;
}

/**
 * Laporan keuangan tutup buku satu triwulan → unduh PDF.
 * Format struk sempit (lebar 80mm) yang ramah dibaca di layar HP: satu kolom,
 * teks besar, tinggi halaman menyesuaikan isi sehingga tidak ada yang terpotong.
 * Gaya minimalis tanpa header bar — selaras pdfTheme.
 */
export function generateLaporanTriwulanPDF(r: RekapTriwulan) {
  const W = 80;            // lebar halaman (mm) — selebar layar HP
  const M = 6;             // margin
  const ROW = 6.5;         // tinggi baris data
  const LBL = 7;           // tinggi label seksi (teks + hairline)
  const SEC_GAP = 5;       // jarak antar seksi
  const MAST = 38;         // tinggi masthead (wordmark + judul + meta + hairline)

  const hadiranNet = r.hadiranMasuk - r.hadiranKeluar;
  const rtNet = r.rtMasuk - r.rtKeluar;

  type Baris = { label: string; nilai: string; tone?: keyof typeof C; saldo?: boolean };
  const seksi: { judul: string; rows: Baris[] }[] = [
    {
      judul: 'KAS HADIRAN',
      rows: [
        { label: 'Pemasukan', nilai: rp(r.hadiranMasuk), tone: 'pos' },
        { label: 'Pengeluaran', nilai: `-${rp(r.hadiranKeluar)}`, tone: 'neg' },
        { label: 'Selisih triwulan', nilai: rp(hadiranNet) },
        { label: 'Saldo akhir', nilai: rp(r.hadiranSaldoAkhir), saldo: true },
      ],
    },
    {
      judul: 'KAS RT',
      rows: [
        { label: 'Pemasukan', nilai: rp(r.rtMasuk), tone: 'pos' },
        { label: 'Pengeluaran', nilai: `-${rp(r.rtKeluar)}`, tone: 'neg' },
        { label: 'Selisih triwulan', nilai: rp(rtNet) },
        { label: 'Saldo akhir', nilai: rp(r.rtSaldoAkhir), saldo: true },
      ],
    },
    {
      judul: 'AKTIVITAS',
      rows: [
        { label: 'Tarikan selesai', nilai: `${r.tarikanSelesai}` },
        { label: 'Talangan lunas', nilai: `${r.talanganLunas}` },
        { label: 'Jumlah transaksi', nilai: `${r.jumlahTransaksi}` },
      ],
    },
  ];

  // ── Hitung tinggi halaman lebih dulu agar tidak ada ruang kosong / terpotong ──
  const TTD_ENTRY = 18;
  let H = MAST;
  for (const s of seksi) H += LBL + 2 + s.rows.length * ROW + SEC_GAP;
  H += 6;                     // jarak sebelum TTD
  H += SIGNERS.length * TTD_ENTRY;
  H += 10;                    // footer
  H = Math.ceil(H);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, H] });
  const now = new Date();
  const docCode = `LK-TW${r.triwulan}-${r.tahun}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const ink   = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const draw  = (c: readonly number[]) => doc.setDrawColor(c[0], c[1], c[2]);

  // ── Masthead tipografis (tanpa bar) ───────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); ink(C.brand);
  doc.text('HADIRAN RT', M, 10, { charSpace: 0.6 });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); ink(C.faint);
  doc.text('RT 004/006 · Tanah Baru · Beji, Depok', M, 14.5);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); ink(C.ink);
  doc.text('Laporan Keuangan', M, 23);
  doc.setFontSize(10.5); ink(C.brand);
  doc.text(r.label, M, 29);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); ink(C.faint);
  doc.text(`Periode ${r.rentang} · ${docCode}`, M, 34);

  draw(C.line); doc.setLineWidth(0.3);
  doc.line(M, MAST - 2, W - M, MAST - 2);

  let y = MAST + 3;

  // ── Seksi ─────────────────────────────────────────────────
  for (const s of seksi) {
    // label seksi ber-letterspace + hairline (pengganti bar hijau)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); ink(C.ink);
    doc.text(s.judul, M, y + 3, { charSpace: 0.8 });
    draw(C.line); doc.setLineWidth(0.3);
    doc.line(M, y + LBL - 2, W - M, y + LBL - 2);
    y += LBL + 2;

    s.rows.forEach((b) => {
      if (b.saldo) {
        // rule tegas di atas saldo akhir — gaya tutup buku, bukan blok fill
        draw(C.ink); doc.setLineWidth(0.3);
        doc.line(M, y - 4.4, W - M, y - 4.4);
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', b.saldo ? 'bold' : 'normal');
      ink(b.saldo ? C.ink : C.faint);
      doc.text(b.label, M + 0.5, y);
      ink(b.saldo ? C.ink : (b.tone ? C[b.tone] : C.sub));
      doc.text(b.nilai, W - M - 0.5, y, { align: 'right' });
      y += ROW;
    });
    y += SEC_GAP;
  }

  // ── TTD (ditumpuk, pas untuk lebar sempit) ────────────────
  y += 2;
  SIGNERS.forEach((p) => {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); ink(C.faint);
    doc.text(p.role, M + 0.5, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); ink(C.ink);
    doc.text(`( ${p.name} )`, W - M - 0.5, y, { align: 'right' });
    draw(C.line); doc.setLineWidth(0.3);
    doc.line(M + 0.5, y + 3.5, W - M - 0.5, y + 3.5);
    y += 18;
  });

  // ── Footer ────────────────────────────────────────────────
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); ink(C.muted);
  doc.text(`Dicetak ${tanggalCetak} · Hadiran RT Digital System`, W / 2, H - 5, { align: 'center' });

  return outputPdf(doc, `Laporan-Keuangan-TW${r.triwulan}-${r.tahun}.pdf`);
}
