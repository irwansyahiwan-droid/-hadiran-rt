// audit:pasang — kartu "Pasang Hadiran RT" & panduan pasang iPhone. Lahir 23 Okt 2026.
//
// Kartunya cuma lahir di peramban yang BELUM memasang app: UA iPhone/iPad,
// Samsung Internet, atau Chrome Android yang menembakkan `beforeinstallprompt`.
// Seluruh sapuan repo memakai UA Chromium desktop (`audit:mesin` bahkan
// SENGAJA tanpa UA iPhone karena kartu ini menutupi bawah layar), jadi tak
// satu pun pernah merendernya — padahal itu yang dilihat tiap warga yang
// membuka tautan grup WA di Safari. Begitu dibuka lewat UA CDP (`1f6f0c4`):
// @320 kolom judul iPhone terjepit ±55px ("Akses / cepat / dari / layar /
// utama / HP", kartu 169px, "Hadiran" meluber 14,7px); kartu mengapung di
// SEMUA tab & menutup FAB bendahara di tiap lebar; dan baris terakhir halaman
// tak bisa digulir keluar dari bawahnya.
//
// Varian: iphone · samsung · android (event `beforeinstallprompt` SINTETIS —
// `prompt()` tak pernah dipanggil). Warga 320/360 × terang/gelap; bendahara
// mock 320/360 terang (peran ber-FAB). Tiap TAB dikunjungi & digulir habis.
//
// Vonis:
//   TEKS    kartu & panduan — AA 4,5 (tinta × alpha × opacity leluhur, latar =
//           modus piksel di sekeliling teks); AAA app dicetak terpisah.
//   LUBER · PATAH · HURUF <11px · KONTROL <44px (kontrak sentuh app).
//   TUTUP   kontrol ber-posisi TETAP (fixed/sticky: FAB, nav, Header) yang
//           titik tengahnya ber-hit-test ke kartu — ia tak pernah bergerak, jadi
//           tak bisa dikeluarkan dgn menggulir. Isi yang mengalir SENGAJA tak
//           dihitung di sini: di gulir 0 kartu mengapung pasti menutup sesuatu
//           (jalan pertama meneriakkan "Lihat semua jadwal" 9× — temuan palsu).
//   ISI     sesudah digulir HABIS, daun teks & kontrol <main> yang ber-hit-test
//           ke kartu (tak ada guliran tersisa untuk mengeluarkannya).
// KONTROL: kartu tak muncul di Beranda = PROBE CACAT (exit 2).
//   MUTASI=1  tombol aksi kembali SEBARIS (`order:0; width:auto`) → tiap kartu
//             @320 WAJIB merah (judul terjepit).
//   MUTASI=2  `--ruang-pasang: 0px` → tiap kartu WAJIB merah di ISI.
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, ratio, parseColor, blend, modusBg, samplePixels } from './lib/audit-harness.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI || '';
const LEBAR = (process.env.LEBAR || '320,360').split(',').map(Number);
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
};
const MUT_CSS = {
  1: '.z-banner .order-last { order: 0 !important; width: auto !important; }',
  2: ':root { --ruang-pasang: 0px !important; }',
};
const KARTU = '.z-banner > div';

const temuan = [];
const aaa = [];
let kartu = 0, panduan = 0, teksDiukur = 0, tabDiperiksa = 0, cacat = 0, mendarat = 0;
const kena = new Set();
// Kunci "kena" = KONTEKS (varian · lebar · tema · peran), bukan tab — satu kartu satu suara.
const catat = (label, s) => { temuan.push(`${label} ${s}`); kena.add(label.match(/^\[([a-z]+ \d+ [a-z]+ [a-z]+)/)[1]); };

const PROBE = (sel) => {
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
    const kr = el.getBoundingClientRect();
    const luber = Math.max(rr.right - Math.min(wr.right, innerWidth, kr.right), Math.max(wr.left, 0, kr.left) - rr.left);
    teks.push({ s: s.slice(0, 50), color: cs.color, op, fs: parseFloat(cs.fontSize), patah, luber, box: [rr.left, rr.top, rr.width, rr.height] });
  }
  const kontrol = [...wadah.querySelectorAll('button, a')].map((b) => {
    const r = b.getBoundingClientRect();
    return { nama: (b.getAttribute('aria-label') || b.innerText || '').trim().slice(0, 20), w: r.width, h: r.height, order: getComputedStyle(b).order };
  });
  return { teks, kontrol, tinggi: wr.height };
};

