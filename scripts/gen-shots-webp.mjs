// Turunkan screenshot manifest (public/screenshots/*.png, 1170px @3x) jadi WebP
// 780px untuk showcase landing /info. Encode via canvas Chromium karena tidak
// ada sharp/cwebp di toolchain. Jalankan setelah scripts/capture-screenshots.mjs:
//   node scripts/gen-shots-webp.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'public/screenshots';
const FILES = ['1-beranda', '2-jadwal', '3-kas'];
const TARGET_W = 780; // frame showcase ~260px CSS → 780 = @3x, tetap tajam

const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of FILES) {
  const b64 = readFileSync(`${DIR}/${f}.png`).toString('base64');
  const out = await page.evaluate(async ({ b64, w }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = Math.round(img.height * (w / img.width));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.84).split(',')[1];
  }, { b64, w: TARGET_W });
  writeFileSync(`${DIR}/${f}-sm.webp`, Buffer.from(out, 'base64'));
  console.log('  ok', `${f}-sm.webp`);
}
await browser.close();
console.log('done');
