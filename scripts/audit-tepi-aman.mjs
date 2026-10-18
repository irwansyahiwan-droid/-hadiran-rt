// audit:tepi-aman — kontrol yang duduk di ZONA SAFE-AREA iPhone (poni/Dynamic
// Island di atas, home indicator di bawah).
//
// Kenapa ada (18 Okt 2026): app dipasang `viewport-fit=cover`, jadi di iPhone
// isinya MENGALIR ke bawah poni & home indicator, dan tiap komponen fixed/sticky
// wajib menyingkir lewat `env(safe-area-inset-*)`. Tak satu pun dari 40-an
// sapuan repo pernah melihat itu: Playwright tak punya safe-area, `env()` = 0,
// jadi zona tersebut tak pernah ada di layar sapuan mana pun. Terukur hari itu
// lewat CDP `Emulation.setSafeAreaInsetsOverride` (Chromium 148): Tambah &
// Revisi jadwal menaruh tombol Batal/Simpan 14px DI DALAM zona home indicator,
// tujuh sheet lain cuma 6px di atasnya — diperbaiki `.pb-sheet` (e9fd410).
//
// Populasi = kontrol yang TERLIHAT & berada di dalam konteks fixed/sticky
// (chrome, FAB, sheet, overlay). Isi halaman yang menggulir BOLEH lewat di bawah
// zona — ia bergerak; yang tak boleh adalah kontrol yang DIAM di sana. Panel
// sheet yang bisa digulir diukur di DASAR gulirnya (tombol aksi ada di sana).
//
// Vonis: kontrol beririsan > 1px dgn zona atas [0, ATAS) atau zona bawah
// (H − BAWAH, H]. "Mepet" (< 8px di luar zona) dicetak, tidak divonis.
// KONTROL: env() wajib terbaca = nilai override (tanpa itu "0 temuan" sama
// dgn "tak ada zona"), dan populasi kosong = PROBE CACAT.
//
// Pakai:  npm run audit:tepi-aman
//   ATAS=47 BAWAH=34   (iPhone 12–14, layar user; Dynamic Island: ATAS=59)
//   MUTASI=1  → dasar sheet & bar nav kehilangan env() — WAJIB merah.
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, openMenuItem, closeLayer } from './lib/audit-harness.mjs';
import { jelajahKartuWarga } from './lib/kartu-warga.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const ATAS = Number(process.env.ATAS || 47);
const BAWAH = Number(process.env.BAWAH || 34);
const W = 390, H = 844;
const MUTASI = process.env.MUTASI || '';
const MUT_CSS = { 1: `.pb-sheet{padding-bottom:1.25rem!important} .nav-dock{padding-bottom:0!important}` };

