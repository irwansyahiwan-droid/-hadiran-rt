// Audit JAGA ISIAN: form yang sudah diisi tak boleh terbuang tanpa tanya, dan
// tombol Simpan pada form kosong wajib MENJELASKAN, bukan diam.
//
// Kenapa alat sendiri (13 Sep 2026, temuan audit Web Interface Guidelines):
// tujuh form tulis bendahara + editor Absensi membuang isian lewat Back HP,
// ketuk latar, atau seret turun — tanpa satu pertanyaan pun. Taruhan
// tertingginya Absensi: Back di tengah menandai puluhan anggota membuang
// semuanya. Obatnya `useJagaIsian` (src/hooks/useJagaIsian.ts).
//
// Yang PALING mudah rusak bukan dialognya, melainkan BACK-STACK. Back HP
// memakan entri history SEBELUM `close()` dipanggil; sheet yang bertanya lalu
// tetap terbuka tak lagi terdaftar, dan Back berikutnya jatuh ke lapisan di
// bawahnya (pindah tab → form ter-unmount) atau keluar app. Karena itu A4
// ("Back LAGI sesudah Lanjut mengisi") dan A9 ("sesudah Buang, Back berikutnya
// masih menghasilkan perubahan TERLIHAT") adalah inti sapuan ini — keduanya
// menilai dari keadaan yang TERLIHAT (tab aktif, jumlah dialog, url), bukan
// dari `history.state`, yang MENIPU (pelajaran bagian D `audit:mundur`).
//
// A. PENJAGA, per form:
//   A1 bersih  — form belum disentuh → Back menutup LANGSUNG (penjaga yang
//                bertanya tiap kali dilatih untuk diabaikan)
//   A2 Back    — form kotor → dialog muncul, form & isinya tetap ada
//   A3 Lanjut  — "Lanjut mengisi" → dialog tutup, isian UTUH
//   A4 Back lagi → dialog muncul LAGI (bukti sheet terdaftar ulang)
//   A5 latar · A6 seret · A7 Escape → dialog (sheet saja)
//   A8 Buang   — tombol merah → form tertutup
//   A9 invarian — Back sesudahnya menghasilkan perubahan terlihat, tetap di app
// B. GALAT INLINE: kolom wajib dikosongkan → Simpan → pesan di bawah kolomnya,
//    fokus di kolom itu, NOL permintaan tulis.
// C. HAPUS TARGET (14 Sep 2026): tombol Hapus di sheet target dulu langsung
//    menghapus. Kini WAJIB bertanya; Back menutup DIALOG saja (sheet tetap),
//    Batal tak mengirim apa pun. Tombol merahnya SENGAJA tak pernah diketuk.
//    Tinggal di sini, bukan di `audit:mundur`, karena sapuan itu dikunci
//    read-only dan sheet-nya memang sheet yang sama.
//
// Mode EDIT transaksi Kas RT & edit anggota masuk populasi 14 Sep 2026 —
// sebelumnya diakui sbg BATAS ("komponen sama, kata beda"). Kata yang beda itu
// persis yang tak pernah terukur.
//
// VALIDASI (tanpa flag MUTASI — mutasi yang bermakna ada di KODE APP, bukan di
// halaman): (1) build SEBELUM penjaga → A2 merah di semua form; (2) mutasi
// sumber `backAktif: !membuang` (sheet tak melepas pendaftaran saat bertanya)
// → A4 merah dgn tab berpindah. Dicatat di CLAUDE.md.
//
// Pakai:  npm run audit:jaga-isian     (bendahara di-MOCK, tulis DIBLOKIR 403)
//   HANYA=target   → cuma form yang namanya cocok (regex, tak peka huruf) —
//                    untuk validasi; populasi yang disaring DICETAK di ringkasan
import { chromium } from 'playwright';
import { newCtx, gotoTab, openMenuItem } from './lib/audit-harness.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const JEDA = 700;

