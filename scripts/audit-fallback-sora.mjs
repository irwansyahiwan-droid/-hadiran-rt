// Audit FALLBACK SORA — keadaan yang app BENAR-BENAR kirim tapi tak satu pun
// sapuan lain pernah lihat.
//
// ── KENAPA ADA ──────────────────────────────────────────────────────────────
// Sejak 5 Sep 2026 Sora dipasang `font-display: optional`: peramban memberi
// jendela blok ~100 ms lalu TIDAK PERNAH menukar. Itu yang menutup kedip 1.898
// ms di kunjungan pertama — tapi konsekuensinya, di jaringan lambat SELURUH
// judul & wordmark dirender INTER, bukan Sora, sepanjang kunjungan itu.
//
// Dan Inter LEBIH LEBAR: terukur 238,3 -> 259 px pada 700/32px, +8,7%. Jadi
// arahnya justru arah yang berisiko LUBER.
//
// Tak satu pun dari 35 sapuan melihat keadaan itu, dan sebabnya struktural:
// semuanya berjalan di localhost, tempat Sora selalu MENANG balapan 100 ms
// (diverifikasi: `Sora Variable=loaded`, 3/3 run). Keadaan yang cuma muncul di
// jaringan lambat karena itu tak pernah masuk populasi siapa pun — bentuk yang
// sama dgn pelajaran ke-33: ambang yang tak dijaga alat sama dgn ambang yang
// tak ada.
//
// Waktu `optional` dipilih, keadaan ini diukur MANUAL sekali: 3 lebar x 4 tab
// WARGA, populasi 21, nol luapan baru. Batasnya diakui terang-terangan di
// CLAUDE.md ke-38: permukaan BENDAHARA & SHEET belum diukur. Sapuan ini
// menutup batas itu, dan menjadikannya penjaga alih-alih catatan.
//
// ── YANG DIVONIS ────────────────────────────────────────────────────────────
// Teks yang MUAT saat Sora ada, tapi TERPOTONG saat Sora tidak ada.
// Populasinya SELURUH teks yang terkurung (aturan sama persis `audit:potong`),
// bukan hanya teks bertumpuk Sora — memblokir Sora menggeser tata letak, jadi
// tetangganya bisa ikut terdorong. Membatasi populasi ke tumpukan Sora akan
// melewatkan justru efek lanjutannya.
//
// Juga dilaporkan (TIDAK menggagalkan): teks yang sudah terpotong lalu
// kehilangan LEBIH banyak. Itu bukan isi yang hilang gara-gara fallback, ia
// sudah hilang sebelumnya — miliknya `audit:potong`.
//
// ── KONTROL, dan kenapa ia yang paling penting di sini ──────────────────────
// Probe pertamaku untuk ini MEMBLOKIR TANPA PERNAH MENGGIGIT dan tetap
// mencetak "0px selisih" — hijau yang berasal dari blokir yang tak terjadi.
// Karena itu tiap jalan WAJIB membuktikan: berapa permintaan woff2 ditolak,
// dan `document.fonts.check` HARUS true di pass pertama & false di pass kedua.
// Salah satu meleset = PROBE CACAT, bukan hijau.
//
// Pakai:  npm run audit:fallback-sora
//   MUTASI=1  lebarkan teks bertumpuk Sora di pass fallback; WAJIB merah
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, closeLayer, openMenuItem } from './lib/audit-harness.mjs';

const URL_APP = process.env.CAP_URL || 'http://localhost:5199';
const LEBAR = (process.env.LEBAR || '320,390').split(',').map(Number);
const MUTASI = +(process.env.MUTASI || 0);
/* Lantai dihitung dari PERMUKAAN, bukan jumlah teks. Jumlah teks bergerak
   mengikuti isi DB (69 warga hari ini, 300 KK yang dijanjikan besok), jadi
   lantai berbasis teks akan salah setiap kali datanya tumbuh atau menyusut.
   Jumlah permukaan adalah properti APP: 4 tab warga + 5 tab bendahara + 3 FAB/
   sheet + menu aksi + revisi + 5 overlay admin + form anggota = 19 per lebar,
   x 2 lebar = 38. Lantai ~95%. */
const LANTAI = 36;

/* Aturan terkurung SAMA PERSIS `audit:potong` — termasuk penjaga
   `overflowX === 'visible'` yang di sana ditambahkan karena elemen yang
   SENGAJA dibiarkan meluber dilaporkan "terpotong" padahal terbaca utuh. */
