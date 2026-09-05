// Audit halaman PUBLIK (landing / warta / nobar / panduan-install) di lebar
// terkecil, light + dark.
//
// Kenapa terpisah dari sapuan app: halaman ini HTML statis di `public/`, tak
// tersentuh audit app mana pun, tapi justru wajah pertama yang dilihat orang —
// dan `panduan-install.html` ditautkan dua kali sebagai "Lihat panduan" untuk
// dibuka warga DI HP.
//
// Yang diperiksa:
//   1. bocor samping (halaman bisa digeser di HP)
//   2. teks terpotong (scrollWidth > clientWidth)
//   3. target sentuh <24px — HIT-TEST nyata (elementFromPoint), bukan bbox
//   4. <img> tanpa atribut alt
//   5. kerangka heading melompat tingkat + jumlah <h1>
//   6. error JS di halaman
//
// Riwayat temuan (31 Jul 2026, semuanya sudah diperbaiki): panduan-install punya
// `body { width: 560px }` MATI → bisa digeser 200px di 360px; warta bocor 3px
// karena stempel SVG ber-rotate; landing melompat h1→h3 & h2→h4.
//
// Catatan alat: elemen `.sr-only` (lebar 1px, sengaja disembunyikan) SELALU
// terbaca "teks terpotong" — disaring lewat `clientWidth > 2`. FP baru →
// betulkan ALATNYA, bukan halamannya.
//
// Pakai:  node scripts/audit-publik.mjs
//   CAP_URL=http://localhost:5199   (default 5174; lawan `vite preview`)
//   W=390                            (lebar viewport, default 360)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.CAP_URL || 'http://localhost:5174';
const W = Number(process.env.W || 360);
const OUT = process.env.OUT_DIR || `.audit-publik-${W}`;
mkdirSync(OUT, { recursive: true });

const HALAMAN = ['landing.html', 'warta.html', 'nobar.html', 'panduan-install.html'];

const PROBE = () => {
  const vis = (el) => {
    const b = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const clip = [...document.querySelectorAll('p,span,h1,h2,h3,h4,button,a,li,td,th')]
    .filter((e) => !e.children.length && vis(e) && e.clientWidth && e.scrollWidth > e.clientWidth + 1)
    // `.sr-only` lebarnya 1px MEMANG disengaja → bukan cacat.
    .filter((e) => e.innerText.trim() && e.clientWidth > 2)
    .map((e) => ({ t: e.innerText.trim().slice(0, 30), cw: e.clientWidth, sw: e.scrollWidth }));

  const kecil = [];
  for (const el of document.querySelectorAll('a[href],button,[role="button"],input,select')) {
    if (!vis(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.top < 0 || b.bottom > innerHeight) continue;
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const owns = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h) || h.closest('a,button,input,select') === el); };
    let l = cx, r = cx, t = cy, bo = cy;
    for (let d = 1; d <= 44; d++) { if (owns(cx - d, cy)) l = cx - d; else break; }
    for (let d = 1; d <= 44; d++) { if (owns(cx + d, cy)) r = cx + d; else break; }
    for (let d = 1; d <= 44; d++) { if (owns(cx, cy - d)) t = cy - d; else break; }
    for (let d = 1; d <= 44; d++) { if (owns(cx, cy + d)) bo = cy + d; else break; }
    const w = Math.round(r - l), h = Math.round(bo - t);
    if (w > 0 && (w < 24 || h < 24)) kecil.push({ t: (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 26), w, h });
  }

  const imgTanpaAlt = [...document.querySelectorAll('img')]
    .filter((i) => vis(i) && i.getAttribute('alt') === null)
    .map((i) => (i.currentSrc || i.src).split('/').pop());

  const tingkat = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
  const lompat = [];
  for (let i = 1; i < tingkat.length; i++) if (tingkat[i] - tingkat[i - 1] > 1) lompat.push(`h${tingkat[i - 1]}→h${tingkat[i]}`);

  const uniq = (a) => [...new Map(a.map((x) => [JSON.stringify(x), x])).values()];
  return {
    bocor: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    lebar: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth },
    jumlahH1: document.querySelectorAll('h1').length,
    clip: uniq(clip), kecil: uniq(kecil), imgTanpaAlt, lompat: uniq(lompat),
  };
};

const browser = await chromium.launch();
let gagal = 0, diukur = 0;

