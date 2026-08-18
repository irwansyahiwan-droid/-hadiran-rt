import type jsPDF from 'jspdf';
import type { CellHookData, Styles } from 'jspdf-autotable';
import { LOGO_DATA_URL } from './logoBase64';
import { CETAK, rgb } from './warnaCetak';

/**
 * Tema bersama semua PDF — minimalis clean "startup 2026" (Stripe/Mercury/Linear).
 *
 * Prinsip: TANPA header bar berwarna. Identitas lewat masthead tipografis
 * (wordmark kecil + meta kanan + judul besar + hairline). Hierarki dari
 * ukuran/berat huruf & whitespace, bukan blok fill. Warna HANYA untuk angka
 * berarah (pos/neg/warn) + satu aksen brand di wordmark — selaras token app.
 */

export type RGB = [number, number, number];

/* Diturunkan dari `warnaCetak.ts`, tidak lagi ditulis tangan (4 Agu 2026).
   Nilai lama di sini mengaku "token pos/neg/warn" tapi membeku di generasi
   sebelum pass kontras maksimal — pos #047857, neg #DC2626 (dua generasi
   tertinggal), warn #B45309, dan `line` #E5E7EB yang di kertas laser praktis
   hilang. Sekarang PDF ikut bergerak sendiri tiap token app bergerak. */
export const C = {
  ink:   rgb(CETAK.ink)   as RGB, // judul / nominal utama
  sub:   rgb(CETAK.sub)   as RGB, // isi tabel
  faint: rgb(CETAK.faint) as RGB, // label / caption
  muted: rgb(CETAK.muted) as RGB, // footer
  line:  rgb(CETAK.line)  as RGB, // hairline
  brand: rgb(CETAK.brand) as RGB, // wordmark & aksen tunggal
  pos:   rgb(CETAK.pos)   as RGB, // uang masuk
  neg:   rgb(CETAK.neg)   as RGB, // uang keluar
  warn:  rgb(CETAK.warn)  as RGB, // perhatian
} as const;

/**
 * SKALA TIPOGRAFI dokumen cetak.
 *
 * Sampai 18 Agu 2026 ukuran huruf ditulis sebagai angka telanjang tersebar di
 * seluruh berkas ini, jadi tak ada satu tempat pun untuk menjawab "seberapa
 * besar laporan ini dicetak". Sekarang ada dua skala bernama:
 *
 * - `RAPAT`  — nilai yang berlaku selama ini, PERSIS. Dipakai enam laporan
 *              lain tanpa perubahan sebyte pun.
 * - `LANSIA` — untuk dokumen yang dibaca warga di atas kertas, bukan dipindai
 *              bendahara di layar. Badan tabel 7,5 → 11pt.
 *
 * `spasiSeksi` sengaja MENGECIL di skala LANSIA (0,9 → 0,35). Letterspacing
 * lebar bikin judul seksi terbaca sebagai deret huruf lepas
 * ("P E N E R I M A A N") — mata yang sudah lelah kehilangan bentuk katanya,
 * jadi menaikkan ukuran huruf saja tak menolong kalau trackingnya dibiarkan.
 */
export interface SkalaTeks {
  wordmark: number; meta: number; judul: number; subjudul: number;
  statLabel: number; statNilai: number;
  seksi: number; spasiSeksi: number;
  tabelHead: number; tabelBody: number; tabelPad: number;
  ringkasBaris: number; ringkasTotal: number; ringkasLebar: number;
  ttdPeran: number; ttdNama: number; ttdGaris: number;
  kaki: number;
  lanjutJudul: number; lanjutSub: number;
}

export const RAPAT: SkalaTeks = {
  wordmark: 7, meta: 7, judul: 19, subjudul: 8.5,
  statLabel: 6.3, statNilai: 12.5,
  seksi: 8, spasiSeksi: 0.9,
  tabelHead: 6.5, tabelBody: 7.5, tabelPad: 2.6,
  ringkasBaris: 8, ringkasTotal: 9.5, ringkasLebar: 80,
  ttdPeran: 7.5, ttdNama: 8.5, ttdGaris: 16,
  kaki: 6.5,
  lanjutJudul: 9, lanjutSub: 7,
};

export const LANSIA: SkalaTeks = {
  wordmark: 8, meta: 8.5, judul: 20, subjudul: 10.5,
  statLabel: 8, statNilai: 14,
  seksi: 10.5, spasiSeksi: 0.35,
  /* Padding baris TURUN sedikit (2,6 → 2,4mm) sementara hurufnya naik 47%.
     Baseline sudah lapang secara vertikal tapi kerdil secara glyph — itu pola
     "airy tapi kecil" yang justru paling sulit dibaca. Tinggi baris tetap
     tumbuh, cuma tidak sebanyak pertumbuhan hurufnya. */
  tabelHead: 9, tabelBody: 11, tabelPad: 2.4,
  ringkasBaris: 11, ringkasTotal: 13.5, ringkasLebar: 92,
  ttdPeran: 9.5, ttdNama: 11.5, ttdGaris: 18,
  kaki: 8,
  lanjutJudul: 11, lanjutSub: 8.5,
};

