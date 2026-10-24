/**
 * Kartu Saya → gambar PNG untuk WhatsApp (19 Okt 2026).
 *
 * Kembaran kartu struk (`shareReceipt.ts`) dgn hero yang berbeda: di sana
 * hero memuat NOMINAL, di sini NAMA warga — dan nama tak boleh dipotong
 * (ia satu-satunya penanda milik siapa kartu ini). Karena itu nama menyusut
 * dulu, lalu melipat di batas KATA, tak pernah berelipsis.
 *
 * Isi = layar Kartu Saya, dibaca dari atas: talangan (yang paling dicari),
 * jejak kehadiran, giliran Sohibul Bait. Palet dari `warnaCetak` (dilarang
 * menulis hex di sini), bagikan lewat `bagikanFileGambar` (files-only — WA
 * menolak berkas yang dicampur teks).
 *
 * Geometri MURNI & diekspor supaya bisa diuji tanpa canvas: tinggi kanvas
 * yang salah = isi terpotong di gambar yang sudah tersebar di grup.
 */
import { CETAK } from './warnaCetak';
import { LOGO_DATA_URL } from './logoBase64';
import {
  bagikanFileGambar,
  namaBerkasPng,
  tanggalBerkas,
  rupiahFont,
  displayFont,
  roundRect,
  loadImage,
  fitText,
  tulisTeksJelasI,
  siapkanHurufKanvas,
} from './shareReceipt';
import { formatRupiahPlain, formatTanggal } from './utils';
import type { KartuWarga as DataKartu, StatusJejak } from './kartuWarga';

export interface DataKartuSaya {
  nama: string;
  noRumah?: string | null;
  kartu: DataKartu;
}

export const KARTU_SAYA = {
  W: 380,
  /** Kolom isi: kartu mulai di 20, teks di 40. */
  X: 40,
  GAP: 14,
  /** Nama: satu baris 30→24px; kalau tetap tak muat, dua baris 30→22px. */
  NAMA_MAKS: 30,
  NAMA_SATU_MIN: 24,
  NAMA_MIN: 22,
  TITIK: 24,
  CELAH: 6,
  BARIS_LEGENDA: 22,
  BARIS_TUNGGAKAN: 34,
  BARIS_MENERIMA: 40,
  TUNGGAKAN_MAKS: 4,
  MENERIMA_MAKS: 3,
  FOOTER: 52,
} as const;

/* ── Nama ─────────────────────────────────────────────────────────────── */

/** Pecah nama jadi KATA yang tak boleh dipisah. Kurung yang berdiri sendiri
 *  ("Saman Suryadi ( Mono )" — begitu tertulis di DB) menempel ke kata di
 *  dalamnya, supaya baris tak pernah berakhir di "(" yatim. */
export function kataNama(nama: string): string[] {
  const t = nama.trim().split(/\s+/).filter(Boolean);
  const hasil: string[] = [];
  for (let i = 0; i < t.length; i++) {
    const k = t[i];
    if (/^[([]+$/.test(k) && i + 1 < t.length) { t[i + 1] = `${k} ${t[i + 1]}`; continue; }
    if (/^[)\]]+$/.test(k) && hasil.length) { hasil[hasil.length - 1] += ` ${k}`; continue; }
    hasil.push(k);
  }
  return hasil;
}

function pecahBaris(kata: string[], lebarTeks: (t: string) => number, lebar: number): string[] {
  const baris: string[] = [];
  let kini = '';
  for (const k of kata) {
    const coba = kini ? `${kini} ${k}` : k;
    if (!kini || lebarTeks(coba) <= lebar) kini = coba;
    else { baris.push(kini); kini = k; }
  }
  if (kini) baris.push(kini);
  return baris;
}

/** Ukuran & baris nama. `ukur(teks, px)` = lebar teks pada ukuran itu.
 *  Urutan: satu baris selama >= 24px; lalu dua baris 30→22px; terakhir
 *  lipatan bebas di 22px (nama tak pernah dipotong). */
