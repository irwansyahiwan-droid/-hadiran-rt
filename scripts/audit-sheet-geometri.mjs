// Audit GEOMETRI sheet / modal / popover di lebar terkecil (360px default).
//
// Kenapa alat sendiri: sapuan kontras (audit-kontras*.mjs) menyampel WARNA, dan
// sapuan lebar nominal (audit-lebar-nominal.mjs) hanya melihat elemen ber-"Rp".
// Yang tak pernah diukur siapa pun adalah GEOMETRI permukaan berlapis — form di
// dalam bottom-sheet, popover menu, dialog konfirmasi. Di situ tiga hal bisa
// rusak tanpa terlihat di layar penuh data:
//   1. kontrol meluber keluar panel (label/input/tombol melewati tepi sheet)
//   2. teks terpotong (scrollWidth > clientWidth) — label form & judul dialog
//   3. panel lebih tinggi dari layar TANPA overflow-y → tombol Simpan tak tergapai
// Plus target sentuh <24px diukur lewat HIT-TEST NYATA (elementFromPoint), bukan
// bounding box — app ini melebarkan area ketuk lewat `before:-inset-*` yang tak
// muncul di getBoundingClientRect (lihat memori "audit layar kosong & gagal").
//
// Bendahara di-MOCK read-only, persis pola audit-kontras-deep.mjs: sesi palsu di
// localStorage, auth di-fulfill lokal, dan SEMUA method tulis diblokir 403 di
// level Playwright. Sheet hanya DIBUKA & diukur — tak pernah ada yang disimpan.
//
// Pakai:  node scripts/audit-sheet-geometri.mjs
//   CAP_URL=http://localhost:5199   (default 5174; verifikasi lawan `vite preview`)
//   W=390                            (lebar viewport, default 360)
//   OUT_DIR=/tmp/sheet               (tempat screenshot)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const URL_APP = process.env.CAP_URL || 'http://localhost:5174';
const W = Number(process.env.W || 360);
/* Tinggi viewport. Sampai 19 Agu 2026 nilai ini HARDCODE 844 di dua konteks —
   akibatnya aturan `panel > layar TANPA overflow-y` di PROBE tak pernah bisa
   menyala: 90vh dari 844 selalu muat. Semua sapuan repo memvariasikan LEBAR
   (320/360/390) & skala teks; TINGGI tak pernah sekali pun. Landscape HP
   (844x390) & HP pendek lawas (320x568) hidup di sisi lain tepi itu. */
const H = Number(process.env.H || 844);
const OUT = process.env.OUT_DIR || `.audit-sheet-${W}x${H}`;
mkdirSync(OUT, { recursive: true });

