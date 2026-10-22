// KARTU PNG — teks yang keluar dari kotaknya di kartu yang dibagikan ke WhatsApp.
//
// Lahir 22 Okt 2026. Kartu PNG digambar di KANVAS, jadi tak punya satu pun
// simpul DOM — seluruh sapuan geometri repo ini (potong, lebar, kata-patah,
// reflow, mesin) buta terhadapnya. Temuan yang melahirkannya dicari MANUAL:
// struk ringkasan Kas Hadiran & Kas RT memaku nominal hero 40px, jadi mulai
// Rp100.000.000 (343px di ruang 300px) angkanya terpotong di tepi kartu hijau
// yang beredar di grup WA (`df2ceba`). Kelas yang sama dgn Odometer di
// `audit:lebar` & `::placeholder` di `audit:kontras`: apa pun yang tak punya
// simpul DOM hilang dari populasi berbasis selektor. Sapuan ini menutupnya.
//
// CARA MENGUKUR — perintah kanvasnya sendiri, bukan pikselnya. Prototipe
// `CanvasRenderingContext2D` disadap: tiap `fill()`/`fillRect()` mencatat kotak
// path yang dicat (kartu, panel, pita, chip, titik), tiap `fillText()` mencatat
// kotak tinta teks dari `measureText` (actualBoundingBox*, sudah memperhitungkan
// textAlign/textBaseline/letterSpacing) — semuanya lewat `getTransform()` ke
// piksel kanvas. WADAH sebuah teks = kotak TERKECIL yang sudah dicat SEBELUM
// teks itu dan memuat titik tengahnya. VONIS: kotak tinta teks melewati
// wadahnya > 0,5 px kanvas. Teks di atas latar kartu (kaki "Dibuat …") ber-
// wadah kanvas itu sendiri, jadi teks yang lari keluar gambar juga tertangkap.
//
// Berkasnya diambil lewat `navigator.share` yang DISADAP (berkas disimpan di
// halaman, TAK ADA yang terkirim) dan `window.open` dibisukan (jalur cadangan
// wa.me). Bendahara = mock harness (sesi palsu, anon, TULIS DIBLOKIR). Simpan
// TAK PERNAH diketuk.
//
// DUA populasi data: hari ini & `EKSTREM` harness (nama 36 karakter, nominal
// ×100 — skala 300 KK). Data hari ini saja = "tak ada yang patah UNTUK angka
// yang kebetulan ada sekarang" — justru begitulah cacat Rp100 juta lolos.
//
// POPULASI (6 kartu × 2 data): ringkasan Kas Hadiran, ringkasan Kas RT, Tutup
// Buku "sekarang", Tutup Buku per triwulan (kartu terbaru), Kartu Saya, dan
// Hasil Tarikan (Jadwal). Kartu PNG BARU wajib masuk daftar `KARTU` di bawah.
//
// HASIL TARIKAN baru ada SESUDAH absensi disimpan (22 Okt 2026 masuk populasi;
// sebelumnya diakui sbg batas). Jalur simpannya (`simpanTarikanSelesai`) murni
// tulis tabel — absensi/talangan/transaksi_kas delete+insert, tarikan update
// ber-`.select('id')` — jadi SETIAP permintaan tulis di sapuan ini DIJAWAB
// LOKAL oleh route di atas mock harness: tak satu byte pun ke jaringan.
// Termasuk `POST /rpc/*`, yang di harness terhitung BACA dan diteruskan — app
// punya dua RPC yang MENULIS (`batalkan_tarikan`, `pulihkan_backup`). Jumlah
// tulis yang dijawab lokal SELALU dicetak; kartu Hasil Tarikan yang tak
// memicu satu tulis pun = PROBE CACAT (simpannya tak pernah terjadi).
//
// KONTROL: kartu yang gagal ditangkap / nol teks / nol wadah = PROBE CACAT
// (exit 2). `MUTASI=1` menambahkan 12 huruf "W" ke tiap teks nominal "Rp…"
// SAAT DICAT → tiap kartu ber-nominal WAJIB merah, kalau tidak PROBE CACAT.

import { chromium } from 'playwright';
import { newCtx, openMenuItem, closeLayer } from './lib/audit-harness.mjs';
import { pilihKartuWarga } from './lib/kartu-warga.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';
const AMBANG = 0.5;

