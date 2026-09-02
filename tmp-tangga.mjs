import { chromium } from 'playwright';
import { newCtx, loginWarga, samplePixels } from './scripts/lib/audit-harness.mjs';

const browser = await chromium.launch();
const hasil = {};
for (const tema of ['light', 'dark']) {
  const { ctx, page } = await newCtx(browser, tema);
  await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
  await loginWarga(page);
  await page.waitForTimeout(1500);
  // rig: 4 kotak berkelas elevasi, di atas kanvas app, terpisah jauh
  await page.evaluate(() => {
    document.querySelectorAll('.rig-elev').forEach((e) => e.remove());
    const wrap = document.createElement('div');
    wrap.className = 'rig-elev app-bg';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;padding:24px 24px 0';
    wrap.innerHTML = ['rest', 'lift', 'float', 'float-high'].map((c) =>
      `<div class="${c} bg-white dark:bg-gray-900" data-k="${c}" style="height:88px;border-radius:16px;margin-bottom:76px"></div>`).join('');
    document.body.appendChild(wrap);
  });
  await page.waitForTimeout(500);
  const kotak = await page.evaluate(() => [...document.querySelectorAll('[data-k]')].map((e) => {
    const r = e.getBoundingClientRect(); return { k: e.dataset.k, x: r.x, w: r.width, bottom: r.bottom };
  }));
  const kanvas = await page.evaluate(() => getComputedStyle(document.querySelector('.rig-elev')).backgroundColor);
  const shot = (await page.screenshot()).toString('base64');
  const pts = [];
  for (const b of kotak) for (let d = 1; d <= 40; d++) pts.push([Math.round(b.x + b.w / 2), Math.round(b.bottom + d)]);
  const px = await samplePixels(page, shot, pts);
  const base = kanvas.match(/\d+/g).map(Number);
  const baseL = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2];
  hasil[tema] = kotak.map((b, i) => {
    const seg = px.slice(i * 40, i * 40 + 40);
    const puncak = Math.max(...seg.map((p) => baseL - (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2])));
    const pulih = seg.findIndex((p) => Math.abs(baseL - (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2])) < 1.5) + 1;
    return { k: b.k, puncak: +puncak.toFixed(1), pulih: pulih || '>40' };
  });
  console.log(`\n${tema.toUpperCase()}  kanvas ${kanvas}`);
  for (const r of hasil[tema]) console.log(`  ${r.k.padEnd(11)} puncak ${String(r.puncak).padStart(6)}   pulih di ${r.pulih}px`);
  const naik = hasil[tema].every((r, i, a) => i === 0 || r.puncak > a[i - 1].puncak);
  console.log(`  → tangga ${naik ? 'MONOTON ✓' : 'TERBALIK ✗'}`);
  await ctx.close();
}
await browser.close();