const PUNGUT = () => {
  const out = [];
  const dialogs = document.querySelectorAll('[role="dialog"]');
  const akar = dialogs.length ? dialogs[dialogs.length - 1] : document;
  akar.querySelectorAll('*').forEach((el) => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim();
    if (!t) return;
    const cs = getComputedStyle(el);
    if (cs.overflowX === 'visible') return;
    if (cs.textOverflow !== 'ellipsis' && cs.overflow !== 'hidden') return;
    if (el.clientWidth <= 0 || cs.visibility === 'hidden') return;
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const kurang = rg.getBoundingClientRect().width - el.clientWidth;
    out.push({ t: t.slice(0, 40), kurang: +kurang.toFixed(1), sora: /^["']?Sora Variable/.test(cs.fontFamily) });
  });
  return out;
};

/* Bagian B — BARIS, bukan margin.
   Percobaan PERTAMAKU di sini memvonis dari MARGIN: lebar teks kalau dirender
   Inter lawan lebar kotaknya. Ia melaporkan 13 "tak muat", di antaranya
   "STRUKTUR PENGURUS RT 004/006" kurang 58px — dan itu TEMUAN PALSU. Kotaknya
   memang lebih sempit dari teks satu baris, tapi teksnya MELIPAT; judul yang
   melipat tidak rusak. Vonis margin hanya sah untuk wadah yang tak bisa
   melipat, dan wadah semacam itu justru sudah dijaga bagian A (terkurung).
   Aturan alat repo ini: temuan palsu → betulkan ALATNYA.

   Yang benar-benar berubah dan bisa dilihat warga: JUMLAH BARIS. Inter 8,7%
   lebih lebar, jadi judul yang pas di dua baris bisa jadi tiga — mendorong
   seluruh isi di bawahnya. Itu terukur langsung dari keadaan yang DIRENDER di
   tiap pass, bukan dari pengukuran sintetis: `getClientRects().length`. */
const BARIS = () => {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  const akar = dialogs.length ? dialogs[dialogs.length - 1] : document;
  const out = [];
  for (const el of akar.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (!/^["\']?Sora Variable/.test(cs.fontFamily)) continue;
    if (cs.visibility === 'hidden') continue;
    const n = [...el.childNodes].find((x) => x.nodeType === 3 && x.textContent.trim());
    if (!n) continue;
    const rg = document.createRange();
    rg.selectNodeContents(n);
    const rects = rg.getClientRects();
    if (!rects.length) continue;
    out.push({ t: n.textContent.trim().slice(0, 40), baris: rects.length, tinggi: +el.getBoundingClientRect().height.toFixed(1) });
  }
  return out;
};

async function pungut(page, kunci, ke, keM) {
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  for (const f of await page.evaluate(PUNGUT)) ke.set(`${kunci}|${f.t}`, f);
  for (const m of await page.evaluate(BARIS)) keM.set(`${kunci}|${m.t}`, { ...m, k: kunci });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
}

/* Populasi permukaan dipetakan dari sapuan yang SUDAH ada (`audit:potong`
   untuk layar & overlay admin, `audit:sheet-geometri` untuk sheet & form),
   bukan disusun ulang dari ingatan. */
async function jelajah(page, w, peran, ke, keM) {
  let dilewat = 0;
  const K = (n) => `${w}/${peran}/${n}`;
  const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
  for (const tab of tabs) { await gotoTab(page, tab); await pungut(page, K(tab), ke, keM); }
  if (peran === 'warga') return { n: tabs.length, dilewat };

  let n = tabs.length;
  // FAB & sheet form — pemicunya BERBEDA bentuk, jadi tiap entri bawa pembukanya
  for (const [tab, nama, pola] of [
    ['Hadiran', 'sheet-setor', /Setor ke Kas RT/i],
    ['Kas RT', 'sheet-kasrt', /Tambah transaksi Kas RT/i],
    ['Kas RT', 'sheet-target', /Ubah target|Tetapkan Target/i],
  ]) {
    await gotoTab(page, tab);
    const t = page.getByRole('button', { name: pola }).first();
    if (!(await t.count())) { console.log(`     DILEWAT ${nama} — pemicunya butuh data nyata`); dilewat++; continue; }
    await t.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1100);
    if (await page.locator('[role="dialog"]').count()) { await pungut(page, K(nama), ke, keM); n++; }
    await closeLayer(page);
  }
  // menu aksi baris tarikan → revisi jadwal (dua langkah)
  await gotoTab(page, 'Jadwal');
  const aksi = page.getByRole('button', { name: /Aksi lainnya tarikan/i }).first();
  if (await aksi.count()) {
    await aksi.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await page.waitForTimeout(350);
    await aksi.click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
    await pungut(page, K('menu-aksi-tarikan'), ke, keM); n++;
    const rev = page.locator('[role="dialog"] button, [role="menu"] button').filter({ hasText: /Revisi jadwal/i }).first();
    if (await rev.count()) { await rev.click({ force: true }).catch(() => {}); await page.waitForTimeout(1300); await pungut(page, K('sheet-revisi'), ke, keM); n++; }
    else dilewat++;
    await closeLayer(page);
  } else { console.log('     DILEWAT menu-aksi-tarikan + sheet-revisi — pemicunya butuh data nyata'); dilewat += 2; }
  // overlay admin lewat menu Header
  for (const [label, nama] of [
    ['Tutup Buku Triwulan', 'laporan'], ['Riwayat Aktivitas', 'riwayat'],
    ['Kelola Anggota', 'anggota'], ['Backup & Restore', 'backup'], ['Tentang Aplikasi', 'tentang'],
  ]) {
    if (!(await openMenuItem(page, label))) { console.log(`     DILEWAT ${nama} (menu tak terbuka)`); dilewat++; continue; }
    await pungut(page, K(nama), ke, keM); n++;
    if (nama === 'anggota') {
      const tbh = page.getByRole('button', { name: /Tambah [Aa]nggota/ }).first();
      if (await tbh.count()) { await tbh.click({ force: true }).catch(() => {}); await page.waitForTimeout(1000); await pungut(page, K('sheet-anggota'), ke, keM); n++; await closeLayer(page); }
      else dilewat++;
    }
    await closeLayer(page);
  }
  return { n, dilewat };
}

async function jalan(browser, w, peran, blokir) {
  const { ctx, page } = await newCtx(browser, 'light', { bendahara: peran === 'bendahara' });
  await page.setViewportSize({ width: w, height: 844 });
  let ditolak = 0;
  if (blokir) await ctx.route(/sora-latin.*\.woff2/, (r) => { ditolak++; return r.abort(); });
  if (blokir && MUTASI === 1) {
    /* Meniru fallback yang JAUH lebih lebar dari Inter. Kalau vonisnya sehat,
       ini wajib melahirkan temuan; kalau tetap nol, yang rusak sapuannya. */
    await ctx.addInitScript(() => {
      const s = document.createElement('style');
      s.textContent = '*{letter-spacing:0.09em!important}';
      const p = () => (document.head || document.documentElement).appendChild(s);
      if (document.head) p(); else document.addEventListener('DOMContentLoaded', p);
    });
  }
  await page.goto(URL_APP, { waitUntil: 'networkidle', timeout: 90_000 });
  if (peran === 'warga') await loginWarga(page);
  await page.waitForTimeout(3000);
  if (!(await page.locator('nav button').count())) {
    console.log(`  PROBE CACAT [${w}/${peran}]: tak pernah masuk app`);
    await ctx.close(); return null;
  }
  const ke = new Map();
  const keM = new Map();   // bagian B: jumlah baris, diukur di KEDUA pass
  const { n: nPermukaan, dilewat } = await jelajah(page, w, peran, ke, keM);
  const soraAda = await page.evaluate(() => document.fonts.check('700 32px "Sora Variable"'));
  await ctx.close();
  return { ke, keM, ditolak, soraAda, nPermukaan, dilewat };
}

const browser = await chromium.launch();
console.log(`\n═══ FALLBACK SORA · font-display:optional di jaringan lambat${MUTASI ? `  [MUTASI=${MUTASI}]` : ''} ═══`);
console.log(`lebar ${LEBAR.join(', ')}px · warga + SELURUH permukaan bendahara & sheet\n`);

const temuan = [];
const memburuk = [];
const margin = [];
let pop = 0, permukaan = 0, cacat = false, dilewatTotal = 0, popM = 0;

for (const w of LEBAR) {
  for (const peran of ['warga', 'bendahara']) {
    const A = await jalan(browser, w, peran, false);
    const B = await jalan(browser, w, peran, true);
    if (!A || !B) { cacat = true; continue; }
    // ── KONTROL: blokirnya benar-benar menggigit? ──
    if (B.ditolak === 0 || A.soraAda !== true || B.soraAda !== false) {
      console.log(`  PROBE CACAT [${w}/${peran}]: blokir tak menggigit — ditolak=${B.ditolak} soraAda ${A.soraAda}→${B.soraAda}`);
      cacat = true; continue;
    }
    pop += A.ke.size; permukaan += A.nPermukaan; dilewatTotal += A.dilewat;
    // B — bandingkan JUMLAH BARIS teks Sora antara kedua pass
    popM += A.keM.size;
    for (const [k, a] of A.keM) {
      const b = B.keM.get(k); if (!b) continue;
      if (b.baris > a.baris) margin.push({ w, peran, k: a.k, t: a.t, dari: a.baris, ke: b.baris, dTinggi: +(b.tinggi - a.tinggi).toFixed(1) });
    }
    let baru = 0, buruk = 0;
    for (const [k, a] of A.ke) {
      const b = B.ke.get(k); if (!b) continue;
      if (a.kurang <= 0.5 && b.kurang > 0.5) { temuan.push({ w, peran, k, t: a.t, hilang: b.kurang, sora: b.sora }); baru++; }
      else if (a.kurang > 0.5 && b.kurang - a.kurang > 8) { memburuk.push({ w, peran, t: a.t, d: +(b.kurang - a.kurang).toFixed(1) }); buruk++; }
    }
    console.log(`  ${baru ? '✗' : 'ok'}  [${w}/${peran}] ${A.nPermukaan} permukaan · ${A.ke.size} teks terkurung · ${baru} luapan BARU${buruk ? ` · ${buruk} memburuk` : ''}  (${B.ditolak} woff2 ditolak)`);
  }
}
await browser.close();

// ── B. teks Sora yang BERTAMBAH BARIS saat jatuh ke Inter ──
const sempit = margin;
console.log(`\n── B. teks Sora bertambah baris saat dirender Inter (${popM} teks) ──`);
if (!sempit.length) console.log('   ok   nol teks bertambah baris');
for (const m of sempit.slice(0, 10)) {
  console.log(`   GAGAL ${m.dari} → ${m.ke} baris (+${m.dTinggi}px tinggi)  [${m.w}/${m.peran}] ${m.k.split('/').pop()}  "${m.t}"`);
}

console.log(`\n=== ${permukaan} permukaan diperiksa · ${pop} teks terkurung · ${popM} teks Sora · A: ${temuan.length} luapan BARU · B: ${sempit.length} bertambah baris ===`);
if (cacat) { console.log('\nPROBE CACAT — lihat di atas'); process.exit(2); }
/* `DILEWAT` WAJIB dicurigai sekuat temuan merah (pelajaran `audit:mundur`:
   dua popover diuji di layar yang SALAH berbulan-bulan dan dilaporkan
   "dilewat karena pemicu tak ada" — kalimat yang benar untuk DATA tapi
   menyembunyikan bahwa mereka tak pernah diuji sama sekali). Di sini
   sebabnya memang DATA: permukaan target Kas RT & revisi jadwal cuma ada
   kalau DB-nya hidup. Sapuan tak boleh mencetak hijau dari populasi yang
   distarve — ia mengaku, dan keluar PROBE CACAT. */
if (dilewatTotal) {
  console.log(`\nPROBE CACAT: ${dilewatTotal} permukaan tak pernah terbuka — jalankan lawan DB hidup`);
  console.log('  (target Kas RT & revisi jadwal hanya ada kalau ada data; lingkungan tanpa Supabase');
  console.log('   menstarve populasi, dan luapan teks bergantung pada STRING NYATA — nama warga,');
  console.log('   keterangan — jadi hijau dari data palsu tak mengatakan apa pun tentang produksi)');
  process.exit(2);
}
if (permukaan < LANTAI) { console.log(`\nPOPULASI TURUN ${permukaan} permukaan < lantai ${LANTAI}`); process.exit(1); }
for (const t of temuan) console.log(`  · [${t.w}/${t.peran}] ${t.k.split('/').pop()}  "${t.t}"  hilang ${t.hilang}px${t.sora ? ' (teks Sora)' : ' (terdorong tetangga)'}`);
if (memburuk.length) {
  console.log(`\n  ── sudah terpotong SEBELUM fallback, jadi milik audit:potong (tak menggagalkan) ──`);
  for (const m of memburuk.slice(0, 8)) console.log(`     [${m.w}/${m.peran}] "${m.t}"  +${m.d}px lebih hilang`);
}
if (MUTASI && temuan.length === 0 && sempit.length === 0) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tetap hijau — mutasinya tak menggigit`); process.exit(2); }
process.exit(temuan.length || sempit.length ? 1 : 0);
