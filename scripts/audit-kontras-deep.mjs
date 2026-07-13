// Audit kontras piksel LANJUTAN: sheet/modal warga, SEMUA permukaan bendahara,
// dan landing /info. Pelengkap scripts/audit-kontras.mjs (permukaan tab warga).
//
// Bendahara di-MOCK 3 lapis aman (tanpa kredensial, tanpa sentuh data):
//   1. Sesi palsu di localStorage sb-<ref>-auth-token (user_metadata.role=bendahara)
//   2. Semua request rest/v1 dipaksa Authorization anon (read publik jalan)
//   3. Method tulis (PATCH/PUT/DELETE/POST insert) DIBLOKIR di level Playwright
// Interaksi hanya: buka sheet/halaman + Escape/back. Tak ada klik Simpan/Hapus.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = process.env.OUT_DIR || '.';
mkdirSync(OUT, { recursive: true });

const env = readFileSync(new globalThis.URL('../.env', import.meta.url), 'utf8');
const SUPA_URL = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
const REF = SUPA_URL.match(/https:\/\/([^.]+)\./)[1];

// ── util kontras (identik audit-kontras.mjs) ───────────────────────────────
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

async function collectTexts(page) {
  return page.evaluate(() => {
    const out = [];
    const walk = (el) => {
      for (const child of el.children) walk(child);
      let txt = '';
      for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent;
      txt = txt.trim();
      if (!txt) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.4) return;
      if (el.closest('[aria-hidden="true"]')) return;
      if (el.disabled || el.closest('[disabled],[aria-disabled="true"]')) return;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 8) return;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
      const hit = document.elementFromPoint(
        Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2)),
        Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2)),
      );
      if (!hit || (!el.contains(hit) && !hit.contains(el))) return;
      const m = cs.color.match(/[\d.]+/g).map(Number);
      out.push({
        text: txt.slice(0, 60),
        color: m.slice(0, 3),
        alpha: m.length > 3 ? m[3] : 1,
        size: parseFloat(cs.fontSize),
        weight: +cs.fontWeight || 400,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''),
      });
    };
    walk(document.body);
    return out;
  });
}

async function samplePixels(page, shotB64, points) {
  return page.evaluate(async ({ b64, pts }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const scale = img.width / innerWidth;
    return pts.map(([x, y]) => {
      const px = Math.min(img.width - 1, Math.max(0, Math.round(x * scale)));
      const py = Math.min(img.height - 1, Math.max(0, Math.round(y * scale)));
      const d = g.getImageData(px, py, 1, 1).data;
      return [d[0], d[1], d[2]];
    });
  }, { b64: shotB64, pts: points });
}

function perimeterPoints(r, fontSize) {
  const my = r.y + r.h / 2;
  const pts = [
    [r.x + 1, my], [r.x + 2, my], [r.x + r.w - 1, my], [r.x + r.w - 2, my],
    [r.x + 1, my - 3], [r.x + r.w - 1, my - 3], [r.x + 1, my + 3], [r.x + r.w - 1, my + 3],
  ];
  if (r.h < fontSize * 2.2) {
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const x = r.x + 2 + (i * (r.w - 4)) / n;
      pts.push([x, r.y + 1], [x, r.y + r.h - 1]);
    }
  }
  return pts.map(([x, y]) => [Math.max(0, Math.min(389, x)), Math.max(0, Math.min(843, y))]);
}

function analyse(el, samples) {
  const bgCands = samples.filter((p) => dist(p, el.color) > 60);
  if (!bgCands.length) return null;
  const groups = new Map();
  for (const p of bgCands) {
    const k = p.map((v) => Math.round(v / 12)).join(',');
    const e = groups.get(k) || { c: p, n: 0 };
    e.n++; groups.set(k, e);
  }
  const sorted = [...groups.values()].sort((a, b) => b.n - a.n);
  const topN = sorted[0].n;
  let worst = Infinity, worstBg = null;
  for (const { c: bg, n } of sorted) {
    if (n < topN) break;
    const fg = el.alpha < 1 ? el.color.map((c, i) => Math.round(c * el.alpha + bg[i] * (1 - el.alpha))) : el.color;
    const r = ratio(fg, bg);
    if (r < worst) { worst = r; worstBg = bg; }
  }
  return { ratio: worst, bg: worstBg };
}

const results = [];
const seen = new Set();