export function susunNama(
  nama: string,
  ukur: (teks: string, px: number) => number,
  lebar: number,
): { px: number; baris: string[] } {
  const { NAMA_MAKS, NAMA_SATU_MIN, NAMA_MIN } = KARTU_SAYA;
  for (let px = NAMA_MAKS; px >= NAMA_SATU_MIN; px--) {
    if (ukur(nama, px) <= lebar) return { px, baris: [nama] };
  }
  const kata = kataNama(nama);
  for (let px = NAMA_MAKS; px >= NAMA_MIN; px--) {
    const b = pecahBaris(kata, (t) => ukur(t, px), lebar);
    if (b.length <= 2 && b.every((t) => ukur(t, px) <= lebar)) return { px, baris: b };
  }
  return { px: NAMA_MIN, baris: pecahBaris(kata, (t) => ukur(t, NAMA_MIN), lebar) };
}

/* ── Legenda jejak ────────────────────────────────────────────────────── */

export const LABEL_STATUS: Record<StatusJejak, string> = {
  hadir: 'Hadir', titip: 'Titip', tidak_hadir: 'Tidak hadir', sohibul: 'Sohibul Bait', kosong: 'Belum tercatat',
};
const URUT_LEGENDA: StatusJejak[] = ['hadir', 'titip', 'tidak_hadir', 'sohibul', 'kosong'];

export interface ItemLegenda { st: StatusJejak; n: number; x: number; baris: number; catatan?: string }

/** Butir legenda + posisinya, melipat di lebar kolom. Paritas layar: hadir &
 *  tidak hadir selalu tampil, status lain hanya kalau ada. `ukur(teks, tebal)`
 *  = lebar teks 13px pada tebal itu. */
export function susunLegenda(
  jejak: { status: StatusJejak }[],
  ukur: (teks: string, tebal: 500 | 700) => number,
  lebar: number,
  /** Paritas layar: "(dihitung hadir)" di butir Sohibul Bait — hanya bila
   *  tiap tarikan Sohibul Bait tercatat hadir (`sohibulTercatatHadir`). */
  sohibulDihitungHadir = false,
): ItemLegenda[] {
  const hasil: ItemLegenda[] = [];
  let x = 0, baris = 0;
  for (const st of URUT_LEGENDA) {
    const n = jejak.filter((j) => j.status === st).length;
    if (n === 0 && st !== 'hadir' && st !== 'tidak_hadir') continue;
    const catatan = st === 'sohibul' && sohibulDihitungHadir ? ' (dihitung hadir)' : undefined;
    const w = 10 + 6 + ukur(`${LABEL_STATUS[st]} `, 500) + ukur(String(n), 700) + (catatan ? ukur(catatan, 500) : 0);
    if (x > 0 && x + w > lebar) { x = 0; baris++; }
    hasil.push({ st, n, x, baris, ...(catatan ? { catatan } : {}) });
    x += w + 16;
  }
  return hasil;
}

/* ── Geometri ─────────────────────────────────────────────────────────── */

export interface Kotak { top: number; h: number }

export interface GeometriKartuSaya {
  hero: Kotak & { namaTop: number; tinggiBaris: number; rumahY: number | null; garisY: number };
  talangan: Kotak;
  jejak: (Kotak & { gridTop: number; perBaris: number; legendaTop: number }) | null;
  giliran: Kotak;
  H: number;
}

