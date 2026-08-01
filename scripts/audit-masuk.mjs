// Audit PINTU MASUK & KELUAR: apa yang terjadi pada auth saat jaringan busuk.
//
// Kenapa alat sendiri: semua sapuan lain menguji layar SESUDAH masuk. Gerbang
// auth sendiri tak pernah disentuh, padahal ia satu-satunya layar yang, kalau
// macet, tak menyisakan jalan lain sama sekali — tak ada tab lain untuk dituju,
// tak ada tarik-untuk-muat-ulang, cuma tombol yang berputar.
//
// Yang dicari, urut dari yang paling mahal:
//   1. Tombol "Masuk" TERKUNCI selamanya. `fetch` yang menggantung di sinyal
//      buruk tidak pernah reject sendiri, jadi `await` telanjang = spinner abadi
//      dan bendahara buntu total. (Riwayat: 1 Agu 2026 — chunk klien gagal
//      diunduh & request auth menggantung, dua-duanya mengunci tombol.)
//   2. Kegagalan JARINGAN dilaporkan sebagai "Email atau password salah".
//      Diagnosis palsu yang mahal: bendahara akan mengganti-ganti sandi yang
//      sebenarnya sudah benar, lalu kena batas laju auth.
//   3. "Keluar" yang gagal menghubungi server tapi MENINGGALKAN token hidup di
//      HP. Pengguna yakin sudah keluar padahal belum.
//
// Jebakan alat (pernah bikin temuan palsu): nama chunk klien adalah
// `vendor-supabase-<hash>.js`, BUKAN `supabase-<hash>.js`. Pola rute yang meleset
// tidak memblokir apa pun — sapuan diam-diam menguji jalur ONLINE dan lolos
// dengan pesan "password salah" yang memang benar. Karena itu tiap gangguan di
// bawah menghitung `kena` dan berteriak kalau tak sekali pun terpasang.
//
// Pakai:  node scripts/audit-masuk.mjs
//   CAP_URL=http://localhost:5199   (default 5174; verifikasi lawan `vite preview`)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL_APP = process.env.CAP_URL || 'http://localhost:5174';
const W = Number(process.env.W || 360);

const env = readFileSync(new globalThis.URL('../.env', import.meta.url), 'utf8');
const REF = env.match(/VITE_SUPABASE_URL=(\S+)/)[1].match(/https:\/\/([^.]+)\./)[1];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesiPalsu = () => ({
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '00000000-0000-4000-8000-0000000000aa', role: 'authenticated', exp: 4102444800, user_metadata: { role: 'bendahara' } })}.audit`,
  token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800, refresh_token: 'audit',
  user: { id: '00000000-0000-4000-8000-0000000000aa', aud: 'authenticated', email: 'audit@lokal', app_metadata: { provider: 'email' }, user_metadata: { role: 'bendahara' }, created_at: '2026-01-01T00:00:00Z' },
});

// Batas kesabaran penguji > batas sabar app (20 dtk), supaya "app menyerah tepat
// waktu" bisa dibedakan dari "app tak pernah menyerah".
const SABAR_MS = 26_000;
const CHUNK_KLIEN = /\/assets\/.*supabase.*\.js/;

const browser = await chromium.launch();
let gagalTotal = 0, diukur = 0;

function lapor(nama, keluhan) {
  diukur++;
  if (keluhan.length) gagalTotal++;
  console.log(`\n### ${nama}${keluhan.length ? '' : '  OK'}`);
  keluhan.forEach((x) => console.log('  ⚠ ' + x));
}

async function konteks(bendahara = false) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 780 }, serviceWorkers: 'block' });
  await ctx.addInitScript(({ ref, s, b }) => {
    localStorage.setItem('hadiran-welcome-v2', '1');
    localStorage.setItem('hadiran-theme', 'light');
    if (b) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
  }, { ref: REF, s: sesiPalsu(), b: bendahara });
  return ctx;
}

/** Pasang gangguan + hitung berapa kali benar-benar kena (anti temuan palsu). */
function ganggu(ctx, pola, aksi) {
  const n = { kena: 0 };
  ctx.route(pola, (route) => { n.kena++; aksi(route); });
  return n;
}

