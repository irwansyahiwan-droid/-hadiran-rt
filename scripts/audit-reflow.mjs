/* Audit REFLOW & TEKS BESAR — halaman tak boleh geser samping.
 *
 * Dua pemeriksaan, dan penting membedakan bobotnya supaya laporan ini jujur:
 *
 *   A. REFLOW 320px (WCAG 2.1 §1.4.10, AA — WAJIB)
 *      320 CSS px adalah lebar terkecil yang diwajibkan standar. Kalau di sini
 *      halaman geser samping, itu pelanggaran konformansi.
 *
 *   B. TEKS DASAR 200% (DI ATAS AA — ambang app sendiri)
 *      `html{font-size:32px}` = warga menyetel "ukuran font besar" di browser.
 *      §1.4.4 sendiri sudah dianggap terpenuhi lewat pemeriksaan A (zoom 200%
 *      pada HP = viewport efektif <320px, dan standar cuma menuntut sampai
 *      320). Jadi temuan di B BUKAN pelanggaran AA — ia ambang ketahanan yang
 *      app ini pilih sendiri karena sebagian warga lansia. JANGAN laporkan
 *      temuan B sebagai "gagal WCAG"; itu melebih-lebihkan.
 *      Catatan cakupan: menaikkan font-size akar juga membesarkan padding/gap
 *      (Tailwind pakai rem), jadi tekanannya LEBIH berat dari penyetelan
 *      "ukuran teks" bawaan Android yang hanya menyentuh teks.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { newCtx, loginWarga, gotoTab, closeLayer } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = process.env.OUT_DIR || '.audit-reflow';
mkdirSync(OUT, { recursive: true });

const hasil = [];

/* Pelaku dicari dari DAUN ke atas: elemen terdalam yang melewati tepi kanan.
   Kalau dilaporkan dari leluhur, yang muncul selalu <div> pembungkus generik
   dan tak bisa ditindaklanjuti. `position:fixed` dikecualikan — ia tidak ikut
   menghasilkan scroll dokumen. */
const PROBE = `(() => {
  const de = document.documentElement;
  const batas = de.clientWidth;
  const geser = de.scrollWidth - batas;
  if (geser <= 1) return { geser: 0, pelaku: [] };
  /* Elemen di dalam pembungkus position:fixed TIDAK ikut menciptakan scroll
     dokumen (Chrome), jadi melaporkannya = menyuruh orang membetulkan yang
     bukan penyebab. Versi pertama probe ini hanya menyaring elemen yang
     posisinya sendiri fixed, sehingga seluruh isi bottom-nav muncul sebagai
     "pelaku" di kelima layar padahal biang aslinya konten biasa. */
  const dalamFixed = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement)
      if (getComputedStyle(n).position === 'fixed') return true;
    return false;
  };
  const lewat = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (dalamFixed(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right <= batas + 1) continue;
    // hanya DAUN: kalau ada anak yang juga melewati, biar anak yang dilaporkan
    if ([...el.children].some((c) => c.getBoundingClientRect().right > batas + 1)) continue;
    lewat.push({
      tag: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : ''),
      lebih: Math.round(r.right - batas),
      teks: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30),
    });
  }
  return { geser, pelaku: lewat.sort((a, b) => b.lebih - a.lebih).slice(0, 5) };
})()`;

async function periksa(page, jenis, nama) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 620) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(300);
    const r = await page.evaluate(PROBE);
    if (r.geser > 1) { hasil.push({ jenis, ctx: nama, ...r }); break; }
  }
}

async function jelajah(page, jenis, awalan) {
  await periksa(page, jenis, `${awalan}login`);
  if (!(await loginWarga(page))) { console.log('GAGAL login', jenis); return; }
  await page.waitForTimeout(3000);
  const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
  for (const t of tabs) { await gotoTab(page, t); await periksa(page, jenis, `${awalan}${t}`); }
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(700);
  const r = await page.evaluate(PROBE);
  if (r.geser > 1) hasil.push({ jenis, ctx: `${awalan}menu`, ...r });
  await closeLayer(page);
}

const browser = await chromium.launch();

// ── A: reflow 320px ───────────────────────────────────────────────────────
{
  const { ctx, page } = await newCtx(browser, 'light');
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await jelajah(page, 'reflow-320', '');
  await ctx.close();
}

// ── B: teks dasar 200% @360px ─────────────────────────────────────────────
{
  const { ctx, page } = await newCtx(browser, 'light');
  await page.setViewportSize({ width: 360, height: 800 });
  /* Lewat addInitScript, BUKAN addStyleTag setelah muat: kalau disuntik
     belakangan, sebagian layout sudah terlanjur diukur React dgn font lama. */
  await ctx.addInitScript(() => {
    const pasang = () => {
      const s = document.createElement('style');
      s.textContent = 'html{font-size:32px !important}';
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.head) pasang(); else document.addEventListener('DOMContentLoaded', pasang);
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await jelajah(page, 'teks-200', '');
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/hasil.json`, JSON.stringify(hasil, null, 1));

const a = hasil.filter((h) => h.jenis === 'reflow-320');
const b = hasil.filter((h) => h.jenis === 'teks-200');
console.log('\n=== REFLOW & TEKS BESAR ===');
console.log(`  A. reflow 320px (WAJIB §1.4.10) : ${a.length} layar geser samping`);
console.log(`  B. teks dasar 200% (di atas AA) : ${b.length} layar geser samping`);
for (const h of hasil) {
  console.log(`\n  [${h.jenis}] ${h.ctx} — geser ${h.geser}px`);
  for (const p of h.pelaku) console.log(`      +${p.lebih}px <${p.tag}> "${p.teks}"`);
}
process.exit(a.length ? 1 : 0); // hanya A yang menggagalkan gerbang