const keadaan = (page) => page.evaluate(() => ({
  tab: document.querySelector('nav button[aria-current="page"]')?.innerText.trim() ?? null,
  dialog: [...document.querySelectorAll('[role="dialog"]')].map((d) => d.getAttribute('aria-label') || '?'),
  absensi: !!document.querySelector('h2') && [...document.querySelectorAll('h2')].some((h) => /^Absensi Tarikan/.test(h.innerText)),
  url: location.origin,
}));

async function back(page) {
  await page.evaluate(() => history.back());
  await page.waitForTimeout(JEDA);
}

const ada = async (loc) => (await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false));

async function seret(page) {
  return page.evaluate(async () => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].pop();
    const gagang = dlg?.querySelector('.touch-none');
    if (!gagang) return false;
    const r = gagang.getBoundingClientRect();
    const x = r.left + r.width / 2, y0 = r.top + r.height / 2;
    const mk = (y) => new Touch({ identifier: 1, target: gagang, clientX: x, clientY: y, pageX: x, pageY: y });
    const fire = (tipe, y, lepas) => {
      const t = mk(y);
      gagang.dispatchEvent(new TouchEvent(tipe, { bubbles: true, cancelable: true,
        touches: lepas ? [] : [t], targetTouches: lepas ? [] : [t], changedTouches: [t] }));
    };
    // Tiap touchmove dipisah satu frame — state React harus sempat dirender (pelajaran audit:gestur).
    const frame = () => new Promise((res) => requestAnimationFrame(() => res()));
    fire('touchstart', y0);
    for (let i = 1; i <= 12; i++) { await frame(); fire('touchmove', y0 + i * 20); }
    await frame();
    fire('touchend', y0 + 240, true);
    return true;
  });
}