// ── MASUK ────────────────────────────────────────────────────────────────────
async function ujiMasuk(nama, pasang, harap) {
  const ctx = await konteks();
  const hitung = pasang(ctx);
  const page = await ctx.newPage();
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: /bendahara/i }).first().click();
  // Panel bendahara membuka dengan transisi tinggi — tanpa jeda, Playwright
  // menolak klik ("element is not stable") dan sapuan mati sebelum menguji apa pun.
  await page.waitForTimeout(700);
  await page.locator('#login-email').fill('bendahara@rt.test');
  await page.locator('#login-password').fill('sandi-benar-banget');

  const form = page.locator('form');
  const tombol = form.getByRole('button', { name: /Masuk sebagai Bendahara|Memproses/ });
  await tombol.click();

  let pesan = null;
  const mulai = Date.now();
  while (Date.now() - mulai < SABAR_MS) {
    if (await form.locator('[role="alert"]').count()) {
      pesan = (await form.locator('[role="alert"]').first().innerText()).trim();
      break;
    }
    await page.waitForTimeout(250);
  }
  const terkunci = await tombol.isDisabled();
  const detik = ((Date.now() - mulai) / 1000).toFixed(1);

  const m = [];
  if (hitung && !hitung.kena) m.push('PROBE CACAT: gangguan tak sekali pun terpasang — hasil di bawah tak bermakna');
  if (pesan === null) m.push(`TOMBOL TERKUNCI ${detik}s tanpa pesan apa pun — bendahara buntu`);
  else if (pesan !== harap) m.push(`pesan salah sasaran: "${pesan}" (harusnya "${harap}")`);
  if (terkunci) m.push('tombol masih disabled sesudah gagal — tak bisa coba lagi');
  lapor(`masuk/${nama}`, m);
  await ctx.close();
}

await ujiMasuk(
  'chunk klien Supabase gagal diunduh',
  (ctx) => ganggu(ctx, CHUNK_KLIEN, (r) => r.abort('failed')),
  'Koneksi bermasalah. Periksa internet lalu coba lagi.',
);

await ujiMasuk(
  'request auth MENGGANTUNG (tak jawab, tak gagal)',
  (ctx) => ganggu(ctx, '**/auth/v1/token**', () => { /* sengaja diam */ }),
  'Server lama tak menjawab. Cek koneksi lalu coba lagi.',
);

await ujiMasuk(
  'endpoint auth diputus',
  (ctx) => ganggu(ctx, '**/auth/v1/token**', (r) => r.abort('failed')),
  'Koneksi bermasalah. Periksa internet lalu coba lagi.',
);

// Kontrol: sandi yang memang salah harus TETAP disebut sandi salah. Tanpa ini,
// sapuan di atas bisa "lolos" dengan cara memukul rata semua jadi pesan koneksi.
await ujiMasuk(
  'kredensial ditolak server (kontrol)',
  (ctx) => ganggu(ctx, '**/auth/v1/token**', (r) => r.fulfill({
    status: 400, contentType: 'application/json',
    body: '{"error":"invalid_grant","error_description":"Invalid login credentials"}',
  })),
  'Email atau password salah.',
);

// ── KELUAR ───────────────────────────────────────────────────────────────────
{
  const ctx = await konteks(true);
  const hitung = ganggu(ctx, '**/auth/v1/logout**', (r) => r.abort('failed'));
  ctx.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' }));
  const page = await ctx.newPage();
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const m = [];
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('menu').getByText('Keluar', { exact: false }).first().click();

  let sisa = 'tak terbaca';
  const mulai = Date.now();
  while (Date.now() - mulai < SABAR_MS) {
    sisa = await page.evaluate(() => Object.keys(localStorage).filter((k) => /^sb-.+-auth-token$/.test(k)));
    if (!sisa.length) break;
    await page.waitForTimeout(250);
  }
  const detik = ((Date.now() - mulai) / 1000).toFixed(1);
  const kembaliKeLogin = await page.locator('#login-password').count() > 0;

  if (!hitung.kena) m.push('PROBE CACAT: request logout tak pernah diblokir');
  if (sisa.length) m.push(`TOKEN MASIH HIDUP setelah ${detik}s "Keluar": ${JSON.stringify(sisa)}`);
  if (!kembaliKeLogin) m.push('tidak kembali ke layar Login');
  lapor('keluar/server tak terjangkau', m);
  await ctx.close();
}

await browser.close();
console.log(`\n=== ${diukur} skenario auth diperiksa @${W}px · ${gagalTotal} bermasalah ===`);
process.exit(gagalTotal ? 1 : 0);
