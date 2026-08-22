// Audit MUNDUR: tombol Back HP pada tiap lapisan yang bisa ditutup.
//
// Kenapa alat sendiri — dan kenapa `audit:papan-ketik` justru titik butanya.
// Sapuan itu (bagian B) menguji disiplin fokus lapisan dan menekan ESCAPE, lalu
// melaporkan enam lapisan sehat. Laporannya benar. Tapi warga app ini membuka
// Hadiran RT dari Android, dan **tak satu pun dari mereka punya tombol Escape**.
// Jalan keluar yang benar-benar mereka pakai — Back HP / gestur geser dari tepi —
// tak pernah ditekan oleh satu pun dari 19 sapuan di repo ini. `audit:masuk`
// paling dekat: ia memuat ULANG halaman dan menekan Back SEKALI sesudah
// pemulihan sesi — satu jalur, di layar tanpa lapisan terbuka.
//
// Jadi kanon repo ini sebenarnya berbunyi: **Escape dan Back WAJIB menutup
// lapisan yang sama.** Harness bersama sudah menuliskannya sebagai fakta
// (`closeLayer`: "Escape (useDialog) → jaring Back HP (useBackDismiss)").
// Yang tak pernah ada: alat yang memeriksa apakah itu masih benar.
//
// Ternyata tidak. `useDialog` (Escape + perangkap fokus) dan `useBackDismiss`
// (back-stack) dipasang dari dua daftar call-site yang BERBEDA, dan selisihnya
// tak terlihat dari satu berkas pun — persis kelas cacat "lahir dari INTERAKSI
// keputusan yang masing-masing benar" yang dicatat memory mahal-lewat-perilaku.
//
// Taruhan tertingginya ConfirmDestruktif: gerbang pengaman SATU-SATUNYA untuk
// aksi merusak uang (hapus transaksi kas, batalkan tarikan). Ia dibuka DI ATAS
// sheet aksi yang tetap hidup (`setHapusRow(selectedRow)` — `selectedRow` tak
// dikosongkan), jadi Back di layar itu memanggil close milik SHEET, bukan
// dialognya: sheet lenyap, dialog merah bertahan sendirian, dan gerakan yang di
// seluruh Android berarti "batal" justru tak membatalkan apa pun. Tekan sekali
// lagi — stack lapisan sudah kosong — dan app KELUAR sementara konfirmasi hapus
// masih terpampang.
//
// Empat sifat, diuji sekaligus karena memperbaiki yang pertama gampang merusak
// sisanya (pelajaran useback-dismiss-strictmode-race: `back()` itu ASINKRON,
// `pushState` sinkron — urutan yang salah pernah membuat app blank total):
//   A1 TERDAFTAR   — membuka lapisan WAJIB mendorong satu entri history.
//   A2 BACK MENUTUP— Back menutup lapisan itu, dan app TETAP di layar.
//   B  TERATAS SAJA— saat bertumpuk, Back menutup yang PALING ATAS saja.
//   C  TAK NYANGKUT— tutup lewat UI/Escape mengembalikan history ke garis dasar
//                    (entri sisa = Back berikutnya "mati", warga menekan 2–3×).
//
// Garis dasar & deteksi "terlempar keluar" memakai SENTINEL: sapuan singgah di
// /landing.html dulu baru ke app, sehingga Back yang lolos dari app mendarat di
// halaman NYATA yang bisa dikenali — bukan about:blank yang ambigu (dan bukan
// no-op diam kalau app kebetulan entri pertama tab).
//
// Pakai:  npm run audit:mundur
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   MUTASI=1  → pushState & history.back dimatikan di halaman; tiap lapisan
//               kehilangan pendaftarannya → sapuan HARUS merah di A1 dan A2.
import { chromium } from 'playwright';
import { newCtx, loginWarga } from './lib/audit-harness.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const SENTINEL = `${APP.replace(/\/$/, '')}/landing.html`;
const MUTASI = process.env.MUTASI === '1';

const LAPISAN = '[role="dialog"],[role="menu"],[role="tooltip"],[role="listbox"]';

const temuan = [];
const probeCacat = [];
const dilewat = [];
let diuji = 0;

const catat = (layar, nama, pesan) => {
  temuan.push({ layar, nama, pesan });
  console.log(`  ✗ ${nama}: ${pesan}`);
};

