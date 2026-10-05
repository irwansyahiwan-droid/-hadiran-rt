// KATA PATAH — satu kata yang tercetak di LEBIH DARI SATU baris ("KAS HADIR" /
// "AN", "Tarikan #" / "22"), plus awal teks yang TERKLIP KIRI oleh leluhur
// ber-overflow ("Setor ke" / "as RT"). Warga + bendahara, 5 tab + overlay Menu,
// 320px (WAJIB §1.4.10) & 360px (acuan terkecil app).
//
// Kenapa ada (5 Okt 2026): dari 40-an sapuan, tak satu pun bertanya apakah
// sebuah KATA masih utuh. `audit:potong` memvonis teks yang HILANG (truncate/
// line-clamp), `audit:lebar` nominal yang MELUBER, `audit:reflow` halaman yang
// geser samping — kata patah tak melakukan satu pun: ia utuh, cuma terbelah.
// Tiga cacat hidup sekaligus tanpa satu laporan, dan yang membongkarnya POTRET:
//   · label hero Beranda "SALDO / KAS HADIR / AN" — kolom 80px, "KAS HADIRAN"
//     diikat NBSP 125px, `overflow-wrap: anywhere` mematahkannya (f6b9703)
//   · 10 judul Riwayat Aktivitas @320px ("Tarikan # / 22", "Pemas / ukan Kas
//     RT") — rail nominal mengapung menyisakan ±50px di baris pertama (9556fe6)
//   · MetaPisah "Setor ke" / "as RT" — geseran -0,8em memotong huruf pertama
//     tiap baris LANJUTAN (6720094)
// Pengaman `overflow-wrap: anywhere`/`break-words` itu SAH (tanpa mereka kata
// yang lebih lebar dari kolomnya mendorong halaman geser samping) — justru
// karena itu ia diam-diam mematahkan kata begitu kolomnya menyempit.
//
// Vonis dari GEJALA, bukan proksi: kata = token tanpa spasi biasa (NBSP
// mengikat, jadi "Kas Hadiran" satu token — persis yang dicetak peramban);
// PATAH = `Range` atas token itu punya rect di >1 `top`. KLIP-KIRI = rect
// pertama token mulai di KIRI tepi leluhur ber-`overflow-x` ≠ visible.
// Populasi = lapisan TERATAS saja (dialog paling atas, atau body) — halaman di
// belakang overlay tak di-unmount (pelajaran `audit:potong`).
//
// Pakai:  npm run audit:kata-patah
//   LEBAR=320          → satu lebar saja (bawaan 320,360)
//   CAP_URL=https://hadiran-rt.vercel.app   (wajib sekali sebelum dianggap benar)
//   MUTASI=1  → kembalikan geometri Riwayat pra-9556fe6 (rail -mb-2 setinggi
//               aslinya + break-words) — PATAH WAJIB merah
//   MUTASI=2  → kembalikan MetaPisah pra-6720094 (pemisah inline-block tanpa
//               bantalan) — KLIP-KIRI WAJIB merah
//   MUTASI=3  → teks di dalam dialog dipaksa `break-all` + lebar maks 60px —
//               PATAH WAJIB merah di SETIAP sheet. (Versi pertama tanpa lebar
//               maks cuma menggigit 4/10: form berlabel pendek tak pernah
//               melipat, jadi tak terbukti probe membaca isinya.) Sheet masuk populasi belakangan; hijau di populasi baru
//               tak membuktikan apa pun sampai probe terbukti menggigit di sana.
//   Nol temuan di cabang mutasinya = PROBE CACAT (exit 2).
//   TUNDA_DATA_MS=4000 → tombol VALIDASI: perlambat rest/v1 (penantian kerangka)
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab, openMenuItem, closeLayer } from './lib/audit-harness.mjs';

const APP = process.env.CAP_URL || 'http://localhost:5199';
const MUTASI = process.env.MUTASI || '';
const TUNDA_DATA_MS = +(process.env.TUNDA_DATA_MS || 0);
const LEBAR = (process.env.LEBAR || '320,360').split(',').map(Number);
const OVERLAY = {
  warga: ['Riwayat Aktivitas', 'Tentang Aplikasi'],
  bendahara: ['Riwayat Aktivitas', 'Kelola Anggota', 'Tutup Buku Triwulan', 'Backup & Restore', 'Tentang Aplikasi'],
};
const MUT_CSS = {
  1: `.flow-root > .float-right { height: auto !important; margin-bottom: -0.5rem !important; }
      p[id^="riw-"][id$="-judul"] { overflow-wrap: break-word !important; }`,
  2: `.meta-pisah > span > span { padding-left: 0 !important; }
      .meta-pisah > span > span::before { position: static !important; display: inline-block !important; }`,
  3: `[role="dialog"] :is(p, h2, h3, label, span, li, dt, dd) { word-break: break-all !important; max-width: 60px !important; }`,
};

