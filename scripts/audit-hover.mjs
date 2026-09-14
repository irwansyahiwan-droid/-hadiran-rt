// Audit HOVER — apakah tiap kontrol MENJAWAB saat kursor berada di atasnya.
//
// Kenapa alat sendiri (14 Sep 2026, audit Web Interface Guidelines ke-5):
// app ini touch-first, dan tak satu pun dari 30+ sapuan pernah memakai
// PENUNJUK. `audit:sentuh` mengukur luas jempol, `audit:papan-ketik` jangkauan
// Tab, `audit:kontras-nonteks` ring fokus — tak ada yang bertanya apa yang
// dilihat bendahara yang membuka app di LAPTOP saat kursornya di atas tombol.
// Garis dasar pertama: **48 dari 208 kontrol unik tak berubah sama sekali** —
// bar nav, chip filter, pilihan periode grafik, pilihan Pemasukan/Pengeluaran,
// baris transaksi Beranda, "Proses tarikan #N" — di app yang 160 kontrol
// lainnya sudah punya hover. Bukan "tak ada hover", tapi hover yang BOLONG.
//
// Cara ukur: `CSS.forcePseudoState` (CDP) memaksa `:hover` pada tiap kontrol,
// lalu gaya terhitung kontrol + keturunannya (<= 25 simpul) dibandingkan dgn
// keadaan diam. Viewport 1280×900 TANPA sentuh, jadi `(hover: hover)` benar —
// utilitas `hover:` Tailwind di repo ini digerbang `hoverOnlyWhenSupported`,
// dan di viewport sentuh ia memang tak pernah menyala (itu disengaja: di iOS
// :hover nyangkut sesudah diketuk).
//
// DUA penjaga populasi, karena "tak berubah" bisa berarti dua hal:
//   · BERGERAK — dua bacaan DIAM berturut-turut sudah berbeda (autoplay,
//     Odometer, animasi masuk). Perubahan saat hover tak bisa dibedakan dari
//     gerak itu, jadi kontrolnya `tak terukur`, BUKAN lulus.
//   · PROBE CACAT — kalau pemaksaan :hover tak menggigit sama sekali, SEMUA
//     kontrol terbaca "tanpa hover". Kurang dari 30% kontrol yang berubah =
//     alatnya, bukan app-nya (exit 2).
//
// Satu kontrol = nama ternormalisasi (angka → N, nominal → Rp…) + tema, dan ia
// bermasalah kalau TAK PERNAH berubah di layar mana pun. Tanpa normalisasi 13
// tombol "Proses tarikan #N" terhitung 13 temuan untuk SATU call-site.
//
// Pakai:  npm run audit:hover
//   MUTASI=1 → :hover TIDAK dipaksa; SEMUA kontrol wajib terbaca tanpa hover
//              dan sapuan wajib keluar PROBE CACAT (bukti penjaganya menggigit).
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';
const PROPS = ['background-color', 'background-image', 'color', 'border-color', 'box-shadow', 'opacity', 'transform', 'filter', 'text-decoration-line', 'outline-color'];
const SEL = 'button,a[href],[role="button"],[role="tab"],[role="switch"],[role="menuitem"],[role="option"],summary';

let pemeriksaan = 0;
const catatan = []; // { tema, kunci, nama, layar, status: 'berubah'|'diam'|'bergerak' }

async function periksa(page, cdp, tema, layar) {
  await page.evaluate((sel) => {
    for (const e of document.querySelectorAll('[data-hv]')) e.removeAttribute('data-hv');
    let i = 0;
    /* Lapisan TERATAS saja: halaman di belakang dialog tak bisa dihover. */
    const atas = [...document.querySelectorAll('[role="dialog"],[role="menu"],[role="listbox"]')].pop();
    for (const el of document.querySelectorAll(sel)) {
      if (atas && !atas.contains(el)) continue;
      if (el.disabled || el.closest('[aria-hidden="true"],[inert],[disabled]')) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (r.width < 8 || r.height < 8 || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
      if (r.bottom <= 0 || r.top >= innerHeight) continue;
      el.setAttribute('data-hv', String(i++));
    }
  }, SEL);
  const baca = () => page.evaluate((props) => {
    const out = {};
    for (const el of document.querySelectorAll('[data-hv]')) {
      const simpul = [el, ...el.querySelectorAll('*')].slice(0, 25);
      /* `::before`/`::after` WAJIB ikut: lapisan hover yang dipasang di pseudo
         (kaki statistik hero — supaya garis pemisah `border-r` tak ikut
         melengkung oleh `rounded`) tak terlihat dari gaya elemen mana pun. */
      out[el.getAttribute('data-hv')] = simpul.map((x) => ['', '::before', '::after'].map((ps) => {
        const c = getComputedStyle(x, ps || null);
        return props.map((p) => c.getPropertyValue(p)).join('|');
      }).join('^')).join('#');
    }
    return out;
  }, PROPS);

  const diam1 = await baca();
  await page.waitForTimeout(120);
  const diam2 = await baca();
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-hv]' });
  if (!MUTASI) for (const id of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: ['hover'] });
  await page.waitForTimeout(450); // anak tangga gerak terpanjang 0.40s
  const hover = await baca();
  for (const id of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: [] });

  const info = await page.evaluate(() => [...document.querySelectorAll('[data-hv]')].map((el) => ({
    id: el.getAttribute('data-hv'),
    nama: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60),
  })));
  for (const e of info) {
    pemeriksaan++;
    const kunci = e.nama.replace(/[+-]?Rp[\d.]+/g, 'Rp…').replace(/\d+/g, 'N');
    const status = diam1[e.id] !== diam2[e.id] ? 'bergerak' : diam1[e.id] !== hover[e.id] ? 'berubah' : 'diam';
    catatan.push({ tema, kunci, nama: e.nama, layar, status });
  }
}

