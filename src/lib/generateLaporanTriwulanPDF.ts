import jsPDF from 'jspdf';
import { amankanPdf } from './pdfTeks';
import { outputPdf } from './pdfOut';
import { C, RAPAT, drawMasthead, sectionLabel, drawSignatures, drawFooter, signH, ensureSpace } from './pdfTheme';
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
/* Seam `build*` — pola yang sama dgn `generateKasRTPDF` & `generateKasHadiranPDF`
   (4 Sep 2026). Generator ini satu-satunya yang belum punya, jadi isinya tak
   bisa diuji tanpa mem-mock `outputPdf`. Murni ekstraksi: nol perubahan pada
   dokumen yang dihasilkan. */
/* A4 + kop bersama sejak 5 Sep 2026 — sebelumnya 80mm ("selebar layar HP")
   dgn masthead tipografisnya sendiri, tanpa lambang.
   Itu keputusan sadar pada zamannya, tapi biayanya baru terlihat waktu
   KESEMBILAN keluaran dijajarkan di lembar kontak wajah-luar:

   - 80×235mm BUKAN ukuran kertas. Enam laporan lain A4. Bendahara yang
     mencetaknya dapat halaman terskala dgn margin raksasa, atau penolakan
     printer — padahal INI satu-satunya dokumen triwulan yang bertanda tangan
     TIGA (Ketua, Sekretaris, Bendahara).
   - Ia satu-satunya dari tujuh yang TIDAK memakai `drawMasthead`, jadi
     satu-satunya yang beredar TANPA lambang & kop RT. Dokumen
     pertanggungjawaban yang paling formal justru yang paling anonim.

   Alasan asli "selebar layar HP" tetap dilayani, dan lebih baik, oleh jalur
   yang memang untuk itu: `shareLaporanKas()` menggambar kartu PNG untuk WA.
   Keduanya berdampingan di `LaporanTriwulan.tsx` — "Bagikan" memanggil kartu,
   "Cetak" memanggil berkas ini. Jadi 80mm di sini menduplikasi pekerjaan yang
   sudah dikerjakan lebih baik di sebelahnya, dgn ongkos pekerjaan yang cuma
   DIA yang punya: dicetak, ditandatangani, diarsipkan. */
export function buildLaporanTriwulanPDF(r: RekapTriwulan): { doc: jsPDF; filename: string } {
  const SK = RAPAT;
  const M = 14;            // margin — sama dgn enam laporan lain
  const ROW = 7;           // tinggi baris data
  const SEC_GAP = 7;       // jarak antar seksi

  // Kas Hadiran: "hasil akhir" yg dilaporkan = sudah/belum disetor SAJA.
  // Talangan Belum Lunas ikut ditampilkan (bendahara minta talangan tetap
  // terlihat di tutup buku) tapi INFORMASIONAL — bukan pengurang
  // "Selisih triwulan"/"Belum disetor". Lihat komentar `laporan.ts`.
  const hadiranNet = r.hadiranMasuk - r.hadiranSetor;
  const rtNet = r.rtMasuk - r.rtKeluar;

  type Baris = { label: string; nilai: string; tone?: keyof typeof C; saldo?: boolean; neg?: boolean };
  const seksi: { judul: string; rows: Baris[] }[] = [
    {
      judul: 'KAS HADIRAN',
      rows: [
        { label: 'Kas Terkumpul', nilai: rp(r.hadiranMasuk), tone: 'pos' },
        { label: 'Setor ke Kas RT', nilai: `-${rp(r.hadiranSetor)}` },
        { label: 'Selisih triwulan', nilai: rp(hadiranNet) },
        { label: 'Belum disetor', nilai: rp(r.hadiranBelumSetor), saldo: true, neg: r.hadiranBelumSetor < 0 },
        { label: 'Talangan belum lunas', nilai: `-${rp(r.hadiranTalangan)}`, tone: 'warn' },
      ],
    },
    {
      judul: 'KAS RT',
      rows: [
        // Saldo Awal (kas RT sebelum app ini mencatat) HANYA muncul di
        // triwulan yg benar-benar memilikinya (mis. Triwulan I 2026) — bukan
        // pengeluaran/pemasukan periode ini, jadi TIDAK ikut "Selisih triwulan".
        ...(r.rtSaldoAwal > 0 ? [{ label: 'Saldo Awal', nilai: rp(r.rtSaldoAwal) }] : []),
        { label: 'Pemasukan', nilai: rp(r.rtMasuk), tone: 'pos' as const },
        { label: 'Pengeluaran', nilai: `-${rp(r.rtKeluar)}`, tone: 'neg' as const },
        { label: 'Selisih triwulan', nilai: rp(rtNet) },
        { label: 'Saldo akhir', nilai: rp(r.rtSaldoAkhir), saldo: true, neg: r.rtSaldoAkhir < 0 },
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

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  amankanPdf(doc);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const now = new Date();
  const docCode = `LK-TW${r.triwulan}-${r.tahun}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const ink  = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const draw = (c: readonly number[]) => doc.setDrawColor(c[0], c[1], c[2]);

  /* SATU sumber untuk masthead — pola yang sama dgn enam laporan lain. */
  let y = drawMasthead(doc, {
    W, M, docCode, tanggalCetak,
    title: 'Laporan Keuangan',
    subtitle: `${r.label} · Periode ${r.rentang}`,
  }, SK);

  // ── Seksi ─────────────────────────────────────────────────
  for (const s of seksi) {
    y = sectionLabel(doc, y + 4, s.judul, W, M, undefined, SK);
    y += 3;
    s.rows.forEach((b) => {
      if (b.saldo) {
        // rule tegas di atas saldo akhir — gaya tutup buku, bukan blok fill
        draw(C.ink); doc.setLineWidth(0.35);
        doc.line(M, y - 4.6, W - M, y - 4.6);
      }
      doc.setFontSize(b.saldo ? SK.ringkasTotal : SK.ringkasBaris);
      doc.setFont('helvetica', b.saldo ? 'bold' : 'normal');
      ink(b.saldo ? C.ink : C.faint);
      doc.text(b.label, M, y);
      ink(b.saldo ? (b.neg ? C.neg : C.ink) : (b.tone ? C[b.tone] : C.sub));
      doc.text(b.nilai, W - M, y, { align: 'right' });
      y += ROW;
    });
    y += SEC_GAP;
  }

  // ── Tanda tangan — blok 3 kolom bersama, bukan tumpukan sempit ────────
  y = ensureSpace(doc, y + 4, signH(SK));
  drawSignatures(doc, y, W, M, { dateline: `Depok, ${tanggalCetak}`, sk: SK });

  drawFooter(doc, W, H, tanggalCetak, M, SK);

  return { doc, filename: `Laporan-Keuangan-TW${r.triwulan}-${r.tahun}.pdf` };
}

export function generateLaporanTriwulanPDF(r: RekapTriwulan) {
  const { doc, filename } = buildLaporanTriwulanPDF(r);
  return outputPdf(doc, filename);
}
