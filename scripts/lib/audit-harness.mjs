/* Harness bersama sapuan kontras (teks & non-teks).
 *
 * Isi berkas ini SENGAJA cuma dua hal:
 *   1. Matematika kontras + pengambilan piksel  — murni, gampang diuji.
 *   2. Penyiapan browser + navigasi warga/bendahara — bagian yang mahal
 *      dan rawan drift kalau disalin ke tiap sapuan.
 *
 * Yang TIDAK boleh masuk sini: aturan "apa yang dianggap gagal". Tiap sapuan
 * punya ambang & pengecualiannya sendiri; menyatukannya bikin satu sapuan
 * diam-diam mengubah vonis sapuan lain.
 */
import { readFileSync } from 'node:fs';

// ── matematika kontras (WCAG 2.1 relative luminance) ───────────────────────
export function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Warna semi-transparan di ATAS latar → warna tampak yang sebenarnya. */
export const blend = (fg, alpha, bg) =>
  alpha >= 1 ? fg : fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

/** "rgb(9, 8, 7)" / "rgba(9, 8, 7, 0.3)" → { rgb:[9,8,7], a:0.3 } (null kalau bukan warna). */
export function parseColor(str) {
  if (!str) return null;
  const m = String(str).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const n = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (n.length < 3 || n.slice(0, 3).some(Number.isNaN)) return null;
  return { rgb: n.slice(0, 3), a: n.length > 3 && !Number.isNaN(n[3]) ? n[3] : 1 };
}

/** Modus warna dari sekumpulan sampel piksel, mengabaikan yang mirip `avoid`.
 *  Modus (bukan worst-case) karena perimeter selalu ketiban antialias glyph/ikon. */
export function modusBg(samples, avoid, minDist = 60) {
  const cands = avoid ? samples.filter((p) => dist(p, avoid) > minDist) : samples;
  if (!cands.length) return null;
  const groups = new Map();
  for (const p of cands) {
    const k = p.map((v) => Math.round(v / 12)).join(',');
    const e = groups.get(k) || { c: p, n: 0 };
    e.n++; groups.set(k, e);
  }
  const sorted = [...groups.values()].sort((a, b) => b.n - a.n);
  const topN = sorted[0].n;
  // seri di puncak → ambil yang paling gelap/terang berbeda (worst case dibiarkan
  // ke pemanggil; di sini cukup kembalikan semua kandidat modus)
  return sorted.filter((g) => g.n === topN).map((g) => g.c);
}

/** Decode screenshot di canvas browser, ambil warna di titik-titik CSS-px. */
export async function samplePixels(page, shotB64, points) {
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

// ── kredensial & sesi mock ────────────────────────────────────────────────
const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
export const SUPA_URL = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
export const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
export const REF = SUPA_URL.match(/https:\/\/([^.]+)\./)[1];

export function fakeSession() {
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

/** Konteks 390px. `bendahara` = sesi palsu + paksa-anon + gembok anti-tulis
 *  (3 lapis identik audit-kontras-deep.mjs — jangan longgarkan salah satunya). */
export async function newCtx(browser, theme, { bendahara = false, welcome = false } = {}) {
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

export async function loginWarga(page) {
  const pw = page.locator('#warga-password');
  await pw.waitFor({ timeout: 15000 });
  /* focus(), BUKAN click(): di viewport sempit (320px) & saat teks diperbesar,
     pemeriksaan aktionabilitas Playwright menolak klik karena tombol mata
     `w-11 h-11` dianggap menghalangi — padahal elementFromPoint di tengah kolom
     benar-benar mengenai INPUT. focus() tak butuh hit-test dan TETAP menyisakan
     sifat penting sapuan ini: 'warga' diketik betulan, tombol per tombol. */
  await pw.focus();
  await pw.pressSequentially('warga', { delay: 60 });
  await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(700);
    if ((await page.locator('nav button', { hasText: 'Beranda' }).count()) > 0) return true;
  }
  return false;
}

export async function gotoTab(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('nav button', { hasText: label }).first().click({ force: true, timeout: 8000 })
    .catch(() => page.locator('nav button', { hasText: label }).first().evaluate((el) => el.click()));
  await page.waitForTimeout(3500);
}

/** Escape (useDialog) → jaring Back HP (useBackDismiss). */
export async function closeLayer(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  if (await page.locator('[role="dialog"]').count()) {
    await page.goBack();
    await page.waitForTimeout(800);
  }
}

export async function openMenuItem(page, itemLabel) {
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
