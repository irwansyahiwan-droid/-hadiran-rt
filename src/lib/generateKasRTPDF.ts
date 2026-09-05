import jsPDF from 'jspdf';
import { amankanPdf } from './pdfTeks';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import {
  tabelSkala, drawMasthead, sectionLabel, drawSummary, drawSignatures, drawFooter, ensureSpace, seksiMinH, C, fmtNum,
  alignHeadFoot, drawContinuationHeaders, LANJUT_LABEL_Y, LANJUT_ISI_TOP, signH, LANSIA,
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

// Kolom "SALDO (Rp)" DIHAPUS (21 Jul 2026). Laporan ini sengaja dikelompokkan
// per kategori (lihat renderKategori), sementara `saldo_setelah` adalah saldo
// berjalan KRONOLOGIS global — di dalam satu seksi ia meloncat naik-turun
// (mis. Donasi Rawat Inap: 8.770.000 → 16.002.000) karena transaksi kategori
// lain terjadi di antaranya. Angkanya benar, tapi mustahil direkonsiliasi di
// dalam seksi → pembaca (warga/auditor) membacanya sebagai salah hitung pada
// dokumen pertanggungjawaban bertanda tangan. Rekonsiliasi sudah dipikul
// subtotal per kategori + blok Ringkasan di akhir. Saldo berjalan yang sah
// tetap tersedia di Ekspor Excel (sheet "Mutasi", kronologis datar).
/* Laporan INI dicetak pada skala LANSIA (badan tabel 11pt, bukan 7,5pt).
   Ia satu-satunya dokumen yang dibagikan ke warga di atas KERTAS dan dibaca
   orang yang matanya sudah tak muda — enam laporan lain tetap skala RAPAT.
   Kolom ikut melebar: pada 11pt "12 Agu 26" dan "+21.920.000" tak lagi muat
   di 22/30mm, dan angka pertanggungjawaban yang terpotong lebih buruk
   daripada angka yang kecil. */
const SK = LANSIA;
const TABEL = tabelSkala(SK);

const COL = {
  0: { cellWidth: 10,   halign: 'center' as const },
  1: { cellWidth: 26 },
  2: { cellWidth: 'auto' as const },
  3: { cellWidth: 34,   halign: 'right' as const },
};
const HEAD = ['NO', 'TANGGAL', 'KETERANGAN', 'JUMLAH (Rp)'];

/**
 * Bangun dokumennya saja, tanpa mengeluarkan berkas.
 *
 * Dipisah dari `generateKasRTPDF` supaya tipografi laporan ini bisa DIRENDER
 * dan dilihat di luar browser (harness → PDF → PNG). Ukuran huruf dokumen
 * cetak tak bisa dinilai dari angka di kode: yang menentukan lolos-tidaknya
 * adalah apakah kolom masih muat dan barisnya masih terbaca di kertas A4.
 */
export function buildKasRTPDF(list: KasRT[], stats: KasRTStats): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  amankanPdf(doc);
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  const docCode  = `KASRT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const sorted = [...list].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  const fmtLong = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const periode = sorted.length
    ? ` · Periode ${fmtLong(sorted[0].tanggal)} – ${fmtLong(sorted[sorted.length - 1].tanggal)}`
    : '';

  /* SATU sumber untuk masthead & kepala lanjutan — kalau dua-duanya mengetik
     judulnya sendiri, salah satunya akan menyimpang tanpa ada yang tahu. */
  const IDENT = {
    title: 'Laporan Pertanggungjawaban Kas RT',
    subtitle: `Kas Besar RT 004/006 Tanah Baru, Beji, Depok${periode}`,
  };
  let Y = drawMasthead(doc, { W, M, docCode, tanggalCetak, ...IDENT }, SK);

  // ── Bagian per jenis transaksi ────────────────────────────────
  // (Strip statistik atas dihapus — angka total sudah di Ringkasan tutup buku.)
  const saldoAwalList = sorted.filter(k => k.keterangan === 'Saldo Awal Kas RT');
  const masukList     = sorted.filter(k => k.tipe === 'masuk' && k.keterangan !== 'Saldo Awal Kas RT');
  const keluarList    = sorted.filter(k => k.tipe === 'keluar');

  if (saldoAwalList.length > 0) {
    Y = sectionLabel(doc, ensureSpace(doc, Y + 7, seksiMinH(SK, saldoAwalList.length)), 'Saldo Awal', W, M, undefined, SK);
    autoTable(doc, {
      ...TABEL,
      startY: Y,
      head: [HEAD],
      body: saldoAwalList.map((k, i) => [
        String(i + 1), fmtDate(k.tanggal), k.keterangan, fmtNum(k.nominal),
      ]),
      margin: { left: M, right: M },
      columnStyles: COL,
      didParseCell: (data) => alignHeadFoot(data, COL),
    });
    Y = getY(doc);
  }

  // Satu sub-bagian per kategori (label "PENERIMAAN/PENGELUARAN — <kategori>" +
  // subtotal + tabel) → laporan berkelompok untuk pertanggungjawaban.
  /* Halaman yang kepala kolomnya SUDAH tercetak. Sembilan kategori berbagi
     kolom yang IDENTIK (NO · TANGGAL · KETERANGAN · JUMLAH), jadi sebelum
     5 Sep 2026 laporan 12 transaksi mencetak 9 label seksi + 9 baris kepala =
     18 baris chrome untuk 12 baris data. Label seksinya jelas berhak — itu
     pengelompokan pertanggungjawabannya, berikut subtotal. Yang tak berhak
     diulang sembilan kali cuma NAMA KOLOMNYA. */
  let halamanBerkepala = 0;

  const renderKategori = (
    startY: number, prefix: string, label: string, rows: KasRT[],
    tone: 'pos' | 'neg', sign: '+' | '-',
  ): number => {
    if (rows.length === 0) return startY;
    const sub = rows.reduce((s, k) => s + k.nominal, 0);
    // Guard: label seksi jangan yatim di dasar halaman (butuh label + kepala tabel + ±2 baris)
    const y = sectionLabel(doc, ensureSpace(doc, startY + 6, seksiMinH(SK, rows.length)), `${prefix} — ${label}`, W, M, { text: `${sign}${rp(sub)}`, tone }, SK);
    /* Kepala dicetak kalau (a) ini seksi PERTAMA di halaman ini, atau (b) tabel
       ini mungkin MELUAP — halaman lanjutan yang barisnya tanpa nama kolom
       lebih buruk daripada kepala yang berulang, jadi taksirannya sengaja
       MURAH HATI dan arah salahnya aman: kelebihan taksir cuma mengembalikan
       perilaku lama. Taksiran ini BUKAN penjaganya — invariannya ("tiap
       halaman berisi baris transaksi punya nama kolom") dijaga uji. */
    const halIni = doc.getNumberOfPages();
    const tinggiKira = rows.length * 9.5 + 8;
    const adaKepala = halIni !== halamanBerkepala || y + tinggiKira > doc.internal.pageSize.getHeight() - 16;
    autoTable(doc, {
      ...TABEL,
      startY: y,
      head: adaKepala ? [HEAD] : [],
      showHead: adaKepala ? 'everyPage' : 'never',
      body: rows.map((k, i) => [
        String(i + 1), fmtDate(k.tanggal), k.keterangan, `${sign}${fmtNum(k.nominal)}`,
      ]),
      /* Isi halaman sambungan mulai DI BAWAH blok label "(lanjutan)" — dulu
         `LANJUT_TOP` (30), yang menaruh kepala kolom tepat di garis label. */
      margin: { left: M, right: M, top: LANJUT_ISI_TOP },
      columnStyles: COL,
      didParseCell(data) {
        alignHeadFoot(data, COL);
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.styles.textColor = tone === 'pos' ? C.pos : C.neg;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      /* Seksi yang menyambung ke halaman berikutnya WAJIB menyebut induknya.
         Tanpa ini halaman baru dibuka oleh kepala kolom polos (NO/TANGGAL/…)
         sehingga baris sisanya jadi baris tak bertuan — pada dokumen
         pertanggungjawaban bertanda tangan itu cacat, bukan sekadar kurang
         rapi. Subtotal TIDAK diulang di sini: nilainya milik seluruh seksi,
         dan menempelkannya di "(lanjutan)" gampang terbaca sebagai subtotal
         baris sambungan saja. */
      didDrawPage(data) {
        if (data.pageNumber === 1) return;
        /* Di BAWAH pita kepala lanjutan (0..24). Dulu 14 — yang sejak kepala
           lanjutan jadi tak-bersyarat akan tertimpa olehnya. */
        sectionLabel(doc, LANJUT_LABEL_Y, `${prefix} — ${label} (lanjutan)`, W, M, undefined, SK);
      },
    });
    /* Sesudah tabel: kalau kepala tadi dicetak, ia tercetak di TIAP halaman yg
       disentuh tabel ini — jadi halaman saat ini pasti sudah berkepala. */
    if (adaKepala) halamanBerkepala = doc.getNumberOfPages();
    return getY(doc);
  };

  for (const kat of KATEGORI_MASUK) {
    Y = renderKategori(Y, 'PENERIMAAN', kat.label, masukList.filter((k) => (k.kategori ?? 'lainnya') === kat.key), 'pos', '+');
  }
  for (const kat of KATEGORI_KELUAR) {
    Y = renderKategori(Y, 'PENGELUARAN', kat.label, keluarList.filter((k) => (k.kategori ?? 'lainnya') === kat.key), 'neg', '-');
  }

  // ── Ringkasan tutup buku ──────────────────────────────────────
  // "Total Penerimaan", bukan "Total Pemasukan": label seksi di atas memakai
  // PENERIMAAN/PENGELUARAN. Satu dokumen tak boleh punya dua kosakata untuk
  // pos yang sama — auditor membacanya sebagai dua hal berbeda.
  const ringkasan: Parameters<typeof drawSummary>[2] = [
    { label: 'Saldo Awal',        value: rp(stats.saldoAwal) },
    { label: 'Total Penerimaan',  value: `+${rp(stats.totalMasuk)}`,  tone: 'pos' },
    { label: 'Total Pengeluaran', value: `-${rp(stats.totalKeluar)}`, tone: 'neg' },
  ];
  const saldoBersih = { label: 'Saldo Bersih', value: rp(stats.saldo) };
  Y = drawSummary(doc, ensureSpace(doc, Y + 6, 52), ringkasan, saldoBersih, W, M, undefined, SK);

  // Tanda tangan: jaga ruangnya seukuran blok NYATA (SIGN_H). Kalau tetap harus
  // pindah halaman, lembar itu dibuat BISA BERDIRI SENDIRI — kepala lanjutan
  // (identitas + kode dokumen) plus ringkasan tutup buku dicetak ulang di
  // atasnya. Tanda tangan harus duduk bersama angka yang disahkannya; lembar
  // tanda tangan kosong tak mengesahkan apa pun dan gampang tertukar.
  const halamanSebelum = doc.getNumberOfPages();
  let ttdY = ensureSpace(doc, Y + 14, signH(SK));
  if (doc.getNumberOfPages() > halamanSebelum) {
    /* Kepala lanjutannya kini dicetak TERPUSAT di akhir (tiap halaman >= 2),
       jadi di sini tinggal mengulang angka yang disahkan tanda tangan. */
    const recapY = sectionLabel(doc, ttdY + 4, 'Ringkasan Tutup Buku', W, M, undefined, SK);
    ttdY = drawSummary(doc, recapY, ringkasan, saldoBersih, W, M, undefined, SK) + 18;
  }
  drawSignatures(doc, ttdY, W, M, { dateline: `Depok, ${tanggalCetak}`, sk: SK });

  const H = doc.internal.pageSize.getHeight();
  drawContinuationHeaders(doc, { W, M, title: IDENT.title, subtitle: `${IDENT.subtitle} · ${docCode}` }, SK);
  drawFooter(doc, W, H, tanggalCetak, M, SK);

  return { doc, filename: `Laporan-Kas-RT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf` };
}

export function generateKasRTPDF(list: KasRT[], stats: KasRTStats) {
  const { doc, filename } = buildKasRTPDF(list, stats);
  return outputPdf(doc, filename);
}
