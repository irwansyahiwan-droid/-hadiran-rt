import type { Workbook, Worksheet, Borders, Cell } from 'exceljs';
import { CETAK, argb } from './warnaCetak';

/* Excel ikut `warnaCetak.ts` (4 Agu 2026, susulan pass cetak).
   Pass sebelumnya menyatukan PDF & kartu PNG lalu berhenti di tiga berkas yang
   ter-grep — Excel tak ikut, padahal ia keluaran juga. Yang tertinggal di sini
   persis kelas nilai yang sudah dibuang dari permukaan lain:
     ZEBRA  #F1F5F9 → kanvas app #ECF1F7
     border #E2E8F0 → token `line` #B8C4D3 (yg lama lebih terang dari hairline app)
     subjudul #94A3B8 → `muted` #475569 — #94A3B8 cuma 2,50:1 di atas putih,
       dan lembar ini yang dibuka bendahara di layar laptop lalu dicetak.
   `BRAND` sudah benar sejak dulu; kini ia pun tak lagi ditulis tangan. */
export const BRAND = argb(CETAK.brand);
export const ZEBRA = argb(CETAK.canvas);

/**
 * TINTA ARAH UANG — cermin keputusan yang sudah diambil PDF, bukan pilihan
 * baru untuk Excel.
 *
 * Sampai 5 Sep 2026 Excel mencetak SELURUH angkanya hitam, termasuk "Talangan
 * Belum Lunas". PDF-nya sejak lama mewarnai arah uang (`pos`/`neg`/`warn`) dan
 * app pun begitu — jadi lembar yang paling sering dibuka bendahara justru satu-
 * satunya permukaan yang membuang tangga warna app. Itu bukan perbedaan MEDIA
 * (Excel mendukung warna dgn baik), melainkan permukaan yang tak pernah
 * ditengok.
 */
export const TINTA = {
  pos:  argb(CETAK.pos),
  neg:  argb(CETAK.neg),
  warn: argb(CETAK.warn),
  ink:  argb(CETAK.ink),
} as const;

/**
 * Warnai satu sel angka menurut arah uangnya.
 *
 * Menyalin `font` yang sudah ada, tidak menimpanya: `r.font = { bold: true }`
 * di baris total akan HILANG kalau sel diberi objek font baru — dan hilangnya
 * senyap, cuma terlihat kalau seseorang membuka berkasnya.
 */
export function warnaiUang(cell: Cell, tone: keyof typeof TINTA): void {
  cell.font = { ...(cell.font ?? {}), color: { argb: TINTA[tone] } };
}

const thin = { style: 'thin' as const, color: { argb: argb(CETAK.line) } };
export const border: Partial<Borders> = { top: thin, left: thin, bottom: thin, right: thin };

/** Judul + subjudul (baris 1–2) yang di-merge selebar tabel. */
export function titleBlock(ws: Worksheet, title: string, subtitle: string, cols: number): void {
  ws.mergeCells(1, 1, 1, cols);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { bold: true, size: 14, color: { argb: BRAND } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, cols);
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { size: 10, color: { argb: argb(CETAK.muted) } };
  ws.getRow(2).height = 16;
}

/**
 * Header tabel berwarna brand di baris `rowIndex`.
 *
 * MELIPAT, bukan terpotong (29 Sep 2026). Tingginya dulu dipaku 18 tanpa
 * `wrapText`, jadi kepala yang lebih lebar dari kolomnya terpotong di KEDUA
 * sisi (rata tengah) — Excel sungguhan mencetak "Kas Terkumpul (Rp)Pendapatan
 * Kotor SB (Rp)" berdempet tanpa satu huruf pun jarak. Tinggi baris kini
 * lahir dari jumlah baris kepala terpanjang; huruf tebal ±10% lebih lebar
 * daripada satuan lebar kolom Excel (lebar satu "0" huruf biasa).
 */
export function headerRow(ws: Worksheet, rowIndex: number, headers: string[]): void {
  const r = ws.getRow(rowIndex);
  let baris = 1;
  headers.forEach((h, i) => {
    const c = r.getCell(i + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    c.font = { bold: true, color: { argb: argb(CETAK.surface) }, size: 11 };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = border;
    baris = Math.max(baris, Math.ceil((h.length * 1.1) / (ws.getColumn(i + 1).width ?? 10)));
  });
  r.height = baris === 1 ? 18 : 15 * baris + 4;
}

/**
 * TANGGAL SUNGGUHAN, bukan teks (29 Sep 2026). Sel tanggal dulu berisi teks
 * "Sab, 26 Sep 2026", jadi mengurutkan kolom Tanggal di Excel menyusunnya
 * menurut NAMA HARI ("Jum…", "Kam…", "Min…") dan filter tak bisa memilih
 * bulan — padahal lembar ini justru tempat bendahara menyortir & mem-pivot.
 *
 * TANPA nama hari (keputusan user): nama hari di sel tanggal ditulis oleh
 * tabel lokal Excel, bukan oleh app — Excel Mac menulis Minggu "Mgg" sedangkan
 * app & PDF "Min", dan peramban lembar lain punya tabelnya sendiri. Bulan
 * lewat `[$-421]` (Indonesia): "Mei", "Agu" — terverifikasi di Excel.
 * Dibangun di UTC supaya nomor seri Excel-nya bulat (exceljs mengonversi
 * lewat UTC) — tengah malam WIB akan jatuh ke tanggal kemarin.
 */
export const FMT_TANGGAL = '[$-421]d mmm yyyy';
export function selTanggal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * SIAP CETAK (29 Sep 2026). Tak satu sheet pun dulu punya `pageSetup`, jadi
 * Excel memakai bawaannya: kertas Letter, skala 100%, kepala tabel tak
 * diulang. Dicetak dari Excel sungguhan, Mutasi Kas RT pecah ke TIGA halaman
 * MENYAMPING — Tanggal/Tipe/Kategori di satu lembar, Keterangan & nominal di
 * lembar kedua, kolom Saldo sendirian di lembar ketiga — dan Rekap Tarikan ke
 * dua. Kini A4, selebar kertas (`fitToHeight: 0` = tinggi bebas, jadi daftar
 * panjang tetap mengalir ke halaman berikut alih-alih diperas jadi satu), dan
 * baris kepala diulang di tiap halaman. Kaki mencermin `drawFooter` PDF.
 */
export function siapCetak(ws: Worksheet, { lanskap = false, barisKepala }: { lanskap?: boolean; barisKepala?: number } = {}): void {
  ws.pageSetup = {
    paperSize: 9,
    orientation: lanskap ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.7, header: 0.3, footer: 0.3 },
    ...(barisKepala ? { printTitlesRow: `${barisKepala}:${barisKepala}` } : {}),
  };
  ws.headerFooter = { oddFooter: '&C&8Hadiran RT Digital System&R&8Hal. &P/&N' };
}

/** Tulis workbook ke file .xlsx dan picu unduhan. */
export async function downloadWorkbook(wb: Workbook, filename: string): Promise<void> {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function stampLong(): string {
  return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
