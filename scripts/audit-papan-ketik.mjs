// Audit PAPAN KETIK: apakah tiap kontrol yang terlihat benar-benar tergapai Tab.
//
// Kenapa alat sendiri: tak satu pun sapuan lain menekan tombol Tab. `audit:sentuh`
// mengukur luas area JEMPOL, `audit:kontras-nonteks` memotret ring fokus (ia
// mem-Tab, tapi hanya untuk mengambil WARNA ring — tak pernah bertanya apakah
// ada kontrol yang urutannya tak pernah sampai). Akibatnya seluruh kelas cacat
// "aksinya ada, terlihat, tapi mustahil dicapai tanpa tetikus" tak terukur.
//
// Kelas itu bukan hipotesis. Dua kali ketemu di hari yang sama (19 Agu 2026):
//   1. Menu Header — fokus tak pernah masuk ke dalam menu (`useExitAnim`
//      menunda mount satu commit), sehingga Escape/panah tak pernah kebagian
//      event. Lihat memory useexitanim-fokus-telat.
//   2. FAB — aksi-BUAT utama tiga halaman, TIDAK PERNAH tergapai Tab. Sebabnya
//      lingkar setan yang tak terlihat dari satu call-site pun: Tab MENGGULIR,
//      gulir menyalakan `useScrollHide`, dan itu dulu memasang `tabIndex={-1}`.
//      FAB duduk di ekor DOM, jadi gilirannya selalu datang setelah ia pergi.
//
// **Ambang: 100%.** Bukan angka yang dinegosiasikan — kontrol yang terlihat &
// aktif tapi tak tergapai papan ketik itu §2.1.1 gagal, titik.
//
// Populasi sengaja menyaring: `aria-hidden`, `disabled`, `.sr-only`, dan
// `tabindex="-1"` DI LUAR `[role=menu]` (roving tabindex itu pola sah — di
// dalam menu, panah yang memindah fokus, bukan Tab).
//
// Pakai:  npm run audit:papan-ketik
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   MUTASI=1  → pasang tabindex=-1 di satu tombol nyata; sapuan HARUS merah
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';
const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const SUPA = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
const REF = SUPA.match(/https:\/\/([^.]+)\./)[1];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesi = () => ({
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '00000000-0000-4000-8000-0000000000aa', role: 'authenticated', exp: 4102444800, user_metadata: { role: 'bendahara' } })}.audit`,
  token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800, refresh_token: 'audit-refresh',
  user: { id: '00000000-0000-4000-8000-0000000000aa', aud: 'authenticated', email: 'audit@lokal', app_metadata: { provider: 'email' }, user_metadata: { role: 'bendahara' }, created_at: '2026-01-01T00:00:00Z' },
});

const POP = (mutasi) => {
  const vis = (e) => {
    const b = e.getBoundingClientRect(), s = getComputedStyle(e);
    return b.width > 1 && b.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const out = [];
  for (const e of document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="menuitem"],[tabindex]')) {
    if (!vis(e)) continue;
    if (e.closest('[aria-hidden="true"]')) continue;
    if (e.hasAttribute('disabled')) continue;
    if (e.classList.contains('sr-only')) continue;
    // roving tabindex di dalam menu itu pola SAH (panah yang memindah, bukan Tab)
    if (e.getAttribute('tabindex') === '-1' && !e.closest('[role="menu"]')) continue;
    e.setAttribute('data-kb', String(out.length));
    out.push({ i: out.length, t: (e.getAttribute('aria-label') || e.innerText || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 34), tag: e.tagName.toLowerCase() });
  }
  /* MUTASI: kunci SATU kontrol nyata keluar dari urutan Tab → sapuan wajib merah.
     Batas yang diakui: React memiliki atribut ini, jadi render-ulang berikutnya
     (revalidate SWR) bisa memulihkannya — pada percobaan 19 Agu 2026 sapuan
     menyala di 6 dari 9 layar, bukan 9. Itu CUKUP sebagai bukti deteksi
     (nol layar merah = probe cacat), tapi jangan dibaca sebagai "3 layar
     kebal": mereka cuma sempat dirender ulang. */
  if (mutasi && out.length > 3) document.querySelector('[data-kb="3"]')?.setAttribute('tabindex', '-1');
  return out;
};

async function konteks(browser, bendahara) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript(({ ref, s, b }) => {
    try {
      localStorage.setItem('hadiran-welcome-v2', '1');
      localStorage.setItem('hadiran-theme', 'light');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
    } catch { /* abaikan */ }
  }, { ref: REF, s: sesi(), b: bendahara });
  if (bendahara) {
    await ctx.route('**/rest/v1/**', (route) => {
      const q = route.request(); const m = q.method();
      if (!(m === 'GET' || m === 'HEAD' || m === 'OPTIONS')) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"audit: tulis diblokir"}' });
      return route.continue({ headers: { ...q.headers(), authorization: `Bearer ${ANON}`, apikey: ANON } });
    });
    await ctx.route('**/auth/v1/**', (route) => {
      const u = route.request().url();
      if (u.includes('/logout')) return route.fulfill({ status: 204, body: '' });
      if (u.includes('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sesi().user) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sesi()) });
    });
  } else {
    await ctx.route('**/rest/v1/**', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));
  return { ctx, page };
}

const browser = await chromium.launch();
let gagal = 0, layar = 0, totalKontrol = 0;

for (const bendahara of [false, true]) {
  const peran = bendahara ? 'b' : 'w';
  const { ctx, page } = await konteks(browser, bendahara);
  await page.goto(APP, { waitUntil: 'networkidle' });
  if (!bendahara) {
    const pw = page.locator('#warga-password');
    await pw.waitFor({ timeout: 60000 });
    await pw.focus();
    await pw.pressSequentially('warga', { delay: 60 });
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
  }
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(4000);

  // Daftar tab DIBACA dari nav, jangan disalin (warga tak punya tab Talangan).
  const tabs = await page.$$eval('nav button', (bs) => bs.map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
  for (const t of tabs) {
    /* Pola `gotoTab` harness bersama: `force` melewati cek aktionabilitas tapi
       MASIH menunggu elemen stabil, dan pil indikator M3 di bar nav memang
       sedang meluncur — jadi klik bisa mentok menunggu animasi. Fallback
       `el.click()` di dalam halaman tak butuh stabilitas sama sekali. */
    const tombolTab = page.locator('nav button', { hasText: t }).first();
    await tombolTab.click({ force: true, timeout: 8000 })
      .catch(() => tombolTab.evaluate((el) => el.click()));
    await page.waitForTimeout(3500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const pop = await page.evaluate(POP, MUTASI);
    await page.evaluate(() => { document.body.setAttribute('tabindex', '-1'); document.body.focus(); });
    const kena = new Set();
    // Anggaran 2x populasi + 15: cukup utk satu putaran penuh walau fokus
    // sempat memutar balik ke awal dokumen.
    for (let i = 0; i < pop.length * 2 + 15; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => document.activeElement?.getAttribute?.('data-kb'));
      if (id != null) kena.add(+id);
      if (kena.size === pop.length) break;
    }
    const luput = pop.filter((p) => !kena.has(p.i));
    layar++; totalKontrol += pop.length;
    if (luput.length) gagal++;
    console.log(`\n### ${peran}-${t}   kontrol ${pop.length} · tergapai ${kena.size}${luput.length ? `  ⚠ LUPUT ${luput.length}` : '  OK'}`);
    luput.slice(0, 8).forEach((l) => console.log(`    ${l.tag} "${l.t}"`));
  }
  await ctx.close();
}

await browser.close();
console.log(`\n=== ${layar} layar · ${totalKontrol} kontrol @390px · ${gagal} layar punya kontrol tak tergapai ===`);
if (MUTASI && gagal === 0) { console.log('\nPROBE CACAT: MUTASI=1 tapi nol temuan — populasi/Tab tak bekerja.'); process.exit(2); }
process.exit(gagal ? 1 : 0);
