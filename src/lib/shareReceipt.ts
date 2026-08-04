import { LOGO_DATA_URL } from './logoBase64';
import { CETAK } from './warnaCetak';

export interface ReceiptRow {
  label: string;
  value: string;
  /**
   * Bentuk baris. Tanpa `kind` = baris detail polos (perilaku lama, dipakai
   * Jadwal & Kas Hadiran) — jangan diubah.
   *   'section' = kepala kelompok + subtotal di kanan (mis. PENERIMAAN)
   *   'total'   = baris kesimpulan bertekanan berpita tint (mis. Saldo Bersih)
   */
  kind?: 'section' | 'total';
  /** Warna nilai: hijau (uang masuk) / merah (uang keluar). Default ink. */
  tone?: 'pos' | 'neg';
}

export interface ReceiptList {
  heading: string;      // mis. "Tidak Hadir (14)"
  items: string[];      // daftar nama, dirender bernomor untuk kontrol cek-fisik
}

export interface ReceiptData {
  title: string;        // mis. "Ringkasan Kas RT"
  amountLabel: string;  // mis. "Saldo Bersih"
  amount: string;       // sudah diformat, mis. "Rp1.250.000"
  rows: ReceiptRow[];
  list?: ReceiptList;   // opsional: daftar nama bernomor (mis. nama tidak hadir)
  shareText: string;    // teks pendamping saat share
}

/** Geometri kartu struk — MURNI (tanpa canvas/DOM) supaya bisa diuji.
 *
 *  Kalau tinggi ini salah, isi struk terpotong atau mengambang di PNG yang
 *  dibagikan bendahara ke grup WA — dan tak ada yang menyadarinya sampai sudah
 *  tersebar. Konstanta di sini adalah SATU SUMBER: `shareReceipt()` menggambar
 *  memakai nilai yang dikembalikan fungsi ini, bukan angka tulis-tangan.
 */
export const STRUK = {
  W: 380,
  rowsCardTop: 250,
  H_SECTION: 34,
  H_DETAIL: 32,
  H_TOTAL: 46,
  LIST_GAP: 14,
  LIST_TOP_PAD: 18,
  LIST_HEAD_H: 22,
  LIST_ITEM_H: 24,
  LIST_BOT_PAD: 14,
  FOOTER: 52,
} as const;

export interface GeometriStruk {
  /** true = ada baris ber-`kind` → mode berseksi. */
  hasGroups: boolean;
  rowsCardH: number;
  listCardTop: number;
  listCardH: number;
  /** Tinggi total kanvas. */
  H: number;
}

export function hitungGeometriStruk(data: Pick<ReceiptData, 'rows' | 'list'>): GeometriStruk {
  const {
    rowsCardTop, H_SECTION, H_DETAIL, H_TOTAL,
    LIST_GAP, LIST_TOP_PAD, LIST_HEAD_H, LIST_ITEM_H, LIST_BOT_PAD, FOOTER,
  } = STRUK;

  // Mode BERSEKSI aktif hanya bila ada baris ber-`kind` (kartu Kas RT dgn
  // rincian kategori). Tanpa itu → geometri lama PERSIS, supaya struk
  // Jadwal/Kas Hadiran tidak ikut berubah. Sifat opt-in ini dikunci uji.
  const hasGroups = data.rows.some((r) => r.kind);
  const rowH = (r: ReceiptRow) =>
    r.kind === 'section' ? H_SECTION : r.kind === 'total' ? H_TOTAL : H_DETAIL;
  const rowsCardH = hasGroups
    ? data.rows.reduce((s, r) => s + rowH(r), 0) + 24
    : 36 * data.rows.length + 16;

  let contentBottom = rowsCardTop + rowsCardH;
  const items = data.list?.items ?? [];
  let listCardTop = 0, listCardH = 0;
  if (items.length) {
    listCardTop = contentBottom + LIST_GAP;
    listCardH = LIST_TOP_PAD + LIST_HEAD_H + items.length * LIST_ITEM_H + LIST_BOT_PAD;
    contentBottom = listCardTop + listCardH;
  }
  return { hasGroups, rowsCardH, listCardTop, listCardH, H: contentBottom + FOOTER };
}

