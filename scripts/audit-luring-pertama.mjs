// Audit LURING KUNJUNGAN PERTAMA — app dipasang sekali, lalu sinyal hilang
// sebelum sempat dibuka kedua kalinya.
//
// Kenapa alat SENDIRI, padahal sudah ada `audit:luring`: sapuan itu memakai
// `ctx.setOffline(true)`, dan itu TIDAK memutus fetch yang dilakukan SERVICE
// WORKER. Buktinya bukan tafsir — isi cache SW tumbuh 0 → 16 aset SELAMA fase
// yang disebut "luring", dan menambah 16 berkas segar ke cache tanpa jaringan
// itu mustahil. Jadi selama berbulan-bulan ia menguji app yang MASIH ONLINE
// lalu melaporkan hijau, sementara shell-nya benar-benar MATI di kunjungan
// pertama. Sapuan yang tak bisa gagal bukan verifikasi.
//
// Karena itu sapuan ini tidak MENGEMULASI luring: ia menyalakan preview-nya
// sendiri lalu MEMATIKANNYA. Tak ada yang bisa berbohong tentang server yang
// sudah tidak ada.
//
// Yang dibuktikan (30 Agu 2026, sebelum perbaikan, 3/3 run): `index.html`
// meminta entry chunk + vendor-react + CSS pada +180 ms, sedangkan service
// worker baru mengontrol halaman ~+250 ms — ia didaftarkan dari React, jadi
// SELALU sesudah ketiganya. Ketiganya lewat tanpa dicegat, tak pernah masuk
// cache, dan `APP_SHELL` tulisan tangan di sw.js tak mungkin menyebutnya
// (nama chunk ber-hash isi berubah tiap build). Warga yang memasang app lalu
// kehilangan sinyal mendapat splash yang tak pernah hilang.
//
// UJI KONTROL wajib (`KUNJUNGAN=2`): kunjungan kedua HARUS boot. Tanpa itu
// "app cacat" dan "alatku memutus lebih dari seharusnya" mencetak hasil sama —
// pelajaran ke-23 di CLAUDE.md.
//
// BATAS YANG DIAKUI: sapuan ini LOKAL saja; ia harus memegang tombol mati
// servernya. Lawan produksi, penjaga yang setara adalah memeriksa `SHELL` di
// /sw.js benar-benar menyebut aset ber-hash yang dirujuk /index.html.
//
// Pakai:  npm run audit:luring-pertama
//   KUNJUNGAN=2  → uji kontrol (harus BOOT)
//   MUTASI=1     → buang JS/CSS dari cache sebelum server mati; WAJIB merah
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { loginWarga } from './lib/audit-harness.mjs';

const PORT = +(process.env.PORT_UJI || 5197);
const APP = `http://localhost:${PORT}`;
const N = +(process.env.KUNJUNGAN || 1);
const MUTASI = process.env.MUTASI === '1';

const hidup = async () => { try { return (await fetch(APP, { signal: AbortSignal.timeout(2000) })).ok; } catch { return false; } };
/* `npx` cuma pembungkus — membunuh pid yang kita spawn meninggalkan proses vite
   yang asli tetap melayani, dan uji "luring" berjalan lawan server hidup. Yang
   dibunuh siapa pun yang MEMEGANG PORT-nya. */
const bunuhPort = () => { try { execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: 'ignore' }); } catch { /* memang kosong */ } };

bunuhPort();
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT)], { cwd: process.cwd(), stdio: 'ignore', detached: true });
for (let i = 0; i < 40 && !(await hidup()); i++) await new Promise((r) => setTimeout(r, 500));
if (!(await hidup())) { console.log('PROBE CACAT: preview tak mau hidup — jalankan `npm run build` dulu'); bunuhPort(); process.exit(2); }
const tamat = (kode) => { bunuhPort(); process.exit(kode); };
setTimeout(() => { console.log('PROBE CACAT: watchdog 240 dtk'); tamat(2); }, 240_000).unref?.();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });   // service worker HIDUP
await ctx.addInitScript(() => {
  try { localStorage.setItem('hadiran-welcome-v2', '1'); localStorage.setItem('hadiran-theme', 'light'); } catch { /* abaikan */ }
});
const page = await ctx.newPage();

