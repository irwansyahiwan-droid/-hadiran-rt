// Audit TEKS TERPOTONG — elemen ber-`truncate`/`line-clamp` yang isinya tak muat
// sehingga terpenggal elipsis.
//
// Kenapa ada (18 Agu 2026): tak satu pun sapuan lain melihatnya. `audit:lebar`
// mencari nominal yang MELUBER keluar kotaknya; `audit:reflow` mencari halaman
// yang geser samping. Teks terpotong tidak melakukan keduanya — ia PATUH pada
// kotaknya, cuma kehilangan sebagian isinya, jadi setiap sapuan geometri
// melaporkannya sebagai sehat. Terukur pertama kali di tab warga: 19 potongan,
// semuanya kurang 7–18px saja ("Talangan · 7 w…", "Nisan Nasrullah ( Ica…").
//
// AMBANG 0, BUKAN 1px. Percobaan pertama menyaring `scrollWidth > clientWidth+1`
// untuk menghindari lapor palsu subpiksel — dan toleransi itu justru menelan
// temuan asli: satu nama meleset TEPAT 1,0px, probe melapor "0 potongan"
// sementara elipsisnya jelas terlihat di screenshot. Lebar teks asli kini
// diukur lewat `Range.getBoundingClientRect()` (bukan `scrollWidth`, yang
// dibulatkan ke integer dan menyembunyikan defisit pecahan).
//
// Bendahara di-MOCK 3 lapis aman, identik audit-kontras-deep.mjs: sesi palsu di
// localStorage + rest/v1 dipaksa anon + SEMUA method tulis dibalas 403 oleh
// Playwright. Jangan pernah pakai kredensial asli di sini.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const env = readFileSync(new globalThis.URL('../.env', import.meta.url), 'utf8');
const SUPA_URL = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
const REF = SUPA_URL.match(/https:\/\/([^.]+)\./)[1];