/** Bentuk minimal `navigator` yang dipakai saat membagikan — supaya bisa diuji. */
export interface NavBagikan {
  canShare?: (d: { files?: File[] }) => boolean;
  share?: (d: { files?: File[]; text?: string; title?: string }) => Promise<void>;
}

/**
 * Bagikan file gambar. Web Share API dulu; gagal/tak didukung → unduh + buka WA.
 *
 * WAJIB files-only: WhatsApp MENOLAK share yang mencampur file dengan
 * `title`/`text` — sharenya "mental balik" tanpa lampiran, jadi bendahara
 * mengira kartunya terkirim padahal grup cuma menerima teks. Aturan yang sama
 * sudah dipakai `pdfOut.ts`; dua pembuat kartu PNG (struk & laporan kas) dulu
 * masih menyertakan title/text. Nama file sudah deskriptif sebagai gantinya.
 * Teks pendamping tetap dipakai di jalur fallback wa.me.
 */
export async function bagikanFileGambar(
  file: File,
  shareText: string,
  nav: NavBagikan = navigator as NavBagikan,
): Promise<'share' | 'batal' | 'fallback'> {
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file] });
      return 'share';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'batal'; // user batal
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  return 'fallback';
}

const rupiahFont = "'Inter Variable', Inter, system-ui, -apple-system, sans-serif";
// Nominal & brand memakai Sora (font-display app) → struk share = suara visual
// yang sama dgn hero in-app, bukan Inter polos.
const displayFont = `'Sora Variable', Sora, ${rupiahFont}`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Render kartu receipt bermerek jadi PNG lalu bagikan (Web Share API + fallback WA). */
/** Potong teks dgn elipsis agar muat dalam lebar maksimum (canvas). */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

