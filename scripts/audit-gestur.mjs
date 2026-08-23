// Audit GESTUR: apakah gestur jempol berhenti di lapisan yang menerimanya.
//
// Kenapa alat sendiri. `audit:sentuh` mengukur LUAS area jempol tiap kontrol —
// dan itu satu-satunya sapuan yang namanya menyebut sentuhan. Tak satu pun dari
// 20 sapuan repo ini pernah benar-benar MENGIRIM sentuhan: semuanya memakai
// `click()` Playwright (peristiwa pointer/mouse). Padahal jempol adalah SATU-
// SATUNYA cara warga memakai app ini, dan di atasnya hidup EMPAT sistem gestur
// yang saling bertetangga: `useSwipeNavigate` (geser mendatar = ganti tab),
// `PullToRefresh` (tarik bawah di puncak), `useDragDismiss` (tarik bawah panel =
// tutup), dan seret carousel Beranda.
//
// Yang tak terlihat dari satu berkas pun: `PullToRefresh` dan `useSwipeNavigate`
// membungkus KONTEN HALAMAN di `App.tsx`, sedangkan sheet/overlay/konfirmasi
// dirender INLINE di dalam JSX halamannya. `position: fixed` memindahkan tempat
// elemen DICAT, **bukan leluhurnya di DOM** — jadi sentuhan di atas sheet modal
// tetap menggelembung sampai ke handler tingkat App.
//
// Akibatnya terukur (23 Agu, 390px): geser mendatar di ATAS sheet "Detail
// transaksi" memindahkan tab di BELAKANGNYA, Beranda → Jadwal, dan sheet-nya
// ikut lenyap karena halamannya di-unmount. Satu gestur merusak dua hal, dan
// yang disentuh warga justru permukaan modal ber-scrim.
//
// Bahwa kebocoran ini NYATA & sudah dikenal terbukti dari `BannerCarousel`:
// ia memasang `onTouchStart={(e) => e.stopPropagation()}` persis untuk mencegah
// seret carousel ikut memindahkan tab. Satu komponen dijaga; lapisan tidak.
// Menu Header & InfoTip kebetulan AMAN — keduanya `createPortal` ke <body>,
// jadi ada di luar subtree pembungkus. Keamanannya kebetulan STRUKTURAL, bukan
// keputusan; lapisan berikutnya yang dirender inline akan bocor lagi.
//
// Bagian G1 (kontrol) WAJIB ADA: geser di halaman TANPA lapisan HARUS
// memindahkan tab. Tanpa itu, "nol temuan" bisa berarti "sapuan tak pernah
// mengirim satu sentuhan pun" — persis kelas populasi-salah yang sudah 20 kali
// kena di repo ini.
//
// Pakai:  npm run audit:gestur
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
// VALIDASI. Sapuan ini SENGAJA tak punya flag MUTASI, dan itu bukan kelalaian:
//   (a) G1 kontrol jalan di SETIAP eksekusi dan membuktikan probe masih sanggup
//       menggerakkan tab. Itu lebih kuat daripada flag yang harus diingat orang
//       — dan ia langsung menangkap "obat" yang curang: kalau penjaganya
//       mematikan swipe sama sekali, G1 merah seketika.
//   (b) Bukti beban = sebelum/sesudah: 10 dari 10 lapisan tembus sebelum
//       penjaga dipasang, 0 sesudahnya, dgn G1 tetap hijau di kedua sisi.
//   Flag `keBody` percobaan pertama DIBUANG: sesudah penjaganya ada di
//   `onTouchStart`, membidik ke <body> pun ikut ditolak — jadi ia cuma akan
//   melaporkan "nol temuan" dan terbaca seperti probe rusak.
import { chromium } from 'playwright';
import { newCtx, loginWarga } from './lib/audit-harness.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const JAUH = !/localhost|127\.0\.0\.1/.test(APP);
const NAV_MS = JAUH ? 90000 : 30000;
const LAPISAN = '[role="dialog"],[role="menu"],[role="listbox"]';

const temuan = [];
const probeCacat = [];
const dilewat = [];
let diuji = 0;
let diujiTarik = 0;
const catat = (nama, pesan) => { temuan.push({ nama, pesan }); console.log(`  ✗ ${nama}: ${pesan}`); };

/* `swipeTab` di App.tsx DIJEPIT di kedua ujung (`if (next) changeTab(next)`),
   jadi geser "ke tab berikutnya" saat sedang di tab TERAKHIR tak mengubah apa
   pun — dan sapuan akan melaporkan lapisan di sana "aman" padahal gesturnya
   tetap tembus. Vonis harus diambil dgn arah yang PUNYA tujuan. */
