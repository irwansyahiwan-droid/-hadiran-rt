/* Audit TARGET SENTUH — WCAG 2.2 §2.5.8 (min 24×24, AA) & §2.5.5 (44×44, AAA)
 * plus ambang app sendiri: 44px (Apple HIG 44pt / Material 48dp), karena warga
 * memakai jempol di HP dan sebagian lansia.
 *
 * ── KENAPA DIUKUR LEWAT HIT-TEST, BUKAN GEOMETRI ──────────────────────────
 * Percobaan pertama sapuan ini menghitung `getBoundingClientRect()` lalu
 * menambahkan `::before` negatif dari CSS — dan MELAPORKAN 19 kontrol "di bawah
 * 44px" yang ternyata SEMUANYA sudah 44px. Sebabnya: properti komputasi untuk
 * pseudo-element bernama `top/right/bottom/left`, BUKAN `insetTop`; pembacaan
 * `cs.insetTop` mengembalikan undefined → seluruh pelebaran `before:-inset-*`
 * terbaca nol. Itu false-positive ke-8 di repo ini, dan pola akarnya sama
 * seperti tujuh sebelumnya: alat menyimpulkan dari MODEL, bukan dari kenyataan.
 *
 * Karena itu ukurannya sekarang KEBENARAN DASAR: dari titik tengah kontrol,
 * rambat keluar 1px demi 1px dan tanyakan `document.elementFromPoint` — selama
 * yang kena masih kontrol itu (atau turunannya), area itu benar-benar bisa
 * ditekan. Cara ini otomatis ikut memperhitungkan hal-hal yang mustahil
 * dimodelkan dengan benar: pelebaran `::before`, `pointer-events`, tumpang
 * tindih z-order, dan kliping `overflow:hidden` leluhur.
 *
 * Batas: perambatan lewat SUMBU TENGAH, jadi area berbentuk L terukur sebagai
 * kotak. Semua target di app ini kotak/lingkaran, jadi ini tepat — kalau nanti
 * ada target aneh, itu yang harus disebut di sini, bukan diam-diam dipercaya.
 *
 * Pengecualian yang DIHORMATI (kalau tidak, alat ini akan berteriak palsu):
 *   - kontrol nonaktif (dikecualikan eksplisit di §2.5.8)
 *   - target <24px yang LOLOS "spacing exception": lingkaran 24px berpusat di
 *     target tidak bersinggungan dengan lingkaran 24px target lain
 *   - kontrol di dalam kalimat/prosa (§2.5.8 mengecualikan target inline teks)
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { newCtx, loginWarga, gotoTab, closeLayer, openMenuItem } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = process.env.OUT_DIR || '.audit-sentuh';
const ONLY = process.env.ONLY; // 'warga' | 'bendahara'
mkdirSync(OUT, { recursive: true });

const MIN_AA = 24;   // §2.5.8 Target Size (Minimum) — wajib
const TARGET = 44;   // ambang app (Apple HIG) — yang dikejar

const hasil = [];
const seen = new Set();

const UKUR = `
(() => {
  const SEL = 'button,a[href],[role="button"],[role="tab"],[role="menuitem"],[role="switch"],input:not([type="hidden"]):not([type="file"]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';
  const CAP = 26; // cukup untuk membuktikan 44px (26*2 > 44), hemat panggilan

  const terlihat = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.4) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
  };
  const mati = (el) => !!(el.disabled || el.closest('[disabled],[aria-disabled="true"]'));
  const jejak = (el) => el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
  /* §2.5.8 mengecualikan target yang menyatu dalam KALIMAT. Deteksi: leluhur
     langsung berupa paragraf/teks yang punya teks lain di sekitarnya. */
  const dalamKalimat = (el) => {
    const p = el.parentElement;
    if (!p) return false;
    if (!/^(p|span|li|label|td|figcaption)$/.test(p.tagName.toLowerCase())) return false;
    const teksLain = (p.textContent || '').replace(el.textContent || '', '').trim();
    return teksLain.length > 12;
  };

  const kandidat = [...document.querySelectorAll(SEL)].filter((el) => terlihat(el) && !mati(el));

  const milik = (el, x, y) => {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
    const h = document.elementFromPoint(x, y);
    return !!h && (h === el || el.contains(h));
  };
  /* Rambat dari sumbu tengah — kebenaran dasar, bukan model CSS. */
  const rambat = (el, cx, cy, dx, dy) => {
    let n = 0;
    while (n < CAP && milik(el, Math.round(cx + dx * (n + 1)), Math.round(cy + dy * (n + 1)))) n++;
    return n;
  };

  const out = [];
  for (const el of kandidat) {
    /* WAJIB scroll ke TENGAH dulu sebelum mengukur. Tanpa ini, kontrol yang
       kebetulan berhenti separuh di bawah Header sticky terukur separuh tinggi
       — chip filter (61x44, min-h 44px) sempat dilaporkan "53x24" karena
       rambat ke atas mentok di header, bukan karena chip-nya kecil. Yang
       diukur harus ukuran saat warga benar-benar hendak menekannya. */
    el.scrollIntoView({ block: 'center', inline: 'center' });
    if (!terlihat(el)) continue;
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    if (!milik(el, Math.round(cx), Math.round(cy))) continue; // terhalang → bukan urusan sapuan ini
    const w = rambat(el, cx, cy, -1, 0) + rambat(el, cx, cy, 1, 0) + 1;
    const h = rambat(el, cx, cy, 0, -1) + rambat(el, cx, cy, 0, 1) + 1;
    out.push({
      nama: (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 34) || jejak(el),
      w, h, tag: jejak(el), kalimat: dalamKalimat(el),
      cx: Math.round(cx), cy: Math.round(cy),
    });
  }
  /* Spacing exception §2.5.8: target <24 tetap LOLOS bila lingkaran 24px
     berpusat padanya tak menyentuh lingkaran 24px target lain. */
  for (const a of out) {
    if (a.w >= 24 && a.h >= 24) { a.renggang = true; continue; }
    a.renggang = out.every((b) => b === a || Math.hypot(a.cx - b.cx, a.cy - b.cy) >= 24);
  }
  return out;
})()`;

async function ukurView(page, ctxName) {
  for (const t of await page.evaluate(UKUR)) {
    const efektif = Math.min(t.w, t.h);
    const key = `${t.nama}|${t.w}x${t.h}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const gagalAA = efektif < MIN_AA && !t.renggang && !t.kalimat;
    /* Toleransi 1px: `h-11` kadang terukur 43 karena pembulatan sub-piksel
       (deviceScaleFactor + posisi pecahan), bukan karena kontrolnya kurang. */
    hasil.push({ ctx: ctxName, ...t, efektif, gagalAA, kurang44: efektif < TARGET - 1 });
  }
}