// ── probe halaman ─────────────────────────────────────────────────────────
const histState = (page) => page.evaluate(() => JSON.stringify(history.state));
const lapisan = (page) =>
  page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed').length, LAPISAN);
const namaLapisan = (page) =>
  page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed')
    .map((el) => el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.tagName), LAPISAN);
const diApp = (page) => page.evaluate(() => !location.pathname.includes('landing'));
/* Tab aktif dibaca dari `aria-current="page"` di bar nav. Wajib ada: tanpa ini
   sapuan tak bisa membedakan "Back menutup lapisan" dari "Back MEMINDAHKAN TAB
   dan lapisannya ikut lenyap karena halamannya di-unmount" — dua peristiwa yang
   penghitung lapisan laporkan identik (n turun ke 0), padahal yang kedua justru
   cacat: satu ketukan Back membuang layar yang sedang dibaca warga. Percobaan
   pertama (22 Agu) tak punya probe ini, melaporkan menu Ekspor "cuma" tak
   terdaftar, LALU menjalankan sisa ujinya di halaman yang salah — 8 lapisan
   termasuk uji bertingkat ConfirmDestruktif diam-diam terlewat. */
const tabAktif = (page) =>
  page.evaluate(() => document.querySelector('nav [aria-current="page"]')?.innerText?.trim()
    || document.querySelector('nav button[aria-current="page"]')?.innerText?.trim() || '');
/* "Hidup" = #root masih mencetak layar. Menjaga regresi blank-total yang pernah
   nyata (memory useback-dismiss-strictmode-race), yang tak akan terlihat dari
   penghitung lapisan mana pun karena nol lapisan itu justru hasil yang benar. */
const appHidup = (page) =>
  page.evaluate(() => (document.getElementById('root')?.innerText || '').trim().length > 40);

async function bersihkan(page, n0) {
  for (let i = 0; i < 4; i++) {
    if ((await lapisan(page)) <= n0) return true;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(600);
  }
  return (await lapisan(page)) <= n0;
}