const arahBerguna = (page) => page.evaluate(() => {
  const bs = [...document.querySelectorAll('nav button')];
  const i = bs.findIndex((b) => b.getAttribute('aria-current') === 'page');
  return i >= 0 && i === bs.length - 1 ? -1 : 1;
});

const tabAktif = (page) => page.evaluate(() => document.querySelector('nav [aria-current="page"]')?.innerText?.trim() || '');
const lapisanNama = (page) => page.evaluate((sel) => [...document.querySelectorAll(sel)]
  .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed')
  .map((el) => el.getAttribute('aria-label') || el.getAttribute('role')), LAPISAN);

/** Kirim geser MENDATAR sungguhan (touchstart/move/end).
 *
 *  Sasarannya ditentukan lewat `document.elementFromPoint` — HIT-TEST NYATA,
 *  bukan selector. Percobaan pertama (23 Agu) menembak `#root`, dan itu justru
 *  LELUHUR pembungkus `{...swipe}`: peristiwa menggelembung ke ATAS, jadi
 *  handler App tak pernah kebagian dan G1 kontrol gagal. Jari warga tak pernah
 *  "mengenai #root" — ia mengenai apa pun yang tercat paling atas di titik itu,
 *  dan itu yang harus ditiru. (Disiplin yang sama sudah dibayar `audit:sentuh`:
 *  ukur lewat elementFromPoint, jangan percaya geometri/selector.)
 *
 */
async function geserMendatar(page, rectDari, frac = 0.5, arah = 1) {
  return page.evaluate(({ sel, f, a }) => {
    let y, x0;
    if (sel) {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, alasan: 'lapisan tak ada' };
      const r = el.getBoundingClientRect();
      y = Math.round(r.top + Math.min(r.height * 0.4, 200));
      x0 = a > 0 ? Math.round(Math.min(r.right, innerWidth) - 25) : Math.round(Math.max(r.left, 0) + 25);
    } else {
      y = Math.round(innerHeight * f);
      x0 = a > 0 ? innerWidth - 25 : 25;
    }
    const x1 = x0 - a * 240;                    // 240px, jauh di atas ambang 64px
    const target = document.elementFromPoint(x0, y) || document.body;
    const mk = (x) => new Touch({ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y });
    const fire = (tipe, x, lepas) => {
      const t = mk(x);
      target.dispatchEvent(new TouchEvent(tipe, { bubbles: true, cancelable: true,
        touches: lepas ? [] : [t], targetTouches: lepas ? [] : [t], changedTouches: [t] }));
    };
    fire('touchstart', x0, false);
    for (let i = 1; i <= 8; i++) fire('touchmove', x0 + (x1 - x0) * i / 8, false);
    fire('touchend', x1, true);
    return { ok: true, sasaran: target.tagName + '.' + String(target.className).slice(0, 40) };
  }, { sel: rectDari, f: frac, a: arah });
}

/* Tunggu SKELETON habis, bukan jeda tetap. Run produksi pertama (23 Agu) masih
   mencetak skeleton saat sapuan mulai berburu pemicu — barisan transaksi belum
   ada, `klik()` menjawab false, dan EMPAT lapisan warga masuk daftar "dilewat".
   Nol temuan dari populasi separuh bukan hasil; itu sapuan yang menyusutkan
   dirinya sendiri (cacat ke-20 punya bentuk yang sama). */
async function tungguIsiNyata(page, batasMs = 25000) {
  const habis = Date.now() + batasMs;
  while (Date.now() < habis) {
    const n = await page.locator('.skeleton, .skeleton-bar').count().catch(() => 0);
    if (n === 0) { await page.waitForTimeout(600); return true; }
    await page.waitForTimeout(500);
  }
  return false;
}

/** Tarik ke BAWAH sungguhan, lalu laporkan apakah indikator pull-to-refresh
 *  sempat bergerak selama tarikan.
 *
 *  `sel` null = tarik di halaman biasa (uji KONTROL). Kalau ada lapisan, titik
 *  mulainya sengaja 60px DI BAWAH tepi atas panel: strip gagang duduk di sana
 *  dan ia memang pemilik sah gestur tarik-tutup (`useDragDismiss`). Yang diuji
 *  di sini BADAN sheet — bagian yang tak dimiliki siapa pun, dan karena itu
 *  tarikannya menggelembung terus ke pembungkus tingkat-App.
 *
 *  Percobaan pertama (23 Agu) menarik di sheet Beranda dan gagal mengukur:
 *  sheet itu salah satu dari DUA yang memasang handler di SELURUH panel, jadi
 *  tarikannya keburu dimakan panel itu sendiri. Populasi yang benar = sheet
 *  ber-gagang (11 dari 13 call-site). */
