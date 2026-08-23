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
 *
 * @param bacaan  (url) => array | null — isi palsu untuk GET tertentu.
 *   Dibutuhkan jalur tulis yang formnya baru ADA kalau datanya ada (editor
 *   absensi cuma bisa dibuka dari sebuah tarikan). Dijawab `[]` seperti biasa
 *   kalau pemetanya mengembalikan null, jadi dua jalur lama tak berubah
 *   perilakunya. Data palsu ini hanya hidup di dalam respons yang dicegat —
 *   tak satu pun request tulis pernah sampai ke server.
 */
async function siapkan(bacaan, balasTulis) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 780 }, serviceWorkers: 'block' });
  await ctx.addInitScript(({ ref, s }) => {
    localStorage.setItem('hadiran-welcome-v2', '1');
    localStorage.setItem('hadiran-theme', 'light');
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
  }, { ref: REF, s: sesiPalsu() });

  const tulis = { n: 0, metode: [] };
  await ctx.route('**/rest/v1/**', (route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      const isi = bacaan ? bacaan(route.request().url()) : null;
      const body = JSON.stringify(isi ?? []);
      return route.fulfill({
        status: 200, contentType: 'application/json',
        headers: { 'content-range': `*/${isi?.length ?? 0}` }, body,
      });
    }
    tulis.n++;
    tulis.metode.push(m); // POST = INSERT; PATCH/DELETE = turunan satu simpan
    if (balasTulis) return balasTulis(route, m);
    // digantung: sengaja tak dipanggil fulfill/abort
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
 * @param buka    (page) => buka form-nya, kembalikan locator WADAH-nya. Wadah tak
 *                harus `[role="dialog"]`: editor absensi adalah VIEW penuh, bukan
 *                sheet, jadi yang dikembalikan cukup elemen yang memuat tombol simpan.
 * @param isi     (wadah) => isi field wajib
 * @param tombol  regex label tombol simpan (termasuk bentuk "sedang menyimpan")
 * @param bacaan  opsional, lihat `siapkan()`
 */
async function ujiTulis(nama, buka, isi, tombol, bacaan) {
  const { ctx, page, tulis } = await siapkan(bacaan);
  const m = [];
  try {
    const wadah = await buka(page);
    if (!wadah) { lapor(nama, ['PROBE CACAT: form tak pernah terbuka — tak ada yang diuji']); await ctx.close(); return; }
    await isi(wadah);

    const simpan = wadah.getByRole('button', { name: tombol });
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

/**
 * KETUKAN GANDA — dua klik di TASK YANG SAMA pada tombol simpan.
 *
 * Kenapa terpisah dari `ujiTulis`: yang di atas menguji request MENGGANTUNG,
 * yaitu apa yang dilihat bendahara saat jaringan busuk. Yang ini menguji hal
 * yang sama sekali berbeda — apakah satu niat bisa tercatat DUA KALI.
 * `disabled={saving}` tak menjawabnya: itu penjaga UI yang baru berlaku SETELAH
 * React me-render, sedangkan dua ketukan di task yang sama masuk ke handler
 * sebelum render itu terjadi. Terukur 19 Agu 2026 di Kas RT: **dua `POST`**
 * untuk satu ketukan ganda. Di app kas itu uang.
 *
 * Kliknya dari DALAM halaman & SINKRON — `dispatchEvent` Playwright tak memicu
 * submit bawaan, dan dua `click()` Playwright terpisah selalu berbeda task
 * sehingga React sempat me-render dan celahnya tak pernah terlihat.
 *
 * Yang dihitung hanya **POST** (INSERT). Percobaan pertama menghitung semua
 * method dan melaporkan "DOBEL" untuk satu simpan yang sehat — satu POST
 * memang diikuti PATCH hitung-ulang saldo. Populasi salah, bukan temuan.
 */
async function ujiKetukGanda(nama, buka, isi, tombol, bacaan) {
  const { ctx, page, tulis } = await siapkan(bacaan);
  const m = [];
  try {
    const wadah = await buka(page);
    if (!wadah) { lapor(nama, ['PROBE CACAT: form tak pernah terbuka — tak ada yang diuji']); await ctx.close(); return; }
    await isi(wadah);
    await page.waitForTimeout(400);

    /* Tombolnya DITANDAI lewat Playwright (peran + nama), lalu diklik dari dalam
       halaman. Versi pertama mencari `button[type="submit"]` dan langsung gagal
       di Kelola Anggota, yang tombol simpannya `onClick` biasa — populasi
       salah, bukan temuan. Menandai dulu membuat probe ini bekerja untuk kedua
       bentuk tanpa menebak-nebak markup. */
    const simpan = wadah.getByRole('button', { name: tombol });
    if (!(await simpan.count())) { lapor(nama, ['PROBE CACAT: tombol simpan tak ketemu']); await ctx.close(); return; }
    await simpan.first().evaluate((el) => el.setAttribute('data-ketuk-ganda', '1'));
    const hasil = await page.evaluate(() => {
      const b = document.querySelector('[data-ketuk-ganda="1"]');
      if (!b) return { ok: false, alasan: 'penanda hilang sebelum diklik' };
      if (b.disabled) return { ok: false, alasan: 'tombol simpan disabled — field wajib belum terisi?' };
      b.click();
      const sesudah1 = b.disabled;   // masih false = celah render memang ada
      b.click();                     // sinkron: React belum sempat me-render
      return { ok: true, sesudah1 };
    });
    if (!hasil.ok) { lapor(nama, [`PROBE CACAT: ${hasil.alasan}`]); await ctx.close(); return; }

    await page.waitForTimeout(2500);
    const post = tulis.metode.filter((x) => x === 'POST').length;
    if (!tulis.n) m.push('PROBE CACAT: tak ada request tulis yang tercegat — hasil tak bermakna');
    else if (post > 1) m.push(`TERCATAT ${post}x untuk SATU ketukan ganda (POST) — transaksi dobel`);
    if (tulis.n && post === 1 && hasil.sesudah1 === false) {
      // Bukan temuan: catatan bahwa celah render NYATA dan yang menahannya
      // adalah latch sinkron, bukan `disabled`. Kalau suatu saat latch dilepas,
      // baris ini yang menjelaskan kenapa sapuan ini ada.
      console.log('    (celah render nyata: tombol belum disabled saat klik ke-2 — ditahan latch sinkron)');
    }
  } catch (e) {
    m.push(`PROBE CACAT: ${e.message.split('\n')[0]}`);
  }
  lapor(nama, m);
  await ctx.close();
}

// ── Kas RT: tambah transaksi ─────────────────────────────────────────────────
/* ── Bagian NOL BARIS ──────────────────────────────────────────────────────
 * Bagian menggantung di atas menguji "server DIAM". Bagian ketuk-ganda menguji
 * "satu niat tercatat dua kali". Yang tak tersentuh keduanya: **server menjawab
 * SUKSES untuk tulis yang mengubah NOL BARIS.**
 *
 * Itu jawaban asli PostgREST saat tak ada baris cocok — `PATCH`/`DELETE` tanpa
 * `Prefer: return=representation` dibalas **204 kosong**, byte per byte identik
 * dgn balasan saat satu baris benar-benar berubah. Tanpa `.select()`, klien
 * secara STRUKTURAL tak bisa membedakannya, jadi ia menoast "tersimpan" untuk
 * sesuatu yang tak pernah tersimpan.
 *
 * Terukur 23 Agu 2026 di Kelola Anggota: PATCH dibalas 204 → app tetap menoast
 * "Data anggota diperbarui". Dua pemicunya bukan karangan — RT ini punya DUA
 * admin aktif (baris bisa sudah diubah/dihapus dari HP lain), dan policy RLS
 * yang hilang membuat UPDATE kena nol baris tanpa error sama sekali.
 *
 * Vonisnya: app boleh gagal, TAPI TIDAK BOLEH MENGAKU BERHASIL. Ketiga permukaan
 * toast dibaca (role=status, role=alert, dan wadah toast tanpa role) — pelajaran
 * cacat alat ke-10 di CLAUDE.md: galat dikirim ke region ASSERTIVE, dan selektor
 * `[role="status"]` saja justru satu-satunya tempat yang dijamin kosong.
 */
const KATA_SUKSES = /tersimpan|diperbarui|berhasil|ditambahkan|disimpan|dihapus|diubah/i;
const KATA_GAGAL  = /gagal|tidak|tak |error|belum|coba lagi|muat ulang/i;

async function ujiNolBaris(nama, buka, isi, tombol, bacaan) {
  diukur++;
  const { ctx, page, tulis } = await siapkan(bacaan, (route) =>
    route.fulfill({ status: 204, body: '' }));   // 204 kosong = "berhasil, 0 baris"
  try {
    const wadah = await buka(page);
    if (!wadah) { lapor(nama, ['PROBE CACAT: form tak pernah terbuka']); return; }
    await isi(wadah);
    const btn = wadah.getByRole('button', { name: tombol }).first();
    if (!(await btn.count())) { lapor(nama, ['PROBE CACAT: tombol simpan tak ada']); return; }
    await btn.click({ force: true });
    await page.waitForTimeout(2600);   // toast sempat terpasang (lihat cacat ke-10)

    const teks = await page.evaluate(() => {
      const ambil = (sel) => [...document.querySelectorAll(sel)].map((e) => e.innerText.trim()).filter(Boolean);
      return [...ambil('[role="status"]'), ...ambil('[role="alert"]'), ...ambil('[class*="toast"]')].join(' | ');
    });
    const keluhan = [];
    if (!tulis.n) keluhan.push('PROBE CACAT: tak ada request tulis sama sekali');
    else if (KATA_SUKSES.test(teks) && !KATA_GAGAL.test(teks)) {
      keluhan.push(`MENGAKU BERHASIL untuk tulis yang mengubah NOL baris → "${teks}"`);
    } else if (!teks) {
      keluhan.push('DIAM TOTAL — tak mengaku berhasil, tapi juga tak memberi tahu bahwa tak ada yang berubah');
    }
    lapor(nama, keluhan);
  } finally {
    await ctx.close();
  }
}

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

// ── Absensi: "Simpan & Hitung Iuran" ─────────────────────────────────────────
// Jalur tulis TERBESAR di app dan satu-satunya yang berantai: `simpanTarikanSelesai`
// menyentuh 4 tabel berurutan (absensi delete+insert → talangan delete+insert →
// transaksi_kas delete+insert → tarikan update). Dua jalur di atas cuma satu insert,
// jadi keduanya tak pernah menguji apa yang terjadi kalau server diam DI TENGAH rantai.
// Yang digantung di sini adalah operasi tulis PERTAMA (absensi delete), yaitu keadaan
// terburuk bagi bendahara: tak satu pun tabel berubah, tapi layar sudah bilang
// "Menghitung…". Yang dijaga tetap sama — tombol wajib pulih dan gagalnya wajib
// diucapkan, bukan ditelan.
const WARGA = Array.from({ length: 4 }, (_, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  nama: ['Pak Slamet', 'Bu Aminah', 'H. Mahmud', 'Pak Tarno'][i],
  no_rumah: `A-${i + 1}`, no_hp: '', role: 'warga',
  status_aktif: true, created_at: '2026-01-01T00:00:00Z',
}));
const TARIKAN = [{
  id: '00000000-0000-4000-8000-0000000000a1',   // hex sah — 't' bukan digit UUID
  nomor: 1, tanggal: '2026-08-15', jumlah_per_orang: 5000,
  total_hadir: 0, total_warga: WARGA.length, sohibul_bait_id: WARGA[0].id,
  status: 'dijadwalkan', total_terkumpul: 0, created_at: '2026-01-01T00:00:00Z',
  sohibul_bait: WARGA[0],
}];
const bacaanAbsensi = (url) => {
  // Cocokkan nama TABEL di path, bukan sekadar substring di seluruh URL: query
  // `tarikan` membawa kata "warga" di dalam parameter select-nya (join
  // `sohibul_bait:warga!sohibul_bait_id`), jadi urutan pengecekan yang ceroboh
  // akan menjawab tabel yang salah.
  const path = new globalThis.URL(url).pathname;
  if (path.endsWith('/tarikan')) return TARIKAN;
  if (path.endsWith('/warga'))   return WARGA;
  return null;                    // sisanya tetap [] (absensi & talangan kosong)
};

await ujiTulis(
  'tulis/Absensi Simpan & Hitung Iuran',
  async (page) => {
    await page.getByRole('button', { name: 'Jadwal' }).first().click();
    /* `^Proses` — BUKAN `Proses tarikan`: Jadwal punya DUA wujud tombol ini, dan
       yang muncul untuk tarikan BERIKUTNYA (satu-satunya yang ada di data palsu)
       justru pil berlabel teks "Proses"; aria-label "Proses tarikan #N" hanya
       dipakai varian ikon-saja untuk tarikan terjadwal lainnya. Jangkar `^`
       menahan agar tak ikut mencocokkan "Memproses…" saat tombolnya sudah diklik. */
    const PROSES = /^Proses/i;
    if (!await tunggu(page, async () => await page.getByRole('button', { name: PROSES }).count() > 0)) return null;
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: PROSES }).first().click();
    // Editor absensi = VIEW penuh, bukan dialog → tunggu tombol simpannya sendiri.
    if (!await tunggu(page, async () => await page.getByRole('button', { name: /Simpan & Hitung/i }).count() > 0)) return null;
    await page.waitForTimeout(800);
    return page.locator('body');
  },
  async () => { /* default "tidak hadir" untuk semua sudah sah — tak ada field wajib */ },
  /^(Simpan & Hitung Iuran|Menghitung…|Menyimpan…)$/,
  bacaanAbsensi,
);

