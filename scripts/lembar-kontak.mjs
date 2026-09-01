// LEMBAR KONTAK — potret SETIAP layar app dalam satu PNG berlabel.
//
// Kenapa alat ini ada: selama ini tiap layar dinilai SATU PER SATU. Yang tak
// pernah terlihat begitu adalah ketidakselarasan ANTAR layar — dua halaman yang
// masing-masing terasa benar, tapi berdampingan langsung ketahuan bicara dengan
// dua suara. Perusahaan besar menilai semua layar sekaligus justru untuk itu.
//
// Alat ini TIDAK memvonis apa pun. Ia cuma menyusun bukti supaya mata manusia
// yang menilai — sengaja tanpa exit code non-nol, karena "tidak selaras" bukan
// sesuatu yang bisa diambang-kan.
//
// Login & navigasi memakai harness bersama (`scripts/lib/audit-harness.mjs`) —
// pelajaran ke-24 di CLAUDE.md: tiga belas sapuan pernah menyalin alur login
// sendiri, lalu MATI serentak waktu satu kait UI berubah.
//
// Keadaan KOSONG & MEMUAT dipaksa dgn mekanisme yang sama seperti
// `audit:keadaan`: tiap GET rest/v1 dibalas `[]`, atau ditahan supaya kerangka
// yang tertangkap. Tulis DIBLOKIR (403) di kedua mode — jangan pernah menyentuh
// data produksi dari sapuan.
//
//   npm run lembar-kontak
//   BAGIAN=normal|kosong|memuat|gagal|luring  — batasi (default: semuanya)
//
// Keluaran: .lembar-kontak/lembar.png (+ potret satuan di folder yang sama).

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { newCtx, loginWarga, gotoTab, openMenuItem, fakeSession, REF, ANON } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const OUT = '.lembar-kontak';
const BAGIAN = process.env.BAGIAN ? [process.env.BAGIAN] : ['normal', 'kosong', 'memuat', 'gagal', 'luring'];
mkdirSync(OUT, { recursive: true });

const TAB_W = ['Beranda', 'Jadwal', 'Hadiran', 'Kas RT'];
const TAB_B = ['Beranda', 'Jadwal', 'Talangan', 'Hadiran', 'Kas RT'];
/* Riwayat Aktivitas dibuka untuk WARGA 1 Sep 2026 (transparansi: siapa
   bendahara yg mengubah data kas). Sampai hari itu ia cuma ada di OVERLAY_B,
   jadi lembar kontak — alat yang tugasnya justru "lihat SEMUA layar
   berdampingan" — tak pernah memuat satu pun tampilan warganya. Kelas titik
   buta yang sama dgn `audit:masuk` yg mati 8 hari: POPULASI tak ikut
   diperbarui saat sebuah permukaan berpindah peran. Kalau nanti ada overlay
   lain dibuka ke warga, ia WAJIB masuk daftar ini di hari yang sama. */
const OVERLAY_W = ['Riwayat Aktivitas'];
const OVERLAY_B = ['Kelola Anggota', 'Riwayat Aktivitas'];

/* Overlay dulu cuma dipotret saat `normal`, jadi keadaan pinggirnya tak pernah
   terlihat sekali pun — padahal justru di situ app tercepat terasa murah, dan
   Riwayat kini dibaca warga awam, bukan cuma bendahara yg paham datanya.
   `memuat` SENGAJA di luar: saat semua request digantung, menu Header belum
   tentu siap diketuk, dan yang terpotret jadi menunya sendiri — bukan
   overlaynya. Lebih baik mengaku tak mengukur daripada memotret hal lain. */
const MODE_OVERLAY = [null, 'kosong', 'gagal'];

const shots = [];   // { grup, label, b64 }
const ambil = async (page, grup, label) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(450);
  const b64 = (await page.screenshot()).toString('base64');
  shots.push({ grup, label, b64 });
  writeFileSync(`${OUT}/${grup}__${label.replace(/[^\w-]+/g, '-')}.png`, Buffer.from(b64, 'base64'));
  process.stdout.write('.');
};

