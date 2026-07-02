// Splash apple-touch-startup-image: ikon di tengah canvas (light & dark).
// Sumber kebenaran = src/assets/logo-rt.svg. Jalankan: node scripts/gen-splash.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync(new URL('../src/assets/logo-rt.svg', import.meta.url), 'utf8');

// Selaras index.html: light=#ECF1F7 (canvas MATERIAL-FLAT 2 Jul = manifest background_color), dark=#030712 (theme-color dark)
const BG = { light: '#ECF1F7', dark: '#030712' };

// 8 ukuran sesuai apple-touch-startup-image di index.html
const SIZES = [
  [640, 1136], [750, 1334], [828, 1792], [1170, 2532],
  [1179, 2556], [1242, 2688], [1284, 2778], [1290, 2796],
];

const browser = await chromium.launch();

async function render(w, h, mode) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const tile = Math.round(Math.min(w, h) * 0.30);      // ikon ~30% sisi pendek
  const radius = Math.round(tile * 0.2237);            // squircle ala iOS
  const shadow = mode === 'light'
    ? `box-shadow:0 ${Math.round(tile*0.06)}px ${Math.round(tile*0.14)}px rgba(31,41,55,.18)`
    : '';
  await page.setContent(
    `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;background:${BG[mode]};` +
    `display:flex;align-items:center;justify-content:center">` +
    `<div style="width:${tile}px;height:${tile}px;border-radius:${radius}px;overflow:hidden;${shadow}">` +
    svg.replace('<svg ', `<svg width="${tile}" height="${tile}" `) +
    `</div></body></html>`,
    { waitUntil: 'networkidle' }
  );
  await page.waitForTimeout(80);
  const buf = await page.screenshot({ type: 'png' });
  await page.close();
  return buf;
}

for (const [w, h] of SIZES) {
  writeFileSync(new URL(`../public/splash/splash-${w}x${h}.png`, import.meta.url), await render(w, h, 'light'));
  writeFileSync(new URL(`../public/splash/splash-${w}x${h}-dark.png`, import.meta.url), await render(w, h, 'dark'));
  console.log(`ok → splash-${w}x${h} (light+dark)`);
}

await browser.close();
