import type jsPDF from 'jspdf';
import { LOGO_DATA_URL } from './logoBase64';

/**
 * Tema bersama semua PDF — minimalis clean "startup 2026" (Stripe/Mercury/Linear).
 *
 * Prinsip: TANPA header bar berwarna. Identitas lewat masthead tipografis
 * (wordmark kecil + meta kanan + judul besar + hairline). Hierarki dari
 * ukuran/berat huruf & whitespace, bukan blok fill. Warna HANYA untuk angka
 * berarah (pos/neg/warn) + satu aksen brand di wordmark — selaras token app.
 */

export type RGB = [number, number, number];

export const C = {
  ink:   [11, 18, 32]    as RGB, // judul / nominal utama (token ink)
  sub:   [55, 65, 81]    as RGB, // isi tabel
  faint: [100, 116, 139] as RGB, // label / caption
  muted: [148, 163, 184] as RGB, // footer
  line:  [229, 231, 235] as RGB, // hairline
  brand: [15, 76, 46]    as RGB, // wordmark & aksen tunggal (token brand)
  pos:   [4, 120, 87]    as RGB, // uang masuk (token pos)
  neg:   [220, 38, 38]   as RGB, // uang keluar (token neg)
  warn:  [180, 83, 9]    as RGB, // perhatian (token warn)
} as const;

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
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); setColor(doc, C.brand);
  doc.text('HADIRAN RT  ·  RT 004/006 TANAH BARU — BEJI, DEPOK', textX, 16, { charSpace: 0.5 });

  // Meta kanan: kode dokumen + tanggal cetak
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); setColor(doc, C.faint);
  doc.text(o.docCode, W - M, 13.5, { align: 'right' });
  doc.text(o.tanggalCetak, W - M, 17.5, { align: 'right' });

  // Judul besar + subtitle
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); setColor(doc, C.ink);
  doc.text(o.title, M, 29);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setColor(doc, C.faint);
  doc.text(o.subtitle, M, 35.5);

  // Hairline penutup masthead
  setDraw(doc, C.line); doc.setLineWidth(0.3);
  doc.line(M, 41, W - M, 41);

  return 41;
}

export interface Stat { label: string; value: string; tone?: keyof typeof C }

/** Strip statistik: kolom label kecil + angka besar, dipisah hairline vertikal. */
export function drawStatStrip(doc: jsPDF, y: number, stats: Stat[], W: number, M: number): number {
  const colW = (W - 2 * M) / stats.length;
  const h = 19;

  stats.forEach((s, i) => {
    const x = M + i * colW;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.3); setColor(doc, C.faint);
    doc.text(s.label.toUpperCase(), x, y + 7.5, { charSpace: 0.4 });
    doc.setFontSize(12.5); setColor(doc, C[s.tone ?? 'ink'] as RGB);
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
  extra?: { text: string; tone?: keyof typeof C },
): number {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setColor(doc, C.ink);
  doc.text(label.toUpperCase(), M, y + 5, { charSpace: 0.9 });
  if (extra) {
    setColor(doc, C[extra.tone ?? 'ink'] as RGB);
    doc.text(extra.text, W - M, y + 5, { align: 'right' });
  }
  setDraw(doc, C.line); doc.setLineWidth(0.3);
  doc.line(M, y + 7.5, W - M, y + 7.5);
  return y + 8.5;
}

/** Gaya dasar autoTable: plain, header rule tegas, baris hairline, foot tanpa blok. */
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

export interface SummaryLine { label: string; value: string; tone?: keyof typeof C }

/** Ringkasan gaya akuntansi: key-value kanan + total ber-double-rule. */
export function drawSummary(
  doc: jsPDF, y: number, lines: SummaryLine[],
  total: { label: string; value: string; tone?: keyof typeof C },
  W: number, M: number, width = 80,
): number {
  const x = W - M - width;
  let ly = y + 5;

  lines.forEach((l) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setColor(doc, C.faint);
    doc.text(l.label, x, ly);
    setColor(doc, C[l.tone ?? 'sub'] as RGB);
    doc.text(l.value, x + width, ly, { align: 'right' });
    ly += 7;
  });

  // Rule tegas di atas total, double rule di bawah (gaya tutup buku)
  setDraw(doc, C.ink); doc.setLineWidth(0.35);
  doc.line(x, ly - 3.2, x + width, ly - 3.2);
  ly += 2.5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); setColor(doc, C.ink);
  doc.text(total.label, x, ly);
  setColor(doc, C[total.tone ?? 'ink'] as RGB);
  doc.text(total.value, x + width, ly, { align: 'right' });
  ly += 3.2;
  doc.setLineWidth(0.3); setDraw(doc, C.ink);
  doc.line(x, ly, x + width, ly);
  doc.line(x, ly + 0.9, x + width, ly + 0.9);

  return ly + 1;
}

/** Blok tanda tangan 3 kolom. */
export function drawSignatures(doc: jsPDF, y: number, W: number, M: number): void {
  const colW = (W - 2 * M) / 3;
  SIGNERS.forEach((p, i) => {
    const cx = M + colW * i + colW / 2;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setColor(doc, C.faint);
    doc.text(p.role, cx, y, { align: 'center' });
    setDraw(doc, C.line); doc.setLineWidth(0.3);
    doc.line(cx - 26, y + 16, cx + 26, y + 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setColor(doc, C.ink);
    doc.text(p.name, cx, y + 21.5, { align: 'center' });
  });
}

/** Footer halaman: caption kecil di tengah. */
export function drawFooter(doc: jsPDF, W: number, H: number, tanggalCetak: string): void {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); setColor(doc, C.muted);
  doc.text(`Dicetak ${tanggalCetak}  ·  Hadiran RT Digital System`, W / 2, H - 8, { align: 'center' });
}