export async function shareReceipt(data: ReceiptData): Promise<void> {
  const W = 380;

  // Pastikan Sora/Inter siap sebelum menggambar — tanpa ini canvas diam-diam
  // jatuh ke font sistem (struk terlihat "bukan app kita").
  try { await document.fonts.ready; } catch { /* lanjut dgn fallback */ }

  // Geometri dari satu sumber murni (teruji) — bukan hitungan tulis-tangan.
  const { hasGroups, rowsCardH, listCardTop, listCardH, H } = hitungGeometriStruk(data);
  const { rowsCardTop, H_SECTION, H_DETAIL, H_TOTAL, LIST_TOP_PAD, LIST_HEAD_H, LIST_ITEM_H } = STRUK;
  const rowH = (r: ReceiptRow) =>
    r.kind === 'section' ? H_SECTION : r.kind === 'total' ? H_TOTAL : H_DETAIL;
  const items = data.list?.items ?? [];

  const scale = Math.min(3, window.devicePixelRatio || 2) * 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Latar — kanvas app (token `sunken`).
  ctx.fillStyle = CETAK.canvas;
  ctx.fillRect(0, 0, W, H);

  // Kartu hero — ramp `.hero-emerald`. Sampai 4 Agu 2026 komentar di sini
  // mengaku "SATU sumber dgn index.css" sambil menyalin nilainya tangan, jadi
  // begitu ramp app diturunkan (13 Jul lalu 4 Agu) kartu yang dikirim ke WA
  // tetap memakai hijau versi lama. Kini benar-benar satu sumber: CETAK.
  const grad = ctx.createLinearGradient(20, 20, W - 60, 230);
  grad.addColorStop(0, CETAK.heroRamp[0]);
  grad.addColorStop(0.52, CETAK.heroRamp[1]);
  grad.addColorStop(1, CETAK.heroRamp[2]);
  ctx.fillStyle = grad;
  roundRect(ctx, 20, 20, W - 40, 200, 24);
  ctx.fill();
  // Scrim AA pojok kiri-atas (paritas .hero-emerald): zona start jewel terlalu
  // terang utk teks putih kecil — radial gelap tipis hanya di pojok itu.
  const scrim = ctx.createRadialGradient(20, 20, 0, 20, 20, 250);
  scrim.addColorStop(0, 'rgba(4, 38, 24, 0.48)');
  scrim.addColorStop(0.55, 'rgba(4, 38, 24, 0)');
  ctx.save();
  roundRect(ctx, 20, 20, W - 40, 200, 24);
  ctx.clip();
  ctx.fillStyle = scrim;
  ctx.fillRect(20, 20, W - 40, 200);
  ctx.restore();

  // Logo + brand
  try {
    const logo = await loadImage(LOGO_DATA_URL);
    ctx.save();
    roundRect(ctx, 40, 42, 34, 34, 17);
    ctx.clip();
    ctx.drawImage(logo, 40, 42, 34, 34);
    ctx.restore();
  } catch {
    /* logo opsional */
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 16px ${displayFont}`; // brandmark = Sora, paritas header app
  ctx.textBaseline = 'middle';
  ctx.fillText('Hadiran RT', 84, 53);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `500 11px ${rupiahFont}`;
  ctx.fillText('RT 004 / RW 006', 84, 70);

  // Label + nominal besar (eyebrow ber-tracking + Sora, paritas hero in-app)
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 11px ${rupiahFont}`;
  try { ctx.letterSpacing = '1.5px'; } catch { /* browser lama: tanpa tracking */ }
  ctx.fillText(data.amountLabel.toUpperCase(), 40, 120);
  try { ctx.letterSpacing = '0px'; } catch { /* noop */ }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 40px ${displayFont}`;
  ctx.fillText(data.amount, 40, 158);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `500 11px ${rupiahFont}`;
  ctx.fillText(data.title, 40, 195);

  // Baris detail (kartu putih FLAT ber-hairline — bahasa kartu app)
  let y = rowsCardTop;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 20, y, W - 40, rowsCardH, 20);
  ctx.fill();
  ctx.strokeStyle = CETAK.line; // tepi kartu "tercetak"
  ctx.lineWidth = 1;
  roundRect(ctx, 20.5, y + 0.5, W - 41, rowsCardH - 1, 20);
  ctx.stroke();
  if (!hasGroups) {
    y += 26;
    data.rows.forEach((row, i) => {
      ctx.fillStyle = CETAK.faint;
      ctx.font = `500 13px ${rupiahFont}`;
      ctx.textAlign = 'left';
      ctx.fillText(row.label, 40, y);
      ctx.fillStyle = CETAK.ink;
      ctx.font = `700 13px ${rupiahFont}`;
      ctx.textAlign = 'right';
      ctx.fillText(row.value, W - 40, y);
      ctx.textAlign = 'left';
      // Divider inset antar-baris (lebih terang dari border kartu — pola list app)
      if (i < data.rows.length - 1) {
        ctx.strokeStyle = CETAK.divider;
        ctx.beginPath();
        ctx.moveTo(40, y + 18);
        ctx.lineTo(W - 40, y + 18);
        ctx.stroke();
      }
      y += 36;
    });
  } else {
    // ── Mode berseksi: PENERIMAAN/PENGELUARAN + rincian kategori + total ──
    // Tipografi sengaja SATU step lebih besar dari mode lama (detail 13→14,
    // total 17): kartu ini dibaca warga (banyak lansia) di grup WA, bukan
    // dipindai bendahara. Warna nilai = token uang app lewat CETAK.
    const POS = CETAK.pos, NEG = CETAK.neg;
    const toneColor = (r: ReceiptRow) => (r.tone === 'pos' ? POS : r.tone === 'neg' ? NEG : CETAK.ink);
    let ry = y + 12;
    data.rows.forEach((row, i) => {
      const h = rowH(row);
      const cy = ry + h / 2;

      if (row.kind === 'section') {
        // Hairline pemisah DI ATAS kepala kelompok (bukan antar tiap baris) →
        // rincian terbaca menempel pada kelompoknya, bukan deretan seragam.
        if (i > 0) {
          ctx.strokeStyle = CETAK.divider;
          ctx.beginPath();
          ctx.moveTo(40, ry);
          ctx.lineTo(W - 40, ry);
          ctx.stroke();
        }
        ctx.textAlign = 'left';
        ctx.fillStyle = CETAK.muted;
        ctx.font = `700 12px ${rupiahFont}`;
        try { ctx.letterSpacing = '1px'; } catch { /* browser lama */ }
        ctx.fillText(row.label.toUpperCase(), 40, cy);
        try { ctx.letterSpacing = '0px'; } catch { /* noop */ }
        ctx.textAlign = 'right';
        ctx.fillStyle = toneColor(row);
        ctx.font = `700 14px ${rupiahFont}`;
        ctx.fillText(row.value, W - 40, cy);
      } else if (row.kind === 'total') {
        ctx.fillStyle = CETAK.posTint;
        roundRect(ctx, 32, ry + 4, W - 64, h - 10, 12);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = CETAK.pos;
        ctx.font = `700 15px ${rupiahFont}`;
        ctx.fillText(row.label, 44, cy);
        ctx.textAlign = 'right';
        ctx.fillStyle = row.value.trim().startsWith('-') ? NEG : CETAK.pos;
        ctx.font = `800 17px ${displayFont}`;
        ctx.fillText(row.value, W - 44, cy);
      } else {
        // Detail kategori — diindent 12px supaya jelas "milik" kelompok di atasnya.
        ctx.textAlign = 'left';
        ctx.fillStyle = CETAK.faint;
        ctx.font = `500 14px ${rupiahFont}`;
        ctx.fillText(fitText(ctx, row.label, W - 80 - 128), 52, cy);
        ctx.textAlign = 'right';
        ctx.fillStyle = toneColor(row);
        ctx.font = `700 14px ${rupiahFont}`;
        ctx.fillText(row.value, W - 40, cy);
      }
      ctx.textAlign = 'left';
      ry += h;
    });
  }

  // Kartu daftar nama bernomor (mis. tidak hadir) — untuk kontrol cek-fisik
  if (items.length) {
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 20, listCardTop, W - 40, listCardH, 20);
    ctx.fill();
    ctx.strokeStyle = CETAK.line;
    ctx.lineWidth = 1;
    roundRect(ctx, 20.5, listCardTop + 0.5, W - 41, listCardH - 1, 20);
    ctx.stroke();
    // Heading
    ctx.fillStyle = CETAK.warn; // selaras "tidak hadir / perhatian"
    ctx.font = `700 11px ${rupiahFont}`;
    ctx.textAlign = 'left';
    ctx.fillText((data.list!.heading).toUpperCase(), 40, listCardTop + LIST_TOP_PAD + LIST_HEAD_H / 2);
    // Item bernomor
    let ly = listCardTop + LIST_TOP_PAD + LIST_HEAD_H + LIST_ITEM_H / 2;
    items.forEach((nama, i) => {
      ctx.fillStyle = CETAK.muted; // nomor — dulu gray-400 (di bawah standar kontras)
      ctx.font = `600 12px ${rupiahFont}`;
      ctx.fillText(`${i + 1}.`, 40, ly);
      ctx.fillStyle = CETAK.ink;
      ctx.font = `500 13px ${rupiahFont}`;
      ctx.fillText(fitText(ctx, nama, W - 40 - 64), 64, ly);
      ly += LIST_ITEM_H;
    });
  }

  // Footer
  const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillStyle = CETAK.muted; // tangga kontras: footer minimal setara gray-400 remap
  ctx.font = `500 11px ${rupiahFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Dibuat ${tgl} · Hadiran RT`, W / 2, H - 28);
  ctx.textAlign = 'left';

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gagal'))), 'image/png')
  );
  const file = new File([blob], 'hadiran-rt.png', { type: 'image/png' });
  await bagikanFileGambar(file, data.shareText);
}