const browser = await chromium.launch();
const layarDiperiksa = new Set();
for (const tema of ['light', 'dark']) {
  for (const peran of ['bendahara', 'warga']) {
    const { ctx, page } = await newCtx(browser, tema, { bendahara: peran === 'bendahara' });
    await page.setViewportSize({ width: 1280, height: 900 });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    await page.goto(URL, { waitUntil: 'networkidle' });
    if (peran === 'warga') await loginWarga(page);
    await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(2500);
    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    for (const t of tabs) {
      await gotoTab(page, t);
      const tinggi = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < Math.min(tinggi, 2700); y += 900) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(300);
        await periksa(page, cdp, tema, `${peran}/${t}`);
      }
      layarDiperiksa.add(`${tema}/${peran}/${t}`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(700);
    await periksa(page, cdp, tema, `${peran}/menu`);
    layarDiperiksa.add(`${tema}/${peran}/menu`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (peran === 'bendahara') {
      for (const [tab, pemicu, nama] of [
        ['Kas RT', 'Tambah transaksi Kas RT', 'sheet-kasrt'],
        ['Hadiran', 'Setor ke Kas RT', 'sheet-setor'],
      ]) {
        await gotoTab(page, tab);
        const b = page.getByRole('button', { name: pemicu });
        if (!(await b.count())) { console.log(`  [${tema}] DILEWAT ${nama} — pemicunya tak ada`); continue; }
        await b.click();
        await page.waitForTimeout(1000);
        await periksa(page, cdp, tema, `${peran}/${nama}`);
        layarDiperiksa.add(`${tema}/${peran}/${nama}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(700);
      }
    }
    await ctx.close();
  }
}
await browser.close();

// ── vonis ────────────────────────────────────────────────────────────────
const unik = new Map();
for (const c of catatan) {
  const k = `${c.tema}¦${c.kunci}`;
  const u = unik.get(k) || { tema: c.tema, kunci: c.kunci, contoh: c.nama, layar: new Set(), berubah: false, diam: false };
  u.layar.add(c.layar);
  if (c.status === 'berubah') u.berubah = true;
  if (c.status === 'diam') u.diam = true;
  unik.set(k, u);
}
const semua = [...unik.values()];
const temuan = semua.filter((u) => !u.berubah && u.diam);
const takTerukur = semua.filter((u) => !u.berubah && !u.diam);
const berubah = semua.filter((u) => u.berubah);

console.log(`\n=== HOVER @1280px: ${pemeriksaan} pemeriksaan · ${semua.length} kontrol unik di ${layarDiperiksa.size} layar · ${temuan.length} tanpa umpan balik hover ===`);
console.log(`  berubah saat hover: ${berubah.length} · tak terukur (bergerak sendiri): ${takTerukur.length}${MUTASI ? ' · MUTASI=1 (:hover tidak dipaksa)' : ''}`);
if (takTerukur.length && process.env.SHOW_BUTA) takTerukur.forEach((u) => console.log(`    · [${u.tema}] "${u.contoh}"`));
for (const tema of ['light', 'dark']) {
  const t = temuan.filter((u) => u.tema === tema);
  if (!t.length) continue;
  console.log(`\n[${tema}] ${t.length} kontrol tanpa hover:`);
  t.sort((a, b) => a.kunci.localeCompare(b.kunci)).forEach((u) => console.log(`   "${u.contoh}"  (${[...u.layar].join(', ')})`));
}

if (!layarDiperiksa.size || berubah.length < semua.length * 0.3) {
  console.log(`\nPROBE CACAT: hanya ${berubah.length} dari ${semua.length} kontrol berubah — pemaksaan :hover tak menggigit, vonis tak berlaku`);
  process.exit(2);
}
process.exit(temuan.length ? 1 : 0);