const env = readFileSync(new globalThis.URL('../.env', import.meta.url), 'utf8');
const SUPA = env.match(/VITE_SUPABASE_URL=(\S+)/)[1];
const ANON = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
const REF = SUPA.match(/https:\/\/([^.]+)\./)[1];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function sesiPalsu() {
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub: '00000000-0000-4000-8000-0000000000aa', role: 'authenticated',
    exp: 4102444800, user_metadata: { role: 'bendahara' },
  })}.audit`;
  return {
    access_token: jwt, token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800,
    refresh_token: 'audit-refresh',
    user: {
      id: '00000000-0000-4000-8000-0000000000aa', aud: 'authenticated', email: 'audit@lokal',
      app_metadata: { provider: 'email' }, user_metadata: { role: 'bendahara' },
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

/** Diukur DI DALAM halaman: dialog/menu teratas, atau `main` bila tak ada. */
const PROBE = () => {
  // Ambil dialog TERATAS, bukan yang pertama di DOM. Halaman overlay (Kelola
  // Anggota dll.) juga ber-role="dialog"; kalau yang diambil itu, alat mengukur
  // daftar di BELAKANG sheet — dan melaporkan skeleton shimmer-nya sebagai
  // "teks terpotong". Yang terakhir di DOM = yang paling atas di layar.
  const semua = [...document.querySelectorAll('[role="dialog"], [role="menu"]')];
  const dlg = semua.length ? semua[semua.length - 1] : null;
  const root = dlg ?? document.querySelector('main') ?? document.body;
  const vis = (el) => {
    const b = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const box = root.getBoundingClientRect();

  // `.skeleton` dilewati: shimmer-nya memang background-image lebih lebar dari
  // kotaknya (itulah animasinya), jadi selalu terbaca "terpotong" padahal tak
  // ada teks sama sekali. Sama utk elemen dekoratif aria-hidden.
  const clip = [...root.querySelectorAll('p,span,h1,h2,h3,button,label,option,div')]
    .filter((e) => !e.children.length && vis(e) && e.clientWidth && e.scrollWidth > e.clientWidth + 1)
    .filter((e) => e.innerText.trim() && !e.closest('.skeleton,[aria-hidden="true"]'))
    .map((e) => ({ t: e.innerText.trim().slice(0, 30), cw: e.clientWidth, sw: e.scrollWidth }));

  const bleed = [...root.querySelectorAll('input,select,button,textarea')]
    .filter(vis)
    .map((e) => ({ e, b: e.getBoundingClientRect() }))
    .filter(({ b }) => b.left < box.left - 1 || b.right > box.right + 1)
    .map(({ e, b }) => ({
      t: (e.getAttribute('aria-label') || e.innerText || e.tagName).trim().slice(0, 24),
      lewat: Math.round(Math.max(box.left - b.left, b.right - box.right)),
    }));

  // Hit-test nyata: perluas dari titik pusat sampai bukan elemen itu lagi.
  const kecil = [];
  for (const el of root.querySelectorAll('button,a[href],input,select,[role="button"]')) {
    if (!vis(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.top < 0 || b.bottom > innerHeight) continue; // di luar layar → tak bisa di-hit-test
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const owns = (x, y) => {
      const h = document.elementFromPoint(x, y);
      return !!h && (h === el || el.contains(h) || h.closest('button,select,input,a') === el);
    };
    let l = cx, r = cx, t = cy, bo = cy;
    for (let d = 1; d <= 40; d++) { if (owns(cx - d, cy)) l = cx - d; else break; }
    for (let d = 1; d <= 40; d++) { if (owns(cx + d, cy)) r = cx + d; else break; }
    for (let d = 1; d <= 40; d++) { if (owns(cx, cy - d)) t = cy - d; else break; }
    for (let d = 1; d <= 40; d++) { if (owns(cx, cy + d)) bo = cy + d; else break; }
    const w = Math.round(r - l), h = Math.round(bo - t);
    // w===0 → tertutup elemen lain (mis. slide carousel non-aktif): FP, lewati.
    if (w > 0 && (w < 24 || h < 24)) {
      kecil.push({ t: (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().slice(0, 24), w, h });
    }
  }

  const cs = getComputedStyle(root);
  const uniq = (a) => [...new Map(a.map((x) => [JSON.stringify(x), x])).values()];
  return {
    dialog: !!dlg,
    panel: { w: Math.round(box.width), h: Math.round(box.height) },
    tinggiLebihLayar: box.height > innerHeight + 1,
    bisaGulir: /auto|scroll/.test(cs.overflowY),
    halamanBocor: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    clip: uniq(clip), bleed, kecil: uniq(kecil),
  };
};

let gagal = 0, diukur = 0;

async function ukur(page, nama, { wajibDialog = true } = {}) {
  const r = await page.evaluate(PROBE);
  if (wajibDialog && !r.dialog) { console.log(`\n### ${nama} — TAK TERBUKA (lewati)`); return; }
  diukur++;
  const masalah = [];
  if (r.halamanBocor) masalah.push('halaman bisa digeser ke samping');
  if (r.bleed.length) masalah.push(`kontrol meluber keluar panel: ${JSON.stringify(r.bleed)}`);
  if (r.clip.length) masalah.push(`teks terpotong: ${JSON.stringify(r.clip)}`);
  if (r.kecil.length) masalah.push(`target sentuh <24px: ${JSON.stringify(r.kecil)}`);
  // Aturan tinggi HANYA berlaku utk dialog: panel mengambang wajib punya
  // overflow-y sendiri, kalau tidak tombol Simpan di dasarnya tak tergapai.
  // HALAMAN penuh (mis. editor absensi) memang lebih tinggi dari layar dan
  // digulir oleh dokumen — memberlakukan aturan dialog di sana = alat berteriak
  // palsu. FP baru → betulkan ALATNYA, bukan kodenya.
  if (r.dialog && r.tinggiLebihLayar && !r.bisaGulir) masalah.push(`panel ${r.panel.h}px > layar TANPA overflow-y`);
  if (masalah.length) gagal++;
  console.log(`\n### ${nama}  ${r.panel.w}×${r.panel.h}${masalah.length ? '' : '  OK'}`);
  masalah.forEach((m) => console.log('  ⚠ ' + m));
  await page.screenshot({ path: `${OUT}/${nama}.png` });
}

async function tutup(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(700);
  if (await page.locator('[role="dialog"]').count()) {
    /* Koordinat klik-luar WAJIB diturunkan dari viewport, bukan hardcode.
       Sampai 19 Agu 2026 ini `click(5, 400)` — di landscape (H=390) titik itu
       DI LUAR layar, kliknya tak mendarat, menu tetap terbuka, dan `keTab`
       berikutnya time-out. Gejalanya terbaca "nav Kas RT hilang di landscape"
       (temuan palsu); penyebabnya alat. Bug alat ke-14. */
    const vh = await page.evaluate(() => innerHeight);
    await page.mouse.click(5, Math.round(vh / 2)).catch(() => {});
    await page.waitForTimeout(700);
  }
}

async function keTab(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('nav button', { hasText: label }).first().click({ force: true });
  await page.waitForTimeout(3800);
}

const browser = await chromium.launch();

