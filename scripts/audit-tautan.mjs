// Audit TAUTAN — tautan per tab (`/jadwal`, `/hadiran`, `/kas-rt`, `/talangan`)
// yang dibagikan ke grup WA benar-benar membuka tab itu, dan alamatnya tetap
// jujur sepanjang pemakaian.
//
// Kenapa alat sendiri (14 Sep 2026): fitur ini menempel di DUA mesin yang sudah
// pernah membuat app blank/tuli — back-stack `useBackDismiss` (push sinkron vs
// back asinkron) dan gate Login warga — dan cacatnya tak terlihat dari layar:
// Beranda yang tampil dgn alamat `/kas-rt` terlihat sehat sampai seseorang
// menyalin tautannya lalu warga mendarat di tab yang salah.
//
// T1 tautan langsung → tab + alamat + judul (5 tab, bendahara)
// T2 warga lewat LOGIN → mendarat di tab tautan (termasuk /talangan)
// T3 pindah tab lewat nav → alamat ikut
// T4 BALAPAN: dari tautan /kas-rt → Jadwal → Beranda (klik sinkron satu task)
//    → alamat "/" (tanpa antrean `gantiPath` alamat tertinggal /kas-rt)
// T5 Back dari tab tautan → Beranda "/", Back lagi → keluar app (sentinel)
// T6 Back di LOGIN bertautan → langsung keluar (tak ada ketukan hangus)
// T7 lapisan di tab: Back menutup sheet saja, alamat & tab tetap
// T8 path asing → Beranda "/" · T9 keluar mode warga → "/"
// T10 bagikan: lembar bagikan menerima teks+URL yang benar; tanpa lembar →
//     URL tersalin + toast; batal (AbortError) → diam
// T11 RELOAD sesudah pindah tab lewat nav (entri di bawah masih "/") & reload
//     dgn sheet terbuka → tab & alamat pulih, Back pertama → Beranda "/".
//     Lahir dari regresi nyata: penyapu entri yatim mendarat di entri "/" dan
//     reload "Muat ulang" melempar warga ke Beranda (tertangkap `audit:masuk`).
//
// Pakai: npm run audit:tautan
//   MUTASI=1 → `history.replaceState` dibisukan di halaman; T1/T3/T4/T8 WAJIB merah.
// Bendahara di-MOCK 3 lapis (harness) — nol tulis.
import { chromium } from 'playwright';
import { newCtx, loginWarga } from './lib/audit-harness.mjs';

const URL = (process.env.CAP_URL || 'http://localhost:5199').replace(/\/$/, '');
const MUTASI = process.env.MUTASI === '1';
const SENTINEL = `${URL}/landing.html`;
const ASAL = new globalThis.URL(URL).origin;
/* Produksi tak pernah `networkidle` (analytics + koneksi Supabase hidup) — ia
   yang membunuh jalan produksi pertama sapuan ini dgn timeout 30 dtk. Tunggu
   DOKUMEN, lalu tunggu app benar-benar siap (`siapApp`). Sasaran jauh dapat
   jeda lebih panjang (preseden `audit:mundur` NAV_MS, cacat alat ke-20). */
const JAUH = !/localhost|127\.0\.0\.1/.test(URL);
const NAV = { waitUntil: 'domcontentloaded', timeout: JAUH ? 90000 : 30000 };
const TAB = [
  ['beranda', '/', 'Beranda'],
  ['jadwal', '/jadwal', 'Jadwal'],
  ['talangan', '/talangan', 'Talangan'],
  ['kas', '/hadiran', 'Hadiran'],
  ['kas-rt', '/kas-rt', 'Kas RT'],
];

const temuan = [];
const cacat = [];
let periksa = 0;
const cek = (kode, ok, rinci) => { periksa++; if (!ok) temuan.push(`${kode} ${rinci}`); return ok; };

async function konteks(opts = {}) {
  const r = await newCtx(browser, 'light', opts);
  if (MUTASI) await r.ctx.addInitScript(() => { window.__mutasi = 0; History.prototype.replaceState = function () { window.__mutasi++; }; });
  return r;
}
const keadaan = (p) => p.evaluate(() => ({
  path: location.pathname,
  tab: document.querySelector('nav button[aria-current="page"]')?.innerText.trim().split('\n')[0] ?? null,
  judul: document.title.split(' · ')[0],
  login: !!document.getElementById('masuk-warga'),
}));
const tunggu = (p, ms = 900) => p.waitForTimeout(ms);
async function buka(page, path) {
  await page.goto(SENTINEL, NAV);
  await page.goto(`${URL}${path}`, NAV);
}
async function siapApp(page) {
  await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: JAUH ? 90000 : 30000 });
  await tunggu(page, JAUH ? 3000 : 1500);
}