for (const tema of ['light', 'dark']) {
  for (const hal of HALAMAN) {
    const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, colorScheme: tema, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errs = [];
    const m0 = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 90)));
    const resp = await page.goto(`${BASE}/${hal}`, { waitUntil: 'networkidle' }).catch(() => null);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(PROBE);
    diukur++;

    /* THEME-COLOR wajib cocok dgn warna yang benar-benar ada di PUNCAK halaman
       (5 Sep 2026). Ia yang mengecat bilah alamat HP, tepat di atas piksel
       pertama halaman — meleset sedikit saja jadi dua warna berbeda yang
       bersinggungan. Terukur di landing: dinyatakan #0D5B36, aslinya #063B22,
       beda 32/255.

       VONISNYA PERSEPTUAL (ΔE-OKLab), bukan selisih RGB absolut. Percobaan
       pertama memakai `ΔRGB > 6` dan melaporkan `nobar` GAGAL 14/255 — temuan
       PALSU: puncak nobar itu FOTO stadion, dan kedua warnanya nyaris hitam
       (#060B14 lawan #141318) yang selisih luminansinya cuma 1,066:1. Tak ada
       yang bisa melihat langkah 6% di antara dua near-black. Selisih RGB
       absolut melebih-lebihkan beda di ujung gelap & meremehkannya di ujung
       terang — ia salah alat ukur untuk pertanyaan "apakah sambungannya
       terlihat".

       Ambang 0,07 memisah dgn margin di kedua sisi: cacat NYATA di landing
       0,101 (rasio luminansi 1,509:1 — langkah yang memang terlihat) lawan
       aproksimasi foto nobar 0,044. Sekitar 3,5x JND, jadi ia memaafkan
       pendekatan atas GAMBAR tapi tak menutupi sambungan yang kentara.
       Halaman tanpa `theme-color` dilewati — itu pilihan sah, bukan cacat. */
    const tc = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta ? meta.getAttribute('content') : null;
    });
    if (tc && /^#[0-9A-Fa-f]{6}$/.test(tc)) {
      const shot = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: 4 } });
      const puncak = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        /* Modus baris paling atas — bukan satu titik, supaya logo/teks yang
           kebetulan menyentuh tepi tak mengambil alih vonis. */
        const d = x.getImageData(0, 1, img.width, 1).data;
        const t = new Map();
        for (let i = 0; i < d.length; i += 4) { const k = `${d[i]},${d[i + 1]},${d[i + 2]}`; t.set(k, (t.get(k) || 0) + 1); }
        return [...t].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
      }, shot.toString('base64'));
      const want = [1, 3, 5].map((i) => parseInt(tc.slice(i, i + 2), 16));
      const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const oklab = ([r, g, b]) => {
        const [R, G, B] = [lin(r), lin(g), lin(b)];
        const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
        const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
        const s2 = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
        return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s2,
                1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s2,
                0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s2];
      };
      const A = oklab(puncak), Bk = oklab(want);
      const dE = Math.hypot(A[0] - Bk[0], A[1] - Bk[1], A[2] - Bk[2]);
      if (dE > 0.07) {
        const hx = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        m0.push(`theme-color ${tc.toUpperCase()} ≠ puncak halaman ${hx(puncak)} (ΔE ${dE.toFixed(3)})`);
      }
    }

    const m = [...m0];
    if (!resp || resp.status() >= 400) m.push(`HTTP ${resp?.status() ?? 'gagal dimuat'}`);
    if (r.bocor) m.push(`bocor samping ${r.lebar.sw}/${r.lebar.cw}`);
    if (r.clip.length) m.push(`teks terpotong: ${JSON.stringify(r.clip.slice(0, 3))}`);
    if (r.kecil.length) m.push(`target sentuh <24px: ${JSON.stringify(r.kecil.slice(0, 4))}`);
    if (r.imgTanpaAlt.length) m.push(`img tanpa alt: ${JSON.stringify(r.imgTanpaAlt.slice(0, 4))}`);
    if (r.lompat.length) m.push(`kerangka heading melompat: ${JSON.stringify(r.lompat)}`);
    if (r.jumlahH1 !== 1) m.push(`jumlah <h1> = ${r.jumlahH1} (harus tepat 1)`);
    if (errs.length) m.push(`error JS: ${JSON.stringify(errs.slice(0, 2))}`);
    if (m.length) gagal++;

    console.log(`\n### ${tema}/${hal}${m.length ? '' : '  OK'}`);
    m.forEach((x) => console.log('  ⚠ ' + x));
    await page.screenshot({ path: `${OUT}/${tema}-${hal.replace('.html', '')}.png` });
    await ctx.close();
  }
}

await browser.close();
console.log(`\n=== ${diukur} halaman diperiksa @${W}px · ${gagal} bermasalah ===`);
process.exit(gagal ? 1 : 0);
