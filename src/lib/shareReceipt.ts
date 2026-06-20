import { LOGO_DATA_URL } from './logoBase64';

export interface ReceiptRow {
  label: string;
  value: string;
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

const rupiahFont = 'Inter, system-ui, -apple-system, sans-serif';

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

  // Tinggi dinamis: baris detail + (opsional) kartu daftar nama + footer.
  const rowsCardTop = 250;
  const rowsCardH = 36 * data.rows.length + 16;
  let contentBottom = rowsCardTop + rowsCardH;

  const items = data.list?.items ?? [];
  const LIST_GAP = 14, LIST_TOP_PAD = 18, LIST_HEAD_H = 22, LIST_ITEM_H = 24, LIST_BOT_PAD = 14;
  let listCardTop = 0, listCardH = 0;
  if (items.length) {
    listCardTop = contentBottom + LIST_GAP;
    listCardH = LIST_TOP_PAD + LIST_HEAD_H + items.length * LIST_ITEM_H + LIST_BOT_PAD;
    contentBottom = listCardTop + listCardH;
  }
  const H = contentBottom + 52; // ruang footer

  const scale = Math.min(3, window.devicePixelRatio || 2) * 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Latar
  ctx.fillStyle = '#EEF2F6';
  ctx.fillRect(0, 0, W, H);

  // Kartu hero hijau (gradient)
  const grad = ctx.createLinearGradient(20, 20, W - 20, 230);
  grad.addColorStop(0, '#0F4C2E');
  grad.addColorStop(0.5, '#145D39');
  grad.addColorStop(1, '#1B7249');
  ctx.fillStyle = grad;
  roundRect(ctx, 20, 20, W - 40, 200, 24);
  ctx.fill();

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
  ctx.font = `700 16px ${rupiahFont}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Hadiran RT', 84, 53);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 11px ${rupiahFont}`;
  ctx.fillText('RT 004 / RW 006', 84, 70);

  // Label + nominal besar
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `700 11px ${rupiahFont}`;
  ctx.fillText(data.amountLabel.toUpperCase(), 40, 120);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 40px ${rupiahFont}`;
  ctx.fillText(data.amount, 40, 158);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 11px ${rupiahFont}`;
  ctx.fillText(data.title, 40, 195);

  // Baris detail (kartu putih)
  let y = rowsCardTop;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 20, y, W - 40, rowsCardH, 20);
  ctx.fill();
  y += 26;
  data.rows.forEach((row) => {
    ctx.fillStyle = '#6B7280';
    ctx.font = `500 13px ${rupiahFont}`;
    ctx.textAlign = 'left';
    ctx.fillText(row.label, 40, y);
    ctx.fillStyle = '#111827';
    ctx.font = `700 13px ${rupiahFont}`;
    ctx.textAlign = 'right';
    ctx.fillText(row.value, W - 40, y);
    ctx.textAlign = 'left';
    y += 36;
  });

  // Kartu daftar nama bernomor (mis. tidak hadir) — untuk kontrol cek-fisik
  if (items.length) {
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 20, listCardTop, W - 40, listCardH, 20);
    ctx.fill();
    // Heading
    ctx.fillStyle = '#B45309'; // warn — selaras "tidak hadir / perhatian"
    ctx.font = `700 11px ${rupiahFont}`;
    ctx.textAlign = 'left';
    ctx.fillText((data.list!.heading).toUpperCase(), 40, listCardTop + LIST_TOP_PAD + LIST_HEAD_H / 2);
    // Item bernomor
    let ly = listCardTop + LIST_TOP_PAD + LIST_HEAD_H + LIST_ITEM_H / 2;
    items.forEach((nama, i) => {
      ctx.fillStyle = '#9CA3AF';
      ctx.font = `600 12px ${rupiahFont}`;
      ctx.fillText(`${i + 1}.`, 40, ly);
      ctx.fillStyle = '#111827';
      ctx.font = `500 13px ${rupiahFont}`;
      ctx.fillText(fitText(ctx, nama, W - 40 - 64), 64, ly);
      ly += LIST_ITEM_H;
    });
  }

  // Footer
  const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `500 11px ${rupiahFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Dibuat ${tgl} · Hadiran RT`, W / 2, H - 28);
  ctx.textAlign = 'left';

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gagal'))), 'image/png')
  );
  const file = new File([blob], 'hadiran-rt.png', { type: 'image/png' });

  // Web Share API dengan file (Android/iOS modern → bisa pilih WhatsApp)
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: data.shareText, title: 'Hadiran RT' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user batal
    }
  }

  // Fallback: unduh gambar + buka WhatsApp dengan teks
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hadiran-rt.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  window.open(`https://wa.me/?text=${encodeURIComponent(data.shareText)}`, '_blank');
}
