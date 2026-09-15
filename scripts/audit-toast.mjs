// Audit TOAST — apakah pesan sementara bisa DIBACA & aksinya bisa DIPAKAI sebelum ia pergi.
//
// Kenapa alat sendiri (15 Sep 2026, audit ui-ux-pro-max): dari 40 sapuan tak satu
// pun pernah bertanya berapa lama toast hidup atau apa yang terjadi saat orang
// sedang MEMEGANGNYA. `audit:tulis` & `audit:kembali` memang membaca toast, tapi
// hanya untuk tahu app MENGAKU — bukan apakah pengakuannya sempat terbaca. Terukur
// sebelum perbaikan:
//   · SEMUA toast hidup 2,6 dtk, berapa pun panjangnya — 19 dari 38 pesan butuh
//     lebih lama pada 200 kata/menit, 17 di antaranya GALAT. Aturan kata app
//     (akibat · jalan keluar · sebut bendanya) memanjangkan galat, durasinya tidak
//     ikut, jadi yang hilang justru ujungnya: jalan keluarnya.
//   · Toast "Urungkan" terus menghitung mundur saat tombolnya DIFOKUS atau DIHOVER;
//     habis waktu → aksinya dijalankan di bawah jari pengguna & fokus jatuh ke
//     <body> (WCAG §2.2.1 A · §2.4.3 A).
//   · Toast di EKOR DOM padahal tercat di ATAS layar: 83 Tab dari "Semua Hadir"
//     — mustahil dalam 5 dtk (urutan fokus ≠ urutan visual).
//
// Bagian:
//   T1 JEDA-FOKUS   fokus di Urungkan → toast BERTAHAN; fokus pergi → toast pergi
//   T2 JEDA-KURSOR  kursor di atas toast → BERTAHAN; kursor pergi → toast pergi
//   T3 FOKUS-PULANG Urungkan ditekan → fokus kembali ke PEMICU, bukan <body>
//   T4 DURASI-BACA  tiap toast yang tak dipegang hidup >= 500 ms + 300 ms/kata
//                   (200 kata/menit). Ambang = SYARAT membaca, sengaja BUKAN salinan
//                   rumus app — rumus boleh berubah, syaratnya tidak.
//   T5 URUTAN       tumpukan toast mendahului <header> di DOM (tercat di atasnya)
//
// Populasi toast diambil dari `.z-toast > div` (wadah bertier bernama), dicatat
// MutationObserver SEPANJANG jalan — keadaan akhir buta urutan (pelajaran B5/B6).
// Tulis diblokir mock bendahara; aksi massal absensi murni state lokal.
//
// Pakai:  npm run audit:toast   (butuh build produksi hidup di :5199)
//   MUTASI=1 → T1/T2 TIDAK memegang toast; keduanya WAJIB merah (bukti giginya).
import { chromium } from 'playwright';
import { newCtx, gotoTab } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';
const TAHAN_MS = 7000;   // > umur toast Urungkan (5 dtk) + 2 dtk
const PERGI_MS = 9000;   // sisa waktu + animasi keluar + longgar
const kata = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

let pemeriksaan = 0;
const temuan = [];
const cacat = [];
const vonis = (bagian, ok, pesan) => { pemeriksaan++; if (!ok) temuan.push(`${bagian}: ${pesan}`); console.log(`  ${ok ? 'ok   ' : 'MERAH'} ${bagian} — ${pesan}`); };

async function rekamToast(ctx) {
  await ctx.addInitScript(() => {
    window.__toast = [];
    const id = new WeakMap();
    const catat = () => {
      const now = performance.now();
      const hidup = new Set();
      for (const el of document.querySelectorAll('.z-toast > div')) {
        if (!id.has(el)) {
          id.set(el, window.__toast.length);
          window.__toast.push({ pesan: el.querySelector('p')?.textContent?.trim() ?? '', aksi: el.querySelector('button')?.textContent?.trim() ?? '', muncul: now, keluar: null, hilang: null });
        }
        const r = window.__toast[id.get(el)];
        if (el.classList.contains('toast-out') && r.keluar === null) r.keluar = now;
        hidup.add(id.get(el));
      }
      window.__toast.forEach((r, i) => { if (!hidup.has(i) && r.hilang === null) { r.hilang = now; if (r.keluar === null) r.keluar = now; } });
    };
    new MutationObserver(catat).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  });
}

