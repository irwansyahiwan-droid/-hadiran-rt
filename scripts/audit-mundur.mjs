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
/* Sasaran JAUH (produksi) bukan sekadar "localhost yang lebih lambat": tiap
   navigasi menempuh cold start + Supabase nyata, dan sapuan ini yang paling
   banyak bernavigasi dari semua sapuan repo (tiap `pulih()` memuat app dari
   nol, dan bagian D memuat ULANG di tengah). Dgn ambang bawaan Playwright 30s,
   dua run produksi berturut-turut MATI di tengah — dan matinya sesudah bagian
   warga selesai bersih, jadi bendahara tak pernah diuji sama sekali. Sapuan
   yang crash lebih buruk daripada sapuan yang merah: ia menyusutkan populasi
   tanpa mengaku. */
const JAUH = !/localhost|127\.0\.0\.1/.test(APP);
const NAV_MS = JAUH ? 90000 : 30000;

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
/** goto dgn satu kali ulang. Kegagalan navigasi TUNGGAL di tengah sapuan tak
 *  boleh membunuh sisa populasi; kalau ulangannya juga gagal, barulah menyerah
 *  keras — itu memang bukan lagi cegukan. */
async function pergi(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_MS });
  } catch (e) {
    console.log(`  … navigasi ke ${url} gagal (${e.name}), diulang sekali`);
    await page.waitForTimeout(2000);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_MS });
  }
}