/* TENANG ITU KEADAAN, BUKAN JEDA (pelajaran ke-34) — kembaran audit:huruf. */
async function tungguIsiNyata(page, batasMs = 25000) {
  const habis = Date.now() + batasMs;
  while (Date.now() < habis) {
    const n = await page.locator('.skeleton, .skeleton-bar').count().catch(() => 0);
    if (n === 0) { await page.waitForTimeout(600); return true; }
    await page.waitForTimeout(400);
  }
  return false;
}

const PROBE = () => {
  const out = []; let kata = 0;
  const atas = [...document.querySelectorAll('[role="dialog"]')].filter((d) => d.getBoundingClientRect().width > 0).pop() || document.body;
  const w = document.createTreeWalker(atas, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const e = n.parentElement; if (!e || !n.textContent.trim()) continue;
    // sr-only: tak tercetak; aria-hidden: dekoratif/duplikat (mis. singkatan "Sep");
    // data-odo: pita digit Odometer yang SENGAJA terkurung (preseden audit:jarak-teks).
    if (e.closest('.sr-only, [aria-hidden="true"], [data-odo], script, style')) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const re = /[^ \t\n\r]+/g; let m;
    while ((m = re.exec(n.textContent))) {
      if (m[0].length < 2) continue;
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const rs = [...r.getClientRects()].filter((x) => x.width > 0.5);
      if (!rs.length) continue;
      kata++;
      if (new Set(rs.map((x) => Math.round(x.top))).size > 1) out.push({ jenis: 'PATAH', kata: m[0], teks: n.textContent.trim().slice(0, 60) });
      let a = e; const kiri = rs[0].left;
      while (a && a !== document.body) {
        const ca = getComputedStyle(a);
        if (ca.overflowX !== 'visible') {
          const ar = a.getBoundingClientRect(); const tepi = ar.left + parseFloat(ca.borderLeftWidth);
          if (kiri < tepi - 0.5 && rs[0].right > tepi) out.push({ jenis: 'KLIP-KIRI', kata: m[0], teks: n.textContent.trim().slice(0, 60), kurang: +(tepi - kiri).toFixed(1) });
          break;
        }
        a = a.parentElement;
      }
    }
  }
  return { out, kata };
};

const browser = await chromium.launch();
let total = 0, layar = 0, cacat = 0, mutasiMendarat = 0;
const sheetDiukur = new Set(), sheetKena = new Set();
const temuan = { PATAH: [], 'KLIP-KIRI': [] };

