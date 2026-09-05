import jsPDF from 'jspdf';
import { amankanPdf } from './pdfTeks';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import {
  tabelSkala, drawMasthead, drawSummary, drawSignatures, drawFooter, ensureSpace, signH, C, fmtNum,
  alignHeadFoot, drawContinuationHeaders, LANJUT_TOP, sectionLabel, LANSIA,
} from './pdfTheme';
import { hitungSaldoHadiran } from './utils';
import type { Tarikan } from './types';

interface TalanganInfo { count: number; total: number; }

interface Stats {
  totalKasTerkumpul: number;
  totalTalanganBelum: number;
  totalSetor: number;
  saldoAktif: number;
}

function rp(n: number) { return `Rp${n.toLocaleString('id-ID')}`; }

/* Dicetak pada skala LANSIA, sama seperti Laporan Pertanggungjawaban Kas RT:
   dua-duanya dibagikan ke warga di atas KERTAS.
   Sempat mustahil di 11pt: dengan DELAPAN kolom, kebutuhannya 186,1mm
   sedangkan A4 potret cuma punya 182mm, dan kurang 4,1mm itu harus dibayar
   oleh salah satu — angka patah di tengah, atau 7 dari 12 nama warga
   membungkus dua baris. Kolom HADIR dihapus (18 Agu 2026) sehingga tinggal
   TUJUH kolom; 11,6mm yang dibebaskannya membuat kebutuhan turun ke 174,5mm
   dan potret muat lagi dengan sisa 7,5mm. Jadi laporan ini bisa memakai
   skala LANSIA UTUH, setara Laporan Pertanggungjawaban Kas RT. */
const SK = LANSIA;
const TABEL = tabelSkala(SK);

