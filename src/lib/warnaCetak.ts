/**
 * Warna untuk permukaan KELUARAN — PDF, kartu PNG yang dikirim ke WhatsApp,
 * dan ringkasan bagikan. SATU sumber; jangan tulis hex di berkas keluaran lagi.
 *
 * ── Kenapa berkas ini ada (4 Agu 2026) ────────────────────────────────────
 * Tiga berkas keluaran (`pdfTheme.ts`, `shareReceipt.ts`, `shareLaporanKas.ts`)
 * masing-masing menyimpan palet sendiri, dan tiap paletnya membawa komentar
 * yang menyatakan dirinya "selaras token app" / "SATU sumber dgn .hero-emerald".
 * Niatnya benar, mekanismenya tidak ada: yang menyalin nilai tak punya cara
 * tahu kalau sumbernya berubah. Hasilnya tiap berkas membeku di generasi token
 * yang berbeda-beda, dan tak satu pun ikut naik saat ambang app dinaikkan
 * AA → AAA:
 *
 *   pdfTheme         pos #047857 · neg #DC2626 · warn #B45309 · line #E5E7EB
 *   shareReceipt     pos #047857 · neg #BE123C · warn #B45309 · line #C5CFDB
 *   shareLaporanKas  pos #047857 · neg #DC2626 · label #9CA3AF (2,50:1 di putih)
 *   token app kini   pos #05543E · neg #941136 · warn #78350F · line #B8C4D3
 *
 * Ini bukan soal rapi-rapi. Kartu PNG-lah yang benar-benar dilihat warga di
 * WhatsApp, dan PDF-lah yang dicetak & diarsipkan — dua permukaan yang paling
 * tak toleran pada abu muda (toner laser memudarkannya lagi). Seluruh kerja
 * kontras app berhenti di layar dan tak pernah sampai ke sini.
 *
 * ── Aturan ────────────────────────────────────────────────────────────────
 * Nilai di sini WAJIB cermin token app (`tailwind.config.js` + `index.css`).
 * Kalau token app berubah, ubah di sini juga — dan jangan menambah warna yang
 * tak punya padanan di app: keluaran bukan tempat memperkenalkan warna baru.
 */

export const CETAK = {
  // Permukaan & garis
  canvas:  '#EBF3EE', // = token `sunken` / body / .app-bg (palet Hutan, 24 Agu 2026)
  surface: '#FFFFFF',
  line:    '#B8C4D3', // = token `line` (tepi kartu)
  divider: '#D1DAE5', // = hairline antar-baris (.divide-inset)

  // Tangga teks — `muted` adalah yang PALING terang yang boleh dipakai
  ink:   '#0B1220', // judul & nominal utama
  sub:   '#1F2937', // = token `ink.sub`, isi tabel
  faint: '#334155', // = token `ink.faint`, label & caption
  muted: '#475569', // footer / nomor urut (7,58:1 di putih) — batas bawah

  // Brand & uang (satu hijau, satu merah, satu amber)
  brand: '#0F4C2E', // = token `brand.DEFAULT`, wordmark & aksen tunggal
  pos:   '#05543E', // = token `pos`
  neg:   '#941136', // = token `neg`
  warn:  '#78350F', // = token `warn`

  posTint: '#ECFDF5', // emerald-50 — fill baris saldo di kartu PNG

  /** Ramp kartu hero — cermin `.hero-emerald` di index.css (pass 4 Agu). */
  heroRamp: ['#0A5230', '#08492B', '#032A17'] as const,
  /** Scrim pojok kiri-atas hero — paritas `.hero-emerald`. */
  heroScrim: 'rgba(4, 38, 24, 0.48)',
} as const;

/** '#0B1220' → 'FF0B1220'. ExcelJS minta ARGB (alfa di DEPAN), bukan '#rrggbb'. */
export function argb(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase();
}

/** '#0B1220' → [11, 18, 32]. jsPDF minta komponen RGB, bukan string hex. */
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
