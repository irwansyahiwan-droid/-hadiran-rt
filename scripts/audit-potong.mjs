/**
 * Audit TEKS TERPOTONG — elemen ber-`truncate`/`line-clamp` yang isinya tak
 * muat sehingga terpenggal elipsis.
 *
 * Kenapa ada (18 Agu 2026): tak satu pun sapuan lain melihatnya. `audit:lebar`
 * mencari nominal yang MELUBER keluar kotaknya; `audit:reflow` mencari halaman
 * yang geser samping. Teks terpotong tidak melakukan keduanya — ia PATUH pada
 * kotaknya dan cuma kehilangan sebagian isinya, jadi tiap sapuan geometri
 * melaporkannya sehat. Itu sebabnya 19 potongan di tab warga bertahan tanpa
 * satu pun sapuan menyentuhnya ("Talangan · 7 w…", "Nisan Nasrullah ( Ica…").
 *
 * TIGA bagian, dan ambangnya TIDAK sama:
 *
 *   A. 390px — acuan HP arus utama.
 *   B. 320px — lebar terkecil yang diwajibkan §1.4.10. Temuan di sini nyata.
 *   C. TEKS DASAR 200% @360px — `html{font-size:32px}`, warga menyetel
 *      "ukuran font besar" di browser. Ini DI ATAS AA: ambang ketahanan yang
 *      app pilih sendiri karena sebagian warga lansia. JANGAN laporkan temuan
 *      C sebagai "gagal WCAG" — disiplin yang sama dgn `audit:reflow`.
 *      Catatan cakupan: menaikkan font-size akar ikut membesarkan padding &
 *      gap (Tailwind pakai rem), jadi tekanannya LEBIH berat daripada
 *      penyetelan "ukuran teks" bawaan Android yang hanya menyentuh teks.
 *
 * AMBANG PROBE 0, BUKAN 1px. Percobaan pertama menyaring
 * `scrollWidth > clientWidth + 1` demi menghindari lapor palsu subpiksel, dan
 * toleransi itu justru menelan temuan asli: satu nama meleset TEPAT 1,0px
 * sehingga probe melapor "0" sementara elipsisnya jelas terlihat di
 * screenshot. Lebar teks asli diukur lewat `Range.getBoundingClientRect()`,
 * BUKAN `scrollWidth` yang dibulatkan ke integer.
 *
 * DIVALIDASI LEWAT MUTASI. Hijau tanpa mutasi tak membuktikan apa pun —
 * sapuan yang tak pernah sampai ke isinya juga melaporkan nol. `MUTASI=1`
 * menyempitkan tiap kolom teks 40px; temuan WAJIB melonjak.
 *
 * Bendahara dijalankan lewat `newCtx(..., { bendahara: true })` dari harness
 * bersama — mock 3 lapis (sesi palsu + rest/v1 dipaksa anon + method tulis
 * dibalas 403). Mock-nya TIDAK disalin ke sini supaya tak melenceng diam-diam
 * saat aslinya berubah.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { newCtx, loginWarga, gotoTab, closeLayer, openMenuItem } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const OUT = process.env.OUT_DIR || '.audit-potong';
mkdirSync(OUT, { recursive: true });

/* Lingkup pemungutan = LAPISAN TERATAS saja. Saat overlay/sheet terbuka,
   halaman di belakangnya TIDAK di-unmount, jadi memungut se-dokumen membuat
   baris Kas RT yang sama terhitung ulang di tiap overlay (terlihat sbg
   "27 Jun · Kas Hadiran" muncul identik di b-riwayat, b-anggota, b-backup,
   dan b-tentang). Itu populasi salah, bukan temuan — kelas cacat yang sama
   dgn "probe mengambil dialog di belakang sheet" di CLAUDE.md. */
const PUNGUT = () => {
  const out = [];
  const dialogs = document.querySelectorAll('[role="dialog"]');
  const akar = dialogs.length ? dialogs[dialogs.length - 1] : document;
  akar.querySelectorAll('*').forEach((el) => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim();
    if (!t) return;
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== 'ellipsis' && cs.overflow !== 'hidden') return;
    if (el.clientWidth <= 0 || cs.visibility === 'hidden') return;
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const kurang = rg.getBoundingClientRect().width - el.clientWidth;
    if (kurang > 0.5) out.push({ t: t.slice(0, 44), kurang: +kurang.toFixed(1) });
  });
  return out;
};

const MUTASI_CSS = '.min-w-0,.truncate{max-width:calc(100% - 40px)!important}';

function pasangMutasi(ctx) {
  if (!process.env.MUTASI) return;
  return ctx.addInitScript((css) => {
    const pasang = () => {
      const s = document.createElement('style');
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.head) pasang(); else document.addEventListener('DOMContentLoaded', pasang);
  }, MUTASI_CSS);
}

function pasangTeks200(ctx) {
  /* addInitScript, BUKAN addStyleTag setelah muat: kalau disuntik belakangan,
     sebagian layout sudah terlanjur diukur React dgn font lama. */
  return ctx.addInitScript(() => {
    const pasang = () => {
      const s = document.createElement('style');
      s.textContent = 'html{font-size:32px !important}';
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.head) pasang(); else document.addEventListener('DOMContentLoaded', pasang);
  });
}

