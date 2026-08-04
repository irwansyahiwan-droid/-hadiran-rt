// Audit JALUR TULIS saat server diam: tombol simpan tak boleh terkunci selamanya.
//
// Kenapa alat sendiri: `audit:keadaan` menguji layar saat BACA gagal, `audit:masuk`
// menguji gerbang auth. Jalur TULIS — pekerjaan bendahara yang sesungguhnya,
// satu-satunya tempat uang benar-benar dicatat — tak tersentuh keduanya.
//
// Yang dicari:
//   1. Tombol simpan TERKUNCI selamanya saat request menggantung. Tiap jalur
//      tulis app ini sudah disiplin memakai `try/finally` untuk melepas status
//      "Menyimpan…", tapi `finally` TAK PERNAH tercapai kalau janjinya tak
//      pernah selesai. `fetch` yang menggantung tidak reject sendiri.
//      (Riwayat: 2 Agu 2026 — satu POST digantung mengunci Simpan Kas RT > 25
//      dtk; bendahara tak punya jalan selain menutup sheet & kehilangan yakin
//      apakah datanya tersimpan atau tidak.)
//   2. Pesan yang muncul sesudah menyerah harus menyebut sebab yang benar.
//
// Penjaganya ada di `src/lib/fetchBerbatas.ts`, dipasang sekali di klien Supabase
// supaya berlaku untuk SEMUA baca & tulis, termasuk kode yang belum ditulis.
// Sapuan ini yang membuktikan penjaga itu benar-benar terpasang di build nyata.
//
// Pakai:  node scripts/audit-tulis.mjs
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

const browser = await chromium.launch();
let gagalTotal = 0, diukur = 0;

function lapor(nama, keluhan) {
  diukur++;
  if (keluhan.length) gagalTotal++;
  console.log(`\n### ${nama}${keluhan.length ? '' : '  OK'}`);
  keluhan.forEach((x) => console.log('  ⚠ ' + x));
}

/**
 * Buka app sebagai bendahara. BACA dijawab kosong; TULIS sengaja DIGANTUNG —
 * tak dijawab, tak digagalkan. `tulis.n` menghitung berapa yang benar-benar
 * tercegat: sapuan yang tak mencegat apa pun akan "lolos" tanpa menguji apa pun.
 */
async function siapkan() {
  const ctx = await browser.newContext({ viewport: { width: W, height: 780 }, serviceWorkers: 'block' });
  await ctx.addInitScript(({ ref, s }) => {
    localStorage.setItem('hadiran-welcome-v2', '1');
    localStorage.setItem('hadiran-theme', 'light');
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
  }, { ref: REF, s: sesiPalsu() });

  const tulis = { n: 0 };
  await ctx.route('**/rest/v1/**', (route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' });
    }
    tulis.n++;   // digantung: sengaja tak dipanggil fulfill/abort
  });
  const page = await ctx.newPage();
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  return { ctx, page, tulis };
}