const toastAda = (page) => page.evaluate(() => document.querySelectorAll('.z-toast > div:not(.toast-out)').length);
async function tungguSepi(page, ms = 14000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (!(await page.evaluate(() => document.querySelectorAll('.z-toast > div').length))) return true; await page.waitForTimeout(150); }
  return false;
}
async function tungguSampai(page, fn, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return Date.now() - t0; await page.waitForTimeout(100); }
  return null;
}
const aktif = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return { tag: a?.tagName ?? '', teks: (a?.getAttribute('aria-label') || a?.innerText || '').trim().split('\n')[0].slice(0, 30), diToast: !!a?.closest('.z-toast') };
});

async function bukaAbsensi(browser) {
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: true });
  await rekamToast(ctx);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await gotoTab(page, 'Jadwal');
  const proses = page.getByRole('button', { name: /^Proses/i }).first();
  if (!(await proses.count())) return { ctx, page, gagal: 'tombol Proses tak ada (butuh tarikan terjadwal)' };
  await proses.click();
  const semua = page.getByRole('button', { name: 'Semua Hadir' });
  if (!(await semua.waitFor({ timeout: 15000 }).then(() => true).catch(() => false))) return { ctx, page, gagal: 'editor Absensi tak terbuka' };
  await page.waitForTimeout(700);
  await page.mouse.move(195, 480);
  return { ctx, page, semua, urungkan: page.getByRole('button', { name: 'Urungkan' }) };
}

/** Ketukan PAPAN KETIK di "Semua Hadir" → toast Urungkan. Fokus tetap di pemicu. */
async function picu(page, semua) {
  if (!(await tungguSepi(page))) return false;
  await semua.focus();
  await page.keyboard.press('Enter');
  return (await tungguSampai(page, async () => (await toastAda(page)) > 0, 2500)) !== null;
}

