// Capture screenshot mode Warga (view-only) untuk manifest.screenshots.
// Pakai pagar ringan "warga" (bukan kredensial rahasia). Jalankan dgn dev server hidup.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

/* 5173 = port BAWAAN `npm run dev` (vite.config.ts tak menyetel server.port).
   Sampai 5 Sep 2026 nilai di sini 5174 — port yang cuma dipakai vite kalau
   5173 sudah terpakai — jadi `npm run tangkap` gagal konek di mesin bersih
   dan penembakan ulang tak pernah semudah yang dikira. */
const URL = process.env.CAP_URL || 'http://localhost:5173';
/* Sasaran JAUH (produksi) menempuh cold start + Supabase nyata, jadi 30 dtk
   bawaan Playwright tak cukup — pelajaran ke-20: `audit:mundur` MATI dua kali
   berturut-turut persis karena ini, dan matinya di tengah jalan sesudah
   sebagian populasi selesai. Menembak langsung ke produksi adalah cara
   TERMUDAH menyegarkan showcase (tak perlu dev server maupun `.env`), jadi
   jalur itu wajib tahan. */
const JAUH = !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(URL);
const NAV_MS = JAUH ? 90_000 : 30_000;
/* SHOT_OUT ada supaya rantai ini bisa DILATIH tanpa menimpa aset sungguhan —
   menembak ke public/ hanya untuk mencoba mekanismenya akan merusak showcase
   landing dgn layar keadaan-kosong. */
const OUT = process.env.SHOT_OUT || 'public/screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  colorScheme: 'light',
  serviceWorkers: 'block', // cegah SW PWA serve index lama → preloadError reload-loop
});
const page = await ctx.newPage();
// Lewati WelcomeSheet onboarding — kunci sama dgn audit-kontras (WelcomeSheet.tsx).
await page.addInitScript(() => localStorage.setItem('hadiran-welcome-v2', '1'));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('  [console]', m.type(), m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 200)));
page.on('load', () => console.log('  [load]', page.url()));
/* Sekali ulang: cegukan tunggal tak boleh membunuh seluruh penembakan;
   gagal DUA kali tetap menyerah keras, karena itu memang bukan cegukan. */
try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: NAV_MS });
} catch {
  console.log('  navigasi pertama gagal, mengulang sekali…');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: NAV_MS });
}

// Masuk mode Warga — ketik per-karakter (onChange per huruf) lalu Enter
// (input punya handler Enter → handleWargaSubmit). Paling andal utk controlled input.
const pw = page.locator('#masuk-warga');
await pw.waitFor({ timeout: NAV_MS });
await pw.click();

// Tunggu betul-betul masuk: bottom nav muncul (poll, toleran animasi)
let entered = false;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(700);
  const hasNav = await page.locator('nav button', { hasText: 'Beranda' }).count();
  const onLogin = await page.locator('#masuk-warga').count();
  if (hasNav > 0 && onLogin === 0) { entered = true; break; }
}
if (!entered) {
  await page.screenshot({ path: `${OUT}/_debug.png` });
  console.log('GAGAL masuk warga — lihat _debug.png; login masih:', await page.locator('#masuk-warga').count());
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