const UKUR = ([ATAS, BAWAH]) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility === 'visible' && cs.display !== 'none'; };
  const tetap = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === 'fixed' || p === 'sticky') return x; } return null; };
  // Lapisan teratas saja: halaman di belakang dialog tak ikut dihitung.
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis).pop();
  const akar = dlg || document.body;
  if (dlg) [dlg, ...dlg.querySelectorAll('*')].forEach((e) => { if (e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = e.scrollHeight; });
  const sel = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"], [tabindex="0"]';
  const kontrol = [...akar.querySelectorAll(sel)].filter((c) => vis(c) && !c.closest('[aria-hidden="true"]') && (dlg || !c.closest('[role="dialog"]')) && tetap(c));
  const out = [];
  for (const c of kontrol) {
    const r = c.getBoundingClientRect();
    if (r.top >= innerHeight || r.bottom <= 0) continue;               // di luar layar (nav tucked dsb.)
    const nama = (c.getAttribute('aria-label') || c.textContent || c.tagName).trim().replace(/\s+/g, ' ').slice(0, 32);
    /* Bagian kontrol yang di dalam zona harus BENAR-BENAR TERLIHAT di sana:
       isi overlay yang tergulir ke bawah Header (yang menutupi zona atas)
       bukan kontrol yang diam di zona — ia tertutup. Hit-test kisi 5×3 di
       irisan kontrol × zona; satu titik yang mengenai kontrol = terlihat. */
    const terlihatDi = (y0, y1) => {
      if (y1 - y0 <= 1) return 0;
      let kena = 0;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
        const x = r.left + (r.width * (i + 0.5)) / 5, y = y0 + ((y1 - y0) * (j + 0.5)) / 3;
        const h = document.elementFromPoint(x, y);
        if (h && (h === c || c.contains(h))) kena++;
      }
      return kena ? Math.round(y1 - y0) : 0;
    };
    // > 1 = px TERLIHAT di dalam zona (vonis) · <= 1 = jarak ke zona (negatif = di luar, utk "mepet")
    const masukAtas = ATAS - r.top, masukBawah = r.bottom - (innerHeight - BAWAH);
    const atas = masukAtas > 1 ? terlihatDi(Math.max(0, r.top), Math.min(ATAS, r.bottom)) : Math.round(masukAtas);
    const bawah = masukBawah > 1 ? terlihatDi(Math.max(innerHeight - BAWAH, r.top), Math.min(innerHeight, r.bottom)) : Math.round(masukBawah);
    // Masuk zona tapi TERTUTUP (isi tergulir di bawah Header): bukan temuan, bukan mepet — tapi dihitung.
    const tertutup = (masukAtas > 1 && atas === 0) || (masukBawah > 1 && bawah === 0);
    out.push({ nama, atas, bawah, tertutup, nav: !!c.closest('nav') });
  }
  const t = document.createElement('div'); t.style.cssText = 'position:fixed;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'; document.body.append(t);
  const cs = getComputedStyle(t); const env = [parseFloat(cs.paddingTop), parseFloat(cs.paddingBottom)]; t.remove();
  return { out, env, lapisan: dlg ? (dlg.getAttribute('aria-label') || 'dialog') : 'halaman' };
};

