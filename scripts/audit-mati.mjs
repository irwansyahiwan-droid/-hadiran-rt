/* Audit KEADAAN NONAKTIF — keterbacaan label tombol saat `disabled`.
 *
 * ── KENAPA SAPUAN INI ADA ─────────────────────────────────────────────────
 * Dua audit kontras yang sudah ada MELEWATI keadaan ini secara eksplisit:
 *   audit-kontras.mjs:33        `if (el.disabled || el.closest('[disabled]')) return`
 *   audit-kontras-nonteks.mjs:88 `const mati = (el) => !!(el.disabled || …)`
 * Alasannya sah — WCAG 1.4.3 memang MENGECUALIKAN kontrol nonaktif. Tapi
 * "tak wajib" bukan "boleh tak terbaca", dan pengecualian itu berarti keadaan
 * nonaktif tak pernah diukur SEKALI PUN di repo ini.
 *
 * Yang tersembunyi di balik lubang itu sudah terbukti dua kali:
 *   1. `.btn-brand` + `disabled:opacity-*` → label putih 2,34:1 (temuan lama,
 *      sudah diperbaiki lewat aturan `.btn-brand:disabled` di index.css).
 *   2. Tombol "Masuk sebagai Bendahara" → 3,87:1 saat "Memproses…", yaitu
 *      SETIAP kali bendahara menekan masuk. Perbaikan (1) tak pernah sampai ke
 *      sana karena tombol itu bukan `.btn-brand`.
 *
 * ── AMBANG: MILIK APP, BUKAN WCAG ─────────────────────────────────────────
 * Sengaja dilaporkan sebagai ambang APP (4,5:1 / 3:1 utk teks besar), BUKAN
 * "gagal WCAG" — persis disiplin yang dipakai bagian teks-200% di audit:reflow.
 * Menyebut ini pelanggaran WCAG akan salah, dan sekali alat berteriak palsu,
 * seluruh temuannya berhenti dipercaya.
 *
 * ── CARA UKUR: PIKSEL NYATA, BUKAN HITUNG TOKEN ───────────────────────────
 * `opacity` mengomposit SELURUH tombol (fill + label sekaligus) ke apa pun di
 * belakangnya, jadi warna akhir keduanya tak ada di token mana pun. Karena itu
 * keduanya diambil dari SCREENSHOT, dari SATU kisi rapat di dalam kotak teks:
 *   fill  = MODUS kisi (latar di balik huruf selalu warna terbanyak di situ)
 *   glyph = sampel terjauh dari fill, setelah 2% ekor terjauh dibuang (ekor itu
 *           antialias sub-piksel, bukan inti huruf)
 * Semua tombol dipaksa `disabled` serempak lalu ditunggu transisinya mengendap
 * — mengukur di tengah transisi pernah memberi opacity 0,788 (bukan 0,6) dan
 * angka yang terlalu optimis.
 *
 * Panel "Masuk sebagai Bendahara" di Login WAJIB dibuka dulu: ia tertutup
 * secara default, dan tombol submit di dalamnya justru temuan yang MELAHIRKAN
 * sapuan ini. Alat yang tak menjangkau kasus pendirinya sendiri tak berguna.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ratio, dist, modusBg, newCtx, loginWarga, gotoTab, closeLayer, openMenuItem } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = process.env.OUT_DIR || '.audit-mati';
const ONLY = process.env.ONLY; // 'warga' | 'bendahara'
mkdirSync(OUT, { recursive: true });

const AA_KECIL = 4.5;
const AA_BESAR = 3.0;   // ≥24px, atau ≥18.66px bold
const hasil = [];

/** Kumpulkan tombol + kotak teksnya, SESUDAH semua dipaksa nonaktif.
 *
 *  HANYA tombol yang gayanya BENAR-BENAR BERUBAH saat nonaktif. Versi pertama
 *  alat ini menyapu semua tombol dan melaporkan label bottom-nav & baris daftar
 *  warga sebagai "gagal" — padahal keduanya tak punya gaya `disabled` sama
 *  sekali, jadi yang terukur cuma kontras normalnya (wilayah audit:kontras,
 *  yang sudah bersih). Subjek sapuan ini adalah SELISIH nonaktif; tombol tanpa
 *  selisih memang bukan urusannya. Ini false-positive ke-9 di repo ini, dan
 *  polanya sama seperti delapan sebelumnya: alat mengukur hal yang benar pada
 *  populasi yang salah. */
