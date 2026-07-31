// Audit KEADAAN DATA: layar saat data KOSONG dan saat muat GAGAL.
//
// Kenapa alat sendiri: semua sapuan lain (kontras, lebar, geometri sheet) jalan
// lawan database produksi yang PENUH, jadi EmptyState & ErrorState praktis tak
// pernah dirender — kelas layar ini adalah blind spot semua audit. Dipaksa lewat
// intercept: setiap GET rest/v1 dibalas `[]` (mode kosong) atau `500` (mode gagal).
//
// Yang dicari, urut dari yang paling mahal:
//   1. NOMINAL saat gagal muat — app kas TIDAK BOLEH menyatakan angka apa pun
//      ketika datanya tak termuat. "Rp0" yang terlihat sehat adalah kebohongan
//      tentang uang; itu cacat terburuk yang bisa dimiliki app ini.
//      (Riwayat: 31 Jul 2026 Kas Hadiran menampilkan hero Rp0 + neraca "Total
//      Bersih Rp0" berwarna hijau saat koneksi putus.)
//   2. Klaim "belum ada data" saat sebenarnya GAGAL memuat — beda diagnosis,
//      beda tindakan bagi bendahara.
//   3. Skeleton yang tak pernah selesai (layar mati).
//   4. Bocor samping di kedua keadaan.
//
// Jebakan yang melahirkan alat ini: `supabase.select()` TIDAK melempar saat
// gagal — ia mengembalikan `{data: null, error}`. Tiap `?? []` tanpa cek
// `res.error` mengubah kegagalan jadi "tidak ada data". Cek ada di halaman TIDAK
// cukup; helper di `src/lib/` juga wajib melempar.
//
// Pakai:  node scripts/audit-keadaan.mjs
//   CAP_URL=http://localhost:5199   (default 5174; verifikasi lawan `vite preview`)
//   MODE=kosong|gagal|dua           (default 'dua' — jalankan keduanya)
//   PERAN=warga|bendahara|dua       (default 'dua')
//   W=390                            (lebar viewport, default 360)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const URL_APP = process.env.CAP_URL || 'http://localhost:5174';
const W = Number(process.env.W || 360);
const MODES = (process.env.MODE ?? 'dua') === 'dua' ? ['kosong', 'gagal'] : [process.env.MODE];
const PERAN = (process.env.PERAN ?? 'dua') === 'dua' ? ['warga', 'bendahara'] : [process.env.PERAN];
const OUT = process.env.OUT_DIR || `.audit-keadaan-${W}`;
mkdirSync(OUT, { recursive: true });

const env = readFileSync(new globalThis.URL('../.env', import.meta.url), 'utf8');
const SUPA = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
const REF = SUPA.match(/https:\/\/([^.]+)\./)[1];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesiPalsu = () => ({
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '00000000-0000-4000-8000-0000000000aa', role: 'authenticated', exp: 4102444800, user_metadata: { role: 'bendahara' } })}.audit`,
  token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800, refresh_token: 'audit',
  user: { id: '00000000-0000-4000-8000-0000000000aa', aud: 'authenticated', email: 'audit@lokal', app_metadata: { provider: 'email' }, user_metadata: { role: 'bendahara' }, created_at: '2026-01-01T00:00:00Z' },
});

const PROBE = () => {
  const t = document.body.innerText;
  return {
    nominal: [...new Set(t.match(/[-+]?Rp[\d.]+/g) ?? [])].slice(0, 8),
    adaError: /Gagal memuat|Gagal memperbarui/i.test(t),
    klaimKosong: (t.match(/Belum ada [^\n·]{0,34}/g) ?? []).slice(0, 3),
    skeleton: document.querySelectorAll('.skeleton').length,
    bocor: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
};

let gagalTotal = 0, diukur = 0;

async function periksa(page, label, mode) {
  const r = await page.evaluate(PROBE);
  diukur++;
  const m = [];
  if (mode === 'gagal') {
    // Aturan inti: gagal muat → NOL nominal & harus mengaku gagal.
    if (r.nominal.length) m.push(`MENYATAKAN NOMINAL saat gagal: ${JSON.stringify(r.nominal)}`);
    if (r.klaimKosong.length) m.push(`mengaku "belum ada data" padahal GAGAL: ${JSON.stringify(r.klaimKosong)}`);
    if (!r.adaError && !r.nominal.length && !r.klaimKosong.length) m.push('tak ada nominal, tapi juga tak ada ErrorState — layar bisu');
  }
  if (r.skeleton) m.push(`skeleton tak selesai: ${r.skeleton}`);
  if (r.bocor) m.push('bocor samping');
  if (m.length) gagalTotal++;
  console.log(`\n### ${mode}/${label}${m.length ? '' : '  OK'}`);
  m.forEach((x) => console.log('  ⚠ ' + x));
  await page.screenshot({ path: `${OUT}/${mode}-${label}.png` });
}

const browser = await chromium.launch();

for (const mode of MODES) {
  for (const peran of PERAN) {
    const bendahara = peran === 'bendahara';
    const sess = sesiPalsu();
    const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
    await ctx.addInitScript(({ ref, s, b }) => {
      localStorage.setItem('hadiran-welcome-v2', '1');
      if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
    }, { ref: REF, s: sess, b: bendahara });

    await ctx.route('**/rest/v1/**', (route) => {
      const m = route.request().method();
      if (m !== 'GET' && m !== 'HEAD') return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"audit: tulis diblokir"}' });
      if (mode === 'gagal') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"audit: gagal muat"}' });
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' });
    });
    if (bendahara) {
      await ctx.route('**/auth/v1/**', (route) => {
        const u = route.request().url();
        if (u.includes('/logout')) return route.fulfill({ status: 204, body: '' });
        if (u.includes('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sess.user) });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sess) });
      });
    }

    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));
    await page.goto(URL_APP, { waitUntil: 'networkidle' });

    if (!bendahara) {
      const pw = page.locator('#warga-password');
      await pw.waitFor({ timeout: 15000 }).catch(() => {});
      await pw.click(); await pw.pressSequentially('warga', { delay: 50 });
      await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
    }
    for (let i = 0; i < 30; i++) { await page.waitForTimeout(600); if (await page.locator('nav button').count()) break; }
    await page.waitForTimeout(3800);

    const tabs = (await page.locator('nav button').allInnerTexts()).map((x) => x.trim().split('\n')[0]);
    for (const tab of tabs) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.locator('nav button', { hasText: tab }).first().click({ force: true });
      await page.waitForTimeout(3800);
      await periksa(page, `${peran}-${tab.replace(/\s+/g, '-')}`, mode);
    }

    if (bendahara) {
      for (const label of ['Tutup Buku Triwulan', 'Riwayat Aktivitas', 'Kelola Anggota']) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Menu' }).click();
        await page.waitForTimeout(600);
        const item = page.getByRole('menu').getByText(label, { exact: false });
        if (!(await item.count())) { await page.keyboard.press('Escape'); continue; }
        await item.first().click();
        await page.waitForTimeout(2800);
        await periksa(page, `overlay-${label.split(' ')[0]}`, mode);
        await page.goBack();
        await page.waitForTimeout(1200);
      }
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\n=== ${diukur} layar diperiksa @${W}px · ${gagalTotal} bermasalah ===`);
process.exit(gagalTotal ? 1 : 0);