async function ukur(page, label, sel) {
  const r = await page.evaluate(PROBE, sel);
  if (!r || !r.teks.length) { console.log(`  PROBE CACAT ${label}: permukaan/teks tak ada (${sel})`); cacat++; return null; }
  const shot = (await page.screenshot()).toString('base64');
  let terburuk = Infinity;
  for (const t of r.teks) {
    teksDiukur++;
    const [x, y, w, h] = t.box;
    const pts = [];
    for (const dy of [-3, h + 3]) for (let k = 0; k <= 6; k++) pts.push([x + (w * k) / 6, y + dy]);
    for (const dx of [-4, w + 4]) for (let k = 0; k <= 3; k++) pts.push([x + dx, y + (h * k) / 3]);
    const sampel = await samplePixels(page, shot, pts);
    const c = parseColor(t.color);
    let rr = Infinity;
    for (const bg of modusBg(sampel, c.rgb) ?? modusBg(sampel)) rr = Math.min(rr, ratio(blend(c.rgb, c.a * t.op, bg), bg));
    terburuk = Math.min(terburuk, rr);
    if (rr < 4.5) catat(label, `TEKS ${rr.toFixed(2)} «${t.s}»`);
    else if (rr < 7) aaa.push(`${label} ${rr.toFixed(2)} «${t.s}»`);
    if (t.fs < 11) catat(label, `HURUF ${t.fs}px «${t.s}»`);
    if (t.luber > 0.5) catat(label, `LUBER +${t.luber.toFixed(1)}px «${t.s}»`);
    for (const p of t.patah) catat(label, `PATAH "${p}" dlm «${t.s}»`);
  }
  for (const k of r.kontrol) if (k.w < 43.5 || k.h < 43.5) catat(label, `KONTROL ${k.w.toFixed(0)}×${k.h.toFixed(0)} «${k.nama}»`);
  if (MUTASI === '1' && r.kontrol.some((k) => /^(Pasang|Buka di Chrome)/.test(k.nama) && k.order === '0' && k.w < 200)) mendarat++;
  console.log(`${label.padEnd(36)} ${r.teks.length} teks · terburuk ${terburuk.toFixed(2)} · tinggi ${r.tinggi.toFixed(0)}px`);
  return r;
}

/** TENANG itu KEADAAN, bukan jeda: kerangka memuat habis. Validasi MUTASI=2
 *  pertama lolos di 2 dari 18 kartu — Beranda diukur saat masih kerangka (mesin
 *  sibuk), sehingga tak ada isi di bawah kartu untuk ditutupi. */
