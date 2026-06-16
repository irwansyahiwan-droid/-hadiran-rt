// Capture screenshot mode Warga (view-only) untuk manifest.screenshots.
// Pakai pagar ringan "warga" (bukan kredensial rahasia). Jalankan dgn dev server hidup.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = 'public/screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  colorScheme: 'light',
  serviceWorkers: 'block', // cegah SW PWA serve index lama → preloadError reload-loop
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('  [console]', m.type(), m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 200)));
page.on('load', () => console.log('  [load]', page.url()));
await page.goto(URL, { waitUntil: 'networkidle' });

// Masuk mode Warga — ketik per-karakter (onChange per huruf) lalu Enter
// (input punya handler Enter → handleWargaSubmit). Paling andal utk controlled input.
const pw = page.locator('#warga-password');
await pw.waitFor({ timeout: 15000 });
await pw.click();
await pw.pressSequentially('warga', { delay: 80 }); // keystroke nyata → React onChange fire
console.log('  nilai field:', JSON.stringify(await pw.inputValue()));
await page.getByRole('button', { name: 'Masuk Sekarang' }).click();

// Tunggu betul-betul masuk: bottom nav muncul (poll, toleran animasi)
let entered = false;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(700);
  const hasNav = await page.locator('nav button', { hasText: 'Beranda' }).count();
  const onLogin = await page.locator('#warga-password').count();
  if (hasNav > 0 && onLogin === 0) { entered = true; break; }
}
if (!entered) {
  await page.screenshot({ path: `${OUT}/_debug.png` });
  console.log('GAGAL masuk warga — lihat _debug.png; login masih:', await page.locator('#warga-password').count());
  await browser.close();
  process.exit(1);
}
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(3000); // data Supabase + skeleton selesai

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('  ok', name);
}

await shot('1-beranda');
for (const [tab, file] of [['Jadwal', '2-jadwal'], ['Kas', '3-kas']]) {
  await page.locator('nav button', { hasText: tab }).first().click();
  await page.waitForTimeout(5000); // tunggu count-up Odometer + skeleton selesai
  await shot(file);
}

await browser.close();
console.log('done');