/**
 * Angka di SEL TABEL: polos tanpa "Rp" (satuan dicantumkan di header kolom,
 * mis. "JUMLAH (Rp)") agar tabel lega & mudah dipindai. Prefiks "Rp" HANYA
 * untuk Total/ringkasan/stat — aturan dari user 2026-06-11.
 */
export function fmtNum(n: number): string {
  return n.toLocaleString('id-ID');
}

export const SIGNERS = [
  { role: 'Ketua RT 004/006', name: "Saman Ma'arif" },
  { role: 'Sekretaris', name: 'M. Aryanto' },
  { role: 'Bendahara', name: 'Irwansyah' },
] as const;

const setColor = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw  = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

/** Masthead tipografis (pengganti header bar). Mengembalikan Y awal konten. */
export function drawMasthead(
  doc: jsPDF,
  o: { W: number; M: number; title: string; subtitle: string; docCode: string; tanggalCetak: string },
  sk: SkalaTeks = RAPAT,
): number {
  const { W, M } = o;

  // Logo identitas "46" (letterhead kiri-atas). Opsional — bila gagal, layout
  // tetap jalan (wordmark di-shift hanya jika logo tampil).
  const LOGO = 11.5;
  let textX = M;
  try {
    doc.addImage(LOGO_DATA_URL, 'JPEG', M, 8.5, LOGO, LOGO);
    textX = M + LOGO + 3.5;
  } catch { /* logo opsional */ }

  // Wordmark kecil ber-letterspace — di samping logo
  doc.setFont('helvetica', 'bold'); doc.setFontSize(sk.wordmark); setColor(doc, C.brand);
  doc.text('HADIRAN RT  ·  RT 004/006 TANAH BARU — BEJI, DEPOK', textX, 16, { charSpace: 0.5 });

  // Meta kanan: kode dokumen + tanggal cetak
  doc.setFont('helvetica', 'normal'); doc.setFontSize(sk.meta); setColor(doc, C.faint);
  doc.text(o.docCode, W - M, 13.5, { align: 'right' });
  doc.text(o.tanggalCetak, W - M, 17.5, { align: 'right' });

  // Judul besar + subtitle
  doc.setFont('helvetica', 'bold'); doc.setFontSize(sk.judul); setColor(doc, C.ink);
  doc.text(o.title, M, 29);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(sk.subjudul); setColor(doc, C.faint);
  doc.text(o.subtitle, M, 35.5);

  // Hairline penutup masthead
  setDraw(doc, C.line); doc.setLineWidth(0.3);
  doc.line(M, 41, W - M, 41);

  return 41;
}

/**
 * Pastikan sisa ruang halaman cukup untuk blok setinggi `needed` mm;
 * kalau tidak, mulai halaman baru. Mengembalikan Y tempat blok digambar.
 */
export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed > H - 16) { doc.addPage(); return 16; }
  return y;
}

export interface Stat { label: string; value: string; tone?: keyof typeof C }

/** Strip statistik: kolom label kecil + angka besar, dipisah hairline vertikal. */
export function drawStatStrip(doc: jsPDF, y: number, stats: Stat[], W: number, M: number, sk: SkalaTeks = RAPAT): number {
  const colW = (W - 2 * M) / stats.length;
  const h = 19;

  stats.forEach((s, i) => {
    const x = M + i * colW;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(sk.statLabel); setColor(doc, C.faint);
    doc.text(s.label.toUpperCase(), x, y + 7.5, { charSpace: 0.4 });
    doc.setFontSize(sk.statNilai); setColor(doc, C[s.tone ?? 'ink'] as RGB);
    doc.text(s.value, x, y + 15);
    if (i > 0) {
      setDraw(doc, C.line); doc.setLineWidth(0.3);
      doc.line(x - colW * 0.08, y + 3.5, x - colW * 0.08, y + h - 2.5);
    }
  });

  setDraw(doc, C.line); doc.setLineWidth(0.3);
  doc.line(M, y + h, W - M, y + h);
  return y + h;
}