// ── KETUKAN GANDA — jalur INSERT yang benar-benar mencatat uang ──────────────
// `buka`/`isi` sengaja SAMA PERSIS dengan skenario di atas (disalin sebagai
// pemanggilan, bukan logika baru) supaya kalau formnya berubah, kedua bagian
// ikut berubah bersama alih-alih satu diam-diam basi.
await ujiKetukGanda(
  'ketuk-ganda/Kas RT tambah transaksi',
  async (page) => {
    await page.getByRole('button', { name: 'Kas RT' }).first().click();
    if (!await tunggu(page, async () => await page.getByRole('button', { name: /Tambah transaksi Kas RT/i }).count() > 0)) return null;
    await page.getByRole('button', { name: /Tambah transaksi Kas RT/i }).click();
    if (!await tunggu(page, async () => await page.locator('[role="dialog"]').count() > 0)) return null;
    await page.waitForTimeout(600);
    return page.locator('[role="dialog"]').last();
  },
  async (dialog) => {
    await dialog.locator('input[inputmode="numeric"]').first().fill('50000');
    const ket = dialog.locator('input[type="text"]').first();
    if (await ket.count()) await ket.fill('audit ketuk ganda');
  },
  /^(Simpan|Menyimpan…)$/,
);

await ujiKetukGanda(
  'ketuk-ganda/Kelola Anggota tambah warga',
  async (page) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    if (!await tunggu(page, async () => await page.getByRole('menu').count() > 0)) return null;
    await page.getByRole('menu').getByText('Kelola Anggota', { exact: false }).first().click();
    if (!await tunggu(page, async () => await page.getByRole('button', { name: /Tambah [Aa]nggota/ }).count() > 0)) return null;
    await page.getByRole('button', { name: /Tambah [Aa]nggota/ }).first().click();
    if (!await tunggu(page, async () => await page.locator('[role="dialog"]').count() > 0)) return null;
    await page.waitForTimeout(600);
    return page.locator('[role="dialog"]').last();
  },
  async (dialog) => { await dialog.locator('#anggota-nama').fill('Warga Ketuk Ganda'); },
  /^(Simpan Anggota|Menyimpan…)$/,
);

