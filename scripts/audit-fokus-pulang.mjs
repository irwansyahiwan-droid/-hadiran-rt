// Audit FOKUS PULANG — overlay yang dibuka dari Menu mengembalikan fokus ke
// tombol "Menu" saat ditutup (§2.4.3 Focus Order, pola WAI-ARIA menu button).
//
// Kenapa alat sendiri (19 Okt 2026): `useDialog` mengembalikan fokus ke
// `activeElement` saat dialog dibuka. Untuk overlay dari Menu itu ITEM MENU,
// yang lenyap bersama menunya — jadi `focus()` diam-diam gagal dan fokus jatuh
// ke <body>. Terukur 24/24 penutupan (8 overlay × Escape/Kembali/Back HP) di
// kedua peran, tak satu pun pulang. Pengguna papan ketik & pembaca layar lalu
// mulai lagi dari puncak dokumen tiap menutup Kartu Saya, Riwayat, Tentang….
// `audit:papan-ketik` bagian B memang menguji "fokus kembali ke pemicu", tapi
// hanya pada 6 lapisan yang dibuka dari tombol yang TETAP ADA; overlay Menu tak
// pernah masuk populasinya (berkas itu dikunci, jadi penjaganya hidup di sini).
// Obatnya di `Header.tsx`: item menu memfokuskan tombol Menu SEBELUM aksinya.
//
// Populasi dipungut dari MENU YANG DIRENDER, bukan daftar tulis-tangan: tiap
// item kecuali aksi non-lapisan (NON_LAPISAN) WAJIB membuka dialog — overlay
// baru otomatis ikut terukur. Item yang tak membuka dialog = PROBE CACAT.
//
// Vonis per penutupan: fokus di tombol "Menu" · tak ada dialog tersisa ·
// penutupan lewat KETUKAN (Kembali / Back HP) tak memunculkan cincin fokus
// (`:focus-visible`) — memulangkan fokus tak boleh membuat pengguna sentuh
// melihat cincin yang tak pernah mereka minta. Escape (papan ketik) boleh.
//
// BAGIAN B (19 Okt 2026, hari yang sama): AKSI YANG MELENYAPKAN TOMBOLNYA
// SENDIRI. Kelas yang sama di luar Menu — terukur 11 kehilangan fokus: tombol
// "×" bersihkan cari (7 tempat; di overlay fokusnya bahkan KELUAR dari dialog),
// tautan di konten Beranda yang memindah tab ("Lihat semua"), dan Kartu Saya
// (pilih nama, "Bukan saya?"). Diaktifkan lewat PAPAN KETIK (fokus + Enter):
// di HP sentuh × sengaja TIDAK memfokuskan kolomnya (papan ketik layar akan
// menutupi daftar), jadi yang diuji jalur yang memang berjanji memindah fokus.
// Vonis: fokus tak di <body>, tak keluar dari dialog yang terbuka, dan
// mendarat di sasarannya (kolom cari · judul halaman · judul layar kartu).
//
// Pakai:  npm run audit:fokus-pulang
//   MUTASI=1 → `focus()` pada tombol Menu dibisukan (mengembalikan bug asli);
//              SEMUA penutupan A wajib merah, kalau tidak PROBE CACAT (exit 2).
//   MUTASI=2 → `focus()` pada SASARAN bagian B dibisukan (kolom cari, judul);
//              SEMUA aksi B wajib merah.
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI === '1';
const MUTASI2 = process.env.MUTASI === '2';
const NON_LAPISAN = [/^Bagikan halaman ini$/, /^Mode (Gelap|Terang)$/, /^Keluar$/];
const CARA = ['Escape', 'Kembali', 'Back HP'];

const temuan = [];
const cacat = [];
let diuji = 0;
let aksiDiuji = 0;
const temuanB = [];

const bacaFokus = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return {
    nama: (a?.getAttribute('aria-label') || a?.tagName || '').slice(0, 40),
    cincin: !!a?.matches?.(':focus-visible'),
    dialog: document.querySelectorAll('[role="dialog"]').length,
  };
});

async function bukaMenu(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menu').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
}