// ── 1) kunjungan pertama, ONLINE ────────────────────────────────────────────
await page.goto(APP, { waitUntil: 'networkidle' });
await loginWarga(page).catch(() => {});
await page.waitForTimeout(6000);
for (let k = 1; k < N; k++) { await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4000); }

const dikontrol = await page.evaluate(() => !!navigator.serviceWorker?.controller);
const entry = await page.evaluate(() => [...document.querySelectorAll('script[type=module][src]')].map((s) => new URL(s.src).pathname));
const isi = () => page.evaluate(async () => {
  const out = [];
  for (const k of await caches.keys()) out.push(...(await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname));
  return out;
});
const cache = await isi();
console.log(`kunjungan ${N} · SW mengontrol ${dikontrol} · cache ${cache.length} entri (${cache.filter((u) => /\.(js|css)$/.test(u)).length} JS/CSS)`);
console.log(`entry ${entry.join(', ')} — di cache: ${entry.length > 0 && entry.every((e) => cache.includes(e))}`);
if (!dikontrol) { console.log('\nPROBE CACAT: service worker tak mengontrol halaman — uji luring tak bermakna'); await browser.close(); tamat(2); }

if (MUTASI) {
  /* MUTASI: buang JS/CSS dari cache — meniru PERSIS keadaan sebelum perbaikan
     (shell tanpa satu pun skrip). Sapuan WAJIB merah. */
  await page.evaluate(async () => {
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      for (const r of await c.keys()) if (/\.(js|css)$/.test(new URL(r.url).pathname)) await c.delete(r);
    }
  });
  await page.waitForTimeout(800);
}

// ── 2) server DIMATIKAN — luring yang tak bisa dibantah ─────────────────────
srv.kill('SIGKILL'); bunuhPort();
for (let i = 0; i < 20 && (await hidup()); i++) await new Promise((r) => setTimeout(r, 250));
if (await hidup()) { console.log('\nPROBE CACAT: server masih menjawab sesudah dimatikan'); await browser.close(); tamat(2); }

const galat = [];
page.on('requestfailed', (r) => galat.push(r.url().split('/').pop().slice(0, 46)));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => { /* gagal navigasi = temuan */ });
await page.waitForTimeout(9000);

const h = await page.evaluate(() => {
  const t = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
  return { teks: t.slice(0, 120), adaNav: !!document.querySelector('nav button'), splash: !!document.getElementById('app-splash') };
});
/* `_vercel/*` disaring: path itu HANYA ada di Vercel, di `vite preview` ia 404
   lalu dibalas index.html oleh fallback SPA. Artefak lokal, bukan cacat app. */
const aset = [...new Set(galat)].filter((g) => /\.(js|css)/.test(g) && !/^script\.js$/.test(g));

const masalah = [];
if (!h.adaNav || h.splash) masalah.push(`shell GAGAL BOOT — nav:${h.adaNav} splash:${h.splash} · "${h.teks}"`);
if (aset.length) masalah.push(`${aset.length} aset shell tak tersaji dari cache: ${JSON.stringify(aset.slice(0, 5))}`);

console.log(`\n### luring kunjungan-${N}${masalah.length ? '' : '  OK'}`);
masalah.forEach((m) => console.log('  ⚠ ' + m));
console.log(`\n=== luring kunjungan pertama · ${masalah.length} bermasalah ===`);
await browser.close();
if (MUTASI && !masalah.length) { console.log('PROBE CACAT: MUTASI=1 tapi nol temuan — sapuan tak menguji apa pun.'); tamat(2); }
if (N > 1 && masalah.length) { console.log('PROBE CACAT: uji KONTROL (kunjungan kedua) ikut merah — alat memutus lebih dari seharusnya.'); tamat(2); }
tamat(masalah.length ? 1 : 0);