/** Tunggu sampai `cek()` benar — bukan asumsi dari satu klik (balapan hidrasi). */
async function tunggu(page, cek, batas = 15_000) {
  const mulai = Date.now();
  while (Date.now() - mulai < batas) {
    if (await cek()) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

/**
 * @param nama    label skenario
 * @param buka    (page) => buka form-nya, kembalikan locator dialog
 * @param isi     (dialog) => isi field wajib
 * @param tombol  regex label tombol simpan (termasuk bentuk "sedang menyimpan")
 */
async function ujiTulis(nama, buka, isi, tombol) {
  const { ctx, page, tulis } = await siapkan();
  const m = [];
  try {
    const dialog = await buka(page);
    if (!dialog) { lapor(nama, ['PROBE CACAT: form tak pernah terbuka — tak ada yang diuji']); await ctx.close(); return; }
    await isi(dialog);

    const simpan = dialog.getByRole('button', { name: tombol });
    const labelAwal = (await simpan.innerText()).trim();
    await simpan.click();

    let label = labelAwal, pulih = false;
    const mulai = Date.now();
    while (Date.now() - mulai < SABAR_MS) {
      label = (await simpan.innerText().catch(() => '(hilang)')).trim();
      if (!/…$/.test(label)) { pulih = true; break; }
      await page.waitForTimeout(250);
    }
    const detik = ((Date.now() - mulai) / 1000).toFixed(1);
    const terkunci = await simpan.isDisabled().catch(() => false);
    // Pesan gagal WAJIB dicari di TIGA permukaan sekaligus. Versi pertama probe
    // ini cuma membaca `[role="status"]` dan melaporkan kedua jalur tulis
    // "menyerah diam-diam" — PALSU, dan false-positive alat ke-10 di repo ini.
    // Sebabnya: Toaster memisahkan pengumuman jadi dua region live permanen
    // (`umumkan(msg, type === 'error')`), dan toast GALAT masuk ke region
    // ASSERTIVE `role="alert"` — bukan `role="status"` yang sopan. Wadah toast
    // yang terlihat sendiri sengaja TANPA role (anti-baca-dobel). Jadi selektor
    // lama justru satu-satunya tempat yang dijamin kosong saat gagal.
    // Beri jeda kecil dulu: label tombol pulih di tick yang sama saat toast
    // baru dipasang, jadi membaca seketika bisa menangkap DOM sebelum render.
    await page.waitForTimeout(400);
    const toast = (await Promise.all([
      page.locator('[role="alert"]').last().innerText().catch(() => ''),
      page.locator('[role="status"]').last().innerText().catch(() => ''),
      page.locator('.z-toast, [class*="z-toast"]').last().innerText().catch(() => ''),
    ])).map((s) => s.trim()).filter(Boolean).join(' | ');

    if (!tulis.n) m.push('PROBE CACAT: tak ada request tulis yang tercegat — hasil tak bermakna');
    if (!pulih) m.push(`TOMBOL TERKUNCI "${label}" setelah ${detik}s — bendahara tak tahu tersimpan atau tidak`);
    else if (terkunci) m.push('tombol pulih labelnya tapi masih disabled — tak bisa coba lagi');
    if (pulih && !toast.trim()) m.push('menyerah diam-diam: tak ada pesan apa pun setelah gagal');
  } catch (e) {
    m.push(`PROBE CACAT: ${e.message.split('\n')[0]}`);
  }
  lapor(nama, m);
  await ctx.close();
}

// ── Kas RT: tambah transaksi ─────────────────────────────────────────────────
await ujiTulis(
  'tulis/Kas RT tambah transaksi',
  async (page) => {
    await page.getByRole('button', { name: 'Kas RT' }).first().click();
    if (!await tunggu(page, async () => await page.getByRole('button', { name: /Tambah transaksi Kas RT/i }).count() > 0)) return null;
    await page.getByRole('button', { name: /Tambah transaksi Kas RT/i }).click();
    if (!await tunggu(page, async () => await page.locator('[role="dialog"]').count() > 0)) return null;
    await page.waitForTimeout(600);   // sheet masih meluncur → klik ditolak "not stable"
    return page.locator('[role="dialog"]').last();
  },
  async (dialog) => {
    await dialog.locator('input[inputmode="numeric"]').first().fill('50000');
    const ket = dialog.locator('input[type="text"]').first();
    if (await ket.count()) await ket.fill('audit tulis');
  },
  /^(Simpan|Menyimpan…)$/,
);

// ── Kelola Anggota: tambah warga (jalur tulis & halaman berbeda) ──────────────
await ujiTulis(
  'tulis/Kelola Anggota tambah warga',
  async (page) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    if (!await tunggu(page, async () => await page.getByRole('menu').count() > 0)) return null;
    const item = page.getByRole('menu').getByText('Kelola', { exact: false });
    if (!await item.count()) return null;
    await item.first().click();
    // Overlay membuka DAFTAR anggota; form baru muncul lewat FAB di dalamnya.
    if (!await tunggu(page, async () => await page.getByRole('button', { name: /Tambah anggota/i }).count() > 0)) return null;
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /Tambah anggota/i }).click();
    if (!await tunggu(page, async () => await page.locator('#anggota-nama').count() > 0)) return null;
    await page.waitForTimeout(600);
    return page.locator('[role="dialog"]').last();
  },
  async (dialog) => { await dialog.locator('#anggota-nama').fill('Warga Audit'); },
  /^(Simpan Anggota|Menyimpan…)$/,
);

await browser.close();
console.log(`\n=== ${diukur} jalur tulis diperiksa @${W}px · ${gagalTotal} bermasalah ===`);
process.exit(gagalTotal ? 1 : 0);
