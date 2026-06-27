// Rasterize src/assets/logo-rt.svg → ikon iOS/PWA + base64 logo PDF.
// Sumber kebenaran tunggal = logo-rt.svg. Jalankan: node scripts/gen-icons.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync(new URL('../src/assets/logo-rt.svg', import.meta.url), 'utf8');

const browser = await chromium.launch();

async function render(size, { jpeg = false } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px">` +
    svg.replace('<svg ', `<svg width="${size}" height="${size}" `) +
    `</body></html>`,
    { waitUntil: 'networkidle' }
  );
  await page.waitForTimeout(120);
  const buf = await page.locator('svg').screenshot(
    jpeg ? { type: 'jpeg', quality: 92 } : { type: 'png' }
  );
  await page.close();
  return buf;
}

// Ikon: full-bleed, opaque (iOS mask squircle otomatis)
const targets = [
  ['public/icon-512.png', 512],
  ['public/icon-192.png', 192],
  ['public/favicon.png', 64],
];
for (const [path, size] of targets) {
  writeFileSync(new URL('../' + path, import.meta.url), await render(size));
  console.log('ok →', path);
}

// Logo raster jpg (dipakai panduan-install.html + arsip src)
const logoJpg = await render(512, { jpeg: true });
writeFileSync(new URL('../public/logo-rt.jpg', import.meta.url), logoJpg);
writeFileSync(new URL('../src/assets/logo-rt.jpg', import.meta.url), logoJpg);
console.log('ok → public/logo-rt.jpg + src/assets/logo-rt.jpg');

// Logo PDF/struk (jpeg base64) — biar brand konsisten di laporan
const jpg = await render(512, { jpeg: true });
const dataUrl = 'data:image/jpeg;base64,' + jpg.toString('base64');
writeFileSync(
  new URL('../src/lib/logoBase64.ts', import.meta.url),
  `export const LOGO_DATA_URL = '${dataUrl}';\n`
);
console.log('ok → src/lib/logoBase64.ts (' + Math.round(jpg.length / 1024) + ' KB)');

await browser.close();
