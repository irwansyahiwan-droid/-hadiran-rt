import jsPDF from 'jspdf';
import { LOGO_DATA_URL } from './logoBase64';
import { outputPdf } from './pdfOut';
import type { RekapTriwulan } from './laporan';

function rp(n: number) {
  const s = `Rp${Math.abs(n).toLocaleString('id-ID')}`;
  return n < 0 ? `-${s}` : s;
}

/**
 * Laporan keuangan tutup buku satu triwulan → unduh PDF.
 * Format struk sempit (lebar 80mm) yang ramah dibaca di layar HP: satu kolom,
 * teks besar, tinggi halaman menyesuaikan isi sehingga tidak ada yang terpotong.
 */
export function generateLaporanTriwulanPDF(r: RekapTriwulan) {
  const W = 80;            // lebar halaman (mm) — selebar layar HP
  const M = 6;             // margin
  const IW = W - 2 * M;    // lebar konten
  const ROW = 6.5;         // tinggi baris data
  const BAR = 7;           // tinggi bar judul seksi
  const SEC_GAP = 4;       // jarak antar seksi

  const hadiranNet = r.hadiranMasuk - r.hadiranKeluar;
  const rtNet = r.rtMasuk - r.rtKeluar;

  type Baris = { label: string; nilai: string; saldo?: boolean };
  const seksi: { judul: string; rows: Baris[] }[] = [
    {
      judul: 'KAS HADIRAN',
      rows: [
        { label: 'Pemasukan', nilai: rp(r.hadiranMasuk) },
        { label: 'Pengeluaran', nilai: `-${rp(r.hadiranKeluar)}` },
        { label: 'Selisih triwulan', nilai: rp(hadiranNet) },
        { label: 'Saldo akhir', nilai: rp(r.hadiranSaldoAkhir), saldo: true },
      ],
    },
    {
      judul: 'KAS RT',
      rows: [
        { label: 'Pemasukan', nilai: rp(r.rtMasuk) },
        { label: 'Pengeluaran', nilai: `-${rp(r.rtKeluar)}` },
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
  const TTD = [
    { role: 'Ketua RT 004/006', name: "Saman Ma'arif" },
    { role: 'Sekretaris', name: 'M. Aryanto' },
    { role: 'Bendahara', name: 'Irwansyah' },
  ];
  const TTD_ENTRY = 18;
  let H = 26;                 // header
  H += 22;                    // blok judul
  for (const s of seksi) H += BAR + 2 + s.rows.length * ROW + SEC_GAP;
  H += 4;                     // jarak sebelum TTD
  H += TTD.length * TTD_ENTRY;
  H += 12;                    // footer
  H = Math.ceil(H);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, H] });
  const now = new Date();
  const docCode = `LK-TW${r.triwulan}-${r.tahun}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, W, 26, 'F');
  doc.addImage(LOGO_DATA_URL, 'JPEG', M, 5, 13, 13);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('RT 004 / RW 006', M + 16, 11);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(167, 243, 208);
  doc.text('Tanah Baru · Beji · Depok', M + 16, 16);
  doc.text('Sistem Hadiran Digital', M + 16, 20);

  // ── Judul ─────────────────────────────────────────────────
  let y = 34;
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
  doc.text('Laporan Keuangan', M, y);
  y += 6;
  doc.setFontSize(11); doc.setTextColor(6, 78, 59);
  doc.text(r.label, M, y);
  y += 5;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
  doc.text(`Periode ${r.rentang} · ${docCode}`, M, y);
  y += 5;
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 4;

  // ── Seksi ─────────────────────────────────────────────────
  for (const s of seksi) {
    // bar judul
    doc.setFillColor(6, 78, 59);
    doc.roundedRect(M, y, IW, BAR, 1, 1, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text(s.judul, M + 2.5, y + 4.8);
    y += BAR + 2;

    s.rows.forEach((b) => {
      if (b.saldo) {
        doc.setFillColor(236, 253, 245);
        doc.rect(M, y - 4.2, IW, ROW, 'F');
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', b.saldo ? 'bold' : 'normal');
      doc.setTextColor(b.saldo ? 5 : 75, b.saldo ? 150 : 85, b.saldo ? 105 : 99);
      doc.text(b.label, M + 1, y);
      doc.setTextColor(b.saldo ? 5 : 17, b.saldo ? 150 : 24, b.saldo ? 105 : 39);
      doc.text(b.nilai, W - M - 1, y, { align: 'right' });
      y += ROW;
    });
    y += SEC_GAP;
  }

  // ── TTD (ditumpuk, pas untuk lebar sempit) ────────────────
  y += 2;
  TTD.forEach((p) => {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
    doc.text(p.role, M + 1, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(17, 24, 39);
    doc.text(`( ${p.name} )`, W - M - 1, y, { align: 'right' });
    doc.setDrawColor(210, 213, 219); doc.setLineWidth(0.3);
    doc.line(M + 1, y + 3.5, W - M - 1, y + 3.5);
    y += TTD_ENTRY;
  });

  // ── Footer ────────────────────────────────────────────────
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(156, 163, 175);
  doc.text(`Dicetak ${tanggalCetak}`, W / 2, H - 5, { align: 'center' });

  return outputPdf(doc, `Laporan-Keuangan-TW${r.triwulan}-${r.tahun}.pdf`);
}
