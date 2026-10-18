// audit:mesin — jumlah BARIS tiap teks di WebKit (Safari iPhone) lawan Chromium.
//
// Kenapa ada (16 Okt 2026): seluruh 40-an sapuan repo berjalan di Chromium,
// sedangkan user memakai iPhone. Potret HP-nya membongkar cacat yang tak terlihat
// satu sapuan pun — baris giliran Kartu Warga tercetak "Tarikan / #30" karena
// WebKit menghitung lebar intrinsik item `MetaPisah` ber-`::before` absolut
// sedikit lebih sempit dari teks ber-angka tabular (eee911a). Kelas itu tak
// punya penjaga: ia hanya ada di mesin yang tak pernah dijalankan siapa pun.
//
// Cara kerja: layar yang SAMA (data, lebar, DPR, sentuh, tema — semuanya
// identik; satu-satunya beda MESIN RENDER) dibuka di kedua mesin. Tiap daun teks
// dipasangkan lewat teksnya + urutan kemunculannya, lalu jumlah baris TERLIHAT-
// nya dibandingkan. Beda baris = mesin memecah teks yang sama secara berbeda.
//
// Yang SENGAJA tidak divonis (dan jumlahnya SELALU dicetak):
//   · `text-wrap: pretty` — kedua mesin punya algoritma "pretty" sendiri,
//     dan keduanya sah; terukur di Tentang Aplikasi 7 lawan 6 baris, dua-duanya rapi.
//   · baris di bawah `line-clamp` — yang dibandingkan baris TERLIHAT
//     (min(baris, clamp)), bukan baris yang terpotong clamp.
//
// Gerbang PROBE CACAT (exit 2): layar yang populasinya timpang antar mesin
// (>3%) — itu layar yang belum termuat di salah satu mesin, bukan beda render —
// dan layar dgn <5 teks. Tanpa itu, layar setengah-muat terbaca "0 beda".
//
// Pakai:  npm run audit:mesin
//   LEBAR=390,375  (bawaan: iPhone 12-15 & iPhone mini/SE)
//   PERAN=warga | bendahara
//   MUTASI=1  → kembalikan titik MetaPisah absolut pra-eee911a DI WEBKIT saja —
//               WAJIB merah ("Tarikan #30" di Kartu Warga).
import { webkit, chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, openMenuItem, closeLayer } from './lib/audit-harness.mjs';
import { pilihKartuWarga, tungguDaftarKartu } from './lib/kartu-warga.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const LEBAR = (process.env.LEBAR || '390,375').split(',').map(Number);
const PERAN = (process.env.PERAN || 'warga,bendahara').split(',');
const MUTASI = process.env.MUTASI || '';
const MUT_CSS = {
  1: `.meta-pisah > span > span::before { display: inline !important; position: absolute !important; top: 0 !important; left: 0 !important; margin-left: 0 !important; }`,
};

/** Daun teks di lapisan TERATAS (dialog kalau ada), baris terlihat tiap daun. */
const KUMPUL = () => {
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter((d) => d.getBoundingClientRect().width > 0).pop();
  const akar = dlg || document.body;
  const ke = new Map(); const out = [];
  for (const el of akar.querySelectorAll('*')) {
    const tn = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!tn.length) continue;
    // Odometer & chrome tetap (nav/header) bukan teks yang dipecah; .sr-only tak dicat.
    if (el.closest('[aria-hidden="true"],[data-odo],.sr-only,nav,header')) continue;
    if (!dlg && el.closest('[role="dialog"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.clip !== 'auto') continue;
    const tops = [];
    for (const n of tn) {
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.width > 0.5 && r.height > 0) tops.push(r.top);
    }
    if (!tops.length) continue;
    tops.sort((a, b) => a - b);
    let baris = 1; for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > 3) baris++;
    const clamp = parseInt(cs.webkitLineClamp, 10);
    const terlihat = clamp > 0 ? Math.min(baris, clamp) : baris;
    const pretty = /pretty/.test(cs.textWrap || cs.textWrapStyle || '');
    const teks = el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
    const k = ke.get(teks) || 0; ke.set(teks, k + 1);
    out.push({ kunci: `${teks}#${k}`, baris: terlihat, pretty, lebar: Math.round(el.getBoundingClientRect().width) });
  }
  return out;
};

async function siap(page) {
  for (let i = 0; i < 60; i++) { if (!(await page.locator('.skeleton, .skeleton-bar').count().catch(() => 0))) break; await page.waitForTimeout(400); }
  await page.waitForTimeout(700);
}
/** Gulir wadah teratas sampai dasar: baris `content-visibility:auto` di bawah
 *  lipatan tak punya kotak sebelum pernah dirender. */
async function gulirSemua(page) {
  await page.evaluate(async () => {
    const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
    const dlg = [...document.querySelectorAll('[role="dialog"]')].pop();
    const wadah = dlg ? [dlg, ...dlg.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY)) : document.scrollingElement;
    if (!wadah) return;
    for (let y = 0; y < wadah.scrollHeight; y += 500) { wadah.scrollTop = y; await tunggu(120); }
    wadah.scrollTop = 0; await tunggu(200);
  });
}