// ── penyiapan & pemulihan ─────────────────────────────────────────────────
async function muat(page, bendahara) {
  await page.goto(SENTINEL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  /* Gate warga hidup di sessionStorage (`hadiran-warga-sesi`, lihat memory
     warga-gate-sesi-tab), jadi pemulihan SESUDAH terlempar keluar mendarat di
     app yang MASIH masuk — memanggil loginWarga tanpa syarat bikin sapuan
     menunggu #warga-password yang takkan pernah datang lalu mati. */
  if (!bendahara && (await page.locator('#warga-password').count())) await loginWarga(page);
  await page.waitForTimeout(2500);
}

/* gotoTab harness memakai timeout 3,5 dtk & scroll ke atas — dipakai apa adanya
   supaya sapuan ini tak melenceng dari yang lain saat nav berubah. */
async function keTab(page, label) {
  if (!label) return;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('nav button', { hasText: label }).first().click({ force: true, timeout: 8000 })
    .catch(() => page.locator('nav button', { hasText: label }).first().evaluate((el) => el.click()));
  await page.waitForTimeout(3000);
}

// ── satu lapisan, empat sifat ─────────────────────────────────────────────
async function ujiLapisan(page, layar, nama, buka, pulih) {
  const dasar = await histState(page);
  const n0 = await lapisan(page);

  if (!(await buka())) { dilewat.push(`${layar}/${nama}`); return; }
  await page.waitForTimeout(900);
  if ((await lapisan(page)) <= n0) { probeCacat.push(`${layar}/${nama}: lapisan tak pernah terbuka`); return; }
  diuji++;

  // A1 — membuka lapisan wajib mendorong entri history
  const stlhBuka = await histState(page);
  if (stlhBuka === dasar) {
    catat(layar, nama, `TAK TERDAFTAR di back-stack — membuka lapisan tak mendorong entri history (state tetap ${dasar})`);
  }

  // C — tutup lewat UI (Escape) mengembalikan history ke garis dasar
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(900);
  if ((await lapisan(page)) <= n0) {
    const histEsc = await histState(page);
    if (histEsc !== dasar) {
      catat(layar, nama, `ENTRI NYANGKUT sesudah tutup lewat UI (${dasar} → ${histEsc}) — Back berikutnya tak berbuat apa-apa`);
    }
  }
  if (!(await bersihkan(page, n0))) { probeCacat.push(`${layar}/${nama}: lapisan tak mau tutup, ronde Back dilewat`); await pulih(); return; }

  // A2 — Back menutup lapisan, app tetap di layar
  if (!(await buka())) return;
  await page.waitForTimeout(900);
  const nBuka = await lapisan(page);
  if (nBuka <= n0) { probeCacat.push(`${layar}/${nama}: gagal buka di ronde kedua`); return; }
  const tabSebelum = await tabAktif(page);

  await page.goBack({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1100);

  if (!(await diApp(page))) {
    catat(layar, nama, 'BACK MELEMPAR KELUAR APP — satu ketukan Back menutup seluruh aplikasi, bukan lapisannya');
    await pulih();
    return;
  }
  if (!(await appHidup(page))) {
    catat(layar, nama, 'APP KOSONG sesudah Back — #root tak mencetak apa pun');
    await pulih();
    return;
  }
  const tabSesudah = await tabAktif(page);
  if (tabSebelum && tabSesudah !== tabSebelum) {
    catat(layar, nama,
      `BACK MEMINDAHKAN TAB (${tabSebelum} → ${tabSesudah || 'entah'}) alih-alih menutup lapisan — ` +
      'warga kehilangan halaman yang sedang dibacanya, dan lapisannya ikut lenyap cuma karena halamannya di-unmount');
    await pulih();
    return;
  }
  const nSisa = await lapisan(page);
  if (nSisa >= nBuka) catat(layar, nama, `BACK TAK MENUTUP lapisan (${nBuka} → ${nSisa})`);
  if (!(await bersihkan(page, n0))) await pulih();
}

// ── B: lapisan bertumpuk ──────────────────────────────────────────────────
async function ujiBertingkat(page, layar, bukaBawah, bukaAtas, pulih) {
  const n0 = await lapisan(page);
  if (!(await bukaBawah())) { dilewat.push(`${layar}/bertingkat`); return; }
  await page.waitForTimeout(900);
  const nBawah = await lapisan(page);
  if (nBawah <= n0) { probeCacat.push(`${layar}/bertingkat: lapisan bawah tak terbuka`); return; }
  /* NAMA lapisan bawah direkam SEBELUM yang atas dibuka. Menghitung jumlahnya
     saja tidak cukup dan itu bukan detail: "yang atas tutup" (benar) dan "yang
     BAWAH tutup sementara dialog merah bertahan" (cacat) sama-sama menyisakan
     satu lapisan. Percobaan pertama (22 Agu) memakai hitungan dan dengan patuh
     melaporkan tumpukan ConfirmDestruktif LULUS. */
  const namaBawah = (await namaLapisan(page)).join(' + ');

  if (!(await bukaAtas())) { await bersihkan(page, n0); dilewat.push(`${layar}/bertingkat`); return; }
  await page.waitForTimeout(900);
  const nAtas = await lapisan(page);
  const namaAtas = await namaLapisan(page);
  if (nAtas <= nBawah) { probeCacat.push(`${layar}/bertingkat: lapisan atas tak menumpuk (${nBawah} → ${nAtas})`); await bersihkan(page, n0); return; }
  diuji++;
  const tabSebelum = await tabAktif(page);

  await page.goBack({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1100);

  if (tabSebelum && (await tabAktif(page)) !== tabSebelum) {
    catat(layar, 'bertingkat', `BACK MEMINDAHKAN TAB saat konfirmasi merusak terbuka (${namaAtas.join(' + ')})`);
    await pulih();
    return;
  }
  if (!(await diApp(page))) {
    catat(layar, 'bertingkat', `BACK MELEMPAR KELUAR APP saat konfirmasi merusak terbuka (${namaAtas.join(' + ')})`);
    await pulih();
    return;
  }
  const nSesudah = await lapisan(page);
  const namaSesudah = (await namaLapisan(page)).join(' + ') || 'kosong';
  if (namaSesudah !== namaBawah) {
    catat(layar, 'bertingkat',
      `BACK menutup lapisan yang SALAH — tumpukan [${namaAtas.join(' + ')}] jadi [${namaSesudah}]; ` +
      `yang WAJIB bertahan cuma yang bawah [${namaBawah}] (${nAtas} → ${nSesudah} lapisan). ` +
      'Di layar ini artinya: gerakan yang di seluruh Android berarti "batal" tak membatalkan konfirmasi hapus — ia membuang sheet di belakangnya dan meninggalkan dialog merah berdiri sendiri.');
  }
  if (!(await bersihkan(page, n0))) await pulih();
}

// ── pemicu ────────────────────────────────────────────────────────────────
const klik = (page, loc) => async () => {
  const l = typeof loc === 'function' ? loc() : loc;
  if (!(await l.count())) return false;
  const el = l.first();
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' })).catch(() => {});
  await page.waitForTimeout(350);
  await el.click({ force: true, timeout: 6000 }).catch(() => el.evaluate((e) => e.click()).catch(() => {}));
  return true;
};

// ── jalan ─────────────────────────────────────────────────────────────────
const browser = await chromium.launch();

for (const peran of ['warga', 'bendahara']) {
  const bendahara = peran === 'bendahara';
  const { ctx, page } = await newCtx(browser, 'light', { bendahara });
  if (MUTASI) {
    await ctx.addInitScript(() => {
      history.pushState = () => {};
      history.back = () => {};
    });
  }
  console.log(`\n── ${peran} ─────────────────────────────────`);
  await muat(page, bendahara);

  let tabSekarang = '';
  const pulih = async () => { await muat(page, bendahara); await keTab(page, tabSekarang); };
  const pindah = async (t) => { tabSekarang = t; await keTab(page, t); };
  /* Tiap uji WAJIB mulai dari layar yang sama. Tanpa penjaga ini satu temuan
     "Back memindahkan tab" menyeret SELURUH uji sesudahnya ke halaman salah,
     dan hasilnya terbaca sebagai "pemicu tak ada" — populasi menyusut diam-diam
     (cacat alat ke-13 di repo ini punya bentuk yang sama). */
  const uji = async (layar, nama, buka) => {
    if (tabSekarang && (await tabAktif(page)) !== tabSekarang) await keTab(page, tabSekarang);
    await ujiLapisan(page, layar, nama, buka, pulih);
  };

  // Beranda
  await uji(`${peran}/Beranda`, 'menu-Header', klik(page, () => page.getByRole('button', { name: 'Menu' })));
  await uji(`${peran}/Beranda`, 'popover-InfoTip', klik(page, () => page.getByRole('button', { name: /^Apa itu/i })));
  await uji(`${peran}/Beranda`, 'popover-urutan', klik(page, () => page.getByRole('button', { name: /^Urutkan/i })));

  // Kas RT — sheet aksi baris + konfirmasi merusak di atasnya
  await pindah('Kas RT');
  await uji(`${peran}/KasRT`, 'menu-ekspor', klik(page, () => page.getByRole('button', { name: /^Ekspor/i })));
  await uji(`${peran}/KasRT`, 'sheet-aksi-baris', klik(page, () => page.getByRole('button', { name: /^(Aksi|Lihat detail):/i })));

  if (bendahara) {
    await uji(`${peran}/KasRT`, 'sheet-tambah', klik(page, () => page.getByRole('button', { name: /Tambah transaksi Kas RT/i })));
    await uji(`${peran}/KasRT`, 'sheet-target', klik(page, () => page.getByRole('button', { name: /^Ubah target|^Tetapkan target/i })));
    if (tabSekarang && (await tabAktif(page)) !== tabSekarang) await keTab(page, tabSekarang);
    await ujiBertingkat(page, `${peran}/KasRT`,
      klik(page, () => page.getByRole('button', { name: /^Aksi:/i })),
      klik(page, () => page.getByRole('button', { name: /^Hapus$/ })),
      pulih);
  }

  // Hadiran
  await pindah('Hadiran');
  await uji(`${peran}/KasHadiran`, 'sheet-detail-tarikan',
    klik(page, () => page.getByRole('button', { name: /Lihat detail/i })));

  await ctx.close();
}

await browser.close();

console.log(`\n=== ${diuji} lapisan diuji · ${temuan.length} bermasalah ===`);
if (dilewat.length) console.log(`    dilewat (pemicu tak ada di data hari ini): ${dilewat.join(', ')}`);
if (probeCacat.length) { console.log('\nPROBE CACAT:'); probeCacat.forEach((p) => console.log('  ! ' + p)); }
if (temuan.length) {
  console.log('\nRINCIAN');
  for (const t of temuan) console.log(`  [${t.layar}] ${t.nama}\n      ${t.pesan}`);
}
if (MUTASI && temuan.length === 0) {
  console.log('\nPROBE CACAT: MUTASI=1 tapi nol temuan — pemicu/deteksi tak bekerja.');
  process.exit(2);
}
process.exit(temuan.length ? 1 : 0);