// ── A) MODE WARGA — WelcomeSheet & sheet detail transaksi ──────────────
{
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.route('**/rest/v1/**', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  await page.goto(URL_APP, { waitUntil: 'networkidle' });
  const pw = page.locator('#masuk-warga');
  await pw.click();
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(600); if (await page.locator('[role="dialog"]').count()) break; }
  await page.waitForTimeout(1200);
  await ukur(page, 'w1-welcome-sheet');   // WelcomeSheet sekali-lihat
  await tutup(page);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  const rows = page.locator('main button').filter({ hasText: /Rp[\d.]/ });
  for (let i = (await rows.count()) - 1; i >= 0; i--) {
    await rows.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await page.waitForTimeout(300);
    await rows.nth(i).click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
    if (await page.locator('[role="dialog"]').count()) { await ukur(page, 'w2-sheet-transaksi'); await tutup(page); break; }
  }
  await ctx.close();
}

// ── B) MODE BENDAHARA (mock read-only) — semua form & dialog ───────────
{
  const sess = sesiPalsu();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript(({ ref, s }) => {
    localStorage.setItem('hadiran-welcome-v2', '1');
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
  }, { ref: REF, s: sess });
  await ctx.route('**/rest/v1/**', (route) => {
    const req = route.request(); const m = req.method();
    const baca = m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
    if (!baca) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"audit: tulis diblokir"}' });
    return route.continue({ headers: { ...req.headers(), authorization: `Bearer ${ANON}`, apikey: ANON } });
  });
  await ctx.route('**/auth/v1/**', (route) => {
    const u = route.request().url();
    if (u.includes('/logout')) return route.fulfill({ status: 204, body: '' });
    if (u.includes('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sess.user) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sess) });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));
  await page.goto(URL_APP, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(700);
  await ukur(page, 'b1-menu-header');
  await tutup(page);

  await keTab(page, 'Hadiran');
  const setor = page.getByRole('button', { name: /Setor ke Kas RT/i });
  if (await setor.count()) { await setor.first().click(); await page.waitForTimeout(1000); await ukur(page, 'b2-modal-setor'); await tutup(page); }
  const ekspor = page.getByRole('button', { name: /Ekspor/i });
  if (await ekspor.count()) { await ekspor.first().click(); await page.waitForTimeout(800); await ukur(page, 'b3-menu-ekspor'); await tutup(page); }

  await keTab(page, 'Kas RT');
  const tambah = page.getByRole('button', { name: /Tambah transaksi Kas RT/i });
  if (await tambah.count()) { await tambah.first().click(); await page.waitForTimeout(1000); await ukur(page, 'b4-modal-kas-rt'); await tutup(page); }
  const target = page.getByRole('button', { name: /Ubah target/i });
  if (await target.count()) { await target.first().click(); await page.waitForTimeout(900); await ukur(page, 'b5-sheet-target'); await tutup(page); }

  // Menu aksi baris tarikan → sheet "Revisi jadwal"
  await keTab(page, 'Jadwal');
  const aksi = page.getByRole('button', { name: /Aksi lainnya tarikan/i }).first();
  if (await aksi.count()) {
    await aksi.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    await aksi.click({ force: true });
    await page.waitForTimeout(1000);
    await ukur(page, 'b6-menu-aksi-tarikan');
    const revisi = page.locator('[role="dialog"] button, [role="menu"] button').filter({ hasText: /Revisi jadwal/i }).first();
    if (await revisi.count()) { await revisi.click({ force: true }); await page.waitForTimeout(1400); await ukur(page, 'b7-sheet-revisi-jadwal'); }
    await tutup(page);
  }

  // Editor absensi = VIEW penuh (bukan dialog) — layar terpadat sisi bendahara.
  const proses = page.getByRole('button', { name: /Proses tarikan/i }).first();
  if (await proses.count()) {
    await proses.click({ force: true });
    await page.waitForTimeout(3000);
    await ukur(page, 'b8-absensi-view', { wajibDialog: false });
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(800);
    await ukur(page, 'b9-absensi-gulir', { wajibDialog: false });
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(900);
  }

  // ConfirmDestruktif (hapus talangan) — baris harus dibuka dulu.
  await keTab(page, 'Talangan');
  await page.locator('main button').filter({ hasText: /belum lunas/ }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);
  const hapus = page.getByRole('button', { name: /Hapus data talangan/i }).first();
  if (await hapus.count()) {
    await hapus.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    await hapus.click({ force: true });
    await page.waitForTimeout(1200);
    await ukur(page, 'b10-confirm-destruktif');
    await tutup(page);
  }

  // Kelola Anggota → form tambah anggota
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(700);
  const mn = page.getByRole('menu').getByText('Kelola Anggota', { exact: false });
  if (await mn.count()) {
    await mn.first().click();
    await page.waitForTimeout(2500);
    const tbh = page.getByRole('button', { name: /Tambah [Aa]nggota/ });
    if (await tbh.count()) { await tbh.first().click(); await page.waitForTimeout(1000); await ukur(page, 'b11-sheet-anggota'); await tutup(page); }
  }
  await ctx.close();
}

await browser.close();
console.log(`\n=== ${diukur} permukaan diukur @${W}\u00d7${H} · ${gagal} bermasalah ===`);
process.exit(gagal ? 1 : 0);