const hasil = {};
const cacat = [];
for (const [mn, mesin] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await mesin.launch();
  for (const lebar of LEBAR) for (const peran of PERAN) {
    const { ctx, page } = await newCtx(browser, 'light', { bendahara: peran === 'bendahara' });
    await page.setViewportSize({ width: lebar, height: 844 });
    if (MUTASI && mn === 'webkit') await ctx.addInitScript((css) => {
      const pasang = () => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); };
      if (document.head) pasang(); else document.addEventListener('DOMContentLoaded', pasang);
    }, MUT_CSS[MUTASI]);
    await page.goto(APP);
    if (peran === 'warga') await loginWarga(page);
    else await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(2000);
    const catat = async (nama) => { await siap(page); await gulirSemua(page); (hasil[`${lebar}|${peran}|${nama}`] ??= {})[mn] = await page.evaluate(KUMPUL); };

    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    for (const t of tabs) { await gotoTab(page, t); await catat(t); }
    await gotoTab(page, 'Hadiran');
    const det = page.locator('button', { hasText: 'Lihat detail' }).first();
    if (await det.count()) { await det.click(); await page.waitForTimeout(1500); await catat('sheet-detail-tarikan'); await closeLayer(page); }
    else cacat.push(`${mn} ${lebar} ${peran}: pemicu sheet detail tarikan tak ada`);
    await gotoTab(page, 'Beranda');
    for (const o of peran === 'warga' ? ['Riwayat Aktivitas', 'Tentang Aplikasi'] : ['Kelola Anggota', 'Tutup Buku Triwulan', 'Riwayat Aktivitas']) {
      if (!(await openMenuItem(page, o))) { cacat.push(`${mn} ${lebar} ${peran}: ${o} tak terbuka`); continue; }
      // Kelola Anggota memuat daftarnya sendiri SESUDAH dibuka — tunggu barisnya, bukan jeda.
      if (o === 'Kelola Anggota') await page.locator('[role="dialog"] button', { hasText: /\S/ }).nth(10).waitFor({ timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await catat(o); await closeLayer(page);
    }
    if (await openMenuItem(page, 'Kartu Saya')) {
      if (await tungguDaftarKartu(page)) await catat('Kartu Warga · pilih'); else cacat.push(`${mn} ${lebar} ${peran}: daftar Kartu Warga tak tampil`);
      if (await pilihKartuWarga(page)) await catat('Kartu Warga · kartu'); else cacat.push(`${mn} ${lebar} ${peran}: kartu tak terbuka`);
      await closeLayer(page);
    } else cacat.push(`${mn} ${lebar} ${peran}: Kartu Warga tak ada di Menu`);
    if (peran === 'bendahara') {
      for (const [tab, aria, nama] of [['Hadiran', 'Setor ke Kas RT', 'sheet-setor'], ['Kas RT', 'Tambah transaksi Kas RT', 'sheet-kasrt']]) {
        await gotoTab(page, tab);
        const f = page.getByRole('button', { name: aria });
        if (await f.count()) { await f.click(); await page.waitForTimeout(1200); await catat(nama); await closeLayer(page); }
        else cacat.push(`${mn} ${lebar} ${peran}: pemicu ${nama} tak ada`);
      }
    }
    await ctx.close();
  }
  await browser.close();
}

let pasangan = 0, dimaafkan = 0, layar = 0;
const beda = [];
for (const [nama, m] of Object.entries(hasil)) {
  if (!m.webkit || !m.chromium) { cacat.push(`[${nama}] hanya terukur di ${Object.keys(m).join('/')}`); continue; }
  const nw = m.webkit.length, nc = m.chromium.length;
  if (Math.min(nw, nc) < 5) { cacat.push(`[${nama}] cuma ${Math.min(nw, nc)} teks — layar kosong?`); continue; }
  if (Math.abs(nw - nc) / Math.max(nw, nc) > 0.03) { cacat.push(`[${nama}] populasi timpang webkit ${nw} · chromium ${nc} — layar belum termuat di salah satu mesin`); continue; }
  layar++;
  const c = new Map(m.chromium.map((x) => [x.kunci, x]));
  for (const w of m.webkit) {
    const x = c.get(w.kunci); if (!x) continue;
    pasangan++;
    if (w.baris === x.baris) continue;
    if (w.pretty || x.pretty) { dimaafkan++; continue; }
    beda.push(`[${nama}] webkit ${w.baris} baris · chromium ${x.baris} · lebar ${w.lebar}px · "${w.kunci.replace(/#\d+$/, '')}"`);
  }
}

console.log(`\n=== MESIN: ${pasangan} teks berpasangan di ${layar} layar · beda baris ${beda.length} · dimaafkan (text-wrap: pretty) ${dimaafkan}${MUTASI ? ` · MUTASI=${MUTASI}` : ''} ===`);
beda.forEach((b) => console.log('  ' + b));
cacat.forEach((c) => console.log('  PROBE CACAT ' + c));
if (MUTASI && !beda.length) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tapi nol beda — probe tak menggigit.`); process.exit(2); }
if (cacat.length) process.exit(2);
process.exit(beda.length ? 1 : 0);