async function kumpulkan(page) {
  return page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll('button, [role="button"]')) {
      const cs = getComputedStyle(b);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const pra = b.__praMati;
      if (!pra) continue; // tak pernah aktif → tak punya "sebelum" utk dibandingkan
      const berubah =
        pra.opacity !== cs.opacity ||
        pra.color !== cs.color ||
        pra.backgroundColor !== cs.backgroundColor ||
        pra.backgroundImage !== cs.backgroundImage;
      if (!berubah) continue;
      const r = b.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      /* Tombol harus benar-benar yang teratas di titik itu — kalau tidak, sampel
         piksel mengambil sheet/scrim di atasnya & melaporkan kontras asing. */
      const hit = document.elementFromPoint(
        Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2)),
        Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2)),
      );
      if (!hit || (!b.contains(hit) && !hit.contains(b))) continue;

      // elemen terdalam yang memuat text node langsung = kotak glyph
      let teks = null;
      const walk = (el) => {
        for (const c of el.children) walk(c);
        if (teks) return;
        let t = '';
        for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent;
        if (t.trim().length >= 2) teks = el;
      };
      walk(b);
      if (!teks) continue;
      const tr = teks.getBoundingClientRect();
      if (tr.width < 8 || tr.height < 6) continue;
      const tcs = getComputedStyle(teks);
      const px = parseFloat(tcs.fontSize);
      const bold = (+tcs.fontWeight || 400) >= 700;
      out.push({
        nama: teks.textContent.trim().slice(0, 30),
        besar: px >= 24 || (px >= 18.66 && bold),
        opacity: +cs.opacity,
        tag: b.tagName.toLowerCase() + (typeof b.className === 'string' ? '.' + b.className.split(' ').slice(0, 2).join('.') : ''),
        btn: { x: r.x, y: r.y, w: r.width, h: r.height },
        txt: { x: tr.x, y: tr.y, w: tr.width, h: tr.height },
      });
    }
    return out;
  });
}

async function ambilPiksel(page, b64, pts) {
  return page.evaluate(async ({ b64, pts }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const s = img.width / innerWidth;
    return pts.map(([x, y]) => {
      const px = Math.min(img.width - 1, Math.max(0, Math.round(x * s)));
      const py = Math.min(img.height - 1, Math.max(0, Math.round(y * s)));
      const d = g.getImageData(px, py, 1, 1).data;
      return [d[0], d[1], d[2]];
    });
  }, { b64, pts });
}

async function ukurView(page, ctxName) {
  // 1. rekam gaya SAAT AKTIF, lalu paksa nonaktif & tunggu transisinya mengendap
  await page.evaluate(() => {
    window.__mati = [];
    for (const b of document.querySelectorAll('button')) {
      if (b.disabled) continue;
      const cs = getComputedStyle(b);
      b.__praMati = {
        opacity: cs.opacity, color: cs.color,
        backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage,
      };
      window.__mati.push(b);
      b.disabled = true;
    }
  });
  await page.waitForTimeout(600);

  const items = await kumpulkan(page);
  if (items.length) {
    const shot = (await page.screenshot({ type: 'png' })).toString('base64');
    const pts = [];
    for (const it of items) {
      /* SATU kisi rapat di dalam kotak teks saja — fill DAN glyph dibaca dari
         kisi yang sama. Versi pertama mengambil fill dari padding tombol
         (kiri/kanan kotak teks); di baris daftar, padding itu ditempati AVATAR,
         jadi rasio yang dilaporkan adalah avatar-lawan-latar, bukan huruf-lawan-
         fill — biang temuan palsu "1:1". Latar di BALIK huruf selalu warna
         terbanyak di kotak teks, jadi modus kisi ini fill yang sebenarnya. */
      const g0 = pts.length; let n = 0;
      for (let gx = 1; gx < it.txt.w - 1; gx += 2) {
        for (let gy = 1; gy < it.txt.h - 1; gy += 2) { pts.push([it.txt.x + gx, it.txt.y + gy]); n++; }
      }
      it._glyph = [g0, n];
    }
    const px = await ambilPiksel(page, shot, pts);
    for (const it of items) {
      const glyphs = px.slice(it._glyph[0], it._glyph[0] + it._glyph[1]);
      if (glyphs.length < 8) continue;
      const modus = modusBg(glyphs, null);
      if (!modus || !modus.length) continue;
      const fill = modus[0];
      /* Glyph = sampel terjauh dari fill, TAPI abaikan 15% ekor terjauh: itu
         antialias sub-piksel & bayangan teks yang tak pernah jadi inti huruf,
         dan memakainya membuat rasio terlihat lebih baik dari yang dibaca mata. */
      const urut = glyphs.map((g) => [dist(g, fill), g]).sort((a, b) => b[0] - a[0]);
      const glyph = urut[Math.min(urut.length - 1, Math.floor(urut.length * 0.02))][1];
      if (dist(glyph, fill) < 12) continue; // kotak teks polos (glyph tak terjaring)
      const cr = ratio(glyph, fill);
      const amb = it.besar ? AA_BESAR : AA_KECIL;
      hasil.push({ ctx: ctxName, nama: it.nama, tag: it.tag, opacity: +it.opacity.toFixed(2), cr: +cr.toFixed(2), amb, gagal: cr < amb });
    }
  }

  // 2. kembalikan seperti semula — layar berikutnya tak boleh mewarisi nonaktif
  await page.evaluate(() => { for (const b of window.__mati || []) b.disabled = false; window.__mati = []; });
  await page.waitForTimeout(250);
}