/** Label seksi: uppercase ber-letterspace + nilai kanan opsional + hairline. */
export function sectionLabel(
  doc: jsPDF, y: number, label: string, W: number, M: number,
  extra?: { text: string; tone?: keyof typeof C }, sk: SkalaTeks = RAPAT,
): number {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(sk.seksi); setColor(doc, C.ink);
  doc.text(label.toUpperCase(), M, y + 5, { charSpace: sk.spasiSeksi });
  if (extra) {
    setColor(doc, C[extra.tone ?? 'ink'] as RGB);
    doc.text(extra.text, W - M, y + 5, { align: 'right' });
  }
  setDraw(doc, C.line); doc.setLineWidth(0.3);
  doc.line(M, y + 7.5, W - M, y + 7.5);
  return y + 8.5;
}

/** Gaya dasar autoTable: plain, header rule tegas, baris hairline, foot tanpa blok. */
/** Gaya autoTable pada SKALA tertentu. `TABLE` = varian RAPAT (dipakai 6 laporan lain). */
export function tabelSkala(sk: SkalaTeks) {
  return {
    theme: 'plain' as const,
    headStyles: {
      fontSize: sk.tabelHead, fontStyle: 'bold' as const, textColor: C.faint,
      cellPadding: { top: sk.tabelPad - 0.6, bottom: sk.tabelPad - 0.6, left: 1, right: 1 },
      lineWidth: { bottom: 0.35 }, lineColor: C.ink,
    },
    bodyStyles: {
      fontSize: sk.tabelBody, textColor: C.sub,
      cellPadding: { top: sk.tabelPad, bottom: sk.tabelPad, left: 1, right: 1 },
      lineWidth: { bottom: 0.15 }, lineColor: C.line,
    },
    footStyles: {
      fontSize: sk.tabelBody, fontStyle: 'bold' as const, textColor: C.ink,
      cellPadding: { top: sk.tabelPad - 0.2, bottom: sk.tabelPad - 0.2, left: 1, right: 1 },
      lineWidth: { top: 0.35 }, lineColor: C.ink,
    },
  };
}

export const TABLE = {
  theme: 'plain' as const,
  headStyles: {
    fontSize: 6.5, fontStyle: 'bold' as const, textColor: C.faint,
    cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
    lineWidth: { bottom: 0.35 }, lineColor: C.ink,
  },
  bodyStyles: {
    fontSize: 7.5, textColor: C.sub,
    cellPadding: { top: 2.6, bottom: 2.6, left: 1, right: 1 },
    lineWidth: { bottom: 0.15 }, lineColor: C.line,
  },
  footStyles: {
    fontSize: 7.5, fontStyle: 'bold' as const, textColor: C.ink,
    cellPadding: { top: 2.4, bottom: 2.4, left: 1, right: 1 },
    lineWidth: { top: 0.35 }, lineColor: C.ink,
  },
};

/**
 * Samakan halign HEADER & FOOT dengan columnStyles body — autoTable tidak
 * menerapkan columnStyles ke section head/foot, jadi tanpa ini judul kolom
 * angka (rata kanan/tengah) melenceng dari datanya. Panggil di awal
 * didParseCell; halign eksplisit per-sel (mis. foot "TOTAL" colSpan) tidak
 * ditimpa karena hanya sel yang masih default-kiri yang disesuaikan.
 */
export function alignHeadFoot(data: CellHookData, cols: Record<number, Partial<Styles>>): void {
  if (data.section !== 'head' && data.section !== 'foot') return;
  const h = cols[data.column.index]?.halign;
  if (h && data.cell.styles.halign === 'left') data.cell.styles.halign = h;
}

export interface SummaryLine { label: string; value: string; tone?: keyof typeof C }

/** Ringkasan gaya akuntansi: key-value kanan + total ber-double-rule. */
export function drawSummary(
  doc: jsPDF, y: number, lines: SummaryLine[],
  total: { label: string; value: string; tone?: keyof typeof C },
  W: number, M: number, width?: number, sk: SkalaTeks = RAPAT,
): number {
  const lebar = width ?? sk.ringkasLebar;
  const x = W - M - lebar;
  let ly = y + 5;

  lines.forEach((l) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(sk.ringkasBaris); setColor(doc, C.faint);
    doc.text(l.label, x, ly);
    setColor(doc, C[l.tone ?? 'sub'] as RGB);
    doc.text(l.value, x + lebar, ly, { align: 'right' });
    ly += sk.ringkasBaris * 0.875;
  });

  // Rule tegas di atas total, double rule di bawah (gaya tutup buku)
  setDraw(doc, C.ink); doc.setLineWidth(0.35);
  doc.line(x, ly - 3.2, x + lebar, ly - 3.2);
  ly += 2.5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(sk.ringkasTotal); setColor(doc, C.ink);
  doc.text(total.label, x, ly);
  setColor(doc, C[total.tone ?? 'ink'] as RGB);
  doc.text(total.value, x + lebar, ly, { align: 'right' });
  ly += 3.2;
  doc.setLineWidth(0.3); setDraw(doc, C.ink);
  doc.line(x, ly, x + lebar, ly);
  doc.line(x, ly + 0.9, x + lebar, ly + 0.9);

  return ly + 1;
}

