// Audit TATA LETAK MELOMPAT (layout shift) saat skeleton berganti isi nyata.
//
// Kenapa alat sendiri: `audit:muat` mengukur KAPAN app tercat (FCP) & kapan bisa
// dipakai — bukan apakah isinya MELOMPAT sesudah itu. Sapuan geometri lain
// (`audit:sheet`, `audit:lebar`, `audit:potong`) memotret SATU keadaan diam:
// mereka mengukur layar yang sudah tenang, jadi perpindahan skeleton → data
// nyata terjadi SEBELUM pengukuran dan tak pernah terlihat oleh satu pun.
// Padahal di situlah jempol warga sudah menyentuh layar: baris bergeser tepat
// saat diketuk, dan yang terbuka bukan baris yang dituju.
//
// Diukur pakai PerformanceObserver('layout-shift') yang dipasang lewat
// addInitScript — WAJIB terpasang sebelum skrip app jalan, kalau tidak geseran
// paling awal (justru yang terbesar) sudah lewat sebelum observer ada.
//
// DUA angka dilaporkan terpisah, sengaja:
//   tanpa-input — geseran yang TAK didahului interaksi (definisi CLS Google)
//   total       — termasuk yang terjadi <500ms sesudah ketukan
// Yang kedua BUKAN pelengkap: pindah tab itu ketukan, jadi seluruh perpindahan
// skeleton → isi sesudahnya ditandai `hadRecentInput` dan HILANG dari CLS resmi.
// Justru itu geseran yang paling dirasakan warga. Menilai app ini cuma dari
// angka pertama = menyetujui lompatan yang paling sering kena jempol.
//
// Pakai:  npm run audit:lompat
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   CPU=4 KBPS=400 LATENCY=400              (kondisi HP warga; 0 = tanpa throttle)
//   MUTASI=1                                (suntik geseran palsu → sapuan HARUS merah)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const CPU = +(process.env.CPU || 4);
const KBPS = +(process.env.KBPS || 400);
const LATENCY = +(process.env.LATENCY || 400);
const MUTASI = process.env.MUTASI === '1';
// Ambang APP, bukan WCAG. Google menyebut CLS "baik" di <=0.1; app kas dipakai
// sambil berdiri di majelis, jadi dipakai ambang yang sama tapi diberlakukan ke
// angka TOTAL — termasuk geseran pasca-ketukan yang CLS resmi buang.
const AMBANG = +(process.env.AMBANG || 0.1);

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

/* Dipasang SEBELUM skrip app. Menyimpan tiap geseran + PENYEBABNYA.
   `entry.sources` itu yang bikin laporan bisa ditindaklanjuti: tanpa itu yang
   didapat cuma angka, dan angka tak memberi tahu baris mana yang melompat. */
const PASANG_OBSERVER = () => {
  window.__lompat = [];
  const jelas = (n) => {
    if (!n || n.nodeType !== 1) return '?';
    const cls = (typeof n.className === 'string' ? n.className : '').split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    const teks = (n.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 34);
    return `${n.tagName.toLowerCase()}${cls ? '.' + cls : ''}${teks ? ` "${teks}"` : ''}`;
  };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__lompat.push({
          nilai: e.value,
          input: !!e.hadRecentInput,
          t: Math.round(e.startTime),
          asal: (e.sources || []).slice(0, 3).map((s) => ({
            n: jelas(s.node),
            dy: Math.round((s.currentRect?.top ?? 0) - (s.previousRect?.top ?? 0)),
            dx: Math.round((s.currentRect?.left ?? 0) - (s.previousRect?.left ?? 0)),
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* browser tanpa layout-shift → sapuan melapor 'tak terukur' */ }
};

async function siapkan(browser, { bendahara }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript(PASANG_OBSERVER);
  await ctx.addInitScript(({ ref, s, b, mut }) => {
    try {
      localStorage.setItem('hadiran-welcome-v2', '1');
      localStorage.setItem('hadiran-theme', 'light');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
    } catch { /* abaikan */ }
    if (mut) {
      /* MUTASI: sisipkan pita yang tumbuh 120px sedetik sesudah muat. Sapuan yang
         benar HARUS melihat ini. Kalau tetap hijau, observernya tak terpasang. */
      addEventListener('DOMContentLoaded', () => {
        const d = document.createElement('div');
        d.style.cssText = 'height:0;background:#f00';
        document.body.prepend(d);
        setTimeout(() => { d.style.height = '120px'; }, 1000);
        setTimeout(() => { d.style.height = '240px'; }, 2500);
      });
    }
  }, { ref: REF, s: sesiPalsu(), b: bendahara, mut: MUTASI });

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
  if (CPU || KBPS) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    if (CPU) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    if (KBPS) await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: (KBPS * 1024) / 8, uploadThroughput: (KBPS * 1024) / 8, latency: LATENCY });
  }
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));
  return { ctx, page };
}