function sadap({ mutasi }) {
  const P = CanvasRenderingContext2D.prototype;
  const st = new WeakMap();
  window.__kanvas = [];
  const S = (c) => {
    let s = st.get(c);
    if (!s) { s = { w: c.canvas.width, h: c.canvas.height, path: null, wadah: [], teks: [] }; st.set(c, s); window.__kanvas.push(s); }
    return s;
  };
  const tf = (c, x, y) => { const m = c.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
  const titik = (c, x, y) => {
    const s = S(c); const [X, Y] = tf(c, x, y);
    const p = s.path || (s.path = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
    p.x0 = Math.min(p.x0, X); p.y0 = Math.min(p.y0, Y); p.x1 = Math.max(p.x1, X); p.y1 = Math.max(p.y1, Y);
  };
  const bungkus = (nama, f) => { const asli = P[nama]; if (asli) P[nama] = function (...a) { f(this, a); return asli.apply(this, a); }; };
  bungkus('beginPath', (c) => { S(c).path = null; });
  bungkus('moveTo', (c, [x, y]) => titik(c, x, y));
  bungkus('lineTo', (c, [x, y]) => titik(c, x, y));
  bungkus('arcTo', (c, [x1, y1, x2, y2]) => { titik(c, x1, y1); titik(c, x2, y2); });
  bungkus('quadraticCurveTo', (c, [a, b, x, y]) => { titik(c, a, b); titik(c, x, y); });
  bungkus('bezierCurveTo', (c, [a, b, d, e, x, y]) => { titik(c, a, b); titik(c, d, e); titik(c, x, y); });
  bungkus('arc', (c, [x, y, r]) => { titik(c, x - r, y - r); titik(c, x + r, y + r); });
  bungkus('ellipse', (c, [x, y, rx, ry]) => { titik(c, x - rx, y - ry); titik(c, x + rx, y + ry); });
  bungkus('rect', (c, [x, y, w, h]) => { titik(c, x, y); titik(c, x + w, y + h); });
  bungkus('roundRect', (c, [x, y, w, h]) => { titik(c, x, y); titik(c, x + w, y + h); });
  bungkus('fill', (c) => { const s = S(c); if (s.path && Number.isFinite(s.path.x0)) s.wadah.push({ ...s.path }); });
  bungkus('fillRect', (c, [x, y, w, h]) => {
    const s = S(c); const [a, b] = tf(c, x, y); const [d, e] = tf(c, x + w, y + h);
    s.wadah.push({ x0: Math.min(a, d), y0: Math.min(b, e), x1: Math.max(a, d), y1: Math.max(b, e) });
  });
  const asliTeks = P.fillText;
  P.fillText = function (t, x, y, maxW) {
    const teks = mutasi && /^[-+]?Rp/.test(String(t)) ? `${t}WWWWWWWWWWWW` : String(t);
    const s = S(this);
    const m = this.measureText(teks);
    let kiri = x - m.actualBoundingBoxLeft, kanan = x + m.actualBoundingBoxRight;
    if (maxW !== undefined && m.width > maxW) { const k = maxW / m.width; kiri = x - m.actualBoundingBoxLeft * k; kanan = x + m.actualBoundingBoxRight * k; }
    const [a, b] = tf(this, kiri, y - m.actualBoundingBoxAscent);
    const [d, e] = tf(this, kanan, y + m.actualBoundingBoxDescent);
    const kotak = { x0: Math.min(a, d), y0: Math.min(b, e), x1: Math.max(a, d), y1: Math.max(b, e) };
    const cx = (kotak.x0 + kotak.x1) / 2, cy = (kotak.y0 + kotak.y1) / 2;
    let wadah = { x0: 0, y0: 0, x1: s.w, y1: s.h, kanvas: true };
    let luas = s.w * s.h;
    for (const w of s.wadah) {
      if (cx < w.x0 || cx > w.x1 || cy < w.y0 || cy > w.y1) continue;
      const l = (w.x1 - w.x0) * (w.y1 - w.y0);
      if (l < luas) { luas = l; wadah = w; }
    }
    /* Wadah juga dipotong ke batas kanvas: teks yang lari keluar GAMBAR tetap luber
       walau "wadahnya" (mis. gradien yang dicat melebihi kanvas) lebih lebar. */
    const W = { x0: Math.max(0, wadah.x0), y0: Math.max(0, wadah.y0), x1: Math.min(s.w, wadah.x1), y1: Math.min(s.h, wadah.y1) };
    const luber = Math.max(W.x0 - kotak.x0, kotak.x1 - W.x1, W.y0 - kotak.y0, kotak.y1 - W.y1);
    s.teks.push({ t: teks, luber, kanan: kotak.x1, batas: W.x1, kanvas: !!wadah.kanvas });
    return asliTeks.call(this, teks, x, y, maxW);
  };
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
  Object.defineProperty(navigator, 'share', { value: async (d) => { window.__berkas = d.files[0]; }, configurable: true });
  window.open = () => null;
}

/* Kartu = [nama, langkah membuka & memicu]. Tiap langkah mengembalikan tombol
   pemicu (locator) — pemicu yang tak ada = PROBE CACAT, bukan dilewati. */
const KARTU = [
  ['ringkasan Kas Hadiran', async (p) => { await tab(p, 'Hadiran'); return p.getByRole('button', { name: 'Bagikan ringkasan ke WhatsApp' }); }],
  ['ringkasan Kas RT', async (p) => { await tab(p, 'Kas RT'); return p.getByRole('button', { name: /^Bagikan/ }).first(); }],
  ['Tutup Buku sekarang', async (p) => { await lapis(p, 'Tutup Buku Triwulan'); return p.getByRole('dialog').getByRole('button', { name: /Bagikan ke WhatsApp/ }).first(); }],
  ['Tutup Buku triwulan terbaru', async (p) => { await lapis(p, 'Tutup Buku Triwulan'); return p.getByRole('dialog').getByRole('button', { name: /PNG/ }).first(); }],
  ['Kartu Saya', async (p) => { await lapis(p, 'Kartu Saya'); if (!(await pilihKartuWarga(p))) return null; return p.getByRole('dialog').getByRole('button', { name: /^Bagikan/ }).first(); }],
  /* TERAKHIR: editor Absensi = view penuh & menyimpan (dijawab LOKAL), jadi ia
     tak boleh mengotori keadaan kartu lain. Langkahnya = `audit:tulis` jalur
     Absensi (Proses → Semua Hadir → Simpan & Hitung Iuran). */
  ['Hasil Tarikan', async (p) => {
    await tab(p, 'Jadwal');
    const proses = p.getByRole('button', { name: /^Proses/i }).first();
    if (!(await proses.count())) return null;
    await proses.click();
    const simpan = p.getByRole('button', { name: /^Simpan & Hitung Iuran$/ });
    await simpan.waitFor({ timeout: 15000 });
    await p.waitForTimeout(600);
    await p.getByRole('button', { name: 'Semua Hadir' }).click({ timeout: 10000 });
    await p.waitForTimeout(400);
    const sebelum = tulisLokal;
    await simpan.click();
    const bagi = p.getByRole('button', { name: /Bagikan PNG/ }).first();
    await bagi.waitFor({ timeout: 20000 });
    if (tulisLokal === sebelum) return null;   // simpan tak pernah terjadi
    return bagi;
  }],
];

async function tab(page, label) {
  while (await page.locator('[role="dialog"]').count()) await closeLayer(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('nav button', { hasText: label }).first().click();
  for (let i = 0; i < 40 && (await page.locator('.skeleton, .skeleton-bar').count()); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(800);
}
async function lapis(page, item) {
  while (await page.locator('[role="dialog"]').count()) await closeLayer(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  if (!(await openMenuItem(page, item))) return;
  for (let i = 0; i < 40 && (await page.locator('[role="dialog"] .skeleton, [role="dialog"] .skeleton-bar').count()); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(800);
}

const browser = await chromium.launch();
const temuan = [], cacat = [];
let tulisLokal = 0;
let kartuN = 0, teksN = 0, kartuBerRp = 0, kartuMerah = 0;
for (const [label, ekstrem] of [['hari ini', false], ['ekstrem', true]]) {
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: true, ekstrem });
  await ctx.addInitScript(sadap, { mutasi: MUTASI });
  /* Didaftarkan SESUDAH mock harness → dijalankan LEBIH DULU. Baca diteruskan ke
     handler harness (anon paksa); TULIS apa pun — termasuk RPC — dijawab di sini
     dan tak pernah `continue`. PATCH/POST memantulkan isinya sbg array (jalur
     `wajibBerubah` menuntut baris kembali), DELETE dijawab 204. */
  await ctx.route('**/rest/v1/**', (route) => {
    const req = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.fallback();
    tulisLokal++;
    if (req.method() === 'DELETE') return route.fulfill({ status: 204, body: '' });
    let isi = [];
    try { const b = req.postDataJSON(); isi = Array.isArray(b) ? b : b ? [b] : []; } catch { /* tanpa badan */ }
    return route.fulfill({ status: req.method() === 'POST' ? 201 : 200, contentType: 'application/json',
      body: JSON.stringify(isi.map((r, i) => ({ id: `ffffffff-0000-4000-8000-${String(i).padStart(12, '0')}`, ...r }))) });
  });
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.locator('nav button').first().waitFor({ timeout: 20000 });
  } catch {
    console.log(`PROBE CACAT: app tak terbuka di ${URL} — preview mati? (npm run build && npx vite preview --port 5199)`);
    process.exit(2);
  }
  for (const [nama, buka] of KARTU) {
    const id = `[${label}] ${nama}`;
    try {
      const pemicu = await buka(page);
      if (!pemicu || !(await pemicu.count())) { cacat.push(`${id}: pemicu tak ada`); continue; }
      await page.evaluate(() => { window.__berkas = null; window.__kanvas.length = 0; });
      await pemicu.click();
      await page.waitForFunction(() => window.__berkas, null, { timeout: 20000 });
      const k = await page.evaluate(() => window.__kanvas.filter((s) => s.teks.length).map((s) => ({ w: s.w, h: s.h, wadah: s.wadah.length, teks: s.teks })));
      const utama = k.sort((a, b) => b.teks.length - a.teks.length)[0];
      if (!utama || utama.teks.length < 5 || utama.wadah < 2) { cacat.push(`${id}: kanvas tak terukur (${utama ? `${utama.teks.length} teks · ${utama.wadah} wadah` : 'nol teks'})`); continue; }
      kartuN++; teksN += utama.teks.length;
      const berRp = utama.teks.some((t) => /^[-+]?Rp/.test(t.t));
      if (berRp) kartuBerRp++;
      const lub = utama.teks.filter((t) => t.luber > AMBANG);
      if (lub.length) kartuMerah++;
      console.log(`${lub.length ? '  ⚠' : '  ok'}  ${id.padEnd(40)} ${String(utama.teks.length).padStart(3)} teks · kanvas ${utama.w}×${utama.h} · luber ${lub.length}`);
      for (const t of lub) {
        temuan.push(`${id}: "${t.t.slice(0, 50)}" lewat ${t.luber.toFixed(1)}px${t.kanvas ? ' (keluar gambar)' : ''}`);
        console.log(`        "${t.t.slice(0, 50)}" lewat wadahnya ${t.luber.toFixed(1)}px kanvas${t.kanvas ? ' — keluar gambar' : ''}`);
      }
    } catch (e) {
      cacat.push(`${id}: ${String(e.message || e).split('\n')[0].slice(0, 90)}`);
    }
  }
  await ctx.close();
}
await browser.close();

console.log(`\n=== KARTU PNG: ${kartuN} kartu · ${teksN} teks diukur · ${temuan.length} luber${MUTASI ? ' · MUTASI=1' : ''} ===`);
console.log(`  tulis dijawab LOKAL: ${tulisLokal} (nol diteruskan ke jaringan)`);
for (const t of temuan) console.log(`  LUBER ${t}`);
if (cacat.length) { console.log(`PROBE CACAT: ${cacat.join(' · ')}`); process.exit(2); }
if (MUTASI && kartuMerah < kartuBerRp) { console.log(`PROBE CACAT: MUTASI=1 tapi hanya ${kartuMerah} dari ${kartuBerRp} kartu ber-nominal merah`); process.exit(2); }
process.exit(temuan.length ? 1 : 0);