async function muat(page, bendahara) {
  await pergi(page, SENTINEL);
  await page.waitForTimeout(400);
  await pergi(page, APP);
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

// ── D: entri yatim yang selamat dari RELOAD ───────────────────────────────
/* Bagian A–C semuanya berjalan di SATU page life. Itu batas yang diwarisi dari
   18 sapuan lain: cuma `audit:masuk` yang pernah memuat ULANG, dan itu di layar
   tanpa lapisan terbuka. Padahal entri history SELAMAT dari reload sementara
   `stack` lapisan lahir KOSONG — jadi sesudah reload app duduk di atas entri
   yang tak lagi dimiliki siapa pun, dan ketukan Back pertama warga terbakar
   percuma: tak ada lapisan yang tertutup, tab tak pindah, app tak keluar.
   NOL perubahan yang bisa dilihat.

   Bukan skenario karangan: `PwaUpdatePrompt` memanggil `location.reload()` saat
   warga menekan "Muat ulang" pada toast versi baru — tiap deploy satu putaran,
   dan lapisan yang kebetulan terbuka saat itu meninggalkan entrinya.

   Yang diuji: sesudah reload-dengan-lapisan-terbuka, Back PERTAMA wajib
   menghasilkan perubahan yang TERLIHAT (lapisan tertutup, tab pindah, atau app
   keluar). Membandingkan `history.state` saja tak cukup — state BERUBAH tiap
   entri yatim dikonsumsi, dan justru itu jebakannya: sapuan yang menonton state
   akan melaporkan "Back bekerja" untuk ketukan yang di mata warga tak
   melakukan apa pun. */
async function ujiYatim(page, layar, buka, pulih) {
  const n0 = await lapisan(page);
  if (!(await buka())) { dilewat.push(`${layar}/yatim`); return; }
  await page.waitForTimeout(900);
  if ((await lapisan(page)) <= n0) { probeCacat.push(`${layar}/yatim: lapisan tak terbuka`); return; }

  await page.reload({ waitUntil: 'domcontentloaded', timeout: NAV_MS });
  await page.waitForTimeout(3000);
  diuji++;

  const sebelum = {
    url: page.url(), tab: await tabAktif(page), n: await lapisan(page), state: await histState(page),
  };
  if (sebelum.n > 0) { probeCacat.push(`${layar}/yatim: lapisan bertahan melewati reload — skenario lain`); await pulih(); return; }

  await page.goBack({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const keluar = !(await diApp(page));
  const sesudah = keluar
    ? { url: page.url(), tab: '', n: 0, state: '' }
    : { url: page.url(), tab: await tabAktif(page), n: await lapisan(page), state: await histState(page) };

  const terlihat = keluar || sesudah.tab !== sebelum.tab || sesudah.n !== sebelum.n || sesudah.url !== sebelum.url;
  if (!terlihat) {
    catat(layar, 'yatim',
      `BACK MATI sesudah reload — entri yatim dari page life sebelumnya masih di history ` +
      `(state ${sebelum.state} → ${sesudah.state}), tapi di mata warga NOL yang berubah: ` +
      'tab tetap, nol lapisan tertutup, app tak keluar. Ketukan Back pertamanya terbakar percuma.');
  }
  if (!keluar && !(await appHidup(page))) catat(layar, 'yatim', 'APP KOSONG sesudah Back pasca-reload');
  await pulih();
}

// ── E: Back BERUNTUN & Back di tengah animasi keluar ──────────────────────
/* Bagian A–D menekan Back SEKALI, di lapisan yang sedang DIAM. Dua keadaan yang
   tersisa justru yang paling sering terjadi di jempol warga:

   E1 beruntun — jempol menekan Back 2–3× cepat (HP terasa tak merespons, atau
      memang mau keluar dari tumpukan). Ini kelas balapan yang SAMA yang pernah
      membuat app BLANK TOTAL (lihat catatan `pendingBack`/`opQueue` di
      `useBackDismiss.ts`): `history.back()` cuma MENJADWALKAN traversal
      (asinkron) sedangkan `pushState` sinkron.

   E2 di tengah animasi keluar — user menutup lapisan lewat tombol UI (fase
      keluar 120–150 ms berjalan, lapisannya MASIH terdaftar di `stack`) lalu
      menekan Back sebelum animasi selesai. Bahayanya bukan "dua lapisan
      tertutup" (Back memang niat kedua) tapi HISTORY DESYNC: `back()` tertunda
      milik fase keluar menyusul dan memakan SATU entri lagi — sesudah itu
      ketukan Back berikutnya jadi mati, persis penyakit bagian D.

   Karena itu vonis E2 bukan "berapa lapisan tertutup" melainkan: app masih
   hidup & di layar, DAN ketukan Back BERIKUTNYA masih menghasilkan perubahan
   yang TERLIHAT. Itu invariant yang menangkap entri nyangkut tanpa memaksakan
   satu tafsir tentang berapa lapisan yang "seharusnya" tertutup.

   Ketukannya WAJIB dari DALAM halaman & sinkron. `page.goBack()` Playwright
   ditunggu sampai traversalnya mendarat, jadi dua panggilan selalu jatuh di
   task BERBEDA dan celah balapannya tak pernah terlihat — pelajaran yang sama
   sudah dibayar di `audit:tulis` (dua `.click()` terpisah bikin React sempat
   render & ketukan ganda tak pernah tertangkap). */

/** Back n× sinkron dalam SATU task, dari dalam halaman. */
const backBeruntun = (page, n) => page.evaluate((k) => { for (let i = 0; i < k; i++) window.history.back(); }, n);

/** Ketukan Back masih menghasilkan perubahan yang TERLIHAT? (invariant bagian D) */
async function backTerlihat(page) {
  const a = { url: page.url(), tab: await tabAktif(page), n: await lapisan(page) };
  await page.goBack({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1100);
  if (!(await diApp(page))) return { terlihat: true, keluar: true };
  const b = { url: page.url(), tab: await tabAktif(page), n: await lapisan(page) };
  return { terlihat: b.tab !== a.tab || b.n !== a.n || b.url !== a.url, keluar: false, a, b };
}

async function ujiBeruntun(page, layar, bukaBawah, bukaAtas, pulih) {
  const n0 = await lapisan(page);
  if (!(await bukaBawah())) { dilewat.push(`${layar}/beruntun`); return; }
  await page.waitForTimeout(900);
  if (!(await bukaAtas())) { await bersihkan(page, n0); dilewat.push(`${layar}/beruntun`); return; }
  await page.waitForTimeout(900);
  const nAtas = await lapisan(page);
  if (nAtas < 2) { probeCacat.push(`${layar}/beruntun: tumpukan tak terbentuk (${nAtas})`); await bersihkan(page, n0); return; }
  diuji++;

  await backBeruntun(page, 3);            // 3 ketukan sinkron, satu task
  await page.waitForTimeout(2000);

  if (!(await diApp(page))) {
    catat(layar, 'beruntun', '3 ketukan Back cepat MELEMPAR KELUAR APP — tumpukannya cuma 3 dalam (tab + sheet + konfirmasi), jadi ketukan ketiga seharusnya mendarat di Beranda');
    await pulih(); return;
  }
  if (!(await appHidup(page))) {
    catat(layar, 'beruntun', '3 ketukan Back cepat → APP KOSONG (#root tak mencetak apa pun) — kelas balapan back()/pushState yang sama yang pernah bikin blank total');
    await pulih(); return;
  }
  const sisa = await lapisan(page);
  if (sisa > n0) catat(layar, 'beruntun', `lapisan NYANGKUT sesudah 3 ketukan Back cepat (${nAtas} → ${sisa}, garis dasar ${n0})`);
  const st = await histState(page);
  if (sisa <= n0 && st !== 'null') catat(layar, 'beruntun', `ENTRI NYANGKUT sesudah 3 ketukan Back cepat (state ${st}, nol lapisan terbuka)`);
  await bersihkan(page, n0);
  await pulih();
}

async function ujiSaatKeluar(page, layar, bukaBawah, bukaAtas, tutupUI, pulih) {
  const n0 = await lapisan(page);
  if (!(await bukaBawah())) { dilewat.push(`${layar}/saat-keluar`); return; }
  await page.waitForTimeout(900);
  if (!(await bukaAtas())) { await bersihkan(page, n0); dilewat.push(`${layar}/saat-keluar`); return; }
  await page.waitForTimeout(900);
  if ((await lapisan(page)) < 2) { probeCacat.push(`${layar}/saat-keluar: tumpukan tak terbentuk`); await bersihkan(page, n0); return; }
  diuji++;

  /* Tutup lewat UI lalu Back 60 ms kemudian — di TENGAH fase keluar 120–150 ms,
     saat lapisannya masih terdaftar di `stack`. Keduanya dari dalam halaman. */
  const adaTombol = await tutupUI();
  if (!adaTombol) { probeCacat.push(`${layar}/saat-keluar: tombol tutup tak ada`); await bersihkan(page, n0); return; }
  await page.evaluate(() => new Promise((r) => setTimeout(() => { window.history.back(); r(); }, 60)));
  await page.waitForTimeout(2000);

  if (!(await diApp(page))) { catat(layar, 'saat-keluar', 'Back di TENGAH animasi keluar MELEMPAR KELUAR APP'); await pulih(); return; }
  if (!(await appHidup(page))) { catat(layar, 'saat-keluar', 'Back di TENGAH animasi keluar → APP KOSONG'); await pulih(); return; }

  const cek = await backTerlihat(page);
  if (!cek.terlihat) {
    catat(layar, 'saat-keluar',
      'HISTORY DESYNC — sesudah Back di tengah animasi keluar, ketukan Back BERIKUTNYA mati: ' +
      `${JSON.stringify(cek.a)} → ${JSON.stringify(cek.b)}. Entri yatim dimakan `+
      '`back()` tertunda milik fase keluar (penyakit yang sama dgn bagian D, sumber berbeda).');
  }
  await pulih();
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
  page.setDefaultNavigationTimeout(NAV_MS);
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

  // D — entri yatim yang selamat dari reload
  if (tabSekarang && (await tabAktif(page)) !== tabSekarang) await keTab(page, tabSekarang);
  await ujiYatim(page, `${peran}/Beranda`, klik(page, () => page.getByRole('button', { name: 'Menu' })), pulih);

  // Kas RT — sheet aksi baris + konfirmasi merusak di atasnya
  await pindah('Kas RT');
  await uji(`${peran}/KasRT`, 'menu-ekspor', klik(page, () => page.getByRole('button', { name: /^Ekspor/i })));
  await uji(`${peran}/KasRT`, 'sheet-aksi-baris', klik(page, () => page.getByRole('button', { name: /^(Aksi|Lihat detail):/i })));

  if (bendahara) {
    await uji(`${peran}/KasRT`, 'sheet-tambah', klik(page, () => page.getByRole('button', { name: /Tambah transaksi Kas RT/i })));
    await uji(`${peran}/KasRT`, 'sheet-target', klik(page, () => page.getByRole('button', { name: /^Ubah target|^Tetapkan target/i })));
    if (tabSekarang && (await tabAktif(page)) !== tabSekarang) await keTab(page, tabSekarang);
    const bukaSheetBaris = klik(page, () => page.getByRole('button', { name: /^Aksi:/i }));
    const bukaKonfirmasi = klik(page, () => page.getByRole('button', { name: /^Hapus$/ }));
    await ujiBertingkat(page, `${peran}/KasRT`, bukaSheetBaris, bukaKonfirmasi, pulih);

    // E — Back beruntun & Back di tengah animasi keluar
    if (tabSekarang && (await tabAktif(page)) !== tabSekarang) await keTab(page, tabSekarang);
    await ujiBeruntun(page, `${peran}/KasRT`, bukaSheetBaris, bukaKonfirmasi, pulih);
    if (tabSekarang && (await tabAktif(page)) !== tabSekarang) await keTab(page, tabSekarang);
    await ujiSaatKeluar(page, `${peran}/KasRT`, bukaSheetBaris, bukaKonfirmasi,
      klik(page, () => page.getByRole('button', { name: /^Batal$/i })), pulih);
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