const FORM = [
  {
    nama: 'Kas RT · tambah transaksi', tab: 'Kas RT', sheet: true,
    buka: (p) => p.getByRole('button', { name: /Tambah transaksi Kas RT/i }).first(),
    tanda: '#kasrt-keterangan',
    kotori: (p) => p.fill('#kasrt-keterangan', 'uji penjaga isian'),
    nilai: (p) => p.inputValue('#kasrt-keterangan'), harap: 'uji penjaga isian',
    judul: /Buang isian transaksi ini\?/, merah: /^Buang isian$/,
    galat: { kosongkan: async () => {}, simpan: /^Simpan$/, kolom: 'kasrt-keterangan', teks: /Isi keterangannya dulu — transaksi belum tersimpan\./ },
  },
  {
    nama: 'Kas Hadiran · setor', tab: 'Hadiran', sheet: true,
    buka: (p) => p.getByRole('button', { name: /Setor ke Kas RT/i }).first(),
    tanda: '#kashadiran-keterangan',
    kotori: (p) => p.fill('#kashadiran-keterangan', 'uji penjaga isian'),
    nilai: (p) => p.inputValue('#kashadiran-keterangan'), harap: 'uji penjaga isian',
    judul: /Buang isian setoran ini\?/, merah: /^Buang isian$/,
    galat: { kosongkan: async () => {}, simpan: /^Setor$/, kolom: 'kashadiran-keterangan', teks: /Isi keterangannya dulu — setoran belum tercatat\./ },
  },
  {
    nama: 'Kas RT · target', tab: 'Kas RT', sheet: true,
    // Satu aksi, DUA wujud tergantung data (pelajaran ke-13).
    buka: (p) => p.getByRole('button', { name: /Ubah target|Tetapkan Target/i }).first(),
    tanda: '#target-nama',
    kotori: (p) => p.fill('#target-nama', 'uji penjaga isian'),
    nilai: (p) => p.inputValue('#target-nama'), harap: 'uji penjaga isian',
    judul: /Buang isian target ini\?/, merah: /^Buang isian$/,
    hapus: { tombol: /^Hapus$/, judul: /^Hapus target .+\?$/ },
    galat: { kosongkan: (p) => p.fill('#target-nominal', ''), simpan: /^Simpan Target$/, kolom: 'target-nominal', teks: /Isi nominal targetnya dulu — target belum tersimpan\./ },
  },
  {
    nama: 'Jadwal · tambah tarikan', tab: 'Jadwal', sheet: true,
    buka: (p) => p.getByRole('button', { name: /Tambah jadwal tarikan/i }).first(),
    tanda: '#jadwal-add-sohibul',
    kotori: async (p) => { const v = await p.$$eval('#jadwal-add-sohibul option', (o) => o[1]?.value); await p.selectOption('#jadwal-add-sohibul', v); },
    nilai: (p) => p.inputValue('#jadwal-add-sohibul'), harap: null,
    judul: /Buang jadwal tarikan baru\?/, merah: /^Buang isian$/,
    galat: { kosongkan: (p) => p.fill('#jadwal-add-tanggal', ''), simpan: /^Simpan Tarikan$/, kolom: 'jadwal-add-tanggal', teks: /Isi tanggal tarikannya dulu — jadwal belum tersimpan\./ },
  },
  {
    nama: 'Jadwal · revisi tarikan', tab: 'Jadwal', sheet: true,
    buka: async (p) => {
      // Sisa sheet aksi baris dari putaran sebelumnya menutupi pemicunya.
      for (let i = 0; i < 3 && (await p.locator('[role="dialog"]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
      const aksi = p.getByRole('button', { name: /Aksi lainnya tarikan/i }).first();
      if (!(await aksi.count())) return null;
      await aksi.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(300);
      await aksi.click({ force: true });
      await p.waitForTimeout(900);
      return p.locator('[role="dialog"] button').filter({ hasText: /Revisi jadwal/i }).first();
    },
    tanda: '#jadwal-edit-sohibul',
    kotori: async (p) => {
      const [cur, lain] = await p.$$eval('#jadwal-edit-sohibul', ([s]) => [s.value, [...s.options].map((o) => o.value).find((v) => v !== s.value)]);
      void cur; await p.selectOption('#jadwal-edit-sohibul', lain);
    },
    nilai: (p) => p.inputValue('#jadwal-edit-sohibul'), harap: null,
    judul: /Buang revisi tarikan #\d+\?/, merah: /^Buang revisi$/,
    galat: { kosongkan: (p) => p.fill('#jadwal-edit-tanggal', ''), simpan: /^Simpan Revisi$/, kolom: 'jadwal-edit-tanggal', teks: /Isi tanggal tarikannya dulu — jadwal belum tersimpan\./ },
  },
  {
    nama: 'Kas RT · edit transaksi', tab: 'Kas RT', sheet: true,
    buka: async (p) => {
      // Sisa sheet aksi baris dari putaran sebelumnya menutupi pemicunya.
      for (let i = 0; i < 3 && (await p.locator('[role="dialog"]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
      const baris = p.getByRole('button', { name: /^Aksi:/ }).first();
      if (!(await baris.count())) return null;
      await baris.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(300);
      await baris.click({ force: true });
      await p.waitForTimeout(900);
      return p.locator('[role="dialog"] button').filter({ hasText: /^\s*Edit\s*$/ }).first();
    },
    tanda: '#kasrt-keterangan',
    kotori: async (p) => p.fill('#kasrt-keterangan', `${await p.inputValue('#kasrt-keterangan')} uji`),
    nilai: (p) => p.inputValue('#kasrt-keterangan'), harap: null,
    judul: /Buang perubahan transaksi ini\?/, merah: /^Buang perubahan$/,
    galat: { kosongkan: (p) => p.fill('#kasrt-keterangan', ''), simpan: /^Simpan Perubahan$/, kolom: 'kasrt-keterangan', teks: /Isi keterangannya dulu — transaksi belum tersimpan\./ },
  },
  {
    nama: 'Kelola Anggota · edit', tab: null, overlay: 'Kelola Anggota', sheet: true,
    // Barisnya sendiri tombol; penanda "bisa diubah" = ikon pensil di dalamnya.
    buka: (p) => p.locator('[role="dialog"] button').filter({ has: p.locator('svg.lucide-pencil') }).first(),
    tanda: '#anggota-nama',
    kotori: async (p) => p.fill('#anggota-nama', `${await p.inputValue('#anggota-nama')} Uji`),
    nilai: (p) => p.inputValue('#anggota-nama'), harap: null,
    judul: /Buang perubahan data .+\?/, merah: /^Buang perubahan$/,
    galat: { kosongkan: (p) => p.fill('#anggota-nama', ''), simpan: /^Simpan Perubahan$/, kolom: 'anggota-nama', teks: /Isi nama anggotanya dulu — anggota belum tersimpan\./ },
  },
  {
    nama: 'Kelola Anggota · tambah', tab: null, overlay: 'Kelola Anggota', sheet: true,
    buka: (p) => p.getByRole('button', { name: /Tambah anggota/i }).first(),
    tanda: '#anggota-nama',
    kotori: (p) => p.fill('#anggota-nama', 'Uji Penjaga Isian'),
    nilai: (p) => p.inputValue('#anggota-nama'), harap: 'Uji Penjaga Isian',
    judul: /Buang isian anggota baru\?/, merah: /^Buang isian$/,
    galat: { kosongkan: async () => {}, simpan: /^Simpan Anggota$/, kolom: 'anggota-nama', teks: /Isi nama anggotanya dulu — anggota belum tersimpan\./ },
  },
  {
    nama: 'Jadwal · editor Absensi', tab: 'Jadwal', sheet: false,
    buka: (p) => p.getByRole('button', { name: /^Proses/i }).first(),
    tanda: 'button[aria-label*="Ketuk untuk ganti status"]',
    kotori: (p) => p.locator('button[aria-label*="Ketuk untuk ganti status"]').first().click(),
    nilai: (p) => p.locator('button[aria-label*="Ketuk untuk ganti status"]').first().getAttribute('aria-label'), harap: null,
    judul: /Keluar tanpa menyimpan absensi\?/, merah: /^Keluar$/,
  },
];

const browser = await chromium.launch();
const temuan = [];
let form = 0, periksa = 0, cacat = 0;
const catat = (f, kode, ok, rinci) => { periksa++; if (!ok) temuan.push(`[${f.nama}] ${kode} ${rinci}`); return ok; };

/* Tiap form TERISOLASI: satu form yang melempar app ke keadaan tak terduga
   (persis yang terjadi saat back-stack desync — terukur di validasi mutasi:
   sapuan MATI di bagian B karena nav sudah hilang) tak boleh membunuh sisa
   populasi. Galatnya dicatat sbg PROBE CACAT bernama, bukan jejak tumpukan
   (pelajaran ke-20: sapuan yang berhenti di tengah = laporan yang tak mengaku). */
let ctxAktif = null;
const HANYA = process.env.HANYA ? new RegExp(process.env.HANYA, 'i') : null;
const DIUJI = HANYA ? FORM.filter((f) => HANYA.test(f.nama)) : FORM;
if (HANYA && !DIUJI.length) { console.log(`PROBE CACAT: HANYA=${process.env.HANYA} tak cocok dgn satu form pun`); process.exit(2); }
for (const f of DIUJI) {
  try { await ujiForm(f); } catch (e) {
    await ctxAktif?.close().catch(() => {});
    temuan.push(`[${f.nama}] PROBE CACAT: ${String(e.message).split('\n')[0]}`);
    cacat++;
    console.log(`\n### ${f.nama}   PROBE CACAT`);
    temuan.filter((t) => t.startsWith(`[${f.nama}]`)).forEach((t) => console.log('  ⚠ ' + t.slice(f.nama.length + 3)));
  }
}

async function ujiForm(f) {
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: true, sentuh: true });
  ctxAktif = ctx;
  let tulis = 0;
  page.on('request', (r) => { if (r.url().includes('/rest/v1/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && !r.url().includes('/rpc/')) tulis++; });
  await page.goto(APP, { waitUntil: 'networkidle' });
  await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(2500);

  const keLayar = async () => {
    /* Mulai dari app SEGAR kalau app sudah keluar/terlempar (itulah yang diuji
       A9) ATAU masih ada lapisan terbuka: sesudah rantai A berhenti di tengah,
       overlay Kelola Anggota masih menutupi tombol Menu dan pemicu mana pun —
       terukur saat validasi mutasi, `locator.click` time-out 30 dtk. */
    if (!(await page.locator('nav button', { hasText: 'Beranda' }).count())
        || (await page.locator('[role="dialog"]').count())) {
      await page.goto(APP, { waitUntil: 'networkidle' });
      await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
      await page.waitForTimeout(2500);
    }
    if (f.overlay) { await gotoTab(page, 'Beranda'); return openMenuItem(page, f.overlay).then(async (ok) => { await page.waitForTimeout(1500); return ok; }); }
    await gotoTab(page, f.tab);
    return true;
  };
  const dialogJaga = () => page.getByRole('dialog', { name: f.judul });
  const formAda = () => ada(page.locator(f.tanda));
  const bukaForm = async () => {
    const pemicu = await f.buka(page);
    if (!pemicu || !(await pemicu.count())) return false;
    await pemicu.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await page.waitForTimeout(250);
    await pemicu.click({ force: true });
    await page.waitForTimeout(1200);
    return formAda();
  };
  const lanjut = async () => { await page.getByRole('dialog', { name: f.judul }).getByRole('button', { name: /^Lanjut mengisi$/ }).click(); await page.waitForTimeout(JEDA); };

  if (!(await keLayar()) || !(await bukaForm())) {
    console.log(`\n### ${f.nama}   PROBE CACAT: form tak terbuka — DILEWAT bukan lulus`);
    cacat++; await ctx.close(); return;
  }
  form++;

  // A1 — belum disentuh: Back menutup langsung.
  await back(page);
  catat(f, 'A1', !(await formAda()) && !(await ada(dialogJaga())), 'form BERSIH tak tertutup langsung oleh Back (atau malah bertanya)');

  // Buka lagi & kotori.
  if (!(await bukaForm())) { temuan.push(`[${f.nama}] PROBE CACAT: form tak bisa dibuka ulang sesudah A1`); cacat++; await ctx.close(); return; }
  await f.kotori(page);
  await page.waitForTimeout(300);
  const nilaiKotor = await f.nilai(page);

  // A2 — Back pada form kotor.
  const sebelumA2 = await keadaan(page);
  await back(page);
  const a2 = catat(f, 'A2', (await ada(dialogJaga())) && (await formAda()),
    `Back pada form KOTOR tak bertanya — isian terbuang (${JSON.stringify(sebelumA2.dialog)} → ${JSON.stringify((await keadaan(page)).dialog)})`);
  if (!a2) {
    console.log(`\n### ${f.nama}   penjaga tak ada — sisa A & B dilewati`);
    temuan.filter((t) => t.startsWith(`[${f.nama}]`)).forEach((t) => console.log('  ⚠ ' + t.slice(f.nama.length + 3)));
    await ctx.close(); return;
  }

  // A3 — Lanjut mengisi.
  await lanjut();
  catat(f, 'A3', !(await ada(dialogJaga())) && (await formAda()) && (await f.nilai(page)) === nilaiKotor,
    '"Lanjut mengisi" tak mengembalikan form utuh');

  // A4 — Back LAGI: sheet wajib terdaftar ulang.
  const sebelumA4 = await keadaan(page);
  await back(page);
  const sesudahA4 = await keadaan(page);
  catat(f, 'A4', (await ada(dialogJaga())) && (await formAda()),
    `Back KEDUA tak bertanya lagi — back-stack desync (tab ${sebelumA4.tab} → ${sesudahA4.tab}, dialog ${sebelumA4.dialog.length} → ${sesudahA4.dialog.length})`);
  if (await ada(dialogJaga())) await lanjut();

  /* Form sudah LENYAP sesudah A4 = desync terjadi. A5–A9 menguji form yang
     masih ada; memvonisnya sekarang cuma mencetak riak berantai (terukur saat
     validasi mutasi: 38 temuan dari SATU cacat — "latar tak bertanya",
     "gagang tak ketemu"… untuk form yang sudah tak ada). Satu cacat, satu baris. */
  /* PENGHENTI RANTAI. Tiap langkah A sesudah A4 menguji form yang MASIH ADA;
     begitu form lenyap (desync, atau satu jalur tutup yang tak dijaga), langkah
     berikutnya cuma mencetak riak berantai. Terukur saat validasi mutasi: SATU
     cacat (seretan tak dijaga) melahirkan A7 "Escape tak bertanya" & A9 "keluar
     app" untuk form yang sudah tak ada; mutasi lain 38 temuan dari 13 cacat.
     Satu cacat, satu baris — sisa A dilewati & DIAKUI, B tetap diuji. */
  const masihAda = async (sesudah) => {
    if (await formAda()) return true;
    console.log(`  (${f.nama}: form lenyap sesudah ${sesudah} — sisa A dilewati, B tetap diuji)`);
    return false;
  };

  let lanjutA = await masihAda('A4');

  if (lanjutA && f.sheet) {
    // A5 — ketuk latar (pita atas layar, di luar panel).
    await page.mouse.click(195, 24);
    await page.waitForTimeout(JEDA);
    catat(f, 'A5', (await ada(dialogJaga())) && (await formAda()), 'ketuk LATAR pada form kotor tak bertanya');
    if (await ada(dialogJaga())) await lanjut();
    lanjutA = await masihAda('A5');
  }
  if (lanjutA && f.sheet) {
    // A6 — seret turun lewat gagang.
    const bisa = await seret(page);
    await page.waitForTimeout(JEDA);
    catat(f, 'A6', bisa && (await ada(dialogJaga())) && (await formAda()), bisa ? 'SERET turun pada form kotor tak bertanya' : 'PROBE: gagang seret tak ketemu');
    if (await ada(dialogJaga())) await lanjut();
    lanjutA = await masihAda('A6');
  }
  if (lanjutA && f.sheet) {
    // A7 — Escape.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(JEDA);
    catat(f, 'A7', (await ada(dialogJaga())) && (await formAda()), 'ESCAPE pada form kotor tak bertanya');
    if (await ada(dialogJaga())) await lanjut();
    lanjutA = await masihAda('A7');
  }

  if (lanjutA) {
    // A8 — Buang.
    await back(page);
    if (await ada(dialogJaga())) {
      await page.getByRole('dialog', { name: f.judul }).getByRole('button', { name: f.merah }).click();
      await page.waitForTimeout(JEDA + 400);
    }
    catat(f, 'A8', !(await formAda()) && !(await ada(dialogJaga())), 'tombol merah tak menutup form');

    // A9 — invarian back-stack: Back berikutnya menghasilkan perubahan TERLIHAT & tetap di app.
    const a = await keadaan(page);
    await back(page);
    const b = await keadaan(page);
    const terlihat = a.tab !== b.tab || a.dialog.length !== b.dialog.length || a.absensi !== b.absensi;
    const diApp = b.url === new URL(APP).origin;
    catat(f, 'A9', terlihat && diApp, diApp
      ? `Back sesudah Buang tak menghasilkan perubahan terlihat — entri yatim (${JSON.stringify(a)} → ${JSON.stringify(b)})`
      : `Back sesudah Buang MELEMPAR KELUAR app (origin ${b.url})`);
  }

  // B — galat inline.
  if (f.galat) {
    if (!(await keLayar()) || !(await bukaForm())) { temuan.push(`[${f.nama}] PROBE CACAT: form tak terbuka untuk bagian B`); cacat++; }
    else {
      await f.galat.kosongkan(page);
      await page.waitForTimeout(200);
      const tulisSebelum = tulis;
      await page.locator('[role="dialog"]').last().getByRole('button', { name: f.galat.simpan }).click();
      await page.waitForTimeout(JEDA);
      const pesan = page.locator(`#${f.galat.kolom}-galat`);
      const teks = (await pesan.count()) ? await pesan.innerText() : '';
      const fokus = await page.evaluate(() => document.activeElement?.id);
      const aria = await page.getAttribute(`#${f.galat.kolom}`, 'aria-describedby');
      catat(f, 'B1', f.galat.teks.test(teks), `pesan galat tak muncul di bawah kolom (terbaca: "${teks}")`);
      catat(f, 'B2', fokus === f.galat.kolom, `fokus tak pindah ke kolom kosong (fokus: ${fokus})`);
      catat(f, 'B3', aria === `${f.galat.kolom}-galat`, `aria-describedby kolom tak menunjuk pesannya (${aria})`);
      catat(f, 'B4', tulis === tulisSebelum, `form kosong tetap MENGIRIM ${tulis - tulisSebelum} permintaan tulis`);
    }
  }

  // C — aksi merusak di dalam sheet WAJIB bertanya (tombol merah tak pernah diketuk).
  if (f.hapus) {
    const bukaUlang = (await keLayar()) && (await bukaForm());
    const tombol = page.locator('[role="dialog"]').last().getByRole('button', { name: f.hapus.tombol });
    if (!bukaUlang || !(await tombol.count())) {
      // Tombol Hapus hanya ada kalau target SUDAH ada — ketiadaannya dicurigai, bukan diluluskan.
      temuan.push(`[${f.nama}] PROBE CACAT: tombol Hapus tak ada (target belum ditetapkan di data?) — C tak diuji`); cacat++;
    } else {
      const dialogHapus = () => page.getByRole('dialog', { name: f.hapus.judul });
      const tulisSebelum = tulis;
      await tombol.click();
      await page.waitForTimeout(JEDA);
      const c1 = catat(f, 'C1', (await ada(dialogHapus())) && (await formAda()) && tulis === tulisSebelum,
        `Hapus tak bertanya dulu (dialog: ${await dialogHapus().count()}, tulis: ${tulis - tulisSebelum})`);
      // Tanpa dialog, C2–C3 cuma riak berantai dari C1 (terukur di validasi sebelum-perbaikan).
      if (c1) {
      await back(page);
      catat(f, 'C2', !(await ada(dialogHapus())) && (await formAda()),
        'Back pada dialog Hapus tak menutup dialognya saja (sheet ikut hilang / dialog bertahan)');
      if (await formAda()) {
        await page.locator('[role="dialog"]').last().getByRole('button', { name: f.hapus.tombol }).click();
        await page.waitForTimeout(JEDA);
        await page.getByRole('dialog', { name: f.hapus.judul }).getByRole('button', { name: /^Batal$/ }).click();
        await page.waitForTimeout(JEDA);
        catat(f, 'C3', !(await ada(dialogHapus())) && (await formAda()) && tulis === tulisSebelum,
          `Batal pada dialog Hapus tak kembali ke sheet utuh (tulis: ${tulis - tulisSebelum})`);
      }
      }
    }
  }

  const milik = temuan.filter((t) => t.startsWith(`[${f.nama}]`));
  console.log(`\n### ${f.nama}${milik.length ? '' : '  OK'}`);
  milik.forEach((t) => console.log('  ⚠ ' + t.slice(f.nama.length + 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n=== JAGA ISIAN: ${form} form diperiksa · ${periksa} pemeriksaan · ${temuan.length} bermasalah · ${cacat} probe cacat ===`);
if (HANYA) console.log(`  (DISARING HANYA=${process.env.HANYA}: ${DIUJI.length} dari ${FORM.length} form — bukan jalan penuh)`);
if (cacat) process.exit(2);
process.exit(temuan.length ? 1 : 0);
