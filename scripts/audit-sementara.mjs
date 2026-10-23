// audit:sementara — PERMUKAAN SEMENTARA: toast (sukses · galat · urungkan) &
// strip Header (LURING · BASI). Lahir 23 Okt 2026.
//
// Semua sapuan visual memotret layar yang SUDAH TENANG, jadi apa pun yang cuma
// hidup beberapa detik sesudah sebuah PERISTIWA tak pernah masuk populasi
// siapa pun: `audit:kontras`, `-deep`, `-nonteks`, `huruf`, `kata-patah`,
// `potong`, `mesin` — nol satu pun yang pernah melihat toast atau strip
// luring/basi (diperiksa: tak satu berkasnya menyebut toast, `setOffline`,
// atau basi). `audit:toast` mengukur WAKTU toast, bukan rupanya. Begitu dibuka,
// ikon status toast ternyata glyph putih di atas `emerald-500`/`rose-500`/
// `slate-400` mentah: 2,54 / 3,67 / 2,56:1 di KEDUA tema (`6a6dd62`), padahal
// app sudah punya resepnya sendiri (jejak Kartu Saya, 8,96:1).
//
// Pemicu — tak satu pun menulis ke DB:
//   toast-sukses   warga: Menu → "Bagikan halaman ini" tanpa navigator.share
//                  (jalur salin → toast "…disalin")
//   strip-luring   warga: ctx.setOffline(true)
//   toast-galat +  warga: GET rest/v1 dibalas 500 LOKAL, lalu "kembali dari
//   strip-basi     latar" >60 dtk (pola `audit:kembali`: getter visibilitas
//                  disuntik, Date.now dimajukan 70 dtk — penyegaran senyap gagal)
//   toast-urungkan bendahara mock: editor Absensi → "Semua Hadir" (state lokal;
//                  tiap tulis dijawab LOKAL, Simpan tak diketuk)
//   strip-versi    bendahara mock: `navigator.serviceWorker` PALSU (`waiting` +
//                  `controller`) disuntik sebelum boot → strip "Versi baru
//                  tersedia" (23 Okt 2026, `f5e9104`: dulu kartu mengapung yang
//                  tertutup kartu Pasang & menutup FAB). Muat ulang tak diketuk.
// Toast DITAHAN kursor selama diukur (Toaster menjeda jamnya di bawah penunjuk
// halus), lalu dilepas & ditunggu pergi sebelum permukaan berikutnya.
//
// Vonis per permukaan, 320 & 360px × terang & gelap:
//   TEKS   AA 4,5:1 (exit 1) — tinta = warna TERHITUNG × alpha × opacity
//          leluhur, dicampur ke latar; latar = MODUS piksel di dalam wadah
//          (toast tembus pandang putih/95 + blur, strip gelap amber/25).
//          Seksi AAA app (7:1) dicetak terpisah & tak menggagalkan.
//   IKON   glyph status lawan titiknya ≥ 3:1 (§1.4.11) — dari warna terhitung.
//   PATAH  token tanpa spasi biasa yang tercetak di >1 baris.
//   HURUF  < 11px (lantai app).   LUBER  teks keluar wadah / layar.
//   KONTROL tombol di dalam permukaan < 44px (kontrak sentuh app), lewat
//          HIT-TEST seperti audit:sentuh — kartu versi lama menaruh "Muat
//          ulang" di 117×35, dan "Urungkan" toast 95×39 (kini before:-inset-1).
//
// KONTROL: permukaan yang tak muncul = PROBE CACAT (exit 2).
//   MUTASI=1  glyph & titik toast disamakan abu (#9CA3AF di #A1A1AA) → tiap
//             toast WAJIB merah di IKON.
//   MUTASI=2  teks wadah dipudarkan `opacity:.2` → tiap permukaan WAJIB merah
//             di TEKS (menguji bahwa opacity leluhur ikut dihitung).
//   Mutasi wajib MENDARAT (gaya terhitung dibaca balik), kalau tidak PROBE CACAT.
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, openMenuItem, ratio, parseColor, blend, modusBg, samplePixels } from './lib/audit-harness.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI || '';
const LEBAR = (process.env.LEBAR || '320,360').split(',').map(Number);
const MUT_CSS = {
  1: '[data-toast] > span:first-child { background-color: #A1A1AA !important; color: #9CA3AF !important; }',
  2: '[data-toast] > p, [data-toast] > button, header [role="status"] p { opacity: .2 !important; }',
};

const temuan = [];
const aaa = [];
let permukaan = 0, teksDiukur = 0, cacat = 0, mendarat = 0;
const kenaMutasi = new Set();