/**
 * Kepala halaman LANJUTAN — versi ramping masthead untuk halaman kedua dst.
 *
 * Dipakai saat sebuah blok (mis. tanda tangan) jatuh ke halaman baru: halaman
 * yang memuat tanda tangan TIDAK boleh anonim. Tanpa identitas dokumen, lembar
 * tanda tangan yang terlepas dari berkas tak bisa dipertanggungjawabkan —
 * siapa pun bisa menukarnya dengan lampiran lain. Mengembalikan Y awal konten.
 */
export function drawContinuationHeader(
  doc: jsPDF,
  o: { W: number; M: number; title: string; subtitle: string },
  sk: SkalaTeks = RAPAT,
): number {
  const { W, M } = o;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(sk.lanjutJudul); setColor(doc, C.ink);
  doc.text(o.title, M, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(sk.lanjutSub); setColor(doc, C.faint);
  doc.text(o.subtitle, M, 20.5);
  doc.text('lanjutan', W - M, 16, { align: 'right' });
  setDraw(doc, C.line); doc.setLineWidth(0.3);
  doc.line(M, 24, W - M, 24);
  return 24;
}

/**
 * Tinggi NYATA blok tanda tangan (mm) — dateline 6 + peran → garis 16 →
 * nama 5,5 + napas bawah. Dipakai sebagai `needed` di ensureSpace supaya blok
 * tak dipindah ke halaman baru padahal masih muat (dulu dijaga 42mm untuk blok
 * ~34mm → laporan sering berakhir dengan halaman tanda tangan nyaris kosong).
 */
export const SIGN_H = 34;

/**
 * Tinggi blok tanda tangan pada skala tertentu.
 *
 * Diturunkan dari geometri NYATA yang digambar `drawSignatures`, bukan
 * ditaksir: dateline 6 → peran → garis di `ttdGaris` → nama di +5,5 → napas
 * bawah 6,5. Untuk `RAPAT` rumus ini menghasilkan tepat 34, yaitu `SIGN_H`
 * yang sudah dipakai selama ini — itu ujinya.
 *
 * Rumus pertamanya (`12 + ttdGaris + ttdNama × 0,55 + 4`) mengarang angkanya
 * dan kelebihan ±4mm. Akibatnya kelihatan langsung di Laporan Alur Kas
 * Hadiran: blok tanda tangan dilempar ke halaman baru karena dikira butuh
 * 40,3mm padahal sisa halaman 38mm dan blok aslinya cuma ±31mm — laporan satu
 * halaman berakhir dengan halaman kedua yang isinya cuma tanda tangan.
 */
export function signH(sk: SkalaTeks): number {
  return 6 + sk.ttdGaris + 5.5 + 6.5;
}

/** Blok tanda tangan 3 kolom. `dateline` opsional ("Depok, 5 Juli 2026") di atas kolom kanan. */
export function drawSignatures(
  doc: jsPDF, y: number, W: number, M: number,
  opts?: { dateline?: string; sk?: SkalaTeks },
): void {
  const sk = opts?.sk ?? RAPAT;
  const colW = (W - 2 * M) / 3;
  if (opts?.dateline) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(sk.ttdPeran); setColor(doc, C.sub);
    doc.text(opts.dateline, M + colW * 2 + colW / 2, y, { align: 'center' });
    y += 6;
  }
  SIGNERS.forEach((p, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(sk.ttdPeran); setColor(doc, C.faint);
    doc.text(p.role, cx, y, { align: 'center' });
    setDraw(doc, C.line); doc.setLineWidth(0.3);
    doc.line(cx - 26, y + sk.ttdGaris, cx + 26, y + sk.ttdGaris);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(sk.ttdNama); setColor(doc, C.ink);
    doc.text(p.name, cx, y + sk.ttdGaris + 5.5, { align: 'center' });
  });
}

/** Footer di SETIAP halaman: caption tengah + nomor halaman kanan (bila multi-halaman). Panggil sekali di akhir. */
export function drawFooter(doc: jsPDF, W: number, H: number, tanggalCetak: string, M = 14, sk: SkalaTeks = RAPAT): void {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(sk.kaki); setColor(doc, C.muted);
    doc.text(`Dicetak ${tanggalCetak}  ·  Hadiran RT Digital System`, W / 2, H - 8, { align: 'center' });
    if (total > 1) doc.text(`Hal. ${p}/${total}`, W - M, H - 8, { align: 'right' });
  }
}