async function ukurPage(page, nama) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 620) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(320);
    await ukurView(page, nama);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  if (!ONLY || ONLY === 'warga') {
    const { ctx, page } = await newCtx(browser, theme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    /* Buka panel bendahara — tombol submit di dalamnya adalah kasus yang
       melahirkan sapuan ini (3,87:1 saat "Memproses…"). Tanpa ini, alat lolos
       justru pada temuan yang mendirikannya. */
    const pemicu = page.locator('button', { hasText: /bendahara/i }).first();
    if (await pemicu.count()) { await pemicu.click({ force: true }); await page.waitForTimeout(700); }
    await ukurPage(page, `${theme}/login`);
    if (await loginWarga(page)) {
      await page.waitForTimeout(3000);
      const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
      for (const t of tabs) { await gotoTab(page, t); await ukurPage(page, `${theme}/w-${t}`); }
    } else console.log(`[${theme}] GAGAL login warga`);
    await ctx.close();
  }

  if (!ONLY || ONLY === 'bendahara') {
    const { ctx, page } = await newCtx(browser, theme, { bendahara: true });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    if (!(await page.locator('nav button').count())) console.log(`[${theme}] GAGAL mock bendahara`);
    else {
      const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
      for (const t of tabs) { await gotoTab(page, t); await ukurPage(page, `${theme}/b-${t}`); }
      for (const [tab, aria, nama] of [
        ['Hadiran', 'Setor ke Kas RT', 'b-sheet-setor'],
        ['Kas RT', 'Tambah transaksi Kas RT', 'b-sheet-kasrt'],
      ]) {
        await gotoTab(page, tab);
        const fab = page.getByRole('button', { name: aria });
        if (!(await fab.count())) continue;
        await fab.click();
        await page.waitForTimeout(1000);
        if (await page.locator('[role="dialog"]').count()) { await ukurView(page, `${theme}/${nama}`); await closeLayer(page); }
      }
      for (const [label, nama] of [['Kelola Anggota', 'b-anggota'], ['Riwayat Aktivitas', 'b-riwayat']]) {
        if (await openMenuItem(page, label)) {
          await page.waitForTimeout(900);
          await ukurView(page, `${theme}/${nama}`);
          await page.goBack();
          await page.waitForTimeout(900);
        }
      }
    }
    await ctx.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/hasil.json`, JSON.stringify(hasil, null, 1));

/* Satu tombol muncul di banyak layar/scroll — laporkan kasus TERBURUK per label
   supaya daftar tak dibanjiri duplikat yang sama. */
const perNama = new Map();
for (const h of hasil) {
  const k = `${h.nama}|${h.tag}`;
  if (!perNama.has(k) || perNama.get(k).cr > h.cr) perNama.set(k, h);
}
const uniq = [...perNama.values()];
const gagal = uniq.filter((h) => h.gagal).sort((a, b) => a.cr - b.cr);

console.log(`\n=== LABEL TOMBOL SAAT NONAKTIF @360px — ${hasil.length} sampel, ${uniq.length} tombol unik ===`);
console.log(`  Ambang APP (WCAG 1.4.3 mengecualikan kontrol nonaktif): 4,5:1 / 3:1 teks besar`);
console.log(`  di bawah ambang: ${gagal.length}`);
for (const h of gagal) console.log(`  ✗ ${h.cr}:1 (amb ${h.amb}) op=${h.opacity} [${h.ctx}] "${h.nama}" <${h.tag}>`);
process.exit(gagal.length ? 1 : 0);