// ── NOL BARIS: jalur uang yang bisa dijangkau sapuan ─────────────────────────
await ujiNolBaris(
  'nol-baris/Kelola Anggota ubah warga',
  async (page) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    if (!await tunggu(page, async () => await page.getByRole('menu').count() > 0)) return null;
    const item = page.getByRole('menu').getByText('Kelola', { exact: false });
    if (!await item.count()) return null;
    await item.first().click();
    if (!await tunggu(page, async () => await page.getByRole('button', { name: /Tambah anggota/i }).count() > 0)) return null;
    await page.waitForTimeout(600);
    /* Baris anggota TAK berlabel "Edit" — pembukanya baris itu sendiri, dan nama
       aksesibelnya = nama warga. Pelajaran cacat ke-13: satu aksi bisa punya nama
       yang sama sekali berbeda dari kata di tombolnya. */
    /* `hasText: /\S/` WAJIB ikut. `hasNotText` saja MELOLOSKAN tombol ikon yang
       teksnya kosong (tutup & muat-ulang di kepala overlay), dan `.first()` lalu
       mendarat di sana alih-alih di baris warga — form tak pernah terbuka dan
       sapuan melaporkannya sbg "PROBE CACAT" tanpa menyebut sebabnya. */
    const baris = page.locator('[role="dialog"] button')
      .filter({ hasText: /\S/ })
      .filter({ hasNotText: /Tambah|Cari|Tutup|Muat|Simpan/i });
    if (!(await baris.count())) return null;
    await baris.first().click({ force: true });
    if (!await tunggu(page, async () => await page.locator('#anggota-nama').count() > 0)) return null;
    await page.waitForTimeout(600);
    return page.locator('[role="dialog"]').last();
  },
  async (dialog) => { await dialog.locator('#anggota-nama').fill('Warga Audit Nol Baris'); },
  /* Mode EDIT memakai label BERBEDA dari mode tambah ("Simpan Perubahan" vs
     "Simpan Anggota"). Cacat ke-13 di CLAUDE.md persis bentuk ini: satu aksi,
     nama aksesibel yang berubah menurut keadaan data. */
  /^(Simpan Perubahan|Menyimpan…)$/,
  (url) => (url.includes('/warga') ? WARGA : null),
);

await browser.close();
console.log(`\n=== ${diukur} jalur tulis diperiksa @${W}px · ${gagalTotal} bermasalah ===`);
process.exit(gagalTotal ? 1 : 0);