async function tarikBawah(page, sel) {
  return page.evaluate(async ({ s }) => {
    const ind = document.querySelector('[data-ptr="indikator"]');
    if (!ind) return { ok: false, alasan: 'indikator PTR tak ada di DOM' };
    let x, y0;
    if (s) {
      const el = document.querySelector(s);
      if (!el) return { ok: false, alasan: 'lapisan tak ada' };
      const r = el.getBoundingClientRect();
      x = Math.round(r.left + r.width / 2);
      y0 = Math.round(r.top + 60);
    } else {
      x = Math.round(innerWidth / 2);
      y0 = Math.round(innerHeight * 0.35);
    }
    const target = document.elementFromPoint(x, y0) || document.body;
    const mk = (y) => new Touch({ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y });
    const fire = (tipe, y, lepas) => {
      const t = mk(y);
      target.dispatchEvent(new TouchEvent(tipe, { bubbles: true, cancelable: true,
        touches: lepas ? [] : [t], targetTouches: lepas ? [] : [t], changedTouches: [t] }));
    };
    const geser = (tr) => { const m = /matrix\(([^)]+)\)/.exec(tr); return m ? Math.abs(parseFloat(m[1].split(',')[5])) : 0; };
    /* Tiap touchmove WAJIB dipisah satu frame. `PullToRefresh.onMove` memanggil
       `setPull` — state React — jadi 14 gerakan dalam SATU task tak pernah
       memberi React kesempatan me-render, dan transform yang dibaca selalu
       nilai SEBELUM tarikan (puncak 0px, terbaca seperti "PTR tak menyala").
       Ini kebalikan disiplin `audit:tulis`, dan bedanya disengaja: di sana yang
       diuji dua ketukan dalam SATU task (celah sebelum render), di sini yang
       ditiru satu jari yang menarik SELAMA BANYAK FRAME — memisahkannya justru
       lebih setia pada gerakan aslinya. */
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    fire('touchstart', y0, false);
    let puncak = 0;
    for (let i = 1; i <= 14; i++) {
      fire('touchmove', y0 + i * 22, false);
      await frame();
      puncak = Math.max(puncak, geser(getComputedStyle(ind).transform));
    }
    fire('touchend', y0 + 14 * 22, true);
    return { ok: true, scrollY: Math.round(scrollY), puncakPx: Math.round(puncak),
             sasaran: target.tagName + '.' + String(target.className).slice(0, 40) };
  }, { s: sel });
}

async function muat(page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: NAV_MS });
  await page.waitForTimeout(1500);
  if (await page.locator('#warga-password').count()) await loginWarga(page);
  await page.waitForTimeout(1200);
  await tungguIsiNyata(page);
}

async function keTab(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('nav button', { hasText: label }).first().click({ force: true, timeout: 8000 })
    .catch(() => page.locator('nav button', { hasText: label }).first().evaluate((el) => el.click()));
  await page.waitForTimeout(1200);
  await tungguIsiNyata(page);
}

const klik = (page, loc) => async () => {
  const l = loc();
  if (!(await l.count())) return false;
  const el = l.first();
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' })).catch(() => {});
  await page.waitForTimeout(350);
  await el.click({ force: true, timeout: 6000 }).catch(() => el.evaluate((e) => e.click()).catch(() => {}));
  return true;
};

/** G1 — KONTROL. Geser di halaman tanpa lapisan WAJIB memindahkan tab.
 *  Kalau ini gagal, seluruh vonis "aman" di G2 tak berarti apa-apa. */
async function ujiKontrol(page, peran) {
  /* Gulir turun dulu: di puncak Beranda titik tengah layar jatuh di dalam
     BannerCarousel, dan carousel SATU-SATUNYA komponen yang memang memasang
     `stopPropagation` di touchstart (supaya seret kartu tak memindahkan tab).
     Membidik ke sana lalu menyimpulkan "sentuhan tak sampai" = menyalahkan
     komponen yang justru sedang bekerja benar — cacat aim, bukan cacat app. */
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(800);
  const t0 = await tabAktif(page);
  const jejak = [];
  for (const frac of [0.35, 0.55, 0.75]) {
    const g = await geserMendatar(page, null, frac);
    await page.waitForTimeout(1500);
    const t1 = await tabAktif(page);
    jejak.push(`${Math.round(frac * 100)}%→${g.sasaran}`);
    if (t1 !== t0) {
      console.log(`  ✓ G1 kontrol: geser memindahkan tab ${t0} → ${t1} (sentuhan sampai; ${jejak.at(-1)})`);
      await keTab(page, t0);
      return true;
    }
  }
  probeCacat.push(`${peran}/G1 KONTROL GAGAL: geser di halaman TANPA lapisan tak memindahkan tab (${t0}) ` +
    `di tiga ketinggian [${jejak.join(', ')}] — sentuhannya tak sampai, jadi semua vonis "aman" di G2 palsu. ` +
    'Perbaiki ALATNYA dulu.');
  return false;
}

