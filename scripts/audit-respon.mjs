// Audit RESPON: berapa lama app MENJAWAB satu ketukan / ketikan / gulir.
//
// Kenapa alat sendiri — ini tepi yang tak disentuh 16 sapuan lain:
//   `audit:muat`   mengukur KAPAN app tercat pertama kali (FCP & siap-pakai).
//   `audit:lompat` mengukur apakah isi MELOMPAT sesudah tercat.
//   `audit:papan-ketik` bertanya apakah kontrol TERGAPAI, bukan seberapa cepat
//                  ia menjawab kalau digapai.
//   `audit:tulis`  menguji jalur tulis saat jaringan busuk — bukan jalur MURNI
//                  KLIEN (saring daftar, buka sheet, pindah tab) yang tak
//                  menyentuh jaringan sama sekali.
// Semua sapuan lain memotret layar yang SUDAH TENANG. Yang bikin app terasa
// murah justru jarak antara jempol menyentuh dan layar berubah — dan sampai
// sapuan ini tak ada satu pun angka soal itu di repo.
//
// TIGA bagian, sengaja dilaporkan terpisah (angkanya beda arti):
//   A. KETUKAN  — pindah tab, buka sheet/menu, ketuk chip & baris daftar.
//   B. KETIKAN  — tiap tombol di kolom cari, yang tiap huruf menyaring daftar.
//                 Bedanya dgn A: A terjadi sekali, B terjadi 6-10x berturut-turut
//                 dan warga MELIHAT hurufnya tertinggal di belakang jempolnya.
//   C. GULIR    — bingkai panjang (long-animation-frame) selama gulir, plus
//                 SIAPA yang memblokirnya (atribusi skrip). Gulir tak punya
//                 interactionId, jadi Event Timing buta terhadapnya.
//
// Diukur pakai Event Timing API (`interactionId` = definisi INP yang dipakai
// Chrome), BUKAN stopwatch di sisi Node: stopwatch Playwright menghitung
// perjalanan CDP + polling, dan itu mengukur ALATNYA, bukan appnya.
// Tiap interaksi dipecah tiga supaya laporannya bisa ditindaklanjuti:
//   tunda   (input delay)     — main thread masih sibuk saat jempol turun
//   proses  (handler)         — kode app sendiri
//   cat     (presentation)    — render + paint sesudah handler
//
// Klik WAJIB klik betulan (Playwright → CDP Input.dispatch*): `el.click()` dari
// dalam halaman itu event SINTETIS, tak diberi `interactionId`, dan sapuan akan
// melaporkan "0 interaksi" dgn tenang. Karena itu tak ada fallback evaluate-click
// di sini — kalau kliknya ditolak, itu DILAPORKAN, bukan ditambal diam-diam.
//
// Pakai:  npm run audit:respon
//   CAP_URL=https://hadiran-rt.vercel.app  (wajib sekali sebelum dianggap benar)
//   CPU=4                                  (HP kelas bawah warga; 0 = tanpa throttle)
//   AMBANG=200 BURUK=500                   (INP "baik" / "buruk" versi Google)
//   MUTASI=1                               (suntik handler 600ms → sapuan HARUS merah)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const CPU = +(process.env.CPU ?? 4);
const MUTASI = process.env.MUTASI === '1';
// Ambang APP = ambang INP Google. Bukan WCAG — jangan dilaporkan sbg "gagal WCAG".
const AMBANG = +(process.env.AMBANG || 200);   // di atas ini: terasa tertinggal
const BURUK = +(process.env.BURUK || 500);     // di atas ini: terasa rusak
const BINGKAI = +(process.env.BINGKAI || 100); // long-animation-frame yg dianggap jank

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

/* Dipasang SEBELUM skrip app: interaksi paling awal (justru yang terberat,
   saat hidrasi masih jalan) sudah lewat kalau observer dipasang belakangan. */