function fakeSession() {
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: '00000000-0000-4000-8000-0000000000aa', role: 'authenticated', aud: 'authenticated', exp: 4102444800, email: 'audit@lokal' })}.x`;
  return {
    access_token: jwt, token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800,
    refresh_token: 'audit-refresh',
    user: { id: '00000000-0000-4000-8000-0000000000aa', aud: 'authenticated', email: 'audit@lokal',
      app_metadata: { provider: 'email' }, user_metadata: { role: 'bendahara' } },
  };
}

// Pemungut: hanya elemen DAUN (tanpa anak elemen) yang benar-benar memotong.
const PUNGUT = () => {
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
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

async function newCtx(browser, bendahara) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    colorScheme: 'light', serviceWorkers: 'block',
  });
  await ctx.addInitScript(({ b, ref, sess }) => {
    try {
      localStorage.setItem('hadiran-welcome-v2', '1');
      localStorage.setItem('hadiran-theme', 'light');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess));
    } catch { /* storage diblokir */ }
  }, { b: bendahara, ref: REF, sess: fakeSession() });

  if (bendahara) {
    await ctx.route('**/rest/v1/**', (route) => {
      const req = route.request(); const m = req.method();
      const baca = m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || (m === 'POST' && req.url().includes('/rpc/'));
      if (!baca) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"audit: tulis diblokir"}' });
      return route.continue({ headers: { ...req.headers(), authorization: `Bearer ${ANON}`, apikey: ANON } });
    });
    await ctx.route('**/auth/v1/**', (route) => {
      const req = route.request();
      if (req.url().includes('/logout')) return route.fulfill({ status: 204, body: '' });
      if (req.url().includes('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession().user) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession()) });
    });
  }
  const page = await ctx.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });

  /* MUTASI=1 — menyempitkan tiap kolom teks 40px supaya baris yang sehat
     DIPAKSA terpotong. Hijau tanpa mutasi tak membuktikan apa pun: sapuan yang
     tak pernah sampai ke isinya juga melaporkan nol. Jalankan `MUTASI=1` dan
     temuannya WAJIB melonjak; kalau tetap nol, yang rusak probenya. */
  if (process.env.MUTASI) {
    await page.addStyleTag({ content: '.min-w-0,.truncate{max-width:calc(100% - 40px)!important}' })
      .catch(() => {});
    await page.addInitScript(() => {
      const pasang = () => {
        const s = document.createElement('style');
        s.textContent = '.min-w-0,.truncate{max-width:calc(100% - 40px)!important}';
        document.head.appendChild(s);
      };
      if (document.head) pasang(); else addEventListener('DOMContentLoaded', pasang);
    });
  }
  return { ctx, page };
}

// Gulir SELURUH halaman: baris di bawah lipatan tak dirender (content-visibility),
// jadi memungut sekali di puncak = menyempitkan populasi tanpa mengaku.
async function pungutLayar(page, nama, hasil) {
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 600) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(140);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(350);
  const found = await page.evaluate(PUNGUT);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const uniq = new Map();
  for (const f of found) uniq.set(f.t + '|' + f.kurang, f);
  const list = [...uniq.values()].sort((a, b) => b.kurang - a.kurang);
  hasil.push({ layar: nama, n: list.length, item: list });
  console.log(`  ${list.length ? '✗' : 'ok'}  ${nama.padEnd(22)} ${list.length}`);
  return list;
}

async function gotoTab(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('nav button', { hasText: label }).first().click({ force: true, timeout: 8000 })
    .catch(() => page.locator('nav button', { hasText: label }).first().evaluate((el) => el.click()));
  await page.waitForTimeout(3200);
}

async function openMenuItem(page, itemLabel) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Menu' }).click().catch(() => {});
  await page.waitForTimeout(600);
  const item = page.getByRole('menu').getByText(itemLabel, { exact: false });
  if (!(await item.count())) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); return false; }
  await item.first().click();
  await page.waitForTimeout(1400);
  return true;
}

async function closeLayer(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  if (await page.locator('[role="dialog"]').count()) { await page.goBack(); await page.waitForTimeout(700); }
}

const browser = await chromium.launch();
const hasil = [];
const ONLY = process.env.ONLY; // 'warga' | 'bendahara'

// ── WARGA ──────────────────────────────────────────────────────────────────
if (!ONLY || ONLY === 'warga') {
  const { ctx, page } = await newCtx(browser, false);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.fill('input[type=password]', 'warga');
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((b) => /Masuk Sekarang/.test(b.textContent))?.click());
  await page.waitForTimeout(3000);
  if (!(await page.locator('nav button').count())) {
    console.log('PROBE CACAT: gate warga tak terlewati');
    process.exitCode = 2;
  } else {
    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    console.log('tab warga:', JSON.stringify(tabs));
    for (const tab of tabs) { await gotoTab(page, tab); await pungutLayar(page, `w-${tab}`, hasil); }
  }
  await ctx.close();
}

// ── BENDAHARA (mock read-only) ─────────────────────────────────────────────
if (!ONLY || ONLY === 'bendahara') {
  const { ctx, page } = await newCtx(browser, true);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  const navN = await page.locator('nav button').count();
  if (!navN) {
    console.log('PROBE CACAT: mock bendahara gagal — masih di layar login');
    process.exitCode = 2;
  } else {
    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    console.log('tab bendahara:', JSON.stringify(tabs));
    for (const tab of tabs) { await gotoTab(page, tab); await pungutLayar(page, `b-${tab}`, hasil); }

    for (const [tab, aria, nama] of [
      ['Hadiran', 'Setor ke Kas RT', 'b-sheet-setor'],
      ['Kas RT', 'Tambah transaksi Kas RT', 'b-sheet-kasrt'],
    ]) {
      await gotoTab(page, tab);
      const fab = page.getByRole('button', { name: aria });
      if (await fab.count()) {
        await fab.click().catch(() => {});
        await page.waitForTimeout(900);
        if (await page.locator('[role="dialog"]').count()) { await pungutLayar(page, nama, hasil); await closeLayer(page); }
      }
    }

    for (const [label, nama] of [
      ['Tutup Buku Triwulan', 'b-laporan'], ['Riwayat Aktivitas', 'b-riwayat'],
      ['Kelola Anggota', 'b-anggota'], ['Backup & Restore', 'b-backup'],
      ['Tentang Aplikasi', 'b-tentang'],
    ]) {
      if (await openMenuItem(page, label)) { await pungutLayar(page, nama, hasil); await closeLayer(page); }
    }
  }
  await ctx.close();
}

const total = hasil.reduce((s, h) => s + h.n, 0);
console.log(`\n=== TEMUAN: ${total} teks terpotong @390px, ${hasil.length} layar ===`);
for (const h of hasil.filter((x) => x.n)) {
  console.log(`\n  ${h.layar}`);
  for (const it of h.item.slice(0, 8)) console.log(`    kurang ${String(it.kurang).padStart(5)}px  "${it.t}"`);
}
await browser.close();
process.exitCode = total ? 1 : (process.exitCode || 0);
