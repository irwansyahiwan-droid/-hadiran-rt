import { LOGO_DATA_URL } from './logoBase64';

/**
 * Data satu kartu laporan kas (dipakai untuk "Tutup Buku Sekarang" maupun
 * tiap triwulan). Semua nominal angka mentah — diformat di sini.
 */
export interface LaporanKasCard {
  title: string;        // mis. 'Tutup Buku · Posisi Kas'
  periodeLabel: string; // mis. 'Per 10 Juni 2026' / 'Triwulan II 2026'
  rentang: string;      // mis. 's/d 10 Jun 2026' / 'Apr–Jun 2026'
  hadiranMasuk: number;
  hadiranKeluar: number;
  hadiranSaldoAkhir: number;
  rtMasuk: number;
  rtKeluar: number;
  rtSaldoAkhir: number;
  tarikanSelesai: number;
  talanganLunas: number;
  jumlahTransaksi: number;
  shareText: string;    // teks pendamping saat share ke WA
}

const FONT = 'Inter, system-ui, -apple-system, sans-serif';

function rp(n: number) {
  const s = `Rp${Math.abs(n).toLocaleString('id-ID')}`;
  return n < 0 ? `-${s}` : s;
}

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

// ── Metrik layout (px) ──────────────────────────────────────────
const W = 384;
const PAD = 20;          // margin luar kartu
const IX = PAD;          // x kiri panel
const IW = W - 2 * PAD;  // lebar panel
const HERO_H = 190;
const GAP = 14;
const PANEL_PAD_T = 16;
const PANEL_TITLE = 24;
const ROW_H = 28;
const PANEL_PAD_B = 12;
const PANEL_GAP = 12;
const ACT_H = 38;
const FOOTER_H = 40;

const panelH = PANEL_PAD_T + PANEL_TITLE + 3 * ROW_H + PANEL_PAD_B;

/** Render kartu laporan kas → PNG → bagikan (Web Share API + fallback WA). */
export async function shareLaporanKas(d: LaporanKasCard): Promise<void> {
  const grandSaldo = d.hadiranSaldoAkhir + d.rtSaldoAkhir;

  // Tinggi total dihitung dulu → kanvas pas, isi TIDAK akan terpotong.
  const H =
    PAD + HERO_H + GAP + panelH + PANEL_GAP + panelH + GAP + ACT_H + FOOTER_H;

  const scale = Math.min(3, window.devicePixelRatio || 2) * 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.textBaseline = 'alphabetic';

  // Latar
  ctx.fillStyle = '#EEF2F6';
  ctx.fillRect(0, 0, W, H);

  // ── Hero hijau ──────────────────────────────────────────────
  const hx = PAD, hy = PAD, hw = IW, hh = HERO_H;
  const grad = ctx.createLinearGradient(hx, hy, hx + hw, hy + hh);
  grad.addColorStop(0, '#0F4C2E');
  grad.addColorStop(0.5, '#145D39');
  grad.addColorStop(1, '#1B7249');
  ctx.fillStyle = grad;
  roundRect(ctx, hx, hy, hw, hh, 24);
  ctx.fill();

  // Logo + brand
  try {
    const logo = await loadImage(LOGO_DATA_URL);
    ctx.save();
    roundRect(ctx, hx + 20, hy + 22, 34, 34, 17);
    ctx.clip();
    ctx.drawImage(logo, hx + 20, hy + 22, 34, 34);
    ctx.restore();
  } catch { /* logo opsional */ }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText('Hadiran RT', hx + 64, hy + 35);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 11px ${FONT}`;
  ctx.fillText('RT 004 / RW 006', hx + 64, hy + 50);

  // Label + saldo besar (auto-shrink agar tak melebihi kartu)
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText(d.title.toUpperCase(), hx + 20, hy + 96);

  const amountStr = rp(grandSaldo);
  let fs = 40;
  ctx.font = `800 ${fs}px ${FONT}`;
  while (ctx.measureText(amountStr).width > hw - 40 && fs > 22) {
    fs -= 1;
    ctx.font = `800 ${fs}px ${FONT}`;
  }
  ctx.fillStyle = grandSaldo < 0 ? '#FCA5A5' : '#FFFFFF';
  ctx.fillText(amountStr, hx + 20, hy + 134);

  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `500 11.5px ${FONT}`;
  ctx.fillText(`${d.periodeLabel} · ${d.rentang}`, hx + 20, hy + 162);

  // ── Panel ledger ────────────────────────────────────────────
  function drawPanel(y: number, judul: string, masuk: number, keluar: number, saldo: number) {
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, IX, y, IW, panelH, 18);
    ctx.fill();

    // Judul
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9CA3AF';
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText(judul.toUpperCase(), IX + 16, y + PANEL_PAD_T + 12);

    const rows: { label: string; val: number; minus?: boolean; saldo?: boolean }[] = [
      { label: 'Masuk', val: masuk },
      { label: 'Keluar', val: keluar, minus: true },
      { label: 'Saldo akhir', val: saldo, saldo: true },
    ];
    let ry = y + PANEL_PAD_T + PANEL_TITLE;
    rows.forEach((r) => {
      if (r.saldo) {
        ctx.fillStyle = '#ECFDF5';
        roundRect(ctx, IX + 8, ry - 4, IW - 16, ROW_H - 6, 8);
        ctx.fill();
      }
      const cy = ry + ROW_H / 2 + 1;
      // label
      ctx.textAlign = 'left';
      ctx.font = `${r.saldo ? '700' : '500'} 13px ${FONT}`;
      ctx.fillStyle = r.saldo ? '#065F46' : '#6B7280';
      ctx.fillText(r.label, IX + 16, cy);
      // value
      ctx.textAlign = 'right';
      ctx.font = `700 13px ${FONT}`;
      ctx.fillStyle = r.saldo
        ? (r.val < 0 ? '#DC2626' : '#065F46')
        : r.minus ? '#DC2626' : '#047857';
      const valStr = r.minus && r.val > 0 ? `-${rp(r.val)}` : rp(r.val);
      ctx.fillText(valStr, IX + IW - 16, cy);
      ry += ROW_H;
    });
  }

  let y = PAD + HERO_H + GAP;
  drawPanel(y, 'Kas Hadiran', d.hadiranMasuk, d.hadiranKeluar, d.hadiranSaldoAkhir);
  y += panelH + PANEL_GAP;
  drawPanel(y, 'Kas RT', d.rtMasuk, d.rtKeluar, d.rtSaldoAkhir);
  y += panelH + GAP;

  // ── Baris aktivitas (satu baris, terpusat) ──────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6B7280';
  ctx.font = `500 11.5px ${FONT}`;
  ctx.fillText(
    `${d.tarikanSelesai} tarikan · ${d.talanganLunas} talangan lunas · ${d.jumlahTransaksi} transaksi`,
    W / 2,
    y + 22,
  );
  y += ACT_H;

  // ── Footer ──────────────────────────────────────────────────
  const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `500 11px ${FONT}`;
  ctx.fillText(`Dibuat ${tgl} · Hadiran RT`, W / 2, y + 18);
  ctx.textAlign = 'left';

  // ── Output + share ──────────────────────────────────────────
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gagal'))), 'image/png'),
  );
  const file = new File([blob], 'laporan-kas-hadiran-rt.png', { type: 'image/png' });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: d.shareText, title: 'Hadiran RT' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user batal
    }
  }

  // Fallback: unduh PNG + buka WhatsApp dengan teks
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'laporan-kas-hadiran-rt.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  window.open(`https://wa.me/?text=${encodeURIComponent(d.shareText)}`, '_blank');
}