const PASANG = () => {
  window.__resp = [];
  window.__loaf = [];
  const jelas = (n) => {
    if (!n || n.nodeType !== 1) return '?';
    const cls = (typeof n.className === 'string' ? n.className : '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    const teks = (n.innerText || n.getAttribute?.('aria-label') || n.getAttribute?.('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 28);
    return `${n.tagName.toLowerCase()}${cls ? '.' + cls : ''}${teks ? ` "${teks}"` : ''}`;
  };
  /* Elemen dicatat di fase CAPTURE, sebelum React sempat meng-unmount targetnya:
     `entry.target` Event Timing sering sudah null persis untuk interaksi yang
     paling menarik (ketukan yang MENGGANTI layar). */
  window.__sasaran = [];
  for (const t of ['pointerdown', 'keydown']) {
    addEventListener(t, (e) => { window.__sasaran.push({ t: e.timeStamp, el: jelas(e.target) }); }, true);
  }
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.interactionId) continue; // hanya interaksi diskrit (definisi INP)
        const dekat = window.__sasaran.filter((s) => Math.abs(s.t - e.startTime) < 60).pop();
        window.__resp.push({
          nama: e.name,
          mulai: Math.round(e.startTime),
          id: e.interactionId,
          durasi: Math.round(e.duration),
          tunda: Math.round(e.processingStart - e.startTime),
          proses: Math.round(e.processingEnd - e.processingStart),
          cat: Math.round(e.startTime + e.duration - e.processingEnd),
          el: dekat?.el || (e.target ? jelas(e.target) : '(target hilang)'),
          fase: window.__fase || '?',
        });
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  } catch { window.__respTakTerukur = true; }
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__loaf.push({
          mulai: Math.round(e.startTime),
          durasi: Math.round(e.duration),
          blokir: Math.round(e.blockingDuration || 0),
          fase: window.__fase || '?',
          skrip: (e.scripts || []).slice(0, 2).map((s) => `${s.invoker || s.name || '?'} ${Math.round(s.duration)}ms`),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch { window.__loafTakTerukur = true; }
};

const MUTAN = () => {
  /* MUTASI: handler 600ms di fase capture. Sapuan yang benar HARUS merah di
     ketiga bagian. Hijau dgn MUTASI=1 = observernya tak terpasang / klik sintetis. */
  const spin = (ms) => { const t = performance.now(); while (performance.now() - t < ms) { /* blokir */ } };
  for (const t of ['pointerdown', 'keydown']) addEventListener(t, () => spin(600), true);
  addEventListener('scroll', () => spin(600), true);
};

async function siapkan(browser, { bendahara }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript(PASANG);
  if (MUTASI) await ctx.addInitScript(MUTAN);
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
  if (CPU) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  }
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));
  return { ctx, page };
}

const setFase = (page, f) => page.evaluate((v) => { window.__fase = v; }, f);
const panen = async (page, sejak) => {
  const r = await page.evaluate(() => ({ ev: window.__resp || [], lf: window.__loaf || [] }));
  return { ev: r.ev.filter((e) => e.mulai >= sejak), lf: r.lf.filter((e) => e.mulai >= sejak) };
};
const tanda = (page) => page.evaluate(() => performance.now());

/* INP mengelompokkan per interactionId lalu ambil durasi TERBESAR: satu ketukan
   memancarkan pointerdown+pointerup+click, dan menghitungnya tiga kali bikin
   satu ketukan sehat terlihat seperti tiga interaksi cepat. */
function perInteraksi(ev) {
  const g = new Map();
  for (const e of ev) {
    const p = g.get(e.id);
    if (!p || e.durasi > p.durasi) g.set(e.id, e);
  }
  return [...g.values()].sort((a, b) => a.mulai - b.mulai);
}