/** G3-KONTROL. Tarik bawah di halaman TANPA lapisan (scrollY 0) WAJIB
 *  menggerakkan indikator PTR. Tanpa ini, "aman" di G3 bisa berarti tarikannya
 *  tak pernah sampai. Ambang gerak 4px: di bawah itu subpiksel/anti-alias. */
async function ujiKontrolTarik(page, peran) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  const g = await tarikBawah(page, null);
  await page.waitForTimeout(1200);
  if (!g.ok || g.puncakPx <= 4) {
    probeCacat.push(`${peran}/G3 KONTROL GAGAL: tarik bawah di halaman tanpa lapisan TAK menggerakkan ` +
      `indikator PTR (puncak ${g.puncakPx ?? '-'}px, scrollY ${g.scrollY ?? '-'}, ${g.alasan || g.sasaran}) — ` +
      'vonis "aman" di G3 palsu. Perbaiki ALATNYA dulu.');
    return false;
  }
  console.log(`  ✓ G3 kontrol: tarik bawah menggerakkan indikator PTR ${g.puncakPx}px (tarikan sampai)`);
  return true;
}

/** G3 — tarik bawah di BADAN lapisan tak boleh menyalakan pull-to-refresh
 *  halaman di belakangnya. */
async function ujiTarik(page, peran, nama, buka) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  if (!(await buka())) { dilewat.push(`${peran}/${nama}(tarik)`); return; }
  await page.waitForTimeout(900);
  const nm = await lapisanNama(page);
  if (!nm.length) { probeCacat.push(`${peran}/${nama}(tarik): lapisan tak terbuka`); return; }
  diujiTarik++;

  const g = await tarikBawah(page, LAPISAN);
  await page.waitForTimeout(1200);
  if (!g.ok) { probeCacat.push(`${peran}/${nama}(tarik): ${g.alasan}`); return; }
  if (g.scrollY === 0 && g.puncakPx > 4) {
    catat(`${peran}/${nama}`,
      `TARIKAN TEMBUS — menarik ke bawah di BADAN lapisan [${nm.join(' + ')}] menyalakan pull-to-refresh ` +
      `halaman di BELAKANGNYA (indikator bergerak ${g.puncakPx}px, scrollY 0). Warga menarik isi sheet; ` +
      'yang muncul justru pemintal muat-ulang milik halaman di baliknya.');
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(700);
}

/** G2 — geser mendatar di ATAS lapisan tak boleh menyentuh halaman di belakangnya. */
async function ujiLapisan(page, peran, nama, buka, pulih) {
  if (!(await buka())) { dilewat.push(`${peran}/${nama}`); return; }
  await page.waitForTimeout(900);
  const nm = await lapisanNama(page);
  if (!nm.length) { probeCacat.push(`${peran}/${nama}: lapisan tak terbuka`); return; }
  diuji++;

  const tabSebelum = await tabAktif(page);
  const arah = await arahBerguna(page);
  const g = await geserMendatar(page, LAPISAN, 0.5, arah);
  if (!g.ok) { probeCacat.push(`${peran}/${nama}: ${g.alasan}`); return; }
  await page.waitForTimeout(1600);

  const tabSesudah = await tabAktif(page);
  const masih = (await lapisanNama(page)).length > 0;
  if (tabSesudah !== tabSebelum) {
    catat(`${peran}/${nama}`,
      `GESTUR TEMBUS — geser mendatar di ATAS lapisan [${nm.join(' + ')}] memindahkan tab di BELAKANGNYA ` +
      `(${tabSebelum} → ${tabSesudah})${masih ? '' : ', dan lapisannya ikut lenyap karena halamannya di-unmount'}. ` +
      'Warga menyentuh permukaan modal ber-scrim; yang bergerak justru halaman di baliknya.');
    await pulih();
    return;
  }
  if (!masih) catat(`${peran}/${nama}`, `lapisan [${nm.join(' + ')}] TERTUTUP oleh geser mendatar — geser samping bukan gerakan tutup`);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(700);
}