async function auditView(page, ctxName) {
  const els = await collectTexts(page);
  if (!els.length) return;
  const shot = (await page.screenshot()).toString('base64');
  const allPts = els.map((e) => perimeterPoints(e.rect, e.size));
  const pixels = await samplePixels(page, shot, allPts.flat());
  let off = 0;
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    const samples = pixels.slice(off, off + allPts[i].length);
    off += allPts[i].length;
    const res = analyse(el, samples);
    if (!res) continue;
    const large = el.size >= 24 || (el.size >= 18.66 && el.weight >= 700);
    const need = large ? 3 : 4.5;
    const key = `${ctxName}|${el.text}|${el.color.join()}|${res.bg.join()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ ctx: ctxName, ...el, bg: res.bg, ratio: +res.ratio.toFixed(2), need, pass: res.ratio >= need });
  }
}

async function auditPage(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 640) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(350);
    await auditView(page, name);
    if (y === 0) await page.screenshot({ path: `${OUT}/${name.replace(/[^\w-]/g, '_')}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

// Audit overlay full-screen yang scroll internal (RiwayatAktivitas dst.)
async function auditOverlay(page, name) {
  await page.waitForTimeout(700);
  await auditView(page, name);
  const scrolled = await page.evaluate(() => {
    const els = [...document.querySelectorAll('div')].filter((d) => {
      const cs = getComputedStyle(d);
      return (cs.position === 'fixed' || cs.position === 'absolute') && cs.overflowY !== 'visible' && d.scrollHeight > d.clientHeight + 100;
    });
    const t = els.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    if (!t) return false;
    t.scrollTop = t.scrollHeight;
    return true;
  });
  if (scrolled) { await page.waitForTimeout(500); await auditView(page, name + '~bawah'); }
  await page.screenshot({ path: `${OUT}/${name.replace(/[^\w-]/g, '_')}.png` });
}

async function closeLayer(page) {
  // Escape (useDialog) → fallback Back HP (useBackDismiss, sudah diserialisasi)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  if (await page.locator('[role="dialog"]').count()) {
    await page.goBack();
    await page.waitForTimeout(800);
  }
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

async function newCtx(browser, theme, { bendahara = false, welcome = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await ctx.addInitScript(({ t, w, b, ref, sess }) => {
    try {
      localStorage.setItem('hadiran-theme', t);
      if (!w) localStorage.setItem('hadiran-welcome-v2', '1');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess));
    } catch {}
  }, { t: theme, w: welcome, b: bendahara, ref: REF, sess: fakeSession() });

  if (bendahara) {
    // Gembok anti-tulis + paksa anon utk read (JWT palsu ditolak PostgREST)
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
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('nav button', { hasText: label }).first().click({ force: true, timeout: 8000 })
    .catch(() => page.locator('nav button', { hasText: label }).first().evaluate((el) => el.click()));
  await page.waitForTimeout(3500);
}

async function openRowSheet(page, name, theme) {
  const rows = page.locator('main button').filter({ hasText: /Rp[\d.]/ });
  const n = await rows.count();
  for (let i = n - 1; i >= 0; i--) {
    await rows.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await page.waitForTimeout(350);
    await rows.nth(i).click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
    if (await page.locator('[role="dialog"]').count()) {
      await auditView(page, `${theme}/${name}`);
      await page.screenshot({ path: `${OUT}/${theme}_${name}.png`.replace(/[^\w-./]/g, '_') });
      await closeLayer(page);
      return true;
    }
  }
  console.log(`  (lewati ${name} — tak ada baris yang membuka sheet)`);
  return false;
}

async function openMenuItem(page, itemLabel) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(600);
  const item = page.getByRole('menu').getByText(itemLabel, { exact: false });
  if (!(await item.count())) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); return false; }
  await item.first().click();
  await page.waitForTimeout(1200);
  return true;
}

const browser = await chromium.launch();
const ONLY = process.env.ONLY; // 'warga' | 'bendahara' | 'landing' — run sebagian saat iterasi