async function pungutLayar(page, bag, nama, hasil) {
  /* Gulir sampai DASAR: baris di bawah lipatan tak dirender
     (`content-visibility:auto`), jadi memungut sekali di puncak =
     menyempitkan populasi tanpa mengaku. */
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(130);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(320);
  const found = await page.evaluate(PUNGUT);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(180);
  const uniq = new Map();
  for (const f of found) uniq.set(`${f.t}|${f.kurang}`, f);
  const item = [...uniq.values()].sort((a, b) => b.kurang - a.kurang);
  hasil.push({ bag, layar: nama, n: item.length, item });
  console.log(`  ${item.length ? '✗' : 'ok'}  [${bag}] ${nama.padEnd(20)} ${item.length}`);
}

async function jelajahWarga(page, bag, hasil) {
  await loginWarga(page);
  if (!(await page.locator('nav button').count())) {
    console.log(`  PROBE CACAT [${bag}]: gate warga tak terlewati`);
    process.exitCode = 2; return;
  }
  const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
  for (const tab of tabs) { await gotoTab(page, tab); await pungutLayar(page, bag, `w-${tab}`, hasil); }
}

async function jelajahBendahara(page, bag, hasil, { dalam = true } = {}) {
  if (!(await page.locator('nav button').count())) {
    console.log(`  PROBE CACAT [${bag}]: mock bendahara gagal — masih di login`);
    process.exitCode = 2; return;
  }
  const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
  for (const tab of tabs) { await gotoTab(page, tab); await pungutLayar(page, bag, `b-${tab}`, hasil); }
  if (!dalam) return;

  for (const [tab, aria, nama] of [
    ['Hadiran', 'Setor ke Kas RT', 'b-sheet-setor'],
    ['Kas RT', 'Tambah transaksi Kas RT', 'b-sheet-kasrt'],
  ]) {
    await gotoTab(page, tab);
    const fab = page.getByRole('button', { name: aria });
    if (await fab.count()) {
      await fab.click().catch(() => {});
      await page.waitForTimeout(900);
      if (await page.locator('[role="dialog"]').count()) { await pungutLayar(page, bag, nama, hasil); await closeLayer(page); }
    }
  }
  for (const [label, nama] of [
    ['Tutup Buku Triwulan', 'b-laporan'], ['Riwayat Aktivitas', 'b-riwayat'],
    ['Kelola Anggota', 'b-anggota'], ['Backup & Restore', 'b-backup'],
    ['Tentang Aplikasi', 'b-tentang'],
  ]) {
    if (await openMenuItem(page, label)) { await pungutLayar(page, bag, nama, hasil); await closeLayer(page); }
  }
}

const browser = await chromium.launch();
const hasil = [];
const ONLY = process.env.ONLY; // '390' | '320' | '200'

// ── A: 390px (acuan HP arus utama) ─────────────────────────────────────────
if (!ONLY || ONLY === '390') {
  for (const bendahara of [false, true]) {
    const { ctx, page } = await newCtx(browser, 'light', { bendahara });
    await pasangMutasi(ctx);
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(bendahara ? 4000 : 1200);
    if (bendahara) await jelajahBendahara(page, '390', hasil);
    else await jelajahWarga(page, '390', hasil);
    await ctx.close();
  }
}

// ── B: 320px (WAJIB §1.4.10) ───────────────────────────────────────────────
if (!ONLY || ONLY === '320') {
  for (const bendahara of [false, true]) {
    const { ctx, page } = await newCtx(browser, 'light', { bendahara });
    await pasangMutasi(ctx);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(bendahara ? 4000 : 1200);
    if (bendahara) await jelajahBendahara(page, '320', hasil);
    else await jelajahWarga(page, '320', hasil);
    await ctx.close();
  }
}

// ── C: teks dasar 200% @360px (DI ATAS AA — ambang app) ────────────────────
if (!ONLY || ONLY === '200') {
  for (const bendahara of [false, true]) {
    const { ctx, page } = await newCtx(browser, 'light', { bendahara });
    await pasangTeks200(ctx);
    await pasangMutasi(ctx);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(bendahara ? 4500 : 1800);
    if (bendahara) await jelajahBendahara(page, '200', hasil, { dalam: false });
    else await jelajahWarga(page, '200', hasil);
    await ctx.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/hasil.json`, JSON.stringify(hasil, null, 1));

const jml = (b) => hasil.filter((h) => h.bag === b).reduce((s, h) => s + h.n, 0);
const layar = (b) => hasil.filter((h) => h.bag === b).length;
console.log(`\n=== TEKS TERPOTONG ===`);
console.log(`  A. 390px  (acuan HP)        : ${jml('390')} temuan / ${layar('390')} layar`);
console.log(`  B. 320px  (WAJIB §1.4.10)   : ${jml('320')} temuan / ${layar('320')} layar`);
console.log(`  C. teks 200% (ambang APP,`);
console.log(`     DI ATAS AA — bukan WCAG) : ${jml('200')} temuan / ${layar('200')} layar`);

for (const b of ['390', '320', '200']) {
  const isi = hasil.filter((h) => h.bag === b && h.n);
  if (!isi.length) continue;
  console.log(`\n  ── rincian ${b} ──`);
  for (const h of isi) {
    console.log(`  ${h.layar}`);
    for (const it of h.item.slice(0, 6)) console.log(`    kurang ${String(it.kurang).padStart(6)}px  "${it.t}"`);
  }
}
/* Keluar 1 HANYA untuk A+B. Bagian C ambang app: temuannya dilaporkan tapi
   tak menggagalkan rantai `npm run audit` — sama seperti bagian 200% di
   `audit:reflow`, supaya tak terbaca sebagai pelanggaran konformansi. */
process.exitCode = (jml('390') + jml('320')) ? 1 : (process.exitCode || 0);