const browser = await chromium.launch();
for (const peran of ['warga', 'bendahara']) {
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: peran === 'bendahara' });
  await page.setViewportSize({ width: 390, height: 844 });
  if (MUTASI2) {
    await ctx.addInitScript(() => {
      const asli = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (o) {
        const sasaran = (this.tagName === 'INPUT' && /^Cari/.test(this.getAttribute('placeholder') || ''))
          || (this.tagName === 'H1' && this.closest('main')) || /^kartu-saya-/.test(this.id || '');
        if (sasaran) { window.__mutasi = (window.__mutasi || 0) + 1; return; }
        return asli.call(this, o);
      };
    });
  }
  if (MUTASI) {
    await ctx.addInitScript(() => {
      const asli = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (o) {
        if (this.getAttribute?.('aria-label') === 'Menu') { window.__mutasi = (window.__mutasi || 0) + 1; return; }
        return asli.call(this, o);
      };
    });
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  if (peran === 'warga') await loginWarga(page);
  await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);

  await bukaMenu(page);
  const semua = (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const lapisan = semua.filter((t) => !NON_LAPISAN.some((r) => r.test(t)));
  console.log(`[${peran}] menu: ${semua.length} item · ${lapisan.length} overlay: ${lapisan.join(' · ')}`);
  if (!lapisan.length) cacat.push(`${peran}: menu tak memuat satu overlay pun`);

  for (const item of lapisan) {
    for (const cara of CARA) {
      await bukaMenu(page);
      await page.getByRole('menuitem', { name: item, exact: true }).click();
      try {
        await page.locator('[role="dialog"]').last().waitFor({ timeout: 6000 });
      } catch {
        cacat.push(`${peran}: "${item}" tak membuka dialog`);
        await page.keyboard.press('Escape').catch(() => {});
        break;
      }
      await page.waitForTimeout(700);
      if (cara === 'Escape') await page.keyboard.press('Escape');
      else if (cara === 'Kembali') await page.locator('[role="dialog"]').last().getByRole('button', { name: 'Kembali' }).click();
      else await page.goBack();
      await page.waitForTimeout(900);
      const f = await bacaFokus(page);
      diuji++;
      const salah = [];
      if (f.dialog) salah.push(`${f.dialog} dialog tersisa`);
      if (f.nama !== 'Menu') salah.push(`fokus di "${f.nama}"`);
      if (cara !== 'Escape' && f.cincin) salah.push('cincin fokus muncul sesudah ketukan');
      if (salah.length) temuan.push(`[${peran}] ${item} · ${cara} → ${salah.join(' · ')}`);
      if (f.dialog) { await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
    }
  }
  // ── B. aksi yang melenyapkan tombolnya sendiri ──
  const fokusB = () => page.evaluate(() => {
    const a = document.activeElement;
    const d = [...document.querySelectorAll('[role="dialog"]')].pop();
    return {
      tag: a?.tagName, id: a?.id || '', ph: a?.getAttribute?.('placeholder') || '',
      nama: (a?.getAttribute?.('aria-label') || a?.innerText || '').trim().slice(0, 30),
      keluarDialog: d ? !d.contains(a) : false,
    };
  });
  const aktifkan = async (loc) => { await loc.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(900); };
  const vonisB = (aksi, f, cocok) => {
    aksiDiuji++;
    const salah = [];
    if (f.tag === 'BODY') salah.push('fokus jatuh ke <body>');
    else if (f.keluarDialog) salah.push(`fokus KELUAR dari dialog ke ${f.tag} "${f.nama}"`);
    else if (!cocok(f)) salah.push(`fokus di ${f.tag} "${f.nama}"`);
    if (salah.length) temuanB.push(`[${peran}] ${aksi} → ${salah.join(' · ')}`);
  };
  async function ujiBersihkan(layar, lingkup) {
    const root = lingkup ? page.locator(lingkup).last() : page.locator('main');
    const kolom = root.locator('input[placeholder^="Cari"]');
    const n = await kolom.count();
    for (let i = 0; i < n; i++) {
      const k = kolom.nth(i);
      if (!(await k.isVisible())) continue;
      const ph = await k.getAttribute('placeholder');
      await k.fill('a');
      await page.waitForTimeout(400);
      const x = k.locator('xpath=..').getByRole('button', { name: /^Bersihkan/ });
      if (!(await x.count())) { cacat.push(`${peran}: ${layar} "${ph}" tanpa tombol ×`); continue; }
      await aktifkan(x.first());
      vonisB(`${layar} · × "${ph}"`, await fokusB(), (f) => f.tag === 'INPUT' && f.ph === ph);
    }
    return n;
  }
  const TAB = peran === 'warga' ? ['Jadwal', 'Hadiran', 'Kas RT'] : ['Jadwal', 'Talangan', 'Hadiran', 'Kas RT'];
  let kolomTotal = 0;
  for (const t of TAB) {
    await gotoTab(page, t); // bar nav bisa TUCKED sesudah gulir → klik biasa ditolak
    kolomTotal += await ujiBersihkan(t);
  }
  // Tautan di konten Beranda yang memindah tab (Lihat semua, kaki hero, CTA slide aktif).
  await gotoTab(page, 'Beranda');
  /* Tautan dipilih lewat URUTAN, ditandai ulang tiap kali Beranda dibuka —
     bukan lewat label: label kaki hero memuat baris baru ("Terkumpul\nRp…")
     dan tak bisa dipakai di selektor. */
  const tandai = () => page.evaluate(() => {
    const as = [...document.querySelectorAll('main a[href^="/"]:not([tabindex="-1"])')].filter((a) => a.offsetParent);
    as.forEach((a, i) => a.setAttribute('data-fp', String(i)));
    return as.map((a) => (a.getAttribute('aria-label') || a.innerText).replace(/\s+/g, ' ').trim());
  });
  const label = await tandai();
  if (!label.length) cacat.push(`${peran}: Beranda tanpa satu tautan tab pun`);
  for (let i = 0; i < label.length; i++) {
    await gotoTab(page, 'Beranda');
    const kini = await tandai();
    if (kini[i] !== label[i]) { cacat.push(`${peran}: tautan Beranda #${i} berubah ("${label[i]}" → "${kini[i]}")`); continue; }
    await aktifkan(page.locator(`[data-fp="${i}"]`));
    await page.waitForTimeout(800);
    vonisB(`Beranda · tautan "${label[i]}"`, await fokusB(), (f) => f.tag === 'H1');
  }
  // Overlay ber-kolom cari + Kartu Saya.
  const OVERLAY_CARI = peran === 'warga' ? ['Riwayat Aktivitas'] : ['Riwayat Aktivitas', 'Kelola Anggota'];
  for (const ov of OVERLAY_CARI) {
    await bukaMenu(page);
    await page.getByRole('menuitem', { name: ov, exact: true }).click();
    await page.locator('[role="dialog"]').last().locator('input[placeholder^="Cari"]').first().waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    kolomTotal += await ujiBersihkan(ov, '[role="dialog"]');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  }
  if (peran === 'warga') {
    await bukaMenu(page);
    await page.getByRole('menuitem', { name: 'Kartu Saya', exact: true }).click();
    const dlg = page.locator('[role="dialog"][aria-label="Kartu saya"]');
    try { await dlg.locator('ul li button').first().waitFor({ timeout: 15000 }); } catch { cacat.push('warga: daftar Kartu Saya tak tampil'); }
    await page.waitForTimeout(500);
    kolomTotal += await ujiBersihkan('Kartu Saya', '[role="dialog"][aria-label="Kartu saya"]');
    await aktifkan(dlg.locator('ul li button').first());
    await dlg.locator('section[aria-label="Giliran Sohibul Bait"]').waitFor({ timeout: 15000 }).catch(() => cacat.push('warga: kartu tak terbuka'));
    await page.waitForTimeout(500);
    vonisB('Kartu Saya · pilih nama', await fokusB(), (f) => f.id === 'kartu-saya-nama');
    await aktifkan(dlg.getByRole('button', { name: 'Bukan saya?' }));
    vonisB('Kartu Saya · Bukan saya?', await fokusB(), (f) => f.id === 'kartu-saya-cari');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  if (!kolomTotal) cacat.push(`${peran}: nol kolom cari terukur`);
  console.log(`[${peran}] bagian B: ${kolomTotal} kolom cari · ${label.length} tautan Beranda`);

  if ((MUTASI || MUTASI2) && !(await page.evaluate(() => window.__mutasi || 0))) cacat.push(`${peran}: MUTASI tak pernah mendarat`);
  await ctx.close();
}
await browser.close();

console.log(`\n### fokus pulang ke tombol Menu${temuan.length ? '' : '  OK'}`);
temuan.forEach((t) => console.log('  ⚠ ' + t));
console.log(`\n### B. aksi yang melenyapkan tombolnya sendiri${temuanB.length ? '' : '  OK'}`);
temuanB.forEach((t) => console.log('  ⚠ ' + t));
const total = temuan.length + temuanB.length;
console.log(`\n=== FOKUS PULANG: ${diuji} penutupan diuji · ${aksiDiuji} aksi diuji · ${total} bermasalah ===`);
if (cacat.length) { console.log(`PROBE CACAT: ${cacat.join(' · ')}`); process.exit(2); }
if (MUTASI && temuan.length < diuji) { console.log(`PROBE CACAT: MUTASI=1 tapi hanya ${temuan.length} dari ${diuji} merah`); process.exit(2); }
if (MUTASI2 && temuanB.length < aksiDiuji) { console.log(`PROBE CACAT: MUTASI=2 tapi hanya ${temuanB.length} dari ${aksiDiuji} aksi merah`); process.exit(2); }
process.exit(total ? 1 : 0);