for (const theme of ['light', 'dark']) {
  // ── PART W: sheet-sheet mode warga ────────────────────────────────────
  if (!ONLY || ONLY === 'warga') {
    const { ctx, page } = await newCtx(browser, theme, { welcome: true });
    await page.goto(URL, { waitUntil: 'networkidle' });
    if (!(await loginWarga(page))) { console.log('GAGAL login warga', theme); await ctx.close(); continue; }
    await page.waitForTimeout(3500);
    if (await page.locator('[role="dialog"]').count()) {
      await auditView(page, `${theme}/w-welcome`);
      await page.screenshot({ path: `${OUT}/${theme}_w-welcome.png` });
      await closeLayer(page);
    }
    await openRowSheet(page, 'w-sheet-trx', theme);
    // menu warga + Tentang Aplikasi
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(600);
    await auditView(page, `${theme}/w-menu`);
    const tentang = page.getByRole('menu').getByText('Tentang Aplikasi');
    if (await tentang.count()) {
      await tentang.click();
      await auditOverlay(page, `${theme}/w-tentang`);
      await page.goBack(); await page.waitForTimeout(800);
    } else { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    await gotoTab(page, 'Hadiran');
    await openRowSheet(page, 'w-sheet-tarikan', theme);
    await gotoTab(page, 'Kas RT');
    await openRowSheet(page, 'w-sheet-kasrt', theme);
    await ctx.close();
  }

  // ── PART B: seluruh permukaan bendahara (mock, read-only) ────────────
  if (!ONLY || ONLY === 'bendahara') {
    const { ctx, page } = await newCtx(browser, theme, { bendahara: true });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    const navN = await page.locator('nav button').count();
    if (!navN) { console.log(`GAGAL mock bendahara (${theme}) — masih di login?`); await page.screenshot({ path: `${OUT}/${theme}_b-gagal.png` }); await ctx.close(); continue; }
    const tabs = await page.locator('nav button').allInnerTexts();
    console.log(`[${theme}] tab bendahara:`, JSON.stringify(tabs));
    for (const tab of tabs) {
      const label = tab.trim().split('\n')[0];
      await gotoTab(page, label);
      await auditPage(page, `${theme}/b-${label}`);
    }
    // Sheet form via FAB (buka saja — TIDAK submit)
    for (const [tab, aria, name] of [
      ['Hadiran', 'Setor ke Kas RT', 'b-sheet-setor'],
      ['Kas RT', 'Tambah transaksi Kas RT', 'b-sheet-form-kasrt'],
    ]) {
      await gotoTab(page, tab);
      const fab = page.getByRole('button', { name: aria });
      if (await fab.count()) {
        await fab.click();
        await page.waitForTimeout(900);
        if (await page.locator('[role="dialog"]').count()) {
          await auditView(page, `${theme}/${name}`);
          await page.screenshot({ path: `${OUT}/${theme}_${name}.png` });
          await closeLayer(page);
        }
      }
    }
    // Baris tarikan Jadwal (detail/absensi — TANPA menyentuh toggle status)
    await gotoTab(page, 'Jadwal');
    const rowJ = page.locator('main button').filter({ hasText: /Tarikan|Sohibul|20\d\d/ }).first();
    if (await rowJ.count()) {
      await rowJ.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
      await auditView(page, `${theme}/b-jadwal-detail`);
      await page.screenshot({ path: `${OUT}/${theme}_b-jadwal-detail.png` });
      await closeLayer(page);
    }
    // Overlay menu bendahara
    for (const [label, name] of [
      ['Tutup Buku Triwulan', 'b-laporan'],
      ['Riwayat Aktivitas', 'b-riwayat'],
      ['Kelola Anggota', 'b-anggota'],
      ['Backup & Restore', 'b-backup'],
      ['Tentang Aplikasi', 'b-tentang'],
    ]) {
      if (await openMenuItem(page, label)) {
        await auditOverlay(page, `${theme}/${name}`);
        await page.goBack();
        await page.waitForTimeout(900);
      }
    }
    await ctx.close();
  }

  // ── PART L: landing /info ─────────────────────────────────────────────
  if (!ONLY || ONLY === 'landing') {
    const { ctx, page } = await newCtx(browser, theme);
    await page.goto(`${URL}/landing.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await auditPage(page, `${theme}/landing`);
    await ctx.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/hasil.json`, JSON.stringify(results, null, 1));
const fails = results.filter((r) => !r.pass).sort((a, b) => a.ratio - b.ratio);
console.log(`\n=== TOTAL sampel: ${results.length}, GAGAL AA: ${fails.length} ===`);
for (const f of fails) {
  console.log(`${f.ratio} (butuh ${f.need}) [${f.ctx}] "${f.text}" fg rgb(${f.color}) a=${f.alpha} bg rgb(${f.bg}) ${f.size}px/${f.weight} <${f.tag}>`);
}