const temuan = [];
function lapor(bagian, layar, ev, extra = '') {
  const it = perInteraksi(ev);
  if (!it.length) { console.log(`  ${layar} — 0 interaksi terukur${extra}`); return 0; }
  const worst = it.reduce((a, b) => (b.durasi > a.durasi ? b : a));
  const p = it.map((x) => x.durasi).sort((a, b) => a - b);
  const med = p[Math.floor(p.length / 2)];
  const vonis = worst.durasi > BURUK ? '⚠⚠ BURUK' : worst.durasi > AMBANG ? '⚠ LAMBAT' : 'OK';
  console.log(`  ${layar.padEnd(26)} n=${String(it.length).padStart(2)}  med ${String(med).padStart(4)}ms  max ${String(worst.durasi).padStart(4)}ms  ${vonis}${extra}`);
  if (worst.durasi > AMBANG) {
    console.log(`      terburuk: ${worst.el}  [tunda ${worst.tunda} · proses ${worst.proses} · cat ${worst.cat}]`);
    temuan.push({ bagian, layar, durasi: worst.durasi, el: worst.el, rinci: `tunda ${worst.tunda} · proses ${worst.proses} · cat ${worst.cat}` });
    return 1;
  }
  return 0;
}

function laporGulir(layar, lf, terukur) {
  /* "nol bingkai panjang" dan "observernya tak ada" terlihat SAMA dari sini —
     dan sapuan yang tak bisa membedakan keduanya akan melaporkan kebutaannya
     sebagai kelulusan. Karena itu dukungan browser ditanyakan terpisah. */
  if (!terukur) { console.log(`  ${layar.padEnd(26)} TAK TERUKUR — browser ini tanpa long-animation-frame`); return 0; }
  const panjang = lf.filter((f) => f.durasi >= BINGKAI);
  if (!lf.length) { console.log(`  ${layar.padEnd(26)} bingkai>${BINGKAI}ms:  0  (tak ada bingkai panjang sama sekali)  OK`); return 0; }
  const worst = lf.reduce((a, b) => (b.durasi > a.durasi ? b : a));
  const vonis = panjang.length ? '⚠ JANK' : 'OK';
  console.log(`  ${layar.padEnd(26)} bingkai>${BINGKAI}ms: ${String(panjang.length).padStart(2)}  terpanjang ${String(worst.durasi).padStart(4)}ms (blokir ${worst.blokir}ms)  ${vonis}`);
  if (panjang.length) {
    console.log(`      ${worst.skrip.join(' | ') || '(tanpa atribusi skrip)'}`);
    temuan.push({ bagian: 'C', layar, durasi: worst.durasi, el: worst.skrip.join(' | ') || 'gulir', rinci: `${panjang.length} bingkai panjang` });
    return 1;
  }
  return 0;
}

// ── jalan ──────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
let gagal = 0, cacat = 0;

