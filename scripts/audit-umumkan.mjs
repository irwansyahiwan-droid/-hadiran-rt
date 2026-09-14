// Audit UMUMKAN — apakah perubahan daftar karena PENCARIAN atau FILTER
// diumumkan ke pembaca layar (WCAG §4.1.3 Status Messages, AA).
//
// Kenapa alat sendiri (14 Sep 2026, audit Web Interface Guidelines ke-6):
// enam kolom cari & chip filter di app ini mengubah daftar tanpa satu suara
// pun. Yang melihat layar membaca "Tidak ada hasil"; yang tidak, mengetik nama
// warga lalu tak tahu apakah hasilnya 12 atau nol. WCAG memakai "jumlah hasil
// pencarian" sebagai CONTOH UTAMA §4.1.3. Tak ada sapuan yang menangkapnya:
// `audit:nama` memeriksa NAMA kontrol, `audit:jaga-isian` region live untuk
// GALAT — tak satu pun mengetik di kolom cari lalu mendengarkan.
//
// Vonis dari REGION LIVE yang sungguh dibaca pembaca layar (`role=status` milik
// Toaster), direkam lewat MutationObserver SEPANJANG jalan — bukan dipotret di
// akhir (pelajaran B5/B6 `audit:jaga-isian`: keadaan akhir buta terhadap urutan).
//
// Empat sifat per permukaan:
//   U1 DIAM saat dibuka — membuka tab/overlay tak boleh mengumumkan "Menampilkan…"
//      (tanpa ini, obatnya gampang berubah jadi cerewet di tiap muat).
//   U2 CARI → "Menampilkan N <benda>", SATU kali untuk satu ketikan beruntun
//      (per huruf = pembaca layar menyela dirinya sendiri).
//   U3 CARI tanpa hasil → kalimat layar kosong ("Tidak ada hasil. …").
//   U4 CHIP filter → diumumkan juga.
//
// Pakai: npm run audit:umumkan
//   Validasi = sebelum/sesudah (build tanpa pengumuman → merah di tiap
//   permukaan). Bendahara di-MOCK 3 lapis (harness) — nol tulis.
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, openMenuItem } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const MUSTAHIL = 'zqxjv';

const PERMUKAAN = [
  { peran: 'warga', nama: 'Jadwal warga', tab: 'Jadwal', benda: 'anggota', cari: true, chip: true },
  { peran: 'warga', nama: 'Hadiran', tab: 'Hadiran', benda: 'tarikan', cari: false, chip: true },
  { peran: 'warga', nama: 'Kas RT', tab: 'Kas RT', benda: 'transaksi', cari: true, chip: true },
  /* Satu baris Talangan = satu WARGA (keputusan user) — bendanya warga. */
  { peran: 'bendahara', nama: 'Talangan', tab: 'Talangan', benda: 'warga', cari: true, chip: true },
  /* Kolom cari Jadwal bendahara hidup di EDITOR ABSENSI (dibuka lewat "Proses"),
     bukan di halaman tab — percobaan pertama mencarinya di tab & keluar PROBE CACAT. */
  { peran: 'bendahara', nama: 'Editor Absensi', tab: 'Jadwal', buka: /^Proses/i, benda: 'anggota', cari: true, chip: true },
  { peran: 'bendahara', nama: 'Kelola Anggota', menu: 'Kelola Anggota', benda: 'anggota', cari: true, chip: false },
  { peran: 'bendahara', nama: 'Riwayat Aktivitas', menu: 'Riwayat Aktivitas', benda: 'aktivitas', cari: true, chip: true },
];

const temuan = [];
const cacat = [];
let diperiksa = 0;
const catat = (p, sifat, pesan) => temuan.push(`[${p.nama}] ${sifat} ${pesan}`);
/* Yang TERDENGAR dicetak selalu, bukan cuma saat merah: "0 bermasalah" tanpa
   bukti isi region tak bisa dibedakan dari probe yang tak mendengar apa pun. */
const terdengar = [];

async function pasangPerekam(page) {
  await page.evaluate(() => {
    const r = document.querySelector('p.sr-only[role="status"][aria-live="polite"]');
    window.__umum = [];
    if (!r) { window.__umumTak = true; return; }
    new MutationObserver(() => {
      const t = r.textContent.trim();
      if (t) window.__umum.push({ t, ms: performance.now() });
    }).observe(r, { childList: true, characterData: true, subtree: true });
  });
}
const sejak = (page, mulai) => page.evaluate((m) => window.__umum.filter((u) => u.ms >= m).map((u) => u.t), mulai);
const kini = (page) => page.evaluate(() => performance.now());

async function lapisanAtas(page) {
  const d = page.locator('[role="dialog"]').last();
  return (await d.count()) ? d : page.locator('main');
}