/** Tahan/kosongkan rest/v1. `mode`: 'kosong' | 'memuat' | null */
async function pasangMode(ctx, mode, bendahara) {
  if (!mode) return;
  await ctx.route('**/rest/v1/**', async (route) => {
    const m = route.request().method();
    /* Tulis DIBLOKIR di semua mode — sapuan tak boleh menyentuh data asli. */
    if (m !== 'GET' && m !== 'HEAD') {
      return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"lembar-kontak: tulis diblokir"}' });
    }
    /* 25 dtk: cukup lama supaya kerangka tetap terpasang saat dipotret (~1 dtk
       sesudah pindah tab), cukup pendek supaya `ctx.close()` tak menggantung
       menunggu handler rute yang masih tidur. */
    if (mode === 'gagal') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"lembar-kontak: gagal muat"}' });
    if (mode === 'memuat') await new Promise((r) => setTimeout(r, 25_000));
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' });
  });
  if (bendahara) {
    await ctx.route('**/auth/v1/**', (route) => {
      const u = route.request().url();
      if (u.includes('/logout')) return route.fulfill({ status: 204, body: '' });
      if (u.includes('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession().user) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession()) });
    });
  }
}

const browser = await chromium.launch();

for (const bagian of BAGIAN) {
  const mode = bagian === 'normal' ? null : bagian;
  /* KOSONG & MEMUAT hanya tema TERANG: dua tema di sana melipatgandakan ubin
     tanpa menambah pertanyaan baru — yang diperiksa BENTUK keadaannya, bukan
     paletnya (palet sudah punya empat sapuan kontras sendiri). */
  const tema = bagian === 'normal' ? ['light', 'dark'] : ['light'];
  if (bagian === 'luring') continue;   // ditangani blok tersendiri di bawah (service worker HIDUP)

  for (const t of tema) {
    // ── LOGIN ──
    if (!mode) {
      const { ctx, page } = await newCtx(browser, t, {});
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await page.locator('#masuk-warga').waitFor({ timeout: 15000 });
      await page.waitForTimeout(2200);
      await ambil(page, `${bagian}-${t}`, 'Login');
      await ctx.close();
    }

    // ── WARGA ──
    {
      const { ctx, page } = await newCtx(browser, t, {});
      await pasangMode(ctx, mode, false);
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      const masuk = await loginWarga(page).catch(() => false);
      if (masuk) {
        for (const tab of TAB_W) {
          if (mode === 'memuat') { await page.locator('nav button', { hasText: tab }).first().click({ force: true }).catch(() => {}); await page.waitForTimeout(900); }
          else await gotoTab(page, tab);
          await ambil(page, `${bagian}-${t}`, `warga · ${tab}`);
        }
        if (MODE_OVERLAY.includes(mode)) {
          for (const label of OVERLAY_W) {
            if (await openMenuItem(page, label)) {
              await ambil(page, `${bagian}-${t}`, `warga · ${label}`);
              await page.keyboard.press('Escape'); await page.waitForTimeout(700);
            }
          }
        }
      } else process.stdout.write('!');
      await ctx.close();
    }

    // ── BENDAHARA ──
    {
      const { ctx, page } = await newCtx(browser, t, { bendahara: true });
      await pasangMode(ctx, mode, true);
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(mode === 'memuat' ? 2500 : 7000);
      for (const tab of TAB_B) {
        if (mode === 'memuat') { await page.locator('nav button', { hasText: tab }).first().click({ force: true }).catch(() => {}); await page.waitForTimeout(900); }
        else await gotoTab(page, tab);
        await ambil(page, `${bagian}-${t}`, `bendahara · ${tab}`);
      }
      if (MODE_OVERLAY.includes(mode)) {
        for (const label of OVERLAY_B) {
          if (await openMenuItem(page, label)) {
            await ambil(page, `${bagian}-${t}`, `bendahara · ${label}`);
            await page.keyboard.press('Escape'); await page.waitForTimeout(700);
          }
        }
      }
      await ctx.close();
    }
  }
}
/* ── LURING: satu-satunya bagian yang membiarkan service worker HIDUP ──────
   Semua sapuan lain memakai `serviceWorkers: 'block'` demi hasil stabil, dan
   justru itu titik butanya: jalur luring memakai KODE BERBEDA (shell dari
   cache, Supabase sengaja dilewati sw.js). Urutannya wajib: daftar SW saat
   ONLINE dulu, pastikan ia MENGONTROL halaman, baru putus jaringan — kalau
   tidak, yang terpotret cuma layar kosong dan itu bukan keadaan luring app. */
if (BAGIAN.includes('luring')) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await ctx.addInitScript(() => { try { localStorage.setItem('hadiran-welcome-v2', '1'); localStorage.setItem('hadiran-theme', 'light'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await loginWarga(page).catch(() => false);
  await page.waitForTimeout(4500);
  const dikontrol = await page.evaluate(() => !!navigator.serviceWorker?.controller);
  if (!dikontrol) {
    console.log('\n  ! PROBE CACAT: service worker tak mengontrol halaman — bagian luring dilewati');
  } else {
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(8000);
    await ambil(page, 'luring-light', 'warga · sesudah reload');
    for (const tab of TAB_W.slice(1)) {
      await page.locator('nav button', { hasText: tab }).first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(1400);
      await ambil(page, 'luring-light', `warga · ${tab}`);
    }
  }
  await ctx.close();
}
process.stdout.write('\n');

/* ── susun jadi satu lembar ──────────────────────────────────────────────── */
const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const grup = [...new Set(shots.map((s) => s.grup))];
const png = await p.evaluate(async ({ shots, grup }) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const imgs = await Promise.all(shots.map((s) => load(s.b64)));
  const TW = 236, TH = Math.round(TW * (844 / 390));      // ubin, rasio layar asli
  const GAP = 14, PAD = 34, LBL = 26, HEAD = 46, KOL = 8;

  let tinggi = 78;
  const tata = [];
  for (const g of grup) {
    const idx = shots.map((s, i) => (s.grup === g ? i : -1)).filter((i) => i >= 0);
    tinggi += HEAD;
    const baris = Math.ceil(idx.length / KOL);
    for (let k = 0; k < idx.length; k++) {
      tata.push({ i: idx[k], x: PAD + (k % KOL) * (TW + GAP), y: tinggi + Math.floor(k / KOL) * (TH + LBL + GAP) });
    }
    tinggi += baris * (TH + LBL + GAP) + 16;
  }

  const c = document.createElement('canvas');
  c.width = PAD * 2 + KOL * TW + (KOL - 1) * GAP;
  c.height = tinggi + 20;
  const g2 = c.getContext('2d');
  g2.fillStyle = '#0B0F0D'; g2.fillRect(0, 0, c.width, c.height);
  g2.fillStyle = '#F5F7F6'; g2.font = '700 34px system-ui'; g2.textBaseline = 'top';
  g2.fillText('Hadiran RT — lembar kontak', PAD, 26);

  let y = 78;
  for (const gr of grup) {
    const idx = shots.map((s, i) => (s.grup === gr ? i : -1)).filter((i) => i >= 0);
    g2.fillStyle = '#7FD1A4'; g2.font = '600 24px system-ui';
    g2.fillText(gr.toUpperCase().replace('-', ' · '), PAD, y + 8);
    y += HEAD + Math.ceil(idx.length / KOL) * (TH + LBL + GAP) + 16;
  }
  for (const t of tata) {
    g2.drawImage(imgs[t.i], t.x, t.y, TW, TH);
    g2.strokeStyle = '#33443B'; g2.lineWidth = 1.5;
    g2.strokeRect(t.x - 0.75, t.y - 0.75, TW + 1.5, TH + 1.5);
    g2.fillStyle = '#A9C2B4'; g2.font = '500 15px system-ui';
    g2.fillText(shots[t.i].label, t.x, t.y + TH + 6);
  }
  return c.toDataURL('image/png').split(',')[1];
}, { shots, grup });

writeFileSync(`${OUT}/lembar.png`, Buffer.from(png, 'base64'));
console.log(`\n=== ${shots.length} layar · ${grup.length} bagian → ${OUT}/lembar.png ===`);
for (const g of grup) console.log(`  ${g.padEnd(16)} ${shots.filter((s) => s.grup === g).length} layar`);
await browser.close();
