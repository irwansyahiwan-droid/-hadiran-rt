// Audit kontras piksel-nyata: Playwright 390px, light+dark, semua tab nav warga.
// FG = computed color; BG = sampel piksel screenshot di perimeter bbox (bukan token).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.env.CAP_URL || 'http://localhost:5174';
const OUT = process.env.OUT_DIR || '.';
mkdirSync(OUT, { recursive: true });

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
  // elemen dgn text node langsung, visible, dalam viewport
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
      // occlusion: titik tengah harus milik elemen ini (bukan kartu/sheet lain di atasnya)
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
  // decode PNG di canvas browser, ambil piksel di titik-titik
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
  // Sampel di KETINGGIAN BARIS TEKS (mid-y) — fair utk gradient vertikal
  // (teks tombol duduk di tengah, bukan di tepi atas fill).
  const my = r.y + r.h / 2;
  const pts = [
    [r.x + 1, my], [r.x + 2, my], [r.x + r.w - 1, my], [r.x + r.w - 2, my],
    [r.x + 1, my - 3], [r.x + r.w - 1, my - 3], [r.x + 1, my + 3], [r.x + r.w - 1, my + 3],
  ];
  // elemen pendek (± satu baris): tepi atas/bawah masih di zona teks
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
  // buang sampel mirip warna teks (glyph/antialias)
  const bgCands = samples.filter((p) => dist(p, el.color) > 60);
  if (!bgCands.length) return null;
  // kelompokkan (kuantisasi 12) → warna unik yg muncul >=2 kali
  const groups = new Map();
  for (const p of bgCands) {
    const k = p.map((v) => Math.round(v / 12)).join(',');
    const e = groups.get(k) || { c: p, n: 0 };
    e.n++; groups.set(k, e);
  }
  // MODUS: warna paling sering = latar sesungguhnya (worst-case perimeter
  // ketipu antialias tepi glyph & ikon/dot inline). Tie → ratio terkecil.
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

async function auditCurrentView(page, ctxName, results, seen) {
  const els = await collectTexts(page);
  if (!els.length) return;
  const shot = (await page.screenshot()).toString('base64');
  const allPts = els.map((e) => perimeterPoints(e.rect, e.size));
  const flat = allPts.flat();
  const pixels = await samplePixels(page, shot, flat);
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

async function auditPage(page, name, results, seen) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 640) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(350);
    await auditCurrentView(page, name, results, seen);
    if (y === 0) await page.screenshot({ path: `${OUT}/${name.replace(/[^\w-]/g, '_')}.png` });
  }
}

async function runTheme(theme, results, seen) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('hadiran-theme', t);
      localStorage.setItem('hadiran-welcome-v2', '1'); // suppress WelcomeSheet (bug back-stack di dev StrictMode)
    } catch {}
  }, theme);
  const page = await ctx.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' }); // matikan animasi → sampel stabil
  page.on('pageerror', (e) => console.log(`  [pageerror ${theme}]`, e.message.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`  [console ${theme}]`, m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'networkidle' });

  // halaman login dulu
  if (!process.env.SKIP_LOGIN_AUDIT) await auditPage(page, `${theme}/login`, results, seen);

  const pw = page.locator('#warga-password');
  await pw.waitFor({ timeout: 15000 });
  await pw.click();
  await pw.pressSequentially('warga', { delay: 60 });
  await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
  let entered = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(700);
    if ((await page.locator('nav button', { hasText: 'Beranda' }).count()) > 0 && (await page.locator('#warga-password').count()) === 0) { entered = true; break; }
  }
  if (!entered) { console.log(`GAGAL masuk warga (${theme})`); await browser.close(); return; }
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(4000);

  const tabs = await page.locator('nav button').allInnerTexts();
  console.log(`[${theme}] tab nav:`, JSON.stringify(tabs));
  for (const tab of tabs) {
    const label = tab.trim().split('\n')[0];
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.locator('nav button', { hasText: label }).first().click({ force: true, timeout: 10000 })
      .catch(() => page.locator('nav button', { hasText: label }).first().evaluate((el) => el.click()));
    await page.waitForTimeout(4500);
    await auditPage(page, `${theme}/${label}`, results, seen);
  }
  await browser.close();
}

const results = [];
const seen = new Set();
for (const theme of ['light', 'dark']) await runTheme(theme, results, seen);

writeFileSync(`${OUT}/hasil.json`, JSON.stringify(results, null, 1));
const fails = results.filter((r) => !r.pass).sort((a, b) => a.ratio - b.ratio);
console.log(`\n=== TOTAL sampel: ${results.length}, GAGAL AA: ${fails.length} ===`);
for (const f of fails) {
  console.log(`${f.ratio} (butuh ${f.need}) [${f.ctx}] "${f.text}" fg rgb(${f.color}) a=${f.alpha} bg rgb(${f.bg}) ${f.size}px/${f.weight} <${f.tag}>`);
}