/** Ukur satu wadah. Kembalikan teks (warna efektif, kotak), ikon status, patah, huruf, luber. */
const PROBE = (sel) => {
  // Toast: yang TERBARU (ekor tumpukan); strip: satu-satunya di Header.
  const semua = document.querySelectorAll(sel);
  const wadah = semua[semua.length - 1];
  if (!wadah) return null;
  const wr = wadah.getBoundingClientRect();
  const teks = [];
  const tw = document.createTreeWalker(wadah, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const s = n.textContent.trim();
    const el = n.parentElement;
    if (!s || el.closest('.sr-only,[aria-hidden="true"]')) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const rr = rg.getBoundingClientRect();
    if (!rr.width) continue;
    const cs = getComputedStyle(el);
    let op = 1;
    for (let a = el; a && a !== wadah.parentElement; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
    const patah = [];
    let i = 0;
    for (const tok of n.textContent.split(/ +/)) {
      const j = n.textContent.indexOf(tok, i); i = j + tok.length;
      if (tok.length < 2) continue;
      const r2 = document.createRange(); r2.setStart(n, j); r2.setEnd(n, j + tok.length);
      if (new Set([...r2.getClientRects()].map((x) => Math.round(x.top))).size > 1) patah.push(tok);
    }
    teks.push({
      s: s.slice(0, 60), color: cs.color, op, fs: parseFloat(cs.fontSize), patah,
      luber: rr.right > Math.min(wr.right, innerWidth) + 0.5 || rr.left < Math.max(wr.left, 0) - 0.5,
    });
  }
  const ukuranSentuh = (b) => {
    /* Hit-test dari sumbu tengah, ala audit:sentuh — kotak CSS tak tahu
       pelebaran `before:-inset-*`. Batas 26px/sisi cukup membuktikan 44. */
    const r = b.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const milik = (x, y) => { const h = document.elementFromPoint(Math.round(x), Math.round(y)); return !!h && (h === b || b.contains(h)); };
    const rambat = (dx, dy) => { let n = 0; while (n < 26 && milik(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
    return { w: rambat(1, 0) + rambat(-1, 0) + 1, h: rambat(0, 1) + rambat(0, -1) + 1 };
  };
  const kontrol = [...wadah.querySelectorAll('button, a')].map((b) => ({ nama: b.innerText.trim().slice(0, 20), ...ukuranSentuh(b) }));
  const titik = wadah.querySelector(':scope > span:first-child');
  const ikon = titik?.querySelector('svg');
  return {
    teks,
    kontrol,
    rect: [wr.left, wr.top, wr.width, wr.height],
    titik: titik && ikon ? { bg: getComputedStyle(titik).backgroundColor, glyph: getComputedStyle(ikon).color, r: titik.getBoundingClientRect().toJSON() } : null,
  };
};

async function ukur(page, label, sel, harusIkon) {
  if (MUTASI) await page.waitForTimeout(150);
  const r = await page.evaluate(PROBE, sel);
  if (!r) { console.log(`  PROBE CACAT ${label}: permukaan tak muncul (${sel})`); cacat++; return; }
  if (!r.teks.length) { console.log(`  PROBE CACAT ${label}: nol teks terukur`); cacat++; return; }
  if (harusIkon && !r.titik) { console.log(`  PROBE CACAT ${label}: ikon status tak ketemu`); cacat++; return; }
  permukaan++;
  // Latar = modus piksel kisi 9×5 di dalam wadah, di luar titik ikon.
  const [x, y, w, h] = r.rect;
  const pts = [];
  for (let i = 1; i <= 9; i++) for (let j = 1; j <= 5; j++) {
    const px = x + (w * i) / 10, py = y + (h * j) / 6;
    if (r.titik && px >= r.titik.r.left - 2 && px <= r.titik.r.right + 2 && py >= r.titik.r.top - 2 && py <= r.titik.r.bottom + 2) continue;
    pts.push([px, py]);
  }
  const shot = (await page.screenshot()).toString('base64');
  const sampel = await samplePixels(page, shot, pts);
  const baris = [];
  if (MUTASI === '1' && r.titik && parseColor(r.titik.bg)?.rgb.join() === '161,161,170') mendarat++;
  if (MUTASI === '2' && r.teks.some((t) => t.op < 0.3)) mendarat++;
  for (const t of r.teks) {
    teksDiukur++;
    const c = parseColor(t.color);
    const bgC = modusBg(sampel, c.rgb) ?? modusBg(sampel);
    // Seri di puncak modus → ambil yang TERBURUK (disiplin audit:kontras).
    let terburuk = Infinity;
    for (const bg of bgC) terburuk = Math.min(terburuk, ratio(blend(c.rgb, c.a * t.op, bg), bg));
    if (terburuk < 4.5) { temuan.push(`${label} TEKS ${terburuk.toFixed(2)} «${t.s}»`); kenaMutasi.add(label); }
    else if (terburuk < 7) aaa.push(`${label} ${terburuk.toFixed(2)} «${t.s}»`);
    if (t.fs < 11) temuan.push(`${label} HURUF ${t.fs}px «${t.s}»`);
    if (t.luber) temuan.push(`${label} LUBER «${t.s}»`);
    for (const p of t.patah) temuan.push(`${label} PATAH "${p}" dlm «${t.s}»`);
    baris.push(terburuk.toFixed(2));
  }
  for (const k of r.kontrol) if (k.w < 43.5 || k.h < 43.5) temuan.push(`${label} KONTROL ${k.w.toFixed(0)}×${k.h.toFixed(0)} «${k.nama}»`);
  let ik = '';
  if (r.titik) {
    const g = parseColor(r.titik.glyph).rgb, d = parseColor(r.titik.bg).rgb;
    const ri = ratio(g, d);
    ik = ` · ikon ${ri.toFixed(2)}`;
    if (ri < 3) { temuan.push(`${label} IKON ${ri.toFixed(2)} glyph rgb(${g}) di titik rgb(${d})`); kenaMutasi.add(label); }
  }
  console.log(`${label.padEnd(30)} ${r.teks.length} teks · terburuk ${Math.min(...baris.map(Number)).toFixed(2)}${ik}`);
}

/** Kerangka memuat habis — TENANG itu keadaan, bukan jeda. Pemicu galat-segar
 *  WAJIB menunggunya: kalau GET mulai dibalas 500 saat muat PERTAMA belum
 *  selesai, yang gagal muat pertama (ErrorState), bukan penyegaran senyap —
 *  jalan validasi 23 Okt kehilangan toast-galat & strip-basi persis begitu. */
async function tungguIsi(page) {
  return page.waitForFunction(() => ![...document.querySelectorAll('.skeleton, .skeleton-bar')]
    .some((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden'), null, { timeout: 25000 })
    .then(() => true, () => false);
}

/** Tahan toast di bawah kursor, tunggu animasi masuknya selesai, ukur, lepas, tunggu pergi. */
async function ukurToast(page, label, w) {
  const t = page.locator('[data-toast]').last();
  try { await t.waitFor({ timeout: 8000 }); } catch { console.log(`  PROBE CACAT ${label}: toast tak muncul`); cacat++; return; }
  await t.hover().catch(() => {});
  await page.waitForFunction(() => [...document.querySelectorAll('[data-toast]')].every((e) => e.getAnimations({ subtree: true }).every((a) => a.playState !== 'running')), null, { timeout: 5000 }).catch(() => {});
  await ukur(page, label, '[data-toast]', true);
  await page.mouse.move(w / 2, 800);
  await page.waitForFunction(() => !document.querySelector('[data-toast]'), null, { timeout: 20000 })
    .catch(() => { console.log(`  PROBE CACAT ${label}: toast tak pernah pergi`); cacat++; });
}

const browser = await chromium.launch();
try {
  for (const w of LEBAR) for (const theme of ['light', 'dark']) {
    const tag = `[${w} ${theme === 'light' ? 'terang' : 'gelap'}`;
    // ── WARGA ────────────────────────────────────────────────────────────
    {
      const { ctx, page } = await newCtx(browser, theme, {});
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(APP).origin });
      await page.setViewportSize({ width: w, height: 844 });
      await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
      if (!(await loginWarga(page))) { console.log('PROBE CACAT: warga gagal masuk'); process.exit(2); }
      await page.waitForTimeout(1500);
      if (MUTASI) await page.addStyleTag({ content: MUT_CSS[MUTASI] });
      await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
      if (!(await openMenuItem(page, 'Bagikan'))) { console.log(`  PROBE CACAT ${tag}]: item Bagikan tak ada`); cacat++; }
      else {
        if (!(await page.locator('[data-toast]', { hasText: 'disalin' }).count())) await page.waitForTimeout(600);
        if (!(await page.locator('[data-toast]', { hasText: 'disalin' }).count())) { console.log(`  PROBE CACAT ${tag}]: toast "disalin" tak muncul (jalur salin gagal?)`); cacat++; }
        await ukurToast(page, `${tag} warga] toast-sukses`, w);
      }
      await ctx.setOffline(true); await page.waitForTimeout(700);
      await ukur(page, `${tag} warga] strip-luring`, 'header [role="status"]', false);
      await ctx.setOffline(false); await page.waitForTimeout(700);
      await gotoTab(page, 'Kas RT');
      if (!(await tungguIsi(page))) { console.log(`  PROBE CACAT ${tag}]: Kas RT tak selesai memuat dalam 25 dtk`); cacat++; }
      await ctx.route('**/rest/v1/**', (r) => (r.request().method() === 'GET' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }) : r.fallback()));
      await page.evaluate(() => {
        let vis = 'hidden';
        Object.defineProperty(document, 'visibilityState', { get: () => vis, configurable: true });
        Object.defineProperty(document, 'hidden', { get: () => vis === 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        const asli = Date.now.bind(Date); Date.now = () => asli() + 70_000;
        vis = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
      });
      await ukurToast(page, `${tag} warga] toast-galat`, w);
      if (!(await page.locator('header [role="status"]', { hasText: 'Gagal memperbarui' }).count())) { console.log(`  PROBE CACAT ${tag}]: strip BASI tak muncul`); cacat++; }
      else await ukur(page, `${tag} warga] strip-basi`, 'header [role="status"]', false);
      await ctx.close();
    }
    // ── BENDAHARA (mock) ─────────────────────────────────────────────────
    {
      const { ctx, page } = await newCtx(browser, theme, { bendahara: true });
      await page.addInitScript(() => {
        const waiting = { postMessage() {}, state: 'installed', addEventListener() {} };
        const reg = { waiting, installing: null, addEventListener() {}, update: async () => {} };
        const sw = { controller: { state: 'activated' }, register: async () => reg, addEventListener() {}, ready: Promise.resolve(reg) };
        Object.defineProperty(navigator, 'serviceWorker', { get: () => sw, configurable: true });
      });
      let tulis = 0;
      await ctx.route('**/rest/v1/**', (r) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(r.request().method())) return r.fallback();
        tulis++; return r.fulfill({ status: 204, body: '' });
      });
      await page.setViewportSize({ width: w, height: 844 });
      await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
      await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
      if (MUTASI) await page.addStyleTag({ content: MUT_CSS[MUTASI] });
      await page.waitForTimeout(800);
      if (!(await page.locator('header [role="status"]', { hasText: 'Versi baru' }).count())) { console.log(`  PROBE CACAT ${tag}]: strip VERSI BARU tak muncul (SW palsu tak terbaca?)`); cacat++; }
      else await ukur(page, `${tag} bendahara] strip-versi`, 'header [role="status"]', false);
      await gotoTab(page, 'Jadwal');
      const proses = page.getByRole('button', { name: /^Proses/i }).first();
      if (!(await proses.count())) { console.log(`  PROBE CACAT ${tag}]: pemicu Proses tak ada`); cacat++; }
      else {
        await proses.click();
        const semua = page.getByRole('button', { name: 'Semua Hadir' });
        try {
          await semua.waitFor({ timeout: 15000 }); await page.waitForTimeout(500);
          await semua.click();
          await ukurToast(page, `${tag} bendahara] toast-urungkan`, w);
        } catch (e) { console.log(`  PROBE CACAT ${tag}]: editor Absensi — ${String(e.message).split('\n')[0].slice(0, 80)}`); cacat++; }
      }
      if (tulis) console.log(`  tulis dijawab LOKAL: ${tulis}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\n=== SEMENTARA: ${permukaan} permukaan · ${teksDiukur} teks diukur · ${temuan.length} temuan${MUTASI ? ` · MUTASI=${MUTASI}` : ''} ===`);
temuan.forEach((t) => console.log(`   ${t}`));
console.log(`\nAMBANG APP · AAA 7:1 (dilaporkan, tak menggagalkan): ${aaa.length} di bawah`);
aaa.slice(0, 12).forEach((t) => console.log(`   ${t}`));
if (cacat) { console.log(`\nPROBE CACAT: ${cacat} permukaan tak terukur`); process.exit(2); }
if (MUTASI) {
  if (!mendarat) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tak pernah mendarat`); process.exit(2); }
  const harus = MUTASI === '1' ? mendarat : permukaan;
  console.log(`\n  MUTASI=${MUTASI} mendarat di ${mendarat} · merah di ${kenaMutasi.size}/${harus}${MUTASI === '1' ? ' toast' : ' permukaan'}`);
  if (kenaMutasi.size < harus) { console.log('PROBE CACAT: mutasi tak menggigit di semua anggota populasinya'); process.exit(2); }
}
process.exit(temuan.length ? 1 : 0);
