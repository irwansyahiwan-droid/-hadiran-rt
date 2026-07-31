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
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 90)));
    const resp = await page.goto(`${BASE}/${hal}`, { waitUntil: 'networkidle' }).catch(() => null);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(PROBE);
    diukur++;

    const m = [];
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