const browser = await chromium.launch();
try {
  // ── T1–T3, T5: toast Urungkan di editor Absensi ─────────────────────────
  const a = await bukaAbsensi(browser);
  if (a.gagal) cacat.push(`absensi: ${a.gagal}`);
  else {
    const { page, semua, urungkan } = a;

    console.log('\nT5 URUTAN');
    if (!(await picu(page, semua))) cacat.push('T5: toast Urungkan tak muncul');
    else {
      const urut = await page.evaluate(() => {
        const t = document.querySelector('.z-toast'), h = document.querySelector('header');
        return t && h ? !!(t.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
      });
      if (urut === null) cacat.push('T5: <header> atau tumpukan toast tak ketemu');
      else vonis('T5', urut, urut ? 'tumpukan toast mendahului <header> (urutan fokus = urutan tercat)' : 'tumpukan toast di SESUDAH <header> — tercat paling atas tapi datang paling akhir di urutan Tab');
      // Jarak dicetak, tak divonis: angka ini sifat HALAMAN (berapa kontrol di atas pemicu).
      let mundur = null;
      for (let i = 1; i <= 60; i++) { await page.keyboard.press('Shift+Tab'); if ((await aktif(page)).teks === 'Urungkan') { mundur = i; break; } }
      console.log(`       jarak dari "Semua Hadir": ${mundur ? `${mundur}× Shift+Tab` : 'tak tergapai dalam 60× Shift+Tab'}`);
      /* Fokus WAJIB dikembalikan: yang tertinggal di "Urungkan" menahan toast
         selamanya (itu perilaku yang BENAR, T1), dan versi pertama sapuan ini
         lalu menunggu toast yang takkan pernah pergi di bagian berikutnya. */
      await semua.focus();
    }

    console.log('\nT1 JEDA-FOKUS');
    if (!(await picu(page, semua))) cacat.push('T1: toast Urungkan tak muncul');
    else {
      if (!MUTASI) await urungkan.focus();
      await page.waitForTimeout(TAHAN_MS);
      const f = await aktif(page);
      vonis('T1', (await toastAda(page)) > 0, `${TAHAN_MS / 1000} dtk dgn fokus ${MUTASI ? 'TIDAK dipegang (MUTASI=1)' : `di "${f.teks}"`} → toast ${(await toastAda(page)) > 0 ? 'BERTAHAN' : 'SUDAH PERGI'}${!MUTASI && !f.diToast ? ` · fokus kini <${f.tag}>` : ''}`);
      if (!MUTASI && (await toastAda(page)) > 0) {
        await semua.focus();
        const ms = await tungguSampai(page, async () => (await toastAda(page)) === 0, PERGI_MS);
        vonis('T1', ms !== null, ms !== null ? `fokus pergi → toast pergi dalam ${(ms / 1000).toFixed(1)} dtk` : `fokus pergi → toast TAK PERNAH pergi (${PERGI_MS / 1000} dtk)`);
      }
    }

    console.log('\nT2 JEDA-KURSOR');
    if (!(await picu(page, semua))) cacat.push('T2: toast Urungkan tak muncul');
    else {
      const kotak = await page.locator('.z-toast > div').first().boundingBox();
      if (!MUTASI && kotak) await page.mouse.move(kotak.x + kotak.width * 0.3, kotak.y + kotak.height / 2);
      await page.waitForTimeout(TAHAN_MS);
      const ada = (await toastAda(page)) > 0;
      vonis('T2', ada, `${TAHAN_MS / 1000} dtk dgn kursor ${MUTASI ? 'TIDAK di atas toast (MUTASI=1)' : 'di atas toast'} → toast ${ada ? 'BERTAHAN' : 'SUDAH PERGI'}`);
      if (!MUTASI && ada) {
        await page.mouse.move(195, 480);
        const ms = await tungguSampai(page, async () => (await toastAda(page)) === 0, PERGI_MS);
        vonis('T2', ms !== null, ms !== null ? `kursor pergi → toast pergi dalam ${(ms / 1000).toFixed(1)} dtk` : `kursor pergi → toast TAK PERNAH pergi (${PERGI_MS / 1000} dtk)`);
      }
    }

    console.log('\nT3 FOKUS-PULANG');
    if (!(await picu(page, semua))) cacat.push('T3: toast Urungkan tak muncul');
    else {
      await urungkan.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700);
      const f = await aktif(page);
      vonis('T3', f.teks === 'Semua Hadir', `Urungkan ditekan → fokus di ${f.tag === 'BODY' ? '<body> (HILANG)' : `"${f.teks}" <${f.tag}>`}`);
    }

    // Satu toast yang TAK dipegang siapa pun, untuk populasi T4.
    if (await picu(page, semua)) await tungguSepi(page);
    a.toast = await page.evaluate(() => window.__toast);
  }
  await a.ctx.close();

  // ── T4 sumber kedua: galat tulis Kas RT (tulis diblokir mock → 403) ──────
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: true });
  await rekamToast(ctx);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await gotoTab(page, 'Kas RT');
  const tambah = page.getByRole('button', { name: /Tambah transaksi Kas RT/i });
  let galatKasRt = [];
  if (!(await tambah.count())) cacat.push('T4: tombol Tambah transaksi Kas RT tak ada');
  else {
    await tambah.click();
    const dialog = page.locator('[role="dialog"]').last();
    await dialog.waitFor({ timeout: 8000 });
    await page.waitForTimeout(700);
    await dialog.locator('input[inputmode="numeric"]').first().fill('50000');
    const ket = dialog.locator('input[type="text"]').first();
    if (await ket.count()) await ket.fill('audit toast');
    await dialog.getByRole('button', { name: /^Simpan$/ }).click();
    await page.mouse.move(195, 480);
    if ((await tungguSampai(page, async () => (await page.evaluate(() => window.__toast.length)) > 0, 8000)) === null) cacat.push('T4: simpan yang diblokir tak memunculkan toast');
    else { await tungguSepi(page); galatKasRt = await page.evaluate(() => window.__toast); }
  }
  await ctx.close();

  console.log('\nT4 DURASI-BACA');
  // Toast yang dipegang di T1–T3 dikeluarkan: umurnya memang sengaja diperpanjang
  // atau dipotong oleh aksi. Yang tersisa = toast terakhir absensi + galat Kas RT.
  const populasi = [...(a.toast ?? []).slice(-1), ...galatKasRt].filter((r) => r.hilang !== null);
  for (const r of populasi) {
    const n = kata(r.pesan) + kata(r.aksi);
    const butuh = 500 + n * 300;
    const umur = Math.round(r.keluar - r.muncul);
    vonis('T4', umur >= butuh - 150, `"${r.pesan}"${r.aksi ? ` [${r.aksi}]` : ''} · ${n} kata butuh ${(butuh / 1000).toFixed(1)} dtk · hidup ${(umur / 1000).toFixed(1)} dtk`);
  }
  if (populasi.length < 2) cacat.push(`T4: populasi ${populasi.length} toast (butuh 2: Urungkan absensi + galat Kas RT)`);
} finally {
  await browser.close();
}

console.log(`\n=== TOAST: ${pemeriksaan} pemeriksaan · ${temuan.length} bermasalah${MUTASI ? ' · MUTASI=1 (toast tidak dipegang)' : ''} ===`);
temuan.forEach((t) => console.log(`  ${t}`));
if (cacat.length) { cacat.forEach((c) => console.log(`PROBE CACAT: ${c}`)); process.exit(2); }
process.exit(temuan.length ? 1 : 0);