const browser = await chromium.launch();
try {
  // ── T1 · tautan langsung, bendahara ─────────────────────────────────────
  for (const [, path, label] of TAB) {
    const { ctx, page } = await konteks({ bendahara: true });
    await buka(page, path); await siapApp(page);
    const k = await keadaan(page);
    cek('T1', k.tab === label && k.path === path && k.judul === label, `${path} → tab ${k.tab} · alamat ${k.path} · judul ${k.judul}`);
    await ctx.close();
  }

  // ── T2 · warga lewat Login ──────────────────────────────────────────────
  for (const [, path, label] of TAB.filter(([id]) => id === 'jadwal' || id === 'talangan')) {
    const { ctx, page } = await konteks();
    await buka(page, path);
    await page.locator('#masuk-warga').waitFor({ timeout: JAUH ? 90000 : 15000 });
    const diLogin = await keadaan(page);
    cek('T2', diLogin.path === path, `Login menghapus niat tautan: alamat ${diLogin.path}, semestinya ${path}`);
    await loginWarga(page); await tunggu(page, 2000);
    const k = await keadaan(page);
    /* Warga tak punya tab Talangan di nav: yang diperiksa judul & alamat. */
    cek('T2', k.judul === label && k.path === path, `warga ${path} → judul ${k.judul} · alamat ${k.path}`);
    await ctx.close();
  }

  const { ctx, page } = await konteks({ bendahara: true });
  // ── T3 · nav → alamat ───────────────────────────────────────────────────
  await buka(page, '/'); await siapApp(page);
  for (const [, path, label] of [...TAB.slice(1), TAB[0]]) {
    await page.locator('nav button', { hasText: label }).first().click();
    await tunggu(page);
    const k = await keadaan(page);
    cek('T3', k.path === path && k.tab === label, `nav ${label} → alamat ${k.path} · tab ${k.tab}`);
  }

  // ── T4 · balapan dari tautan ─────────────────────────────────────────────
  await buka(page, '/kas-rt'); await siapApp(page);
  await page.evaluate(() => {
    const b = (t) => [...document.querySelectorAll('nav button')].find((x) => x.innerText.includes(t));
    b('Jadwal').click(); b('Beranda').click();
  });
  await tunggu(page, 1500);
  let k = await keadaan(page);
  cek('T4', k.tab === 'Beranda' && k.path === '/', `kas-rt → Jadwal → Beranda (satu task) → tab ${k.tab} · alamat ${k.path}`);
  await page.locator('nav button', { hasText: 'Jadwal' }).click(); await tunggu(page);
  await page.locator('nav button', { hasText: 'Beranda' }).click(); await tunggu(page);
  k = await keadaan(page);
  cek('T4', k.path === '/', `dari tautan: Jadwal → Beranda (terpisah) → alamat ${k.path}`);

  // ── T5 · Back dari tab tautan ────────────────────────────────────────────
  await buka(page, '/hadiran'); await siapApp(page);
  await page.goBack(); await tunggu(page, 1200);
  k = await keadaan(page);
  cek('T5', k.tab === 'Beranda' && k.path === '/', `Back dari /hadiran → tab ${k.tab} · alamat ${k.path}`);
  await page.goBack(); await tunggu(page, 1500);
  cek('T5', page.url() === SENTINEL, `Back kedua semestinya keluar app, mendarat di ${page.url()}`);

  // ── T7 · lapisan di tab ──────────────────────────────────────────────────
  await buka(page, '/kas-rt'); await siapApp(page);
  const fab = page.getByRole('button', { name: 'Tambah transaksi Kas RT' });
  if (!(await fab.count())) cacat.push('T7 FAB Kas RT tak ada');
  else {
    await fab.click(); await tunggu(page, 1000);
    const adaSheet = await page.locator('[role="dialog"]').count();
    await page.goBack(); await tunggu(page, 1200);
    k = await keadaan(page);
    const sisa = await page.locator('[role="dialog"]').count();
    cek('T7', adaSheet > 0 && sisa === 0 && k.tab === 'Kas RT' && k.path === '/kas-rt', `sheet ${adaSheet}→${sisa} · tab ${k.tab} · alamat ${k.path}`);
  }

  // ── T11 · reload ─────────────────────────────────────────────────────────
  await buka(page, '/'); await siapApp(page);
  await page.locator('nav button', { hasText: 'Kas RT' }).click(); await tunggu(page);
  await page.reload(NAV); await siapApp(page);
  k = await keadaan(page);
  cek('T11', k.tab === 'Kas RT' && k.path === '/kas-rt', `nav Kas RT lalu reload → tab ${k.tab} · alamat ${k.path}`);
  const fab2 = page.getByRole('button', { name: 'Tambah transaksi Kas RT' });
  if (await fab2.count()) {
    await fab2.click(); await tunggu(page, 1000);
    await page.reload(NAV); await siapApp(page);
    k = await keadaan(page);
    cek('T11', k.tab === 'Kas RT' && k.path === '/kas-rt', `reload dgn sheet terbuka → tab ${k.tab} · alamat ${k.path}`);
    await page.goBack(); await tunggu(page, 1200);
    k = await keadaan(page);
    cek('T11', k.tab === 'Beranda' && k.path === '/', `Back pertama sesudah reload → tab ${k.tab} · alamat ${k.path}`);
  } else cacat.push('T11 FAB Kas RT tak ada');

  // ── T8 · path asing ──────────────────────────────────────────────────────
  await buka(page, '/tidak-ada-halaman-ini'); await siapApp(page);
  k = await keadaan(page);
  cek('T8', k.tab === 'Beranda' && k.path === '/', `path asing → tab ${k.tab} · alamat ${k.path}`);

  // ── T10 · bagikan ────────────────────────────────────────────────────────
  await buka(page, '/jadwal'); await siapApp(page);
  const bagikan = async () => {
    await page.getByRole('button', { name: 'Menu' }).click(); await tunggu(page, 600);
    await page.getByRole('menuitem', { name: 'Bagikan halaman ini' }).click(); await tunggu(page, 900);
  };
  if (!MUTASI) {
    await page.evaluate(() => { window.__dibagikan = []; navigator.share = async (d) => { window.__dibagikan.push(d); }; });
    await bagikan();
    const d = await page.evaluate(() => window.__dibagikan);
    cek('T10', d.length === 1 && d[0].text === 'Jadwal · Hadiran RT 004/006' && d[0].url === `${ASAL}/jadwal` && !('title' in d[0]),
      `lembar bagikan menerima ${JSON.stringify(d)}`);

    await page.evaluate(() => { window.__umum = []; const r = document.querySelector('p.sr-only[role="status"]'); new MutationObserver(() => { if (r.textContent.trim()) window.__umum.push(r.textContent.trim()); }).observe(r, { childList: true, characterData: true, subtree: true }); });
    await page.evaluate(() => { navigator.share = async () => { throw new DOMException('batal', 'AbortError'); }; });
    await bagikan();
    const diam = await page.evaluate(() => window.__umum.filter((t) => /Tautan/.test(t)));
    cek('T10', diam.length === 0, `lembar bagikan DIBATALKAN tetap bersuara: ${JSON.stringify(diam)}`);

    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: URL });
    await page.evaluate(() => { delete Navigator.prototype.share; navigator.share = undefined; });
    await bagikan();
    const salin = await page.evaluate(async () => ({ klip: await navigator.clipboard.readText().catch(() => null), umum: window.__umum }));
    cek('T10', salin.klip === `${ASAL}/jadwal` && salin.umum.includes('Tautan halaman Jadwal disalin — tempel di WhatsApp.'),
      `tanpa lembar bagikan → papan klip ${JSON.stringify(salin.klip)} · pengumuman ${JSON.stringify(salin.umum)}`);
  }
  await ctx.close();

  // ── T6 · Back di Login bertautan ─────────────────────────────────────────
  {
    const { ctx: c, page: p } = await konteks();
    await buka(p, '/hadiran');
    await p.locator('#masuk-warga').waitFor({ timeout: JAUH ? 90000 : 15000 });
    await p.goBack(); await tunggu(p, 1500);
    cek('T6', p.url() === SENTINEL, `Back pertama di Login (tautan /hadiran) mendarat di ${p.url()} — ketukan hangus`);
    // T9 · keluar mode warga → "/"
    await p.goto(`${URL}/kas-rt`, NAV);
    await loginWarga(p); await tunggu(p, 2000);
    await p.getByRole('button', { name: 'Menu' }).click(); await tunggu(p, 600);
    await p.getByRole('menuitem', { name: 'Keluar' }).click(); await tunggu(p, 1500);
    const kk = await keadaan(p);
    cek('T9', kk.login && kk.path === '/', `keluar mode warga → login ${kk.login} · alamat ${kk.path}`);
    await c.close();
  }
} catch (e) {
  cacat.push(`MATI: ${e.message.split('\n')[0].slice(0, 160)}`);
}
await browser.close();

/* Mutasi yang tak memerahkan apa pun = penjaganya tak menggigit. */
if (MUTASI && !temuan.length) cacat.push('MUTASI tak memerahkan satu pemeriksaan pun');
console.log(`\n=== TAUTAN TAB: ${periksa} pemeriksaan · ${temuan.length} bermasalah · ${cacat.length} probe cacat${MUTASI ? ' · MUTASI=1' : ''} ===`);
temuan.forEach((t) => console.log('  ' + t));
cacat.forEach((c) => console.log('  PROBE CACAT ' + c));
/* Mutasi yang tak memerahkan apa pun = penjaganya tak menggigit (penghitung di
   halaman tak bisa dipakai: tiap `goto` melahirkan window baru). */
if (cacat.length) process.exit(2);
process.exit(temuan.length ? 1 : 0);
