// Audit LURING — app dibuka & dipakai saat tak ada sinyal sama sekali.
//
// Kenapa alat sendiri: `audit:keadaan` memaksa SERVER membalas gagal (500/[]),
// `audit:masuk` menguji jalur auth saat jaringan busuk. Keduanya tetap punya
// jaringan. Tak satu pun pernah MEMATIKANNYA — padahal app ini PWA dgn service
// worker, dan jalur luring itu KODE YANG SAMA SEKALI BERBEDA: shell disajikan
// dari cache, chunk halaman dari stale-while-revalidate, sementara Supabase
// sengaja DILEWATI sw.js sehingga tiap request datanya gagal keras.
//
// Warga app ini memakai Android kelas bawah dgn sinyal seadanya; "dibuka saat
// tak ada sinyal" bukan kasus tepi, itu hari Selasa.
//
// Yang diuji — empat sifat, dan sifat ke-3 yang paling mudah rusak diam-diam:
//   1. shell tetap terbuka (bukan layar putih / dinosaurus browser)
//   2. TIDAK terlempar ke Login (gate warga bertahan tanpa jaringan)
//   3. app MENGAKU sedang tanpa sinyal — app kas dilarang menyajikan angka
//      basi seolah angka sekarang (lihat `audit:keadaan`)
//   4. pindah tab tetap bekerja dari cache, tanpa layar kosong
//
// CATATAN localhost: `@vercel/analytics` & `@vercel/speed-insights` menyuntik
// `/_vercel/*/script.js`. Path itu HANYA ada di Vercel; di `vite preview` ia
// 404 lalu dibalas index.html oleh fallback SPA, jadi console memuntahkan
// "Unexpected token '<'". Itu artefak lokal, BUKAN cacat app — diverifikasi
// 22 Agu 2026: di produksi keduanya balas `application/javascript`. Sapuan ini
// karena itu MENYARING request `_vercel/` sebelum menilai.
//
// Pakai:  npm run audit:luring
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   MUTASI=1  → service worker dicabut sebelum luring; sapuan HARUS merah
import { chromium } from 'playwright';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';

const browser = await chromium.launch();
let gagal = 0;
const lapor = (nama, masalah) => {
  if (masalah.length) gagal++;
  console.log(`\n### ${nama}${masalah.length ? '' : '  OK'}`);
  masalah.forEach((m) => console.log('  ⚠ ' + m));
};

/* Service worker SENGAJA TIDAK diblokir — ia justru subjeknya. Semua sapuan
   lain memakai `serviceWorkers: 'block'` demi hasil yang stabil, dan itulah
   sebabnya jalur ini tak pernah terlihat oleh satu pun dari mereka. */
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('hadiran-welcome-v2', '1');
    localStorage.setItem('hadiran-theme', 'light');
  } catch { /* abaikan */ }
});
const page = await ctx.newPage();
const errJs = [];
page.on('pageerror', (e) => errJs.push(e.message.replace(/\s+/g, ' ').slice(0, 140)));
const asetAneh = [];
page.on('response', (r) => {
  const ct = r.headers()['content-type'] || '';
  // `_vercel/*` dilewati: lihat CATATAN localhost di kepala berkas.
  if (/\.js(\?|$)/.test(r.url()) && !/javascript/.test(ct) && !r.url().includes('/_vercel/')) {
    asetAneh.push(`${r.url().split('/').pop()} → ${r.status()} ${ct || '(tanpa ct)'}`);
  }
});

await page.goto(APP, { waitUntil: 'networkidle' });
const pw = page.locator('#masuk-warga');
await pw.waitFor({ timeout: 60000 });
await pw.click();
await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 60000 });
await page.waitForTimeout(4500);

const dikontrol = await page.evaluate(() => !!navigator.serviceWorker.controller);
if (!dikontrol) {
  lapor('luring/prasyarat', ['PROBE CACAT: service worker tak mengontrol halaman — uji luring tak bermakna']);
  await browser.close();
  process.exit(2);
}

if (MUTASI) {
  /* MUTASI: cabut service worker + buang cache-nya. Tanpa keduanya, reload saat
     luring tak punya apa pun untuk disajikan → sapuan WAJIB merah di sifat 1.
     Ini menguji ASSERSI INTI sapuan, bukan sekadar membuat sesuatu berubah. */
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });
  await page.waitForTimeout(1200);
}

await ctx.setOffline(true);

// ── 1–3) reload saat luring ──────────────────────────────────────────────────
await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { /* kegagalan navigasi = temuan, bukan crash */ });
await page.waitForTimeout(8000);

const A = await page.evaluate(() => {
  const b = (document.body.innerText || '').replace(/\s+/g, ' ');
  return {
    kosong: b.trim().length < 20,
    login: !!document.querySelector('#masuk-warga'),
    /* Odometer merender PITA digit "0 1 2 3 4 5 6 7 8 9" — menandainya sbg
       "app menyatakan Rp0" itu temuan palsu, jadi pola ini mengecualikannya. */
    rp0: /Rp\s?0(?!\s*1\s*2\s*3)\b/.test(b),
    aku: /tanpa sinyal|tidak ada internet|luring|offline|koneksi/i.test(b),
    teks: b.slice(0, 110),
  };
});
{
  const m = [];
  if (A.kosong) m.push('LAYAR KOSONG saat luring — shell tak tersaji dari cache');
  if (A.login) m.push('TERLEMPAR KE LOGIN saat luring — gate warga tak bertahan tanpa jaringan');
  if (!A.kosong && !A.login && !A.aku) m.push('app TIDAK MENGAKU tanpa sinyal — angka basi tampil seolah angka sekarang');
  if (A.rp0) m.push('menyatakan "Rp0" saat luring — app kas dilarang mengarang nominal');
  lapor('luring/buka ulang tanpa sinyal', m);
  if (!m.length) console.log(`    ${A.teks}`);
}

// ── 4) pindah tab saat luring ────────────────────────────────────────────────
if (!A.kosong && !A.login) {
  const tabs = await page.$$eval('nav button', (bs) => bs.map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
  for (const t of tabs.slice(1)) {
    const b = page.locator('nav button', { hasText: t }).first();
    await b.click({ force: true, timeout: 8000 }).catch(() => b.evaluate((el) => el.click()));
    await page.waitForTimeout(5000);
    const s = await page.evaluate(() => {
      const x = (document.body.innerText || '').replace(/\s+/g, ' ');
      return { kosong: x.trim().length < 20, aku: /tanpa sinyal|tidak ada internet|luring|offline|koneksi/i.test(x) };
    });
    const m = [];
    if (s.kosong) m.push('layar KOSONG — chunk halaman tak tersaji dari cache');
    if (!s.kosong && !s.aku) m.push('tak ada pengakuan tanpa sinyal di layar ini');
    lapor(`luring/tab ${t}`, m);
  }
}

if (asetAneh.length) lapor('luring/aset', [`aset .js membalas non-JS: ${asetAneh.slice(0, 4).join(' | ')}`]);
if (errJs.length) lapor('luring/galat js', [`pageerror: ${errJs.slice(0, 3).join(' | ')}`]);

await browser.close();
console.log(`\n=== luring @390px · ${gagal} bermasalah ===`);
if (MUTASI && gagal === 0) { console.log('\nPROBE CACAT: MUTASI=1 tapi nol temuan — sapuan tak menguji apa pun.'); process.exit(2); }
process.exit(gagal ? 1 : 0);
