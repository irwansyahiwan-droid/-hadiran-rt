// Audit LEBAR nominal di 360px: apakah angka rupiah terpotong / bikin halaman geser?
//
// Kenapa ada: acuan terkecil app = 360px, dan setiap pass "wajah angka" (Inter → Sora)
// menambah lebar glyph. Verifikasi WAJIB ukur DOM lawan `vite preview` (bukan dev
// server, bukan hitung token). Lapor 3 hal:
//   1. halaman geser samping (documentElement.scrollWidth > innerWidth)
//   2. elemen ber-"Rp" yang scrollWidth > clientWidth (terpotong / ellipsis aktif)
//   3. elemen ber-"Rp" yang melewati tepi viewport
//
// False-positive yang sudah dikenal (jangan dikejar):
//   - slide BannerCarousel di tepi ("Rp20.530.000" x=309): kartu tetangga memang
//     duduk sebagian di luar viewport, bukan kartu aktif.
//   - chip 3-kolom hero Beranda ("Rp4.485.000", clamp 11.52px): melewati content-box
//     kolomnya 1–2px tapi tak menabrak divider; sudah pas secara visual di 360px.
//
// Bendahara di-MOCK aman, identik audit-kontras-deep.mjs: sesi palsu + paksa anon
// utk read + semua method tulis diblokir di level Playwright. Interaksi hanya buka
// halaman/sheet + Escape/back — tak ada klik Simpan/Hapus.
//
//   npx vite build && npx vite preview --port 5174   (terminal lain)
//   node scripts/audit-lebar-nominal.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = process.env.OUT_DIR || '.';
const W = +(process.env.W || 360);
mkdirSync(OUT, { recursive: true });

const env = readFileSync(new globalThis.URL('../.env', import.meta.url), 'utf8');
const SUPA_URL = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
const REF = SUPA_URL.match(/https:\/\/([^.]+)\./)[1];

const findings = [];

async function measure(page, ctxName) {
  const res = await page.evaluate((ctxName) => {
    const out = { ctx: ctxName, pageW: document.documentElement.scrollWidth, viewW: innerWidth, items: [] };
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      let txt = '';
      for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent;
      txt = txt.trim();
      if (!/Rp\s?[\d.]/.test(txt)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.4) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 6) continue;
      // BannerCarousel = kartu bertumpuk 3D: slide tetangga memang duduk di luar
      // viewport. Hanya nilai elemen yang PUSATNYA terlihat yang bisa dinilai.
      const cx = r.x + r.width / 2;
      if (cx < 0 || cx > innerWidth) continue;
      // Slide tetangga yang cuma "mengintip" di tepi masih lolos uji pusat, tapi
      // tertutup kartu aktif → uji oklusi (pola sama audit-kontras-deep.mjs).
      const hit = document.elementFromPoint(
        Math.min(innerWidth - 1, Math.max(0, cx)),
        Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2)),
      );
      if (!hit || (!el.contains(hit) && !hit.contains(el))) continue;
      // <span> inline punya clientWidth 0 → scrollWidth tak bisa dipakai. Uji
      // tepi nyata: apakah kotak teks melewati content-box leluhur blok terdekat?
      let bleed = 0;
      let par = el.parentElement;
      while (par && par !== document.body) {
        const pcs = getComputedStyle(par);
        if (pcs.display !== 'inline' && par.clientWidth > 0) {
          const pr = par.getBoundingClientRect();
          const padR = parseFloat(pcs.paddingRight) || 0;
          const padL = parseFloat(pcs.paddingLeft) || 0;
          bleed = Math.round(Math.max(r.right - (pr.right - padR), (pr.left + padL) - r.left));
          break;
        }
        par = par.parentElement;
      }
      const clip = el.scrollWidth - el.clientWidth;
      const overflowRight = Math.round(r.right - innerWidth);
      const overflowLeft = Math.round(-r.left);
      if (clip > 1 || overflowRight > 0 || overflowLeft > 0 || bleed > 1) {
        out.items.push({
          text: txt.slice(0, 40),
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 90),
          clip,
          overflowRight,
          overflowLeft,
          font: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          size: parseFloat(cs.fontSize),
        });
      }
    }
    return out;
  }, ctxName);

  if (res.pageW > res.viewW + 1) {
    findings.push({ ctx: ctxName, kind: 'halaman-geser', detail: `scrollWidth ${res.pageW} > ${res.viewW}` });
  }
  for (const it of res.items) findings.push({ ctx: ctxName, kind: 'nominal', ...it });
  const n = res.items.length + (res.pageW > res.viewW + 1 ? 1 : 0);
  console.log(`  ${n === 0 ? 'ok' : `⚠ ${n} temuan`}  ${ctxName}`);
}

