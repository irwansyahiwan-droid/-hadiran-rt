import { LOGO_DATA_URL } from './logoBase64';
import { bagikanFileGambar } from './shareReceipt';
import { CETAK } from './warnaCetak';
import { formatRupiahPlain } from './utils';

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

/** Nominal BERTANDA untuk kartu ("-Rp390.000"). Dibangun di atas
 *  `formatRupiahPlain` (yang sengaja memakai Math.abs) supaya format "Rp" cuma
 *  punya satu sumber; berkas ini dulu menyalin rumusnya sendiri. Diekspor demi
 *  uji: tanda minus di kartu yang beredar di WA tak boleh salah. */
export function rpBertanda(n: number): string {
  return (n < 0 ? '-' : '') + formatRupiahPlain(n);
}

/** Nominal yang jadi ANGKA UTAMA kartu.
 *
 *  Aturan bisnisnya, bukan pilihan tata letak: Kas RT adalah pool final /
 *  akumulasi, jadi ia yang tampil besar. Saldo Kas Hadiran (yang BELUM disetor)
 *  muncul terpisah di panel dan TIDAK boleh dijumlahkan ke sini — menjumlahkan
 *  keduanya menghitung uang yang sama dua kali di kartu yang dibaca puluhan
 *  warga. Diekspor supaya aturan itu punya uji, bukan cuma komentar. */
export function nominalHeroKartu(d: Pick<LaporanKasCard, 'rtSaldoAkhir'>): number {
  return d.rtSaldoAkhir;
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
  // Kas RT = pool final/akumulasi → jadi angka utama. Saldo Kas Hadiran
  // (belum disetor) ditampilkan terpisah di panel, TIDAK dijumlah ke total.
  const heroAmount = nominalHeroKartu(d);

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

  // Latar — token `sunken` app. Dulu #EEF2F6, tone yang tak pernah ada di app.
  ctx.fillStyle = CETAK.canvas;
  ctx.fillRect(0, 0, W, H);

  // ── Hero hijau ──────────────────────────────────────────────
  const hx = PAD, hy = PAD, hw = IW, hh = HERO_H;
  const grad = ctx.createLinearGradient(hx, hy, hx + hw, hy + hh);
  /* Ramp `.hero-emerald` lewat CETAK. Nilai lama (#0F4C2E→#145D39→#1B7249)
     adalah ramp brand-deep dari sebelum 13 Jul: makin ke kanan makin TERANG,
     kebalikan arah hero app sekarang, dan hijau paling terangnya sudah dua kali
     diturunkan sejak itu karena teks putih kecil di atasnya tak lolos. */
  grad.addColorStop(0, CETAK.heroRamp[0]);
  grad.addColorStop(0.5, CETAK.heroRamp[1]);
  grad.addColorStop(1, CETAK.heroRamp[2]);
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

  const amountStr = rpBertanda(heroAmount);
  let fs = 40;
  ctx.font = `800 ${fs}px ${FONT}`;
  while (ctx.measureText(amountStr).width > hw - 40 && fs > 22) {
    fs -= 1;
    ctx.font = `800 ${fs}px ${FONT}`;
  }
  /* Nominal TETAP putih walau minus — DESIGN.stitch §7 melarang mewarnai
     nominal hero salmon/merah ("saldo minus disengaja"; sinyalnya chip KATA,
     bukan rona, karena rona lemah bagi mata yang sulit membedakan warna).
     Kartu ini satu-satunya permukaan yang masih melanggarnya. */
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(amountStr, hx + 20, hy + 134);
  if (heroAmount < 0) {
    // Chip "DEFISIT" — paritas HeroSaldo in-app.
    ctx.font = `700 10px ${FONT}`;
    const cw = ctx.measureText('DEFISIT').width + 16;
    ctx.fillStyle = CETAK.neg;
    roundRect(ctx, hx + 20, hy + 142, cw, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('DEFISIT', hx + 28, hy + 155);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `500 11.5px ${FONT}`;
  ctx.fillText(`${d.periodeLabel} · ${d.rentang}`, hx + 20, hy + 162);

  // ── Panel ledger ────────────────────────────────────────────
  function drawPanel(y: number, judul: string, masuk: number, keluar: number, saldo: number, saldoLabel = 'Saldo akhir') {
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, IX, y, IW, panelH, 18);
    ctx.fill();

    // Judul
    ctx.textAlign = 'left';
    // #9CA3AF = 2,50:1 di putih — judul panel praktis tak terbaca di layar HP
    // penerima, apalagi setelah WhatsApp mengompres gambarnya.
    ctx.fillStyle = CETAK.faint;
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText(judul.toUpperCase(), IX + 16, y + PANEL_PAD_T + 12);

    const rows: { label: string; val: number; minus?: boolean; saldo?: boolean }[] = [
      { label: 'Masuk', val: masuk },
      { label: 'Keluar', val: keluar, minus: true },
      { label: saldoLabel, val: saldo, saldo: true },
    ];
    let ry = y + PANEL_PAD_T + PANEL_TITLE;
    rows.forEach((r) => {
      if (r.saldo) {
        ctx.fillStyle = CETAK.posTint;
        roundRect(ctx, IX + 8, ry - 4, IW - 16, ROW_H - 6, 8);
        ctx.fill();
      }
      const cy = ry + ROW_H / 2 + 1;
      // label
      ctx.textAlign = 'left';
      ctx.font = `${r.saldo ? '700' : '500'} 13px ${FONT}`;
      ctx.fillStyle = r.saldo ? CETAK.pos : CETAK.faint;
      ctx.fillText(r.label, IX + 16, cy);
      // value
      ctx.textAlign = 'right';
      ctx.font = `700 13px ${FONT}`;
      ctx.fillStyle = r.saldo
        ? (r.val < 0 ? CETAK.neg : CETAK.pos)
        : r.minus ? CETAK.neg : CETAK.pos;
      const valStr = r.minus && r.val > 0 ? `-${rpBertanda(r.val)}` : rpBertanda(r.val);
      ctx.fillText(valStr, IX + IW - 16, cy);
      ry += ROW_H;
    });
  }

  let y = PAD + HERO_H + GAP;
  drawPanel(y, 'Kas Hadiran', d.hadiranMasuk, d.hadiranKeluar, d.hadiranSaldoAkhir, 'Belum disetor');
  y += panelH + PANEL_GAP;
  drawPanel(y, 'Kas RT', d.rtMasuk, d.rtKeluar, d.rtSaldoAkhir, 'Saldo akhir');
  y += panelH + GAP;

  // ── Baris aktivitas (satu baris, terpusat) ──────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = CETAK.faint;
  ctx.font = `500 11.5px ${FONT}`;
  ctx.fillText(
    `${d.tarikanSelesai} tarikan · ${d.talanganLunas} talangan lunas · ${d.jumlahTransaksi} transaksi`,
    W / 2,
    y + 22,
  );
  y += ACT_H;

  // ── Footer ──────────────────────────────────────────────────
  const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillStyle = CETAK.muted;
  ctx.font = `500 11px ${FONT}`;
  ctx.fillText(`Dibuat ${tgl} · Hadiran RT`, W / 2, y + 18);
  ctx.textAlign = 'left';

  // ── Output + share ──────────────────────────────────────────
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gagal'))), 'image/png'),
  );
  const file = new File([blob], 'laporan-kas-hadiran-rt.png', { type: 'image/png' });
  // Satu jalur share utk semua kartu PNG (files-only — lihat bagikanFileGambar).
  await bagikanFileGambar(file, d.shareText);
}