for (const L of LEBAR) {
  for (const peran of ['warga', 'bendahara']) {
    const { ctx, page } = await newCtx(browser, 'light', { bendahara: peran === 'bendahara' });
    if (TUNDA_DATA_MS) await ctx.route('**/rest/v1/**', async (route) => { await new Promise((r) => setTimeout(r, TUNDA_DATA_MS)); return route.fallback(); });
    await page.setViewportSize({ width: L, height: 844 });
    await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
    if (peran === 'warga' && !(await loginWarga(page))) { console.log(`PROBE CACAT: ${peran} gagal masuk`); process.exit(2); }
    await page.locator('nav button', { hasText: 'Beranda' }).first().waitFor({ timeout: 90000 });
    if (MUTASI) await page.addStyleTag({ content: MUT_CSS[MUTASI] });

    /* Lantai kata per permukaan: halaman & overlay < 20 kata = layar kosong; SHEET
       memang ringkas (form tambah transaksi 13 kata, menu aksi 11) — ambang
       halaman di sana melaporkan PROBE CACAT palsu (terjadi di jalan pertama). */
    const ukur = async (nama, minKata = 20) => {
      const label = `[${L} ${peran}/${nama}]`;
      if (!(await tungguIsiNyata(page))) {
        const sisa = await page.evaluate(() => [...document.querySelectorAll('.skeleton, .skeleton-bar')].slice(0, 4).map((e) => { const r = e.getBoundingClientRect(); let a = e; const jalur = []; for (let i = 0; a && i < 4; i++, a = a.parentElement) jalur.push(a.tagName.toLowerCase() + (a.getAttribute('aria-label') ? `[${a.getAttribute('aria-label')}]` : '')); return `${r.width > 0 && getComputedStyle(e).visibility !== 'hidden' ? 'TERLIHAT' : 'tersembunyi'} ${jalur.join('<')}`; }));
        console.log(`  PROBE CACAT ${label}: kerangka memuat tak habis dalam 25 dtk · ${sisa.join(' | ')}`); cacat++; return;
      }
      if (await page.locator('[data-keadaan="gagal"]').count()) { console.log(`  PROBE CACAT ${label}: yang tampil layar GAGAL MUAT, bukan isi`); cacat++; return; }
      // Mendarat = gaya TERHITUNG elemen sasaran benar-benar berubah di layar ini.
      if (MUTASI && (await page.evaluate((m) => m === '1'
        ? [...document.querySelectorAll('.flow-root > .float-right')].some((e) => getComputedStyle(e).marginBottom === '-8px')
        : m === '2' ? [...document.querySelectorAll('.meta-pisah > span > span')].some((e) => getComputedStyle(e).paddingLeft === '0px' && getComputedStyle(e, '::before').position === 'static')
        : [...document.querySelectorAll('[role="dialog"] *')].some((e) => getComputedStyle(e).wordBreak === 'break-all'), MUTASI))) mutasiMendarat++;
      const { out, kata } = await page.evaluate(PROBE);
      total += kata; layar++;
      if (kata < minKata) { console.log(`  PROBE CACAT ${label}: cuma ${kata} kata — layar kosong?`); cacat++; return; }
      const unik = [...new Map(out.map((o) => [o.jenis + o.kata + o.teks, o])).values()];
      if (unik.some((o) => o.jenis === 'PATAH') && minKata === 5) sheetKena.add(nama);
      if (minKata === 5) sheetDiukur.add(nama);
      unik.forEach((o) => temuan[o.jenis].push(`${label} "${o.kata}" dlm "${o.teks}"${o.kurang ? ` · terklip ${o.kurang}px` : ''}`));
      console.log(`${label.padEnd(36)} ${String(kata).padStart(5)} kata · ${unik.length ? `${unik.length} TEMUAN` : 'ok'}`);
      unik.slice(0, 6).forEach((o) => console.log(`    ${o.jenis} "${o.kata}" dlm "${o.teks}"${o.kurang ? ` · terklip ${o.kurang}px` : ''}`));
    };

    const tabs = await page.$$eval('nav button', (bs) => bs.map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
    for (const t of tabs) { await gotoTab(page, t); await ukur(t); }

    /* SHEET & FORM (5 Okt 2026, hari yang sama dgn lahirnya). Kolom tersempit
       app justru di sini — nama warga & keterangan bebas di samping nominal,
       label di samping kolom isian. Pemicu dipetakan dari sapuan yang SUDAH
       membukanya (audit:potong · audit:fallback-sora · audit:sheet-geometri ·
       audit:jaga-isian), bukan dari ingatan. Pemicu yang tak ketemu = PROBE
       CACAT, bukan dilewati: populasi yang menyusut diam-diam adalah kelas
       cacat yang paling mahal di repo ini (pelajaran ke-23). */
    const bukaSheet = async (tab, nama, pemicu) => {
      await gotoTab(page, tab);
      const t = pemicu();
      if (!(await t.count())) { console.log(`  PROBE CACAT [${L} ${peran}/${nama}]: pemicu tak ada`); cacat++; return false; }
      await t.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await page.waitForTimeout(300);
      await t.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1100);
      /* Satu percobaan ulang: klik pertama bisa mendarat saat baris masih
         beranimasi masuk (`.rise`) — terjadi sekali di jalan validasi. Gagal
         dua kali tetap PROBE CACAT. */
      if (!(await page.locator('[role="dialog"]').count())) { await page.waitForTimeout(600); await t.click({ force: true }).catch(() => {}); await page.waitForTimeout(1300); }
      if (!(await page.locator('[role="dialog"]').count())) { console.log(`  PROBE CACAT [${L} ${peran}/${nama}]: sheet tak terbuka`); cacat++; return false; }
      await ukur(nama, 5);
      return true;
    };
    const SHEET = [
      ['Beranda', 'sheet-trx', () => page.locator('main button').filter({ hasText: /Rp[\d.]/ }).last()],
      ['Kas RT', 'sheet-detail-kasrt', () => page.locator('button[aria-label^="Lihat detail"], button[aria-label^="Aksi:"]').first()],
      ['Hadiran', 'sheet-detail-tarikan', () => page.locator('button', { hasText: 'Lihat detail' }).first()],
      ...(peran === 'bendahara' ? [
        ['Hadiran', 'sheet-setor', () => page.getByRole('button', { name: /Setor ke Kas RT/i }).first()],
        ['Kas RT', 'sheet-kasrt', () => page.getByRole('button', { name: /Tambah transaksi Kas RT/i }).first()],
        ['Kas RT', 'sheet-target', () => page.getByRole('button', { name: /Ubah target|Tetapkan Target/i }).first()],
        ['Jadwal', 'sheet-tambah-jadwal', () => page.getByRole('button', { name: /Tambah jadwal tarikan/i }).first()],
      ] : []),
    ];
    for (const [tab, nama, pemicu] of SHEET) { if (await bukaSheet(tab, nama, pemicu)) await closeLayer(page); }
    if (peran === 'bendahara') {
      // Dua langkah: menu aksi baris → Revisi jadwal (pola audit:fallback-sora).
      if (await bukaSheet('Jadwal', 'menu-aksi-tarikan', () => page.getByRole('button', { name: /Aksi lainnya tarikan/i }).first())) {
        const rev = page.locator('[role="dialog"] button, [role="menu"] button').filter({ hasText: /Revisi jadwal/i }).first();
        if (await rev.count()) { await rev.click({ force: true }).catch(() => {}); await page.waitForTimeout(1300); await ukur('sheet-revisi', 5); }
        else { console.log(`  PROBE CACAT [${L} ${peran}/sheet-revisi]: pemicu tak ada`); cacat++; }
        await closeLayer(page); await closeLayer(page);
      }
    }

    await gotoTab(page, 'Beranda');
    for (const o of OVERLAY[peran]) {
      if (!(await openMenuItem(page, o))) { console.log(`  PROBE CACAT [${L} ${peran}/${o}]: overlay tak terbuka`); cacat++; continue; }
      await page.waitForTimeout(1200);
      await ukur(o);
      if (o === 'Kelola Anggota') {
        const tbh = page.getByRole('button', { name: /Tambah [Aa]nggota/ }).first();
        if (await tbh.count()) { await tbh.click({ force: true }).catch(() => {}); await page.waitForTimeout(1000); await ukur('sheet-anggota', 5); await closeLayer(page); }
        else { console.log(`  PROBE CACAT [${L} ${peran}/sheet-anggota]: pemicu tak ada`); cacat++; }
      }
      await closeLayer(page);
    }

    if (peran === 'bendahara') {
      /* Editor Absensi = VIEW penuh (bukan dialog), layar terpadat sisi
         bendahara: 69 nama warga di kolom sempit. Terakhir, karena ia keluar
         lewat Escape dan konteksnya ditutup sesudahnya. Tak ada yang diketuk
         di dalamnya — nol tulis. */
      await gotoTab(page, 'Jadwal');
      const proses = page.getByRole('button', { name: /Proses tarikan/i }).first();
      if (await proses.count()) {
        await proses.click({ force: true }).catch(() => {});
        await page.waitForTimeout(3000);
        await ukur('absensi');
        await page.keyboard.press('Escape').catch(() => {});
      } else { console.log(`  PROBE CACAT [${L} ${peran}/absensi]: pemicu tak ada`); cacat++; }
    }
    await ctx.close();
  }
}
await browser.close();