async function measurePage(page, ctxName) {
  await measure(page, `${ctxName}#atas`);
  for (let i = 1; i <= 4; i++) {
    const more = await page.evaluate(() => {
      const before = scrollY;
      scrollBy(0, innerHeight * 0.85);
      return scrollY > before;
    });
    if (!more) break;
    await page.waitForTimeout(600);
    await measure(page, `${ctxName}#gulir${i}`);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
}

function fakeSession() {
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: '00000000-0000-4000-8000-0000000000aa', role: 'authenticated', aud: 'authenticated', exp: 4102444800, email: 'audit@lokal' })}.x`;
  return {
    access_token: jwt,
    token_type: 'bearer',
    expires_in: 3600 * 24 * 365,
    expires_at: 4102444800,
    refresh_token: 'audit-refresh',
    user: {
      id: '00000000-0000-4000-8000-0000000000aa',
      aud: 'authenticated',
      email: 'audit@lokal',
      app_metadata: { provider: 'email' },
      user_metadata: { role: 'bendahara' },
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

async function newCtx(browser, { bendahara = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await ctx.addInitScript(({ b, ref, sess }) => {
    try {
      localStorage.setItem('hadiran-theme', 'light');
      localStorage.setItem('hadiran-welcome-v2', '1');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess));
    } catch {}
  }, { b: bendahara, ref: REF, sess: fakeSession() });

  if (bendahara) {
    await ctx.route('**/rest/v1/**', (route) => {
      const req = route.request();
      const m = req.method();
      const isRead = m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || (m === 'POST' && req.url().includes('/rpc/'));
      if (!isRead) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"audit: tulis diblokir"}' });
      const headers = { ...req.headers(), authorization: `Bearer ${ANON}`, apikey: ANON };
      return route.continue({ headers });
    });
    await ctx.route('**/auth/v1/**', (route) => {
      const req = route.request();
      if (req.url().includes('/logout')) return route.fulfill({ status: 204, body: '' });
      if (req.url().includes('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession().user) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession()) });
    });
  }
  const page = await ctx.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 150)));
  return { ctx, page };
}

async function loginWarga(page) {
  const pw = page.locator('#warga-password');
  await pw.waitFor({ timeout: 15000 });
  await pw.click();
  await pw.pressSequentially('warga', { delay: 60 });
  await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(700);
    if ((await page.locator('nav button', { hasText: 'Beranda' }).count()) > 0) return true;
  }
  return false;
}

async function gotoTab(page, label) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('nav button', { hasText: label }).first().click({ force: true, timeout: 8000 })
    .catch(() => page.locator('nav button', { hasText: label }).first().evaluate((el) => el.click()));
  await page.waitForTimeout(3500);
}

async function closeLayer(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  if (await page.locator('[role="dialog"]').count()) {
    await page.goBack();
    await page.waitForTimeout(800);
  }
}

async function openRowSheet(page, name) {
  const rows = page.locator('main button').filter({ hasText: /Rp[\d.]/ });
  const n = await rows.count();
  for (let i = n - 1; i >= 0; i--) {
    await rows.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await page.waitForTimeout(350);
    await rows.nth(i).click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
    if (await page.locator('[role="dialog"]').count()) {
      await measure(page, name);
      await closeLayer(page);
      return true;
    }
  }
  console.log(`  (lewati ${name} — tak ada baris yang membuka sheet)`);
  return false;
}

async function openMenuItem(page, itemLabel) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(600);
  const item = page.getByRole('menu').getByText(itemLabel, { exact: false });
  if (!(await item.count())) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); return false; }
  await item.first().click();
  await page.waitForTimeout(1500);
  return true;
}

const browser = await chromium.launch();
const ONLY = process.env.ONLY;

// ── WARGA ────────────────────────────────────────────────────────────────
if (!ONLY || ONLY === 'warga') {
  console.log(`\n[warga @ ${W}px]`);
  const { ctx, page } = await newCtx(browser);
  await page.goto(URL, { waitUntil: 'networkidle' });
  if (!(await loginWarga(page))) { console.log('GAGAL login warga'); }
  else {
    await page.waitForTimeout(3500);
    await measurePage(page, 'w-Beranda');
    await openRowSheet(page, 'w-sheet-trx');
    for (const tab of ['Jadwal', 'Hadiran', 'Kas RT']) {
      await gotoTab(page, tab);
      await measurePage(page, `w-${tab}`);
    }
    await openRowSheet(page, 'w-sheet-kasrt');
  }
  await ctx.close();
}

// ── BENDAHARA (mock read-only) ───────────────────────────────────────────
if (!ONLY || ONLY === 'bendahara') {
  console.log(`\n[bendahara @ ${W}px]`);
  const { ctx, page } = await newCtx(browser, { bendahara: true });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  if (!(await page.locator('nav button').count())) {
    console.log('GAGAL mock bendahara — masih di login?');
  } else {
    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    console.log('  tab:', JSON.stringify(tabs));
    for (const tab of tabs) {
      await gotoTab(page, tab);
      await measurePage(page, `b-${tab}`);
    }
    await gotoTab(page, 'Kas RT');
    await openRowSheet(page, 'b-sheet-kasrt');
    for (const [label, name] of [
      ['Tutup Buku Triwulan', 'b-laporan'],
      ['Riwayat Aktivitas', 'b-riwayat'],
      ['Kelola Anggota', 'b-anggota'],
    ]) {
      if (await openMenuItem(page, label)) {
        await measurePage(page, name);
        await page.goBack();
        await page.waitForTimeout(900);
      }
    }
  }
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/hasil-lebar.json`, JSON.stringify(findings, null, 1));
console.log(`\n=== TEMUAN: ${findings.length} @ ${W}px ===`);
for (const f of findings) {
  if (f.kind === 'halaman-geser') console.log(`[${f.ctx}] HALAMAN GESER — ${f.detail}`);
  else console.log(`[${f.ctx}] "${f.text}" clip=${f.clip} kanan=${f.overflowRight} kiri=${f.overflowLeft} ${f.font} ${f.size}px <${f.tag}> .${f.cls}`);
}