const browser = await chromium.launch();
for (const peran of ['warga', 'bendahara']) {
  const bendahara = peran === 'bendahara';
  const { ctx, page } = await newCtx(browser, 'light', { bendahara, sentuh: true });
  page.setDefaultNavigationTimeout(NAV_MS);
  console.log(`\n── ${peran} ─────────────────`);
  await muat(page);

  let tabSekarang = '';
  const pulih = async () => { await muat(page); if (tabSekarang) await keTab(page, tabSekarang); };
  const uji = async (nama, buka) => {
    if (tabSekarang && (await tabAktif(page)) !== tabSekarang) await keTab(page, tabSekarang);
    await ujiLapisan(page, peran, nama, buka, pulih);
  };

  if (!(await ujiKontrol(page, peran))) { await ctx.close(); continue; }
  /* Kontrol KEDUA, di tab NON-Beranda. Bukan pengulangan: App mendaftarkan
     entri TAB ke back-stack yang sama, jadi penjaga gestur yang menghitung
     stack mentah-mentah akan mematikan swipe & PTR di SEMUA tab selain
     Beranda — dan kontrol yang cuma jalan di Beranda tak akan melihatnya.
     Persis itu yang lolos 23 Agu dan terlanjur ter-deploy. */
  await keTab(page, 'Jadwal');
  if (!(await ujiKontrol(page, `${peran}@Jadwal`))) { await ctx.close(); continue; }
  const diujiAwal = diuji;
  await keTab(page, 'Beranda'); tabSekarang = 'Beranda';

  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(700);
  await uji('sheet-detail-transaksi', klik(page, () => page.locator('button').filter({ hasText: /[+-]Rp/ })));
  await uji('popover-urutan', klik(page, () => page.getByRole('button', { name: /^Urutkan/i })));

  tabSekarang = 'Kas RT'; await keTab(page, 'Kas RT');
  await uji('menu-ekspor', klik(page, () => page.getByRole('button', { name: /^Ekspor/i })));
  await uji('sheet-aksi-baris', klik(page, () => page.getByRole('button', { name: /^(Aksi|Lihat detail):/i })));
  if (bendahara) {
    await uji('sheet-tambah', klik(page, () => page.getByRole('button', { name: /Tambah transaksi Kas RT/i })));
    await uji('sheet-target', klik(page, () => page.getByRole('button', { name: /^Ubah target|^Tetapkan target/i })));
  }

  /* G3 — populasi = sheet ber-GAGANG (11 dari 13 call-site `useDragDismiss`).
     Sheet yang handler-nya di SELURUH panel (Beranda detail-transaksi &
     panduan InstallPrompt) SENGAJA di luar populasi: tarikan di sana memang
     dimiliki panelnya sendiri, jadi mengujinya = mengukur `useDragDismiss`,
     bukan kebocoran PTR. */
  if (await ujiKontrolTarik(page, peran)) {
    if (bendahara) {
      await keTab(page, 'Kas RT');
      await ujiTarik(page, peran, 'sheet-tambah', klik(page, () => page.getByRole('button', { name: /Tambah transaksi Kas RT/i })));
      await ujiTarik(page, peran, 'sheet-target', klik(page, () => page.getByRole('button', { name: /^Ubah target|^Tetapkan target/i })));
    }
    await keTab(page, 'Hadiran');
    await ujiTarik(page, peran, 'sheet-detail-tarikan', klik(page, () => page.getByRole('button', { name: /Lihat detail/i })));
  }
  /* Satu peran yang menyumbang NOL lapisan tak boleh terbaca sebagai "aman".
     Laporan hijau dari populasi kosong itu kepercayaan palsu — kelas yang paling
     dihindari repo ini. */
  if (diuji === diujiAwal) {
    probeCacat.push(`${peran}: NOL lapisan teruji — semua pemicu meleset. Vonis peran ini TIDAK ADA, bukan "aman".`);
  }
  await ctx.close();
}
await browser.close();

console.log(`\n=== G2 ${diuji} lapisan digeser · G3 ${diujiTarik} lapisan ditarik @390px · ${temuan.length} bermasalah ===`);
if (dilewat.length) console.log(`    dilewat: ${dilewat.join(', ')}`);
if (probeCacat.length) { console.log('\nPROBE CACAT:'); probeCacat.forEach((p) => console.log('  ! ' + p)); }
if (temuan.length) { console.log('\nRINCIAN'); temuan.forEach((t) => console.log(`  [${t.nama}]\n      ${t.pesan}`)); }
process.exit(temuan.length || probeCacat.length ? 1 : 0);