async function tungguIsi(page) {
  return page.waitForFunction(() => ![...document.querySelectorAll('.skeleton, .skeleton-bar')]
    .some((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden'), null, { timeout: 25000 })
    .then(() => true, () => false);
}

/** Di tab ini: kontrol di luar kartu yang tertutup kartu, lalu (digulir habis) isi yang tertutup. */
async function periksaTab(page, label) {
  if (!(await tungguIsi(page))) { console.log(`  PROBE CACAT ${label}: kerangka memuat tak habis dalam 25 dtk`); cacat++; return false; }
  tabDiperiksa++;
  const tutup = await page.evaluate((sel) => {
    const k = document.querySelector(sel);
    if (!k) return null;
    const tetap = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
    return [...document.querySelectorAll('button, a, [role="button"]')].filter((b) => !k.contains(b) && tetap(b) && !b.closest('.sr-only,[aria-hidden="true"]')).map((b) => {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return null;
      const a = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return a && k.contains(a) ? (b.getAttribute('aria-label') || b.innerText || b.tagName).trim().slice(0, 30) : null;
    }).filter(Boolean);
  }, KARTU);
  if (tutup === null) return false;
  for (const t of tutup) catat(label, `TUTUP kontrol «${t}»`);
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(500); }
  await tungguIsi(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(300);
  const isi = await page.evaluate((sel) => {
    const k = document.querySelector(sel);
    if (!k) return [];
    if (MUTASI_2 && getComputedStyle(document.documentElement).getPropertyValue('--ruang-pasang').trim() === '0px') window.__mendarat = (window.__mendarat || 0) + 1;
    return [...document.querySelectorAll('main *')].filter((e) => (e.childElementCount === 0 && e.textContent.trim() || e.matches('button, a, [role="button"]')) && !e.closest('.sr-only,[aria-hidden="true"]')).map((e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return null;
      const a = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return a && k.contains(a) ? (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 30) : null;
    }).filter(Boolean);
  }, KARTU);
  for (const t of isi) catat(label, `ISI tertutup «${t}»`);
  return true;
}

const browser = await chromium.launch();
try {
  const sel = [];
  for (const ua of Object.keys(UA)) for (const w of LEBAR) {
    for (const theme of ['light', 'dark']) sel.push({ ua, w, theme, peran: 'warga' });
    sel.push({ ua, w, theme: 'light', peran: 'bendahara' });
  }
  for (const { ua, w, theme, peran } of sel) {
    const tag = `[${ua} ${w} ${theme === 'light' ? 'terang' : 'gelap'} ${peran}`;
    const { ctx, page } = await newCtx(browser, theme, { bendahara: peran === 'bendahara' });
    if (peran === 'bendahara') await ctx.route('**/rest/v1/**', (r) => (['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.fallback() : r.fulfill({ status: 204, body: '' })));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: UA[ua], platform: ua === 'iphone' ? 'iPhone' : 'Linux armv8l' });
    await page.addInitScript((m) => { window.MUTASI_2 = m === '2'; }, MUTASI);
    await page.setViewportSize({ width: w, height: 844 });
    await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
    if (peran === 'warga' && !(await loginWarga(page))) { console.log(`PROBE CACAT ${tag}]: warga gagal masuk`); process.exit(2); }
    await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
    if (MUTASI) await page.addStyleTag({ content: MUT_CSS[MUTASI] });
    if (ua === 'android') await page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true });
      e.prompt = async () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(e);
    });
    await page.waitForTimeout(1500);
    if (!(await page.locator(KARTU).count())) { console.log(`  PROBE CACAT ${tag}]: kartu tak muncul di Beranda`); cacat++; await ctx.close(); continue; }
    kartu++;
    await ukur(page, `${tag}] kartu`, KARTU);
    const tabs = await page.$$eval('nav button', (bs) => bs.map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
    let tampil = 0;
    for (const t of tabs) {
      await gotoTab(page, t);
      if (await periksaTab(page, `${tag} ${t}]`)) tampil++;
    }
    if (!tampil) { console.log(`  PROBE CACAT ${tag}]: kartu tak tampil di tab mana pun`); cacat++; }
    mendarat += await page.evaluate(() => window.__mendarat || 0);
    if (ua === 'iphone' && peran === 'warga') {
      await gotoTab(page, 'Beranda');
      await page.locator(KARTU).getByRole('button', { name: 'Pasang' }).click();
      await page.waitForTimeout(900);
      if (await ukur(page, `${tag}] panduan`, '[role="dialog"]')) panduan++;
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\n=== PASANG: ${kartu} kartu · ${panduan} panduan · ${teksDiukur} teks · ${tabDiperiksa} tab diperiksa · ${temuan.length} temuan${MUTASI ? ` · MUTASI=${MUTASI}` : ''} ===`);
temuan.forEach((t) => console.log(`   ${t}`));
console.log(`\nAMBANG APP · AAA 7:1 (dilaporkan, tak menggagalkan): ${aaa.length} di bawah`);
aaa.slice(0, 12).forEach((t) => console.log(`   ${t}`));
if (cacat) { console.log(`\nPROBE CACAT: ${cacat} kartu/permukaan tak terukur`); process.exit(2); }
if (MUTASI) {
  if (!mendarat) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tak pernah mendarat`); process.exit(2); }
  const sasaran = MUTASI === '1' ? kartu / LEBAR.length * LEBAR.filter((x) => x < 360).length : kartu;
  const merah = [...kena].filter((l) => MUTASI === '1' ? / 320 / .test(l) : true).length;
  console.log(`\n  MUTASI=${MUTASI} mendarat ${mendarat}× · kartu merah ${merah}/${sasaran}`);
  if (merah < sasaran) { console.log('PROBE CACAT: mutasi tak menggigit di semua anggota populasinya'); process.exit(2); }
}
process.exit(temuan.length ? 1 : 0);
