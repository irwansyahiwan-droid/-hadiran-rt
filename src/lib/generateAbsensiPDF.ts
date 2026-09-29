import jsPDF from 'jspdf';
import { amankanPdf } from './pdfTeks';
import autoTable from 'jspdf-autotable';
import { outputPdf } from './pdfOut';
import {
  TABLE, drawMasthead, drawStatStrip, drawSignatures, drawFooter, ensureSpace, C, alignHeadFoot,
  drawContinuationHeaders, LANJUT_TOP,
} from './pdfTheme';
import type { Tarikan } from './types';

/* `id` opsional: dipakai hanya untuk mengenali Sohibul Bait (lihat di bawah).
   Pemanggil yang cuma mengirim nama tetap berperilaku seperti dulu. */
interface Hadir { nama: string; id?: string }
interface Tidak { nama: string; lunas: boolean }

/** Daftar hadir (absensi) satu tarikan → unduh PDF. */
/* Seam `build*` — pola sama dgn generator lain (4 Sep 2026). Murni ekstraksi. */
export function buildAbsensiPDF(tarikan: Tarikan, hadir: Hadir[], tidak: Tidak[], titip: Hadir[] = []): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  amankanPdf(doc);
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();
  const tanggalCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const docCode = `ABS-${String(tarikan.nomor).padStart(3, '0')}-${now.getFullYear()}`;

  /* Sohibul Bait BUKAN "Hadir" (keputusan user 26 Sep 2026) — aturan yang sama
     dgn `ringkasAbsensi` ("SB dikecualikan dari SEMUA hitungan"), kartu tarikan
     ("56/69 hadir") & sheet detail tarikan. Ia tetap tercatat di daftar hadir
     resmi ini — baris PERTAMA, berstatus "Sohibul Bait" — dan ikut Total
     Anggota Tercatat; yang berubah hanya hitungan Hadir-nya. */
  const sbId = tarikan.sohibul_bait_id ?? '';
  const sohibul = sbId ? hadir.find((h) => h.id === sbId) : undefined;
  const hadirS = hadir.filter((h) => h !== sohibul).sort((a, b) => a.nama.localeCompare(b.nama));
  const titipS = [...titip].sort((a, b) => a.nama.localeCompare(b.nama));
  const tidakS = [...tidak].sort((a, b) => a.nama.localeCompare(b.nama));
  const lunasCount = tidakS.filter((t) => t.lunas).length;
  const total = (sohibul ? 1 : 0) + hadirS.length + titipS.length + tidakS.length;

  const tglTarikan = tarikan.tanggal
    ? new Date(tarikan.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const IDENT = {
    title: `Daftar Hadir Tarikan ke-${tarikan.nomor}`,
    subtitle: `${tglTarikan} · Sohibul Bait: ${tarikan.sohibul_bait?.nama ?? '—'}`,
  };
  let Y = drawMasthead(doc, { W, M, docCode, tanggalCetak, ...IDENT });

  /* TITIP ikut di strip sejak 4 Sep 2026 — sebelumnya hanya Hadir/Tidak
     Hadir/Talangan Lunas, sehingga orang berstatus Titip ada di TABEL dan ikut
     "Total Anggota Tercatat", tapi tak disebut di ringkasan mana pun. Terukur
     dgn 5 hadir/1 titip/2 tidak: strip berbunyi 5 dan 2 sementara kaki berbunyi
     8 — pembaca yang merekonsiliasi menemukan satu nama hilang tanpa penjelasan.
     Layar app sudah lama menampilkan Titip sbg stat sendiri; kertasnya yang
     tertinggal.
     Ongkos tata letak DIUKUR dulu, bukan ditaksir: 4 kolom → colW 45,5mm (isi
     efektif 41,9mm) sementara label terpanjang `TALANGAN LUNAS` 26,1mm pada
     skala RAPAT — sisa 38%, nilai dua digit hanya 4,9mm. Nol risiko luber.
     Urutannya mengikuti LAYAR (Hadir · Titip · Tidak Hadir), supaya warga yang
     membaca keduanya tak perlu memetakan ulang.
     Tone `ink` untuk Titip disengaja: ia bukan kabar baik maupun buruk — iuran
     tetap masuk, orangnya tak hadir. */
  Y = drawStatStrip(doc, Y, [
    { label: 'Hadir',          value: String(hadirS.length), tone: 'pos' },
    { label: 'Titip',          value: String(titipS.length) },
    { label: 'Tidak Hadir',    value: String(tidakS.length), tone: tidakS.length > 0 ? 'neg' : 'ink' },
    { label: 'Talangan Lunas', value: String(lunasCount) },
  ], W, M);

  // ── Tabel kehadiran ───────────────────────────────────────
  type Row = [string, string, string];
  const rows: Row[] = [];
  let n = 1;
  if (sohibul) rows.push([String(n++), sohibul.nama, 'Sohibul Bait']);
  hadirS.forEach((h) => rows.push([String(n++), h.nama, 'Hadir']));
  titipS.forEach((t) => rows.push([String(n++), t.nama, 'Titip']));
  tidakS.forEach((t) => rows.push([String(n++), t.nama, t.lunas ? 'Talangan Lunas' : 'Talangan']));

  const ABS_COL = {
    0: { cellWidth: 12, halign: 'center' as const },
    1: { cellWidth: 'auto' as const },
    2: { cellWidth: 40, halign: 'center' as const },
  };
  autoTable(doc, {
    ...TABLE,
    startY: Y + 7,
    head: [['NO', 'NAMA ANGGOTA', 'STATUS']],
    body: rows,
    margin: { left: M, right: M, top: LANJUT_TOP },
    columnStyles: ABS_COL,
    didParseCell(data) {
      alignHeadFoot(data, ABS_COL);
      if (data.section !== 'body' || data.column.index !== 2) return;
      const s = rows[data.row.index]?.[2] ?? '';
      if (s === 'Hadir') { data.cell.styles.textColor = C.pos; data.cell.styles.fontStyle = 'bold'; }
      else if (s === 'Titip' || s === 'Sohibul Bait') { data.cell.styles.fontStyle = 'bold'; }
      else if (s === 'Talangan Lunas') { data.cell.styles.textColor = C.pos; }
      else if (s === 'Talangan') { data.cell.styles.textColor = C.warn; data.cell.styles.fontStyle = 'bold'; } // amber = talangan se-app (29 Sep 2026)
    },
  });

  // ── Total + TTD ───────────────────────────────────────────
  // Guard: baris total + blok ttd (dgn dateline) jangan tergambar lewat batas halaman
  const afterY = ensureSpace(doc, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8, 52);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
  /* Strip (Hadir + Titip + Tidak Hadir) menjumlah ke PEMBAYAR; kalau Sohibul
     Bait tercatat, selisih satunya disebut di sini — pembaca yang
     merekonsiliasi tak boleh menemukan satu nama tanpa penjelasan. */
  doc.text(sohibul
    ? `Total Anggota Tercatat: ${total} (${total - 1} pembayar + Sohibul Bait)`
    : `Total Anggota Tercatat: ${total}`, M, afterY);

  drawSignatures(doc, afterY + 16, W, M, { dateline: `Depok, ${tanggalCetak}` });

  const H = doc.internal.pageSize.getHeight();
  drawContinuationHeaders(doc, { W, M, title: IDENT.title, subtitle: `${IDENT.subtitle} · ${docCode}` });
  drawFooter(doc, W, H, tanggalCetak);

  return { doc, filename: `Daftar-Hadir-Tarikan-${tarikan.nomor}.pdf` };
}

export function generateAbsensiPDF(tarikan: Tarikan, hadir: Hadir[], tidak: Tidak[], titip: Hadir[] = []) {
  const { doc, filename } = buildAbsensiPDF(tarikan, hadir, tidak, titip);
  return outputPdf(doc, filename);
}