const nP = temuan.PATAH.length, nK = temuan['KLIP-KIRI'].length;
console.log(`\n=== KATA PATAH: ${total} kata diperiksa di ${layar} layar · patah ${nP} · terklip kiri ${nK}${MUTASI ? ` · MUTASI=${MUTASI}` : ''} ===`);
if (nP) { console.log('\n  KATA PATAH DI TENGAH:'); temuan.PATAH.forEach((x) => console.log('   ' + x)); }
if (nK) { console.log('\n  AWAL TEKS TERKLIP KIRI:'); temuan['KLIP-KIRI'].forEach((x) => console.log('   ' + x)); }

if (!layar) { console.log('\nPROBE CACAT: nol layar terukur'); process.exit(2); }
if (MUTASI) {
  // Mutasi wajib MENDARAT (pelajaran audit:muat) dan wajib menggigit di cabangnya.
  if (!mutasiMendarat) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tak pernah terpasang`); process.exit(2); }
  if (MUTASI === '3') {
    console.log(`\n  MUTASI=3 menggigit di ${sheetKena.size}/${sheetDiukur.size} sheet · tak tergigit: ${[...sheetDiukur].filter((x) => !sheetKena.has(x)).join(', ') || '-'}`);
  }
  const kena = MUTASI === '1' ? nP : MUTASI === '2' ? nK : sheetKena.size;
  if (!kena) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tapi nol temuan di cabangnya — probe tak menggigit`); process.exit(2); }
}
if (cacat) process.exit(2);
process.exit(nP || nK ? 1 : 0);