const temuan = [], mepet = [], cacat = [];
let populasi = 0, layar = 0, tertutupN = 0;
const b = await chromium.launch();
for (const peran of ['warga', 'bendahara']) {
  const { ctx, page } = await newCtx(b, 'light', { bendahara: peran === 'bendahara' });
  await page.setViewportSize({ width: W, height: H });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: ATAS, bottom: BAWAH, left: 0, right: 0 } });
  if (MUTASI) await ctx.addInitScript((css) => { const p = () => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }; if (document.head) p(); else document.addEventListener('DOMContentLoaded', p); }, MUT_CSS[MUTASI]);
  const catat = async (nama) => {
    await page.waitForTimeout(700);
    const r = await page.evaluate(UKUR, [ATAS, BAWAH]);
    if (r.env[0] !== ATAS || r.env[1] !== BAWAH) { cacat.push(`[${peran}/${nama}] env() terbaca ${r.env} — override safe-area tak menggigit`); return; }
    layar++; populasi += r.out.length;
    for (const k of r.out) {
      if (k.tertutup) { tertutupN++; continue; }
      if (k.atas > 1 || k.bawah > 1) temuan.push(`[${peran}/${nama}] "${k.nama}" ${k.atas > 1 ? `${k.atas}px di zona ATAS` : `${k.bawah}px di zona home indicator`}`);
      // Bar nav SENGAJA rapat di atas home indicator (pola tab bar iOS): 0px itu rancangannya.
      else if (!k.nav && (k.atas > -8 || k.bawah > -8)) mepet.push(`[${peran}/${nama}] "${k.nama}" ${Math.max(k.atas, k.bawah)}px`);
    }
  };
  const buka = async (tab, nama, pemicu) => {
    if (tab) await gotoTab(page, tab);
    const t = pemicu(); if (!(await t.count())) { cacat.push(`[${peran}/${nama}] pemicu tak ada`); return false; }
    await t.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {}); await page.waitForTimeout(300);
    await t.click({ force: true }).catch(() => {}); await page.waitForTimeout(1200);
    if (!(await page.locator('[role="dialog"]').count())) { await t.click({ force: true }).catch(() => {}); await page.waitForTimeout(1300); }
    if (!(await page.locator('[role="dialog"]').count())) { cacat.push(`[${peran}/${nama}] tak terbuka`); return false; }
    await catat(nama); return true;
  };

  await page.goto(APP);
  if (peran === 'warga') { await page.locator('#masuk-warga').waitFor({ timeout: 30000 }); await catat('Login'); await loginWarga(page); }
  else await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);
  const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
  for (const t of tabs) {
    await gotoTab(page, t); await page.waitForTimeout(1200); await catat(t);
    // Gulir ke dasar: FAB & bar nav di posisi akhir halaman.
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight)); await catat(`${t} · dasar`);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  const SHEET = [
    ['Beranda', 'sheet-trx', () => page.locator('main button').filter({ hasText: /Rp[\d.]/ }).last()],
    ['Kas RT', 'sheet-detail-kasrt', () => page.locator('button[aria-label^="Lihat detail"], button[aria-label^="Aksi:"]').first()],
    ['Hadiran', 'sheet-detail-tarikan', () => page.locator('button', { hasText: 'Lihat detail' }).first()],
    ...(peran === 'bendahara' ? [
      ['Hadiran', 'sheet-setor', () => page.getByRole('button', { name: /Setor ke Kas RT/i }).first()],
      ['Kas RT', 'sheet-kasrt', () => page.getByRole('button', { name: /Tambah transaksi Kas RT/i }).first()],
      ['Kas RT', 'sheet-target', () => page.getByRole('button', { name: /Ubah target|Tetapkan Target/i }).first()],
      ['Jadwal', 'sheet-tambah-jadwal', () => page.getByRole('button', { name: /Tambah jadwal tarikan/i }).first()],
    ] : []),
  ];
  for (const [tab, nama, p] of SHEET) if (await buka(tab, nama, p)) await closeLayer(page);
  if (peran === 'bendahara') {
    if (await buka('Jadwal', 'menu-aksi-tarikan', () => page.getByRole('button', { name: /Aksi lainnya tarikan/i }).first())) {
      const rev = page.locator('[role="dialog"] button, [role="menu"] button').filter({ hasText: /Revisi jadwal/i }).first();
      if (await rev.count()) { await rev.click({ force: true }).catch(() => {}); await page.waitForTimeout(1300); await catat('sheet-revisi'); }
      else cacat.push(`[${peran}/sheet-revisi] pemicu tak ada`);
      await closeLayer(page); await closeLayer(page);
    }
  }
  await gotoTab(page, 'Beranda');
  const OVERLAY = peran === 'warga' ? ['Riwayat Aktivitas', 'Tentang Aplikasi'] : ['Kelola Anggota', 'Tutup Buku Triwulan', 'Riwayat Aktivitas'];
  for (const o of OVERLAY) {
    if (!(await openMenuItem(page, o))) { cacat.push(`[${peran}/${o}] tak terbuka`); continue; }
    await page.waitForTimeout(1500); await catat(o);
    if (o === 'Kelola Anggota') {
      const tbh = page.getByRole('button', { name: /Tambah [Aa]nggota/ }).first();
      if (await tbh.count()) { await tbh.click({ force: true }).catch(() => {}); await page.waitForTimeout(1200); await catat('sheet-anggota'); await closeLayer(page); }
      else cacat.push(`[${peran}/sheet-anggota] pemicu tak ada`);
    }
    await closeLayer(page);
  }
  for (const m of await jelajahKartuWarga(page, (fase) => catat(`Kartu Warga · ${fase}`))) cacat.push(`[${peran}] ${m}`);
  await ctx.close();
}
await b.close();

console.log(`\n=== TEPI AMAN: ${populasi} kontrol tetap diperiksa di ${layar} layar · zona atas ${ATAS}px · zona bawah ${BAWAH}px · di zona ${temuan.length} · mepet ${mepet.length} · tertutup chrome (dimaafkan) ${tertutupN}${MUTASI ? ` · MUTASI=${MUTASI}` : ''} ===`);
temuan.forEach((t) => console.log('  ✗ ' + t));
if (mepet.length) { console.log('  ── mepet (< 8px, tak divonis) ──'); mepet.forEach((t) => console.log('    ' + t)); }
cacat.forEach((c) => console.log('  PROBE CACAT ' + c));
if (!populasi) { console.log('PROBE CACAT: populasi kosong'); process.exit(2); }
if (MUTASI && !temuan.length) { console.log(`PROBE CACAT: MUTASI=${MUTASI} tapi nol temuan — probe tak menggigit.`); process.exit(2); }
if (cacat.length) process.exit(2);
process.exit(temuan.length ? 1 : 0);