export function hitungGeometriKartuSaya(o: {
  barisNama: number;
  pxNama: number;
  adaRumah: boolean;
  /** Jumlah tarikan menunggak (0 = tak ada talangan). */
  nTunggakan: number;
  nJejak: number;
  barisLegenda: number;
  adaGiliran: boolean;
  nMenerima: number;
}): GeometriKartuSaya {
  const K = KARTU_SAYA;
  // Hero — logo & brand duduk di 42..76 (paritas struk), eyebrow di 112.
  const namaTop = 126;
  const tinggiBaris = Math.round(o.pxNama * 1.2);
  let y = namaTop + o.barisNama * tinggiBaris;
  const rumahY = o.adaRumah ? y + 12 : null;
  if (o.adaRumah) y += 22;
  const garisY = y + 16;
  const heroBawah = garisY + 64;
  const hero = { top: 20, h: heroBawah - 20, namaTop, tinggiBaris, rumahY, garisY };

  // Talangan
  const tTop = heroBawah + K.GAP;
  let tH: number;
  if (o.nTunggakan === 0) tH = 84;
  else {
    const tampil = Math.min(o.nTunggakan, K.TUNGGAKAN_MAKS);
    const lebih = o.nTunggakan > K.TUNGGAKAN_MAKS ? K.BARIS_TUNGGAKAN : 0;
    tH = 84 + tampil * K.BARIS_TUNGGAKAN + lebih + 30 + 14;
  }
  let bawah = tTop + tH;

  // Jejak
  let jejak: GeometriKartuSaya['jejak'] = null;
  if (o.nJejak > 0) {
    const top = bawah + K.GAP;
    const perBaris = Math.floor((K.W - 2 * K.X + K.CELAH) / (K.TITIK + K.CELAH));
    const nBaris = Math.ceil(o.nJejak / perBaris);
    const gridTop = top + 52;
    const gridH = nBaris * K.TITIK + (nBaris - 1) * K.CELAH;
    const legendaTop = gridTop + gridH + 16;
    const h = legendaTop + o.barisLegenda * K.BARIS_LEGENDA + 14 - top;
    jejak = { top, h, gridTop, perBaris, legendaTop };
    bawah = top + h;
  }

  // Giliran
  const gTop = bawah + K.GAP;
  let dasar = gTop + (o.adaGiliran ? 92 : 70);
  if (o.nMenerima > 0) {
    const tampil = Math.min(o.nMenerima, K.MENERIMA_MAKS);
    const lebih = o.nMenerima > K.MENERIMA_MAKS ? 30 : 0;
    dasar += 42 + tampil * K.BARIS_MENERIMA + lebih;
  }
  const giliran = { top: gTop, h: dasar + 18 - gTop };

  return { hero, talangan: { top: tTop, h: tH }, jejak, giliran, H: gTop + giliran.h + K.FOOTER };
}

/* ── Penggambar ───────────────────────────────────────────────────────── */

function kartuPutih(ctx: CanvasRenderingContext2D, k: Kotak) {
  const { W } = KARTU_SAYA;
  ctx.fillStyle = CETAK.surface;
  roundRect(ctx, 20, k.top, W - 40, k.h, 20);
  ctx.fill();
  ctx.strokeStyle = CETAK.line;
  ctx.lineWidth = 1;
  roundRect(ctx, 20.5, k.top + 0.5, W - 41, k.h - 1, 20);
  ctx.stroke();
}

function garis(ctx: CanvasRenderingContext2D, y: number) {
  const { W, X } = KARTU_SAYA;
  ctx.strokeStyle = CETAK.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(X, y + 0.5);
  ctx.lineTo(W - X, y + 0.5);
  ctx.stroke();
}

function eyebrow(ctx: CanvasRenderingContext2D, teks: string, x: number, y: number, warna: string) {
  ctx.fillStyle = warna;
  ctx.font = `700 11px ${rupiahFont}`;
  try { ctx.letterSpacing = '1px'; } catch { /* peramban lama */ }
  ctx.fillText(teks.toUpperCase(), x, y);
  try { ctx.letterSpacing = '0px'; } catch { /* noop */ }
}

/** Bulatan status — paritas `GAYA_JEJAK` di layar. Nomor di dalam bulatan
 *  bercincin memakai `ink` (bukan biru): 11px biru-600 di putih cuma 5,2:1,
 *  dan kompresi WhatsApp memakan sisanya. Cincinnya yang membawa status. */