for (const bendahara of [false, true]) {
  const peran = bendahara ? 'bendahara' : 'warga';
  console.log(`\n════════ ${peran.toUpperCase()} @390px · CPU ${CPU}x ════════`);
  const { ctx, page } = await siapkan(browser, { bendahara });
  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  if (!bendahara) {
    const pw = page.locator('#masuk-warga');
    await pw.waitFor({ timeout: 60000 });
    await pw.click();
  }
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(5000);

  const tabs = await page.$$eval('nav button', (bs) => bs.map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
  console.log(`(tab: ${tabs.join(' · ')})`);

  for (const t of tabs) {
    // ── A. ketukan: pindah tab ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await setFase(page, `tab:${t}`);
    let m = await tanda(page);
    try {
      await page.locator('nav button', { hasText: t }).first().click({ timeout: 8000 });
    } catch (e) {
      console.log(`  PROBE CACAT: tab "${t}" tak bisa diklik betulan — ${String(e).slice(0, 80)}`);
      cacat++; continue;
    }
    await page.waitForTimeout(4000);
    console.log(`\n── ${t} ──`);
    gagal += lapor('A', `pindah tab`, (await panen(page, m)).ev);

    // ── A. ketukan: chip filter (kalau ada) ──
    const chip = page.locator('[role="tablist"] button, .chip, button[aria-pressed]').first();
    if (await chip.count()) {
      m = await tanda(page);
      await setFase(page, `chip:${t}`);
      await chip.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
      gagal += lapor('A', `ketuk chip`, (await panen(page, m)).ev);
    }

    // ── B. ketikan: kolom cari (tiap huruf menyaring daftar) ──
    const cari = page.locator('input[inputmode="search"], input[type="search"]').first();
    if (await cari.count()) {
      await cari.scrollIntoViewIfNeeded().catch(() => {});
      await cari.focus();
      await page.waitForTimeout(600);
      m = await tanda(page);
      await setFase(page, `cari:${t}`);
      await cari.pressSequentially('ahmad', { delay: 260 });
      await page.waitForTimeout(2500);
      gagal += lapor('B', `ketik "ahmad"`, (await panen(page, m)).ev);
      for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');
      await page.waitForTimeout(1200);
    }

    // ── A. ketukan: baris daftar pertama yg bisa diketuk ──
    const baris = page.locator('main button, main [role="button"]').filter({ hasNotText: /^$/ }).nth(2);
    if (await baris.count()) {
      m = await tanda(page);
      await setFase(page, `baris:${t}`);
      const ok = await baris.click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (ok) {
        await page.waitForTimeout(2500);
        gagal += lapor('A', `ketuk baris/kontrol`, (await panen(page, m)).ev);
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(800);
      }
    }

    // ── C. gulir ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await setFase(page, `gulir:${t}`);
    m = await tanda(page);
    await page.mouse.move(195, 500);
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 220); await page.waitForTimeout(90); }
    await page.waitForTimeout(1200);
    const dukungLoaf = await page.evaluate(() => !window.__loafTakTerukur);
    gagal += laporGulir(`gulir`, (await panen(page, m)).lf, dukungLoaf);
  }
  await ctx.close();
}

/* ══ D. AKSI BERAT: ekspor / cetak / bagikan ════════════════════════════════
 * Bagian A-C mengukur interaksi yang dijawab app SENDIRI. Ekspor tidak: ia
 * mengunduh chunk-nya lebih dulu (Excel 941 kB, PDF triwulan 399 kB) lalu
 * merender berkas di main thread — satu-satunya jeda BERDETIK-DETIK yang
 * tersisa di app, dan sampai 20 Agu 2026 satu-satunya yang tak mengaku
 * sedang bekerja sama sekali.
 *
 * Yang diuji BUKAN kecepatannya (itu jaringan, bukan app), tapi tiga sifat yang
 * memang milik app:
 *   D1 MENGAKU  — ada tanda "sedang bekerja" dalam ≤1 dtk sesudah diketuk.
 *   D2 SEKALI   — satu ketukan ganda = SATU berkas, bukan dua.
 *   D3 MENGAKU GAGAL — chunk yang gagal diunduh berakhir sebagai pesan di
 *                 layar. Bukan skenario karangan: `vercel.json` merewrite semua
 *                 path ke index.html, jadi sesudah deploy chunk lama dibalas
 *                 HTTP 200 berisi HTML dan `import()` menolak dgn galat MIME.
 *
 * Throttle jaringan dipasang SESUDAH data halaman termuat: yang diuji unduhan
 * CHUNK, bukan kecepatan Supabase.
 *
 * POPULASI yang diakui: dua menu Ekspor (Kas Hadiran & Kas RT) — permukaan
 * ekspor yang bisa dicapai tanpa membuka overlay. Empat jalur berat lain
 * (PDF jadwal, PDF absensi di sheet detail, laporan triwulan, riwayat
 * aktivitas) memakai `useAksiBerat()` yang sama tapi TIDAK ikut disapu di sini;
 * itu kekurangan sapuan ini, bukan bukti mereka aman.
 */
const AMBANG_AKU = +(process.env.AMBANG_AKU || 1000);

/* Tanda sibuk TIDAK diwajibkan untuk aksi yang selesai lebih cepat dari ambang
   ini: `useAksiBerat` sengaja menahan pemintalnya 250ms supaya jalur yang
   chunk-nya sudah ter-cache (terukur 132-182ms) tidak BERKEDIP. Percobaan
   pertama sapuan ini mengabaikan itu dan melaporkan "DIAM" untuk berkas yang
   sudah turun dalam 134ms — populasi salah, bukan temuan: tak ada yang perlu
   diakui, kerjanya sudah selesai sebelum mata sempat mencari tandanya. */