async function ukurPage(page, nama) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 620) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(320);
    await ukurView(page, nama);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

const browser = await chromium.launch();
/* Satu tema saja: geometri target tidak bergantung tema (warna iya, kotak tidak).
   Lebar 360px = acuan terkecil app [[anggaran-lebar-baris-360px]]. */
const theme = 'light';

if (!ONLY || ONLY === 'warga') {
  const { ctx, page } = await newCtx(browser, theme);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await ukurPage(page, 'login');
  if (!(await loginWarga(page))) { console.log('GAGAL login warga'); }
  else {
    await page.waitForTimeout(3000);
    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    console.log('[warga] tab:', JSON.stringify(tabs));
    for (const t of tabs) { await gotoTab(page, t); await ukurPage(page, `w-${t}`); }
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(700);
    await ukurView(page, 'w-menu');
    await closeLayer(page);
  }
  await ctx.close();
}

if (!ONLY || ONLY === 'bendahara') {
  const { ctx, page } = await newCtx(browser, theme, { bendahara: true });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  if (!(await page.locator('nav button').count())) console.log('GAGAL mock bendahara');
  else {
    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    console.log('[bendahara] tab:', JSON.stringify(tabs));
    for (const t of tabs) { await gotoTab(page, t); await ukurPage(page, `b-${t}`); }
    for (const [tab, aria, nama] of [
      ['Hadiran', 'Setor ke Kas RT', 'b-sheet-setor'],
      ['Kas RT', 'Tambah transaksi Kas RT', 'b-sheet-form-kasrt'],
    ]) {
      await gotoTab(page, tab);
      const fab = page.getByRole('button', { name: aria });
      if (!(await fab.count())) continue;
      await fab.click();
      await page.waitForTimeout(1000);
      if (await page.locator('[role="dialog"]').count()) { await ukurView(page, nama); await closeLayer(page); }
    }
    for (const [label, nama] of [['Kelola Anggota', 'b-anggota'], ['Riwayat Aktivitas', 'b-riwayat']]) {
      if (await openMenuItem(page, label)) {
        await page.waitForTimeout(700);
        await ukurView(page, nama);
        await page.goBack();
        await page.waitForTimeout(900);
      }
    }
  }
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/hasil.json`, JSON.stringify(hasil, null, 1));

const gagal = hasil.filter((t) => t.gagalAA).sort((a, b) => a.efektif - b.efektif);
const kurang = hasil.filter((t) => !t.gagalAA && t.kurang44).sort((a, b) => a.efektif - b.efektif);
console.log(`\n=== TARGET SENTUH @360px — ${hasil.length} kontrol ===`);
console.log(`  GAGAL §2.5.8 (<${MIN_AA}px, tanpa keringanan): ${gagal.length}`);
console.log(`  di bawah ambang app ${TARGET}px            : ${kurang.length}`);
for (const t of gagal) console.log(`  ✗ ${t.w}x${t.h} [${t.ctx}] "${t.nama}" <${t.tag}>`);
for (const t of kurang) console.log(`  · ${t.w}x${t.h} [${t.ctx}] "${t.nama}" <${t.tag}>`);
process.exit(gagal.length ? 1 : 0);
