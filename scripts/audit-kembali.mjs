// Audit KEMBALI DARI LATAR: apakah data di layar masih boleh dipercaya sesudah
// app ditinggal, lalu dibuka lagi.
//
// Kenapa alat sendiri — tepi yang tak disentuh 17 sapuan lain: semuanya menguji
// SATU kunjungan yang berjalan terus. `audit:masuk` satu-satunya yang pernah
// memuat ULANG halaman (dan itu memang reload penuh: state React lahir baru).
// Tak satu pun pernah menguji sesi yang TETAP HIDUP tapi ditinggal — padahal
// itu cara app ini benar-benar dipakai: warga buka Hadiran RT, pindah ke
// WhatsApp membalas grup, lalu kembali. Halaman tak dimuat ulang, `useEffect`
// mount tak jalan lagi, dan halaman-halaman utama TIDAK memasang realtime
// (`useRealtime` cuma dipakai Riwayat Aktivitas) — jadi yang terbaca warga
// adalah angka saat ia membuka app tadi, tanpa satu pun tanda bahwa itu basi.
// Untuk app kas, "saldo lama yang tampak seperti saldo sekarang" bukan soal
// rasa; itu pernyataan keliru tentang uang.
//
// TIGA sifat diuji sekaligus, karena memperbaiki yang pertama gampang merusak
// dua sisanya:
//   1. KEMBALI LAMA  → data diambil ulang (≥1 GET rest/v1).
//   2. KEMBALI SEBENTAR → TIDAK diambil ulang. Warga menyentuh notifikasi lalu
//      balik dalam 3 detik; menyegarkan tiap kali itu = badai request di paket
//      Supabase GRATIS, dan baterai HP kelas bawah.
//   3. DIAM-DIAM → penyegarannya tak boleh memunculkan skeleton lagi. Layar
//      yang berkedip balik ke abu tiap kali app dibuka terasa lebih murah
//      daripada data basi yang diam.
//
// BATAS SAPUAN — diakui, bukan disembunyikan: Chromium di harness ini TIDAK
// BISA benar-benar disembunyikan. `Emulation.setPageVisibilityOverride` sudah
// tak ada di protokol, `Page.setWebLifecycleState({state:'hidden'})` ditolak,
// dan tab kedua yang dibawa ke depan TIDAK menyembunyikan tab pertama (diuji
// headless MAUPUN headed: `visibilityState` tetap 'visible', nol event).
// Karena itu transisinya DISUNTIK — getter `visibilityState`/`hidden` ditimpa
// lalu `visibilitychange` dikirim. Artinya sapuan ini menguji HANDLER app
// terhadap kontrak peramban, bukan peramban itu sendiri. Jeda "ditinggal"-nya
// TIDAK dipalsukan: sapuan menunggu betulan, supaya ambang basi app benar-benar
// terlampaui.
//
// Pakai:  npm run audit:kembali
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   LAMA=65 SEBENTAR=4                      (detik ditinggal)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const LAMA = +(process.env.LAMA || 65) * 1000;
const SEBENTAR = +(process.env.SEBENTAR || 4) * 1000;
const TUNGGU_GET = 6000;   // sabar menunggu GET sesudah kembali

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const SUPA = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
const REF = SUPA.match(/https:\/\/([^.]+)\./)[1];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesiPalsu = () => ({
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '00000000-0000-4000-8000-0000000000aa', role: 'authenticated', exp: 4102444800, user_metadata: { role: 'bendahara' } })}.audit`,
  token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800, refresh_token: 'audit-refresh',
  user: { id: '00000000-0000-4000-8000-0000000000aa', aud: 'authenticated', email: 'audit@lokal', app_metadata: { provider: 'email' }, user_metadata: { role: 'bendahara' }, created_at: '2026-01-01T00:00:00Z' },
});

/* Suntikan visibilitas. `configurable: true` supaya bisa dibolak-balik, dan
   `document.hidden` ikut ditimpa — kode yang membaca salah satunya saja tetap
   melihat dunia yang konsisten. */
const PASANG_VIS = () => {
  const set = (v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  window.__sembunyi = () => set('hidden');
  window.__tampil = () => set('visible');
};

async function siapkan(browser, { bendahara }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(PASANG_VIS);
  await ctx.addInitScript(({ ref, s, b }) => {
    try {
      localStorage.setItem('hadiran-welcome-v2', '1');
      localStorage.setItem('hadiran-theme', 'light');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
    } catch { /* abaikan */ }
  }, { ref: REF, s: sesiPalsu(), b: bendahara });

  if (bendahara) {
    await ctx.route('**/rest/v1/**', (route) => {
      const q = route.request(); const m = q.method();
      if (!(m === 'GET' || m === 'HEAD' || m === 'OPTIONS')) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"audit: tulis diblokir"}' });
      return route.continue({ headers: { ...q.headers(), authorization: `Bearer ${ANON}`, apikey: ANON } });
    });
    await ctx.route('**/auth/v1/**', (route) => {
      const u = route.request().url();
      if (u.includes('/logout')) return route.fulfill({ status: 204, body: '' });
      if (u.includes('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sesiPalsu().user) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sesiPalsu()) });
    });
  } else {
    await ctx.route('**/rest/v1/**', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));
  return { ctx, page };
}

let gagal = 0, cacat = 0;
const browser = await chromium.launch();

/** Satu putaran: sembunyikan `jeda` ms, tampilkan lagi, laporkan apa yang terjadi. */
async function putaran(page, tabel, { jeda, wajibAmbil }) {
  const get = [];
  const dengar = (r) => { if (r.url().includes('/rest/v1/') && r.method() === 'GET') get.push(r.url().split('/rest/v1/')[1].split('?')[0]); };
  await page.evaluate(() => window.__sembunyi());
  await page.waitForTimeout(jeda);
  page.on('request', dengar);
  /* Skeleton dihitung SELAMA jendela, bukan sesudahnya: kalau ia muncul lalu
     hilang dalam 300ms, memotretnya belakangan akan melaporkan "tak ada". */
  await page.evaluate(() => {
    window.__skel = 0;
    window.__pantau?.disconnect?.();
    window.__pantau = new MutationObserver(() => {
      if (document.querySelector('.skeleton, .skeleton-bar')) window.__skel++;
    });
    window.__pantau.observe(document.body, { childList: true, subtree: true });
  });
  await page.evaluate(() => window.__tampil());
  await page.waitForTimeout(TUNGGU_GET);
  page.off('request', dengar);
  const skel = await page.evaluate(() => { window.__pantau?.disconnect?.(); return window.__skel; });

  const ambil = get.length;
  let vonis = 'OK', pesan = '';
  if (wajibAmbil && ambil === 0) { vonis = '⚠ DATA BASI DIAM'; pesan = 'nol GET sesudah kembali — angka di layar tetap yang lama'; }
  else if (!wajibAmbil && ambil > 0) { vonis = '⚠ BADAI REQUEST'; pesan = `${ambil} GET untuk perginya cuma ${jeda / 1000} dtk`; }
  else if (wajibAmbil && skel > 0) { vonis = '⚠ BERKEDIP'; pesan = 'skeleton muncul lagi — penyegaran tak diam-diam'; }
  console.log(`  ${tabel.padEnd(30)} pergi ${String(jeda / 1000).padStart(2)} dtk → GET ${String(ambil).padStart(2)}${skel ? ` · skeleton ${skel}` : ''}  ${vonis}${pesan ? ` (${pesan})` : ''}`);
  if (vonis !== 'OK') gagal++;
  return ambil;
}

for (const bendahara of [false, true]) {
  const peran = bendahara ? 'BENDAHARA' : 'WARGA';
  const tab = bendahara ? 'Kas RT' : 'Beranda';
  console.log(`\n════════ ${peran} · tab ${tab} ════════`);
  const { ctx, page } = await siapkan(browser, { bendahara });
  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  if (!bendahara) {
    const pw = page.locator('#warga-password');
    await pw.waitFor({ timeout: 60000 });
    await pw.focus();
    await pw.pressSequentially('warga', { delay: 60 });
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
  }
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(4000);
  if (bendahara) {
    await page.locator('nav button', { hasText: tab }).first().click({ force: true });
    await page.waitForTimeout(4000);
  }
  const siap = await page.evaluate(() => typeof window.__sembunyi === 'function');
  if (!siap) { console.log('  PROBE CACAT: suntikan visibilitas tak terpasang'); cacat++; await ctx.close(); continue; }

  await putaran(page, '1. ditinggal LAMA', { jeda: LAMA, wajibAmbil: true });
  await page.waitForTimeout(1500);
  await putaran(page, '2. ditinggal SEBENTAR', { jeda: SEBENTAR, wajibAmbil: false });
  await ctx.close();
}

await browser.close();
console.log(`\n=== ditinggal ${LAMA / 1000} dtk (lama) & ${SEBENTAR / 1000} dtk (sebentar) · 2 peran · ${gagal} bermasalah ===`);
if (cacat) console.log(`${cacat} probe cacat (bukan vonis app) — betulkan ALATNYA.`);
process.exit(gagal ? 1 : 0);