const BEBAS_AKU_MS = +(process.env.BEBAS_AKU || 1000);

async function tandaSibuk(page, spinAwal) {
  return page.evaluate((awal) => {
    const spin = document.querySelectorAll('.animate-spin').length;
    const busy = document.querySelectorAll('[aria-busy="true"]').length;
    const toast = /Menyiapkan|Membuat|Mohon tunggu/i.test(document.body.innerText);
    return spin > awal || busy > 0 || toast;
  }, spinAwal);
}

console.log(`\n════════ D. AKSI BERAT (bendahara, 400 kbps + CPU ${CPU}x) ════════`);
{
  const { ctx, page } = await siapkan(browser, { bendahara: true });
  const unduh = [];
  page.on('download', (d) => unduh.push(d.suggestedFilename()));
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(4000);

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');

  for (const t of ['Hadiran', 'Kas RT']) {
    await page.locator('nav button', { hasText: t }).first().click({ force: true });
    await page.waitForTimeout(4500);
    const pemicu = page.getByRole('button', { name: 'Ekspor' }).first();
    if (!(await pemicu.count())) { console.log(`  ${t}: tak ada tombol Ekspor — dilewati`); continue; }
    await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8, latency: 400 });

    const daftar = await page.evaluate(async () => {
      const b = [...document.querySelectorAll('button')].find((x) => /^Ekspor/.test(x.innerText.trim()));
      b?.click();
      await new Promise((r) => setTimeout(r, 400));
      const it = [...document.querySelectorAll('[role="menuitem"]')].map((x) => x.innerText.trim());
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return it;
    });
    await page.waitForTimeout(600);
    if (!daftar.length) { console.log(`  PROBE CACAT: menu Ekspor ${t} tak berisi apa pun`); cacat++; continue; }

    for (const label of daftar) {
      // ── D1: mengaku sedang bekerja ──
      await pemicu.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      const spinAwal = await page.evaluate(() => document.querySelectorAll('.animate-spin').length);
      unduh.length = 0;
      const t0 = Date.now();
      await page.getByRole('menuitem', { name: label }).click();
      let aku = null;
      for (let i = 0; i < 100 && !unduh.length; i++) {
        await page.waitForTimeout(100);
        if (aku === null && await tandaSibuk(page, spinAwal)) aku = Date.now() - t0;
      }
      const tUnduh = unduh.length ? Date.now() - t0 : null;
      const cepat = tUnduh !== null && tUnduh <= BEBAS_AKU_MS;
      const vonisD1 = cepat ? 'OK (selesai <1dtk, tanda sibuk memang ditahan)'
        : aku === null ? '⚠ DIAM'
        : aku > AMBANG_AKU ? '⚠ TELAT MENGAKU' : 'OK';
      console.log(`  ${t} · ${label.padEnd(14)} mengaku ${String(aku ?? '—').padStart(5)}ms · berkas ${String(tUnduh ?? '—').padStart(5)}ms  ${vonisD1}`);
      if (!vonisD1.startsWith('OK')) { gagal++; temuan.push({ bagian: 'D1', layar: `${t} · ${label}`, durasi: tUnduh ?? 0, el: 'tanpa tanda sibuk', rinci: aku === null ? 'layar tak berubah sama sekali' : `mengaku ${aku}ms` }); }
      await page.waitForTimeout(2500);
    }

    // ── D2: ketukan ganda dalam SATU task ──
    await pemicu.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    unduh.length = 0;
    /* WAJIB dari dalam halaman & sinkron: dua `.click()` Playwright terpisah
       selalu jatuh di task berbeda, jadi React sempat me-render `disabled` dan
       celahnya tak pernah terlihat (jebakan yang sama dicatat di `audit:tulis`). */
    const kirim = await page.evaluate((l) => {
      const el = [...document.querySelectorAll('[role="menuitem"]')].find((x) => x.innerText.trim() === l);
      if (!el) return false;
      el.click(); el.click();
      return true;
    }, daftar[0]);
    if (!kirim) { console.log('  PROBE CACAT: item menu hilang saat uji ketuk-ganda'); cacat++; }
    else {
      await page.waitForTimeout(15000);
      const vonis = unduh.length === 1 ? 'OK' : '⚠ DOBEL';
      console.log(`  ${t} · ketuk-ganda ${daftar[0]}: ${unduh.length} berkas  ${vonis}`);
      if (unduh.length !== 1) { gagal++; temuan.push({ bagian: 'D2', layar: `${t} · ketuk-ganda`, durasi: 0, el: `${unduh.length} berkas untuk satu niat`, rinci: 'latch sinkron hilang' }); }
    }
    await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 });
  }

  await ctx.close();
}