/** Bangun dokumennya saja — lihat catatan sama di `generateKasRTPDF.ts`. */
export function buildKasHadiranPDF(
  tarikanList: Tarikan[],
  talanganMap: Record<string, TalanganInfo>,
  setorMap: Record<string, number>,
  stats: Stats,
): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  amankanPdf(doc);
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  const docCode = `KAS-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Periode data = rentang tanggal tarikan pertama–terakhir
  const byTanggal = [...tarikanList].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  const fmtLong = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const periode = byTanggal.length
    ? ` · Periode ${fmtLong(byTanggal[0].tanggal)} – ${fmtLong(byTanggal[byTanggal.length - 1].tanggal)}`
    : '';

  /* SATU sumber untuk masthead & kepala lanjutan — kalau dua-duanya mengetik
     judulnya sendiri, salah satunya akan menyimpang tanpa ada yang tahu. */
  const IDENT = {
    title: 'Laporan Alur Kas Hadiran',
    /* "Kota" dibuang 4 Sep 2026: dgn `periode` terpanjang, baris ini terukur
       182,4mm sementara lebar isi A4 bermargin 14mm cuma 182,0mm — luber
       0,43mm ke margin. Sesudahnya 173,8mm (sisa 8,2mm), cukup menahan kalau
       string periode memanjang. Nol informasi hilang, dan Header app sendiri
       sudah lama menulis alamatnya begitu ("RT 004/006 TANAH BARU · BEJI,
       DEPOK"). Ejaan yang sama dipakai di SELURUH generator — alamat yang
       ditulis dua cara di dokumen dari app yang sama itu drift. */
    subtitle: `Kas masuk, talangan & setoran RT 004/006 Tanah Baru, Beji, Depok${periode}`,
  };
  const Y = drawMasthead(doc, { W, M, docCode, tanggalCetak, ...IDENT }, SK);

  // (Strip statistik atas dihapus — angka yang sama sudah di Ringkasan tutup buku.)
  // ── Tabel per tarikan ─────────────────────────────────────
  /* Lebar kolom pada skala LANSIA — DIUKUR lewat `doc.getTextWidth`, bukan
     ditaksir. Yang mengikat itu DATA, bukan kepala kolom: angka rupiah tak
     punya spasi sehingga TAK BISA membungkus, sedangkan "KAS MASUK (Rp)"
     berspasi dan turun ke baris kedua dengan tenang. Karena itu potret tetap
     cukup — "kurang 4,9mm" yang sempat terukur adalah total kalau tiap kepala
     dipaksa satu baris, batas semu; mengganti orientasi halaman karenanya
     akan jadi obat untuk penyakit yang tidak ada.

     Kolom angka disizing dari baris TOTAL, BUKAN dari sampel baris biasa.
     Percobaan pertama memakai 23mm karena mengukur `49.650.000` (10 digit),
     lalu TOTAL 42 tarikan tembus `252.525.000` dan PATAH jadi "252.525.00"
     lalu "0" di baris berikutnya — di dokumen bertanda tangan itu bukan
     kurang rapi, itu angka yang bisa salah dibaca. Baris TOTAL selalu lebih
     lebar dari baris mana pun di atasnya; ia yang menentukan.
     Diukur @11pt bold: `-999.999.999` = 24,7mm → 25mm.

     Sisanya jatuh ke SOHIBUL BAIT (±44mm), lega untuk nama terpanjang yang
     terukur (40,3mm). Nama berspasi sehingga membungkus dengan anggun kalau
     pun lewat; angka tidak — itu sebabnya angka yang dapat jatah pasti. */
  const KAS_COL = {
    0: { cellWidth: 8,  halign: 'center' as const },
    1: { cellWidth: 30 },
    2: { cellWidth: 'auto' as const },
    3: { cellWidth: 25, halign: 'right' as const },
    4: { cellWidth: 25, halign: 'right' as const },
    5: { cellWidth: 25, halign: 'right' as const },
    6: { cellWidth: 25, halign: 'right' as const },
  };
  const sorted = [...tarikanList].sort((a, b) => a.nomor - b.nomor);

  /* Dokumen ini mencetak angka yang SAMA dari dua tempat: baris TOTAL tabel
     (dihitung dari kolomnya sendiri, di bawah) dan blok Ringkasan (memakai
     `stats` kiriman halaman). Keduanya wajib tak pernah saling membantah —
     ini berkas pertanggungjawaban ke 69 warga, dan dua angka berbeda dalam
     satu dokumen membuat SELURUHNYA tak bisa dipercaya.

     Diperiksa 23 Agu 2026, dan alasan sepakatnya BERBEDA-BEDA:
       · totalKas  — struktural: `sorted` ini persis daftar yang dipakai
                     halaman untuk `totalKasTerkumpul`.
       · totalTal  — struktural: `talanganMap` & `totalTalanganBelum` lahir
                     dari SATU pass atas `talData` yang sama.
       · totalSetor— TIDAK struktural. Halaman menjumlahkan semua transaksi
                     bertipe `setor_kas_rt`; `setorMap` di sini dikunci
                     `tarikan_id`. Keduanya cuma sama selama tiap setoran
                     benar-benar tertaut tarikan (aturan lama repo ini).
                     Terukur hari ini: 3 baris, selisih Rp0. Kalau suatu saat
                     ada setoran tanpa `tarikan_id`, baris TOTAL tabel akan
                     lebih KECIL dari Ringkasan — dan itu bukan salah tabel,
                     melainkan setoran yang memang tak bisa ditempatkan di
                     kolom tarikan mana pun.

     Rumus bersihnya WAJIB lewat `hitungSaldoHadiran` — satu sumber rumus
     saldo (lihat utils.ts). Sebelum ini pengurangannya ditulis ulang inline
     di sini, persis kelas drift yang membuat helper itu diadakan. */
  const totalKas  = sorted.reduce((s, t) => s + (t.total_terkumpul ?? 0), 0);
  const totalTal  = Object.values(talanganMap).reduce((s, v) => s + v.total, 0);
  const totalSetor = Object.values(setorMap).reduce((s, v) => s + v, 0);
  const totalNet  = hitungSaldoHadiran(totalKas, totalTal, totalSetor);

  const rows = sorted.map((t, i) => {
    const tal = talanganMap[t.id] ?? { count: 0, total: 0 };
    const kasIn = t.total_terkumpul ?? 0;
    const setor = setorMap[t.id] ?? 0;
    const net   = kasIn - tal.total - setor;
    return [
      String(i + 1),
      `#${t.nomor} · ${new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      t.sohibul_bait?.nama ?? '—',
      fmtNum(kasIn),
      tal.total > 0 ? `-${fmtNum(tal.total)}` : '0',
      setor > 0 ? `-${fmtNum(setor)}` : '0',
      net < 0 ? `-${fmtNum(Math.abs(net))}` : fmtNum(net),
    ];
  });

  autoTable(doc, {
    ...TABEL,
    startY: Y + 7,
    head: [['NO', 'TARIKAN', 'SOHIBUL BAIT', 'KAS MASUK (Rp)', 'TALANGAN (Rp)', 'SETOR KAS RT (Rp)', 'NET KAS (Rp)']],
    body: rows,
    foot: [[
      { content: 'TOTAL', colSpan: 3, styles: { halign: 'right' } },
      { content: fmtNum(totalKas), styles: { halign: 'right' } },
      { content: totalTal > 0 ? `-${fmtNum(totalTal)}` : '0', styles: { halign: 'right' } },
      { content: totalSetor > 0 ? `-${fmtNum(totalSetor)}` : '0', styles: { halign: 'right' } },
      { content: totalNet < 0 ? `-${fmtNum(Math.abs(totalNet))}` : fmtNum(totalNet), styles: { halign: 'right' } },
    ]],
    showFoot: 'lastPage',
    margin: { left: M, right: M, top: LANJUT_TOP },
    columnStyles: KAS_COL,
    didParseCell(data) {
      alignHeadFoot(data, KAS_COL);
      if (data.section === 'foot') {
        if (data.column.index === 4 && totalTal > 0) data.cell.styles.textColor = C.neg;
        if (data.column.index === 5 && totalSetor > 0) data.cell.styles.textColor = C.warn;
        if (data.column.index === 6) {
          data.cell.styles.textColor = totalNet < 0 ? C.neg : C.pos;
        }
        return;
      }
      if (data.section !== 'body') return;
      const row = sorted[data.row.index];
      if (!row) return;
      const tal = talanganMap[row.id] ?? { count: 0, total: 0 };
      const setor = setorMap[row.id] ?? 0;
      if (data.column.index === 4 && tal.total > 0) {
        data.cell.styles.textColor = C.neg;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 5 && setor > 0) {
        data.cell.styles.textColor = C.warn;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 6) {
        const net = (row.total_terkumpul ?? 0) - tal.total - setor;
        data.cell.styles.textColor = net < 0 ? C.neg : C.pos;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Ringkasan tutup buku ──────────────────────────────────
  const afterY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const saldoText = (stats.saldoAktif < 0 ? '-' : '') + rp(Math.abs(stats.saldoAktif));

  const ringkasan: Parameters<typeof drawSummary>[2] = [
    { label: 'Total Kas Terkumpul',        value: rp(stats.totalKasTerkumpul) },
    { label: 'Total Talangan Belum Lunas', value: `-${rp(stats.totalTalanganBelum)}`, tone: 'neg' },
    { label: 'Total Setor ke Kas RT',      value: `-${rp(stats.totalSetor)}`, tone: 'warn' },
  ];
  const saldoBersih = {
    label: 'Saldo Bersih Kas', value: saldoText,
    tone: (stats.saldoAktif < 0 ? 'neg' : 'ink') as 'neg' | 'ink',
  };
  const sumY = drawSummary(doc, ensureSpace(doc, afterY + 6, 52), ringkasan, saldoBersih, W, M, undefined, SK);

  /* Lembar tanda tangan WAJIB bisa berdiri sendiri — penjaga yang sudah ada di
     `generateKasRTPDF` tapi belum pernah ada di sini. Sebelumnya, kalau blok
     tanda tangan jatuh ke halaman baru, halaman itu keluar TANPA identitas
     apa pun: tak ada judul, tak ada kode dokumen, tak ada periode. Terbukti
     nyata di data 42 tarikan — halaman 3 berisi ringkasan + tiga tanda tangan
     dan tak satu pun menyebut dokumen apa yang disahkan. Lembar begitu, kalau
     terlepas dari berkasnya, tak mengesahkan apa pun dan gampang tertukar.
     Huruf yang membesar (skala LANSIA) membuat kasus ini jauh lebih sering
     terjadi, jadi penjaganya dipasang bersama kenaikan hurufnya. */
  const halamanSebelum = doc.getNumberOfPages();
  let ttdY = ensureSpace(doc, sumY + 14, signH(SK));
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

  return { doc, filename: `Laporan-Kas-Hadiran-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf` };
}

export function generateKasHadiranPDF(
  tarikanList: Tarikan[],
  talanganMap: Record<string, TalanganInfo>,
  setorMap: Record<string, number>,
  stats: Stats,
) {
  const { doc, filename } = buildKasHadiranPDF(tarikanList, talanganMap, setorMap, stats);
  return outputPdf(doc, filename);
}