const browser = await chromium.launch();
for (const peran of ['warga', 'bendahara']) {
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: peran === 'bendahara' });
  await page.goto(URL, { waitUntil: 'networkidle' });
  if (peran === 'warga') await loginWarga(page);
  await page.locator('nav button', { hasText: 'Beranda' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await pasangPerekam(page);
  if (await page.evaluate(() => window.__umumTak)) { cacat.push(`${peran}: region live Toaster tak ditemukan`); await ctx.close(); continue; }

  for (const p of PERMUKAAN.filter((x) => x.peran === peran)) {
    try {
      // U1 — membuka permukaan tak mengumumkan apa pun tentang daftar
      let m = await kini(page);
      if (p.tab) {
        await gotoTab(page, p.tab);
        if (p.buka) {
          const b = page.getByRole('button', { name: p.buka }).first();
          if (!(await b.count())) { cacat.push(`[${p.nama}] pemicu tak ada`); continue; }
          m = await kini(page);
          await b.click();
        }
      } else if (!(await openMenuItem(page, p.menu))) { cacat.push(`[${p.nama}] menu tak terbuka`); continue; }
      await page.waitForTimeout(1500);
      diperiksa++;
      const saatBuka = (await sejak(page, m)).filter((t) => /^Menampilkan|^Tidak ada hasil/.test(t));
      if (saatBuka.length) catat(p, 'U1', `CEREWET saat dibuka: ${JSON.stringify(saatBuka)}`);

      const lapis = await lapisanAtas(page);
      const polaAda = new RegExp(`^Menampilkan \\d+ ${p.benda}$`);
      if (p.cari) {
        const kolom = lapis.locator('input[inputmode="search"]:visible').first();
        if (!(await kolom.count())) { cacat.push(`[${p.nama}] kolom cari tak ada`); }
        else {
          // U2 — satu ketikan beruntun (3 huruf) = SATU pengumuman "Menampilkan N benda"
          await kolom.click();
          m = await kini(page);
          await page.keyboard.type('ari', { delay: 90 });
          await page.waitForTimeout(1600);
          const u2 = await sejak(page, m);
          const cocok = u2.filter((t) => polaAda.test(t) || /^Tidak ada hasil/.test(t));
          if (!cocok.length) catat(p, 'U2', `cari "ari" → DIAM (region: ${JSON.stringify(u2)})`);
          if (cocok.length) terdengar.push(`[${p.nama}] U2 "ari" → ${JSON.stringify(cocok)}`);
          if (cocok.length > 1) catat(p, 'U2', `cari "ari" → ${cocok.length} pengumuman untuk satu ketikan (debounce): ${JSON.stringify(cocok)}`);

          // U3 — tanpa hasil → kalimat layar kosong
          await kolom.fill('');
          await page.waitForTimeout(900);
          m = await kini(page);
          await kolom.pressSequentially(MUSTAHIL, { delay: 60 });
          await page.waitForTimeout(1600);
          const u3 = await sejak(page, m);
          terdengar.push(`[${p.nama}] U3 "${MUSTAHIL}" → ${JSON.stringify(u3)}`);
          if (!u3.some((t) => /^Tidak ada hasil\. \S/.test(t))) catat(p, 'U3', `cari "${MUSTAHIL}" → tak ada "Tidak ada hasil. …" (region: ${JSON.stringify(u3)})`);
          const layarKosong = await lapis.getByText('Tidak ada hasil', { exact: true }).count();
          if (!layarKosong) cacat.push(`[${p.nama}] U3 layar kosong tak tampil — kueri mustahil ternyata cocok?`);
          await kolom.fill('');
          await page.waitForTimeout(900);
        }
      }
      if (p.chip) {
        // U4 — chip filter yang belum aktif
        /* Tombol periode grafik Kas RT ("3 bln") juga ber-aria-pressed, tapi ia tak
           menyaring DAFTAR — percobaan pertama memilihnya lalu memvonis "DIAM". */
        const chip = lapis.locator('button[aria-pressed="false"]:not([aria-label$="bulan terakhir"])').filter({ hasNotText: /^\s*$/ }).first();
        if (!(await chip.count())) { cacat.push(`[${p.nama}] chip filter tak ada`); }
        else {
          const label = (await chip.innerText()).trim();
          m = await kini(page);
          await chip.click();
          await page.waitForTimeout(1500);
          const u4 = await sejak(page, m);
          terdengar.push(`[${p.nama}] U4 chip "${label}" → ${JSON.stringify(u4)}`);
          if (!u4.some((t) => polaAda.test(t) || /^Tidak ada hasil\. \S/.test(t))) catat(p, 'U4', `chip "${label}" → DIAM (region: ${JSON.stringify(u4)})`);
          // kembalikan ke "Semua" supaya permukaan berikutnya mulai bersih
          const semua = lapis.locator('button[aria-pressed="false"]', { hasText: /^Semua$/ }).first();
          if (await semua.count()) { await semua.click(); await page.waitForTimeout(900); }
        }
      }
      if (p.menu) { await page.keyboard.press('Escape'); await page.waitForTimeout(900); }
      if (p.buka) { await page.goBack(); await page.waitForTimeout(1200); }
    } catch (e) {
      cacat.push(`[${p.nama}] ${e.message.split('\n')[0].slice(0, 120)}`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
  await ctx.close();
}
await browser.close();

console.log(`\n=== UMUMKAN §4.1.3: ${diperiksa} permukaan diperiksa · ${temuan.length} bermasalah · ${cacat.length} probe cacat ===`);
terdengar.forEach((t) => console.log('  · ' + t));
temuan.forEach((t) => console.log('  ' + t));
cacat.forEach((c) => console.log('  PROBE CACAT ' + c));
if (cacat.length || diperiksa < PERMUKAAN.length) process.exit(2);
process.exit(temuan.length ? 1 : 0);