/* ── D3: chunk ekspor GAGAL (skenario chunk basi pasca-deploy) ──
 * WAJIB konteks BARU. Percobaan pertama memasang route ini di halaman yang sama
 * dgn D1/D2 dan melaporkan "DIAM SELAMANYA" — palsu: modul yang sudah pernah
 * di-`import()` duduk di module cache peramban, jadi importnya tak pernah
 * menyentuh jaringan lagi dan route mana pun tak bisa menggagalkannya. Yang
 * terukur di sana bukan kegagalan chunk, melainkan PDF yang berhasil dibuat. */
{
  const { ctx, page } = await siapkan(browser, { bendahara: true });
  await ctx.route(/assets\/(generate|exceljs|index\.es|html2canvas).*\.js/, (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>chunk basi</title>' }));
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.locator('nav button', { hasText: 'Kas RT' }).first().click({ force: true });
  await page.waitForTimeout(4000);
  const pemicu2 = page.getByRole('button', { name: 'Ekspor' }).first();
  if (!(await pemicu2.count())) { console.log('  PROBE CACAT: tombol Ekspor tak ada di uji chunk rusak'); cacat++; }
  else {
    await pemicu2.click().catch(() => {});
    await page.waitForTimeout(700);
    const item = page.getByRole('menuitem').first();
    const nama = (await item.innerText()).trim();
    await item.click();
    let pesan = null;
    for (let i = 0; i < 60 && !pesan; i++) {
      await page.waitForTimeout(100);
      const p = await page.evaluate(() => {
        const t = document.body.innerText;
        const m = t.match(/(Gagal[^\n]{0,60})/);
        return m ? m[1] : null;
      });
      if (p) pesan = p;
    }
    const vonis = pesan ? 'OK' : '⚠ DIAM SELAMANYA';
    console.log(`  chunk RUSAK · ${nama}: ${pesan ? `"${pesan}"` : 'tak ada pesan apa pun di layar'}  ${vonis}`);
    if (!pesan) { gagal++; temuan.push({ bagian: 'D3', layar: `chunk rusak · ${nama}`, durasi: 0, el: 'layar diam', rinci: 'import() gagal tanpa pesan' }); }
  }
  await ctx.close();
}

await browser.close();
console.log(`\n=== ambang ${AMBANG}ms (buruk >${BURUK}ms) · bingkai ${BINGKAI}ms · CPU ${CPU}x · ${temuan.length} bermasalah ===`);
for (const f of temuan.sort((a, b) => b.durasi - a.durasi).slice(0, 12)) {
  console.log(`  [${f.bagian}] ${f.layar} ${f.durasi}ms — ${f.el}  (${f.rinci})`);
}
if (MUTASI && !temuan.length) { console.log('\nPROBE CACAT: MUTASI=1 tapi nol temuan — observer tak terpasang atau klik sintetis.'); process.exit(2); }
if (cacat) console.log(`\n${cacat} probe cacat (bukan vonis app) — betulkan ALATNYA.`);
process.exit(gagal ? 1 : 0);
