// Audit FOKUS PULANG — overlay yang dibuka dari Menu mengembalikan fokus ke
// tombol "Menu" saat ditutup (§2.4.3 Focus Order, pola WAI-ARIA menu button).
//
// Kenapa alat sendiri (19 Okt 2026): `useDialog` mengembalikan fokus ke
// `activeElement` saat dialog dibuka. Untuk overlay dari Menu itu ITEM MENU,
// yang lenyap bersama menunya — jadi `focus()` diam-diam gagal dan fokus jatuh
// ke <body>. Terukur 24/24 penutupan (8 overlay × Escape/Kembali/Back HP) di
// kedua peran, tak satu pun pulang. Pengguna papan ketik & pembaca layar lalu
// mulai lagi dari puncak dokumen tiap menutup Kartu Saya, Riwayat, Tentang….
// `audit:papan-ketik` bagian B memang menguji "fokus kembali ke pemicu", tapi
// hanya pada 6 lapisan yang dibuka dari tombol yang TETAP ADA; overlay Menu tak
// pernah masuk populasinya (berkas itu dikunci, jadi penjaganya hidup di sini).
// Obatnya di `Header.tsx`: item menu memfokuskan tombol Menu SEBELUM aksinya.
//
// Populasi dipungut dari MENU YANG DIRENDER, bukan daftar tulis-tangan: tiap
// item kecuali aksi non-lapisan (NON_LAPISAN) WAJIB membuka dialog — overlay
// baru otomatis ikut terukur. Item yang tak membuka dialog = PROBE CACAT.
//
// Vonis per penutupan: fokus di tombol "Menu" · tak ada dialog tersisa ·
// penutupan lewat KETUKAN (Kembali / Back HP) tak memunculkan cincin fokus
// (`:focus-visible`) — memulangkan fokus tak boleh membuat pengguna sentuh
// melihat cincin yang tak pernah mereka minta. Escape (papan ketik) boleh.
//
// Pakai:  npm run audit:fokus-pulang
//   MUTASI=1 → `focus()` pada tombol Menu dibisukan (mengembalikan bug asli);
//              SEMUA penutupan wajib merah, kalau tidak PROBE CACAT (exit 2).
import { chromium } from 'playwright';
import { newCtx, loginWarga } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';
const NON_LAPISAN = [/^Bagikan halaman ini$/, /^Mode (Gelap|Terang)$/, /^Keluar$/];
const CARA = ['Escape', 'Kembali', 'Back HP'];

const temuan = [];
const cacat = [];
let diuji = 0;

const bacaFokus = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return {
    nama: (a?.getAttribute('aria-label') || a?.tagName || '').slice(0, 40),
    cincin: !!a?.matches?.(':focus-visible'),
    dialog: document.querySelectorAll('[role="dialog"]').length,
  };
});

async function bukaMenu(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menu').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
}

const browser = await chromium.launch();
for (const peran of ['warga', 'bendahara']) {
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: peran === 'bendahara' });
  await page.setViewportSize({ width: 390, height: 844 });
  if (MUTASI) {
    await ctx.addInitScript(() => {
      const asli = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (o) {
        if (this.getAttribute?.('aria-label') === 'Menu') { window.__mutasi = (window.__mutasi || 0) + 1; return; }
        return asli.call(this, o);
      };
    });
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  if (peran === 'warga') await loginWarga(page);
  await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);

  await bukaMenu(page);
  const semua = (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const lapisan = semua.filter((t) => !NON_LAPISAN.some((r) => r.test(t)));
  console.log(`[${peran}] menu: ${semua.length} item · ${lapisan.length} overlay: ${lapisan.join(' · ')}`);
  if (!lapisan.length) cacat.push(`${peran}: menu tak memuat satu overlay pun`);

  for (const item of lapisan) {
    for (const cara of CARA) {
      await bukaMenu(page);
      await page.getByRole('menuitem', { name: item, exact: true }).click();
      try {
        await page.locator('[role="dialog"]').last().waitFor({ timeout: 6000 });
      } catch {
        cacat.push(`${peran}: "${item}" tak membuka dialog`);
        await page.keyboard.press('Escape').catch(() => {});
        break;
      }
      await page.waitForTimeout(700);
      if (cara === 'Escape') await page.keyboard.press('Escape');
      else if (cara === 'Kembali') await page.locator('[role="dialog"]').last().getByRole('button', { name: 'Kembali' }).click();
      else await page.goBack();
      await page.waitForTimeout(900);
      const f = await bacaFokus(page);
      diuji++;
      const salah = [];
      if (f.dialog) salah.push(`${f.dialog} dialog tersisa`);
      if (f.nama !== 'Menu') salah.push(`fokus di "${f.nama}"`);
      if (cara !== 'Escape' && f.cincin) salah.push('cincin fokus muncul sesudah ketukan');
      if (salah.length) temuan.push(`[${peran}] ${item} · ${cara} → ${salah.join(' · ')}`);
      if (f.dialog) { await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
    }
  }
  if (MUTASI && !(await page.evaluate(() => window.__mutasi || 0))) cacat.push(`${peran}: MUTASI tak pernah mendarat`);
  await ctx.close();
}
await browser.close();

console.log(`\n### fokus pulang ke tombol Menu${temuan.length ? '' : '  OK'}`);
temuan.forEach((t) => console.log('  ⚠ ' + t));
console.log(`\n=== FOKUS PULANG: ${diuji} penutupan diuji · ${temuan.length} bermasalah ===`);
if (cacat.length) { console.log(`PROBE CACAT: ${cacat.join(' · ')}`); process.exit(2); }
if (MUTASI && temuan.length < diuji) { console.log(`PROBE CACAT: MUTASI=1 tapi hanya ${temuan.length} dari ${diuji} merah`); process.exit(2); }
process.exit(temuan.length ? 1 : 0);