function titik(ctx: CanvasRenderingContext2D, cx: number, cy: number, st: StatusJejak, nomor: number | null, r = KARTU_SAYA.TITIK / 2) {
  const penuh = st === 'hadir' || st === 'tidak_hadir';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = st === 'hadir' ? CETAK.pos : st === 'tidak_hadir' ? CETAK.neg : CETAK.surface;
  ctx.fill();
  if (!penuh) {
    const tebal = st === 'kosong' ? 1 : r >= 8 ? 2 : 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r - tebal / 2, 0, Math.PI * 2);
    ctx.strokeStyle = st === 'titip' ? CETAK.titip : st === 'sohibul' ? CETAK.emas : CETAK.line;
    ctx.lineWidth = tebal;
    ctx.stroke();
  }
  if (nomor === null) return;
  ctx.fillStyle = penuh ? CETAK.surface : st === 'kosong' ? CETAK.muted : CETAK.ink;
  ctx.font = `700 ${nomor >= 100 ? 9 : 10}px ${rupiahFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(String(nomor), cx, cy + 0.5);
  ctx.textAlign = 'left';
}

export async function buatPngKartuSaya(d: DataKartuSaya): Promise<File> {
  const K = KARTU_SAYA;
  const { W, X } = K;
  const { kartu } = d;

  /* Canvas TIDAK ikut memicu unduhan font: tanpa `load` eksplisit, kunjungan
     pertama di jaringan lambat menggambar nama dgn huruf sistem. */
  try {
    await Promise.all([
      siapkanHurufKanvas(),
      document.fonts.load(`800 30px ${displayFont}`),
      document.fonts.load(`500 13px ${rupiahFont}`),
    ]);
    await document.fonts.ready;
  } catch { /* lanjut dgn cadangan */ }

  const ukurCanvas = document.createElement('canvas').getContext('2d')!;
  const nama = susunNama(d.nama, (t, px) => {
    ukurCanvas.font = `800 ${px}px ${displayFont}`;
    return ukurCanvas.measureText(t).width;
  }, W - 2 * X);
  const legenda = susunLegenda(kartu.jejak, (t, tebal) => {
    ukurCanvas.font = `${tebal} 13px ${rupiahFont}`;
    return ukurCanvas.measureText(t).width;
  }, W - 2 * X, (() => {
    const nSb = kartu.jejak.filter((j) => j.status === 'sohibul').length;
    return nSb > 0 && kartu.sohibulTercatatHadir === nSb;
  })());
  const barisLegenda = legenda.length ? legenda[legenda.length - 1].baris + 1 : 0;

  const g = hitungGeometriKartuSaya({
    barisNama: nama.baris.length,
    pxNama: nama.px,
    adaRumah: !!d.noRumah,
    nTunggakan: kartu.tunggakan.length,
    nJejak: kartu.jejak.length,
    barisLegenda,
    adaGiliran: !!kartu.giliran,
    nMenerima: kartu.sudahMenerima.length,
  });

  const scale = Math.min(3, window.devicePixelRatio || 2) * 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = g.H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = CETAK.canvas;
  ctx.fillRect(0, 0, W, g.H);

  // ── Hero ──
  const h = g.hero;
  const grad = ctx.createLinearGradient(20, 20, W - 60, 20 + h.h);
  grad.addColorStop(0, CETAK.heroRamp[0]);
  grad.addColorStop(0.52, CETAK.heroRamp[1]);
  grad.addColorStop(1, CETAK.heroRamp[2]);
  ctx.fillStyle = grad;
  roundRect(ctx, 20, 20, W - 40, h.h, 24);
  ctx.fill();
  const scrim = ctx.createRadialGradient(20, 20, 0, 20, 20, 250);
  scrim.addColorStop(0, CETAK.heroScrim);
  scrim.addColorStop(0.55, 'rgba(4, 38, 24, 0)');
  ctx.save();
  roundRect(ctx, 20, 20, W - 40, h.h, 24);
  ctx.clip();
  ctx.fillStyle = scrim;
  ctx.fillRect(20, 20, W - 40, h.h);
  ctx.restore();

  try {
    const logo = await loadImage(LOGO_DATA_URL);
    ctx.save();
    roundRect(ctx, X, 42, 34, 34, 17);
    ctx.clip();
    ctx.drawImage(logo, X, 42, 34, 34);
    ctx.restore();
  } catch { /* logo opsional */ }
  ctx.fillStyle = CETAK.surface;
  ctx.font = `700 16px ${displayFont}`;
  ctx.fillText('Hadiran RT', 84, 53);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `500 11px ${rupiahFont}`;
  ctx.fillText('RT 004 / RW 006', 84, 70);

  eyebrow(ctx, 'Kartu Saya', X, 112, 'rgba(255,255,255,0.9)');

  ctx.fillStyle = CETAK.surface;
  ctx.font = `800 ${nama.px}px ${displayFont}`;
  nama.baris.forEach((b, i) => ctx.fillText(b, X, h.namaTop + i * h.tinggiBaris + h.tinggiBaris / 2));
  if (h.rumahY !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `500 13px ${rupiahFont}`;
    /* `no_rumah` teks bebas dari Kelola Anggota — kata panjang dulu lari keluar
       kartu hijau (`audit:kartu-png`, data EKSTREM, 22 Okt 2026). Elipsis,
       pola yang sama dgn baris tunggakan & giliran di bawah. */
    ctx.fillText(fitText(ctx, `Rumah ${d.noRumah}`, W - 2 * X), X, h.rumahY);
  }

  // Kaki statistik — paritas HeroStats di layar (Hadir · Talangan · Giliran).
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(X, h.garisY + 0.5);
  ctx.lineTo(W - X, h.garisY + 0.5);
  ctx.stroke();
  const tercatat = kartu.hadir + kartu.titip + kartu.tidakHadir;
  const stat: [string, string][] = [
    ['Hadir', `${kartu.hadir}/${tercatat}`],
    ['Talangan', kartu.totalTunggakan > 0 ? formatRupiahPlain(kartu.totalTunggakan) : 'Lunas'],
    ['Giliran', kartu.giliran ? `#${kartu.giliran.nomor}` : kartu.sudahMenerima.length > 0 ? 'Selesai' : '—'],
  ];
  const kolom = (W - 2 * X) / 3;
  stat.forEach(([label, nilai], i) => {
    const x = X + i * kolom + (i > 0 ? 12 : 0);
    const lebar = kolom - (i > 0 ? 12 : 0) - 6;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(X + i * kolom + 0.5, h.garisY + 14);
      ctx.lineTo(X + i * kolom + 0.5, h.garisY + 52);
      ctx.stroke();
    }
    /* Label huruf awal kalimat ber-tracking — paritas HeroStats layar, bukan eyebrow kapital. */
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `600 12px ${rupiahFont}`;
    try { ctx.letterSpacing = '0.5px'; } catch { /* peramban lama */ }
    ctx.fillText(label, x, h.garisY + 22);
    try { ctx.letterSpacing = '0px'; } catch { /* noop */ }
    let px = 18;
    ctx.font = `700 ${px}px ${displayFont}`;
    while (px > 13 && ctx.measureText(nilai).width > lebar) { px--; ctx.font = `700 ${px}px ${displayFont}`; }
    ctx.fillStyle = CETAK.surface;
    ctx.fillText(nilai, x, h.garisY + 43);
  });

  // ── Talangan ──
  const t = g.talangan;
  kartuPutih(ctx, t);
  if (kartu.tunggakan.length === 0) {
    ctx.fillStyle = CETAK.pos;
    ctx.font = `700 16px ${rupiahFont}`;
    ctx.fillText('Tidak ada talangan', X, t.top + 32);
    ctx.fillStyle = CETAK.faint;
    ctx.font = `500 13px ${rupiahFont}`;
    const n = kartu.talanganLunas.length;
    ctx.fillText(n > 0 ? `Pernah ditalangi ${n}×, semuanya sudah lunas.` : 'Belum pernah kena talangan.', X, t.top + 56);
  } else {
    ctx.fillStyle = CETAK.faint;
    ctx.font = `500 13px ${rupiahFont}`;
    ctx.fillText('Talangan belum lunas', X, t.top + 30);
    ctx.fillStyle = CETAK.neg;
    ctx.font = `800 26px ${displayFont}`;
    ctx.fillText(formatRupiahPlain(kartu.totalTunggakan), X, t.top + 58);
    let y = t.top + 84;
    kartu.tunggakan.slice(0, K.TUNGGAKAN_MAKS).forEach((r) => {
      garis(ctx, y);
      const cy = y + K.BARIS_TUNGGAKAN / 2;
      ctx.font = `600 14px ${rupiahFont}`;
      const nilai = formatRupiahPlain(r.nominal);
      const lebarNilai = ctx.measureText(nilai).width;
      ctx.fillStyle = CETAK.sub;
      ctx.font = `500 14px ${rupiahFont}`;
      tulisTeksJelasI(ctx, fitText(ctx, `Tarikan #${r.nomor} · ${formatTanggal(r.tanggal)}`, W - 2 * X - lebarNilai - 12), X, cy);
      ctx.fillStyle = CETAK.ink;
      ctx.font = `600 14px ${rupiahFont}`;
      ctx.textAlign = 'right';
      ctx.fillText(nilai, W - X, cy);
      ctx.textAlign = 'left';
      y += K.BARIS_TUNGGAKAN;
    });
    if (kartu.tunggakan.length > K.TUNGGAKAN_MAKS) {
      garis(ctx, y);
      ctx.fillStyle = CETAK.faint;
      ctx.font = `500 13px ${rupiahFont}`;
      ctx.fillText(`+${kartu.tunggakan.length - K.TUNGGAKAN_MAKS} tarikan lainnya`, X, y + K.BARIS_TUNGGAKAN / 2);
      y += K.BARIS_TUNGGAKAN;
    }
    garis(ctx, y);
    ctx.fillStyle = CETAK.faint;
    ctx.font = `500 13px ${rupiahFont}`;
    ctx.fillText('Hubungi bendahara untuk melunasi.', X, y + 18);
  }

  // ── Jejak kehadiran ──
  if (g.jejak) {
    const j = g.jejak;
    kartuPutih(ctx, j);
    ctx.fillStyle = CETAK.ink;
    ctx.font = `700 15px ${displayFont}`;
    ctx.fillText('Jejak Kehadiran', X, j.top + 30);
    ctx.fillStyle = CETAK.faint;
    ctx.font = `500 13px ${rupiahFont}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${kartu.jejak.length} tarikan`, W - X, j.top + 30);
    ctx.textAlign = 'left';
    kartu.jejak.forEach((jj, i) => {
      const kol = i % j.perBaris;
      const bar = Math.floor(i / j.perBaris);
      titik(ctx,
        X + kol * (K.TITIK + K.CELAH) + K.TITIK / 2,
        j.gridTop + bar * (K.TITIK + K.CELAH) + K.TITIK / 2,
        jj.status, jj.nomor);
    });
    legenda.forEach((l) => {
      const cy = j.legendaTop + l.baris * K.BARIS_LEGENDA + K.BARIS_LEGENDA / 2;
      const x = X + l.x;
      titik(ctx, x + 5, cy, l.st, null, 5);
      ctx.fillStyle = CETAK.sub;
      ctx.font = `500 13px ${rupiahFont}`;
      const teks = `${LABEL_STATUS[l.st]} `;
      ctx.fillText(teks, x + 16, cy);
      const wTeks = ctx.measureText(teks).width;
      ctx.fillStyle = CETAK.ink;
      ctx.font = `700 13px ${rupiahFont}`;
      ctx.fillText(String(l.n), x + 16 + wTeks, cy);
      if (l.catatan) {
        const wN = ctx.measureText(String(l.n)).width;
        ctx.fillStyle = CETAK.sub;
        ctx.font = `500 13px ${rupiahFont}`;
        ctx.fillText(l.catatan, x + 16 + wTeks + wN, cy);
      }
    });
  }

  // ── Giliran Sohibul Bait ──
  const gl = g.giliran;
  kartuPutih(ctx, gl);
  ctx.fillStyle = CETAK.faint;
  ctx.font = `500 13px ${rupiahFont}`;
  ctx.fillText('Giliran Sohibul Bait', X, gl.top + 30);
  ctx.fillStyle = CETAK.ink;
  ctx.font = `600 16px ${rupiahFont}`;
  ctx.fillText(
    fitText(ctx, kartu.giliran ? `Tarikan #${kartu.giliran.nomor} · ${formatTanggal(kartu.giliran.tanggal)}` : 'Belum ada jadwal', W - 2 * X),
    X, gl.top + 54);
  let dasar = gl.top + 70;
  if (kartu.giliran) {
    ctx.fillStyle = CETAK.faint;
    ctx.font = `500 13px ${rupiahFont}`;
    ctx.fillText(
      kartu.giliran.sisaSebelum === 0 ? 'Ini tarikan berikutnya.' : `${kartu.giliran.sisaSebelum} tarikan lagi sebelum giliran ini.`,
      X, gl.top + 78);
    dasar = gl.top + 92;
  }
  if (kartu.sudahMenerima.length > 0) {
    garis(ctx, dasar + 6);
    eyebrow(ctx, 'Sudah menerima', X, dasar + 28, CETAK.faint);
    ctx.textAlign = 'right';
    eyebrow(ctx, 'Pendapatan kotor', W - X, dasar + 28, CETAK.faint);
    ctx.textAlign = 'left';
    let y = dasar + 42;
    kartu.sudahMenerima.slice(0, K.MENERIMA_MAKS).forEach((m) => {
      ctx.fillStyle = CETAK.ink;
      ctx.font = `500 14px ${rupiahFont}`;
      ctx.fillText(`Tarikan #${m.nomor}`, X, y + 12);
      ctx.fillStyle = CETAK.faint;
      ctx.font = `500 12px ${rupiahFont}`;
      ctx.fillText(formatTanggal(m.tanggal), X, y + 29);
      ctx.fillStyle = CETAK.ink;
      ctx.font = `600 14px ${displayFont}`;
      ctx.textAlign = 'right';
      ctx.fillText(m.pendapatanKotor !== null ? formatRupiahPlain(m.pendapatanKotor) : '—', W - X, y + 20);
      ctx.textAlign = 'left';
      y += K.BARIS_MENERIMA;
    });
    if (kartu.sudahMenerima.length > K.MENERIMA_MAKS) {
      ctx.fillStyle = CETAK.faint;
      ctx.font = `500 13px ${rupiahFont}`;
      ctx.fillText(`+${kartu.sudahMenerima.length - K.MENERIMA_MAKS} tarikan lainnya`, X, y + 14);
    }
  }

  // ── Kaki ──
  const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillStyle = CETAK.faint;
  ctx.font = `500 12px ${rupiahFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Dibuat ${tgl} · Hadiran RT`, W / 2, g.H - 28);
  ctx.textAlign = 'left';

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gagal'))), 'image/png'),
  );
  return new File([blob], namaBerkasPng(`Kartu Saya ${d.nama} ${tanggalBerkas()}`), { type: 'image/png' });
}

/** Teks pendamping — hanya dipakai jalur cadangan wa.me (berkas tak bisa
 *  dibagikan langsung); jalur utama files-only. */
export function teksKartuSaya(d: DataKartuSaya): string {
  const k = d.kartu;
  const tercatat = k.hadir + k.titip + k.tidakHadir;
  const talangan = k.totalTunggakan > 0 ? `${formatRupiahPlain(k.totalTunggakan)} belum lunas` : 'lunas';
  return `Kartu Saya — ${d.nama}\nTalangan: ${talangan} · Hadir ${k.hadir}/${tercatat}\n— Hadiran RT`;
}

export async function bagikanKartuSaya(d: DataKartuSaya): Promise<void> {
  await bagikanFileGambar(await buatPngKartuSaya(d), teksKartuSaya(d));
}