/* Ambil geseran yang tercatat SESUDAH penanda, lalu geser penandanya.
   Slice per-tab, bukan total sesi: kalau digabung, satu tab buruk tak bisa
   dibedakan dari lima tab yang masing-masing sedikit. */
async function panen(page, sejak) {
  const semua = await page.evaluate(() => window.__lompat || []);
  return { entri: semua.filter((e) => e.t >= sejak), tandaBaru: semua.length ? Math.max(...semua.map((e) => e.t)) + 1 : sejak };
}

function lapor(nama, entri) {
  const tanpaInput = entri.filter((e) => !e.input).reduce((s, e) => s + e.nilai, 0);
  const total = entri.reduce((s, e) => s + e.nilai, 0);
  const buruk = total > AMBANG;
  console.log(`\n### ${nama}   tanpa-input ${tanpaInput.toFixed(3)} · total ${total.toFixed(3)}${buruk ? '  ⚠ LOMPAT' : '  OK'}`);
  if (buruk) {
    for (const e of entri.filter((x) => x.nilai >= 0.01).sort((a, b) => b.nilai - a.nilai).slice(0, 5)) {
      const asal = e.asal.map((s) => `${s.n} (dy ${s.dy > 0 ? '+' : ''}${s.dy})`).join(' | ') || '(tak ada sumber)';
      console.log(`    ${e.nilai.toFixed(3)} @${e.t}ms${e.input ? ' [pasca-ketuk]' : ''}  ${asal}`);
    }
  }
  return buruk;
}

/* Daftar tab DIBACA dari bar nav yang benar-benar dirender, bukan disalin.
   `src/components/layout/tabs.ts` sendiri melarang menyalin daftarnya ke tempat
   lain — dan alasannya langsung terbukti di sini: warga TAK punya tab Talangan
   (`tabTerlihat()` menyaringnya; diaksesnya lewat tombol "Lihat" di Beranda).
   Daftar hardcode bikin sapuan menunggu tombol yang memang tak pernah ada lalu
   mati time-out — populasi salah yang menyamar jadi kegagalan app. */
const bacaTab = (page) => page.$$eval('nav button', (bs) => bs.map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
const browser = await chromium.launch();
let gagal = 0, diukur = 0;

for (const bendahara of [false, true]) {
  const peran = bendahara ? 'b' : 'w';
  const { ctx, page } = await siapkan(browser, { bendahara });
  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  if (!bendahara) {
    const pw = page.locator('#masuk-warga');
    await pw.waitFor({ timeout: 60000 });
    await pw.click();
  }
  // Tunggu bottom-nav MENGAKU ada; jangan pakai jeda tetap — di CPU 4x lambat
  // jeda tetap kadang memotret layar yang belum hidrasi lalu "lolos" palsu.
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(6000);

  let tanda = 0;
  {
    const { entri, tandaBaru } = await panen(page, tanda); tanda = tandaBaru;
    diukur++; if (lapor(`${peran}-muat-awal`, entri)) gagal++;
  }

  const tabAda = await bacaTab(page);
  console.log(`  (tab ${peran}: ${tabAda.join(' · ')})`);
  for (const t of tabAda.slice(1)) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const { tandaBaru } = await panen(page, tanda); tanda = tandaBaru;
    await page.locator('nav button', { hasText: t }).first().click({ force: true });
    await page.waitForTimeout(7000);
    const { entri, tandaBaru: tb } = await panen(page, tanda); tanda = tb;
    diukur++; if (lapor(`${peran}-${t}`, entri)) gagal++;
  }
  await ctx.close();
}

await browser.close();
console.log(`\n=== ${diukur} layar diukur @390px · CPU ${CPU}x · ${KBPS}kbps · ambang ${AMBANG} · ${gagal} melompat ===`);
if (MUTASI && gagal === 0) { console.log('\nPROBE CACAT: MUTASI=1 tapi nol temuan — observer tak terpasang.'); process.exit(2); }
process.exit(gagal ? 1 : 0);
