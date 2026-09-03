/**
 * Audit LANTAI KETERBACAAN HURUF — ambang APP, bukan WCAG.
 *
 * Kenapa ada (3 Sep 2026): dari 30 sapuan, tak satu pun pernah bertanya
 * "apakah teks ini masih terbaca?". `audit:kontras` menjaga RASIO,
 * `audit:sentuh` menjaga luas JEMPOL, `audit:potong` menjaga ISI. Tak ada yang
 * menjaga UKURAN. Terukur di sesi yang sama: teks terkecil app 9,2px di 320 &
 * 360px (eyebrow hero, mis. "SALDO KAS HADIRAN") — dan app ini dipakai warga
 * lansia. Bentuk celahnya identik dgn dua yang sudah dibayar mahal: ambang AAA
 * yang dinyatakan tapi tak pernah dicetak (pelajaran ke-33) dan §1.4.12 yang
 * tak pernah disentuh. **Ambang yang tak dijaga alat sama dgn ambang yang tak
 * ada** — selama sapuan ini tak berjalan, 9,2px bisa jadi 8,5px minggu depan
 * tanpa satu pun laporan.
 *
 * AMBANGNYA BUKAN ANGKA KARANGAN. Ia anak tangga TERKECIL tangga tipografi app
 * sendiri: `micro` & `overline` = 0.6875rem = 11px (`tailwind.config.js`,
 * skala DITIMPA di luar `extend`). Aturannya karena itu bisa dinyatakan tanpa
 * menawar: **tak boleh ada teks yang TERCAT lebih kecil dari anak tangga
 * terkecil.** Teks di bawahnya bukan pilihan peran — ia teks yang LOLOS dari
 * tangganya, lewat `clamp()` ber-vw atau mesin susut-agar-muat.
 *
 * Dilaporkan sbg ambang APP, BUKAN "gagal WCAG" — WCAG tak punya syarat ukuran
 * huruf minimum. Disiplin yang sama dgn bagian teks-200% di `audit:potong` dan
 * seksi AAA di `audit:kontras`.
 *
 * LEBAR: 320 · 360 · 390. Wajib lebih dari satu, dan ini bukan kehati-hatian
 * kosong — teks terkecil app lahir dari `clamp(0.575rem, 2.55vw, 0.6875rem)`,
 * yang MENGECIL saat layar menyempit. Mengukur di satu lebar saja akan
 * melaporkan 11px yang sehat sambil melewatkan 9,2px yang sebenarnya dibaca
 * warga (kelas cacat yang sama sudah dibayar `audit:lebar`: satu lebar = satu
 * titik sampel).
 *
 * KONTROL: populasi kosong = PROBE CACAT, dan probe WAJIB melihat lebih dari
 * satu ukuran (>=3 nilai berbeda). Tanpa itu "app patuh" dan "probeku membaca
 * satu nilai warisan untuk semuanya" mencetak angka yang sama.
 *
 * Kontrol PERTAMA yang kutulis SALAH, dan dicatat di sini supaya tak diulang:
 * ia menuntut `maks >= 20px` ("harus melihat teks besar hero"). Itu asumsi
 * tentang ISI, bukan uji tentang PROBE — halaman Jadwal memang tak punya
 * nominal, teks terbesarnya `text-subtitle` 18px, jadi sapuan meneriakkan
 * PROBE CACAT di 6 layar yang justru sehat. Uji kontrol yang mengandaikan
 * bentuk data akan berbohong begitu datanya berubah bentuk.
 *
 * MUTASI=1 mengecilkan `.text-caption` jadi 9px lewat stylesheet ber-!important.
 * Temuan WAJIB melonjak jauh di atas garis dasar.
 */
import { chromium } from 'playwright';
import { newCtx, loginWarga, gotoTab } from './lib/audit-harness.mjs';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const AMBANG = +(process.env.AMBANG || 11);      // px — anak tangga terkecil
/* LANTAI KERAS untuk teks ber-`data-susut`. Mesin susut-agar-muat memang boleh
   turun di bawah anak tangga — tapi tidak sampai hilang. Angkanya = `MIN_KAKI_PX`
   di `HeroSaldo.tsx`, lantai keterbacaan yang dipilih untuk warga lansia; kalau
   di sana digeser, geser juga di sini. */
const LANTAI_KERAS = +(process.env.LANTAI_KERAS || 9.6);
const LEBAR = (process.env.LEBAR || '320,360,390').split(',').map(Number);
const MUTASI = +(process.env.MUTASI || 0);

const PUNGUT = ([ambang, lantaiKeras]) => {
  /* SUSUT-AGAR-MUAT — pengecualian OPT-IN, dan sengaja tidak dipercaya begitu
     saja. Sebuah nilai boleh turun di bawah anak tangga HANYA kalau (a) ia
     menyatakannya lewat `data-susut` di call-site, dan (b) ia tetap di atas
     LANTAI KERAS. Tanpa syarat (b) penanda ini jadi pintu belakang: siapa pun
     bisa memasangnya lalu menyusut sampai 6px. Jumlah yang dimaafkan SELALU
     dicetak — sapuan tak boleh menyempitkan populasinya sendiri tanpa mengaku. */
  const hasil = [];
  const ukuran = new Set();
  let populasi = 0, maks = 0, susut = 0;
  const dilewat = { srOnly: 0, takTerlihat: 0 };

  document.querySelectorAll('*').forEach((el) => {
    /* DAUN TEKS saja: elemen yang punya text node sendiri yang tak kosong.
       Tanpa saringan ini tiap leluhur ikut terhitung dan satu teks dilaporkan
       berkali-kali dgn ukuran yang diwarisi — populasi salah, bukan temuan. */
    const teks = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!teks) return;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') { dilewat.takTerlihat++; return; }
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { dilewat.takTerlihat++; return; }
    /* `.sr-only` & kawan: kotak 1px ber-clip, memang bukan untuk dibaca mata.
       Dilaporkan "terlalu kecil" pernah jadi cacat alat ke-4 di repo ini. */
    if (cs.clip !== 'auto' || (cs.clipPath && cs.clipPath !== 'none')) { dilewat.srOnly++; return; }

    const px = Math.round(parseFloat(cs.fontSize) * 100) / 100;
    populasi++;
    ukuran.add(px);
    if (px > maks) maks = px;
    const boleh = el.closest('[data-susut]');
    if (boleh && px >= lantaiKeras) { susut++; return; }
    if (px < ambang) {
      hasil.push({ px, teks: teks.slice(0, 30), cls: (typeof el.className === 'string' ? el.className : '').trim().slice(0, 58),
                   tembusKeras: !!boleh });
    }
  });
  return { hasil, populasi, maks, ragam: ukuran.size, susut, dilewat };
};

/* DUA mutasi, karena ada DUA vonis dan satu tak bisa menguji yang lain.
   1 — `.text-caption` → 9px: menguji ambang tangga (11px) & membuktikan probe
       mendarat di populasi.
   2 — `[data-susut]` → 8px: menguji LANTAI KERAS. Tanpa ini penanda `data-susut`
       cuma pintu belakang yang tak pernah diuji — sapuan akan tetap hijau
       walau nilai yang "dimaafkan" menyusut sampai tak terbaca. */
const MUT_CSS = { 1: '.text-caption{font-size:9px!important}', 2: '[data-susut]{font-size:8px!important}' };

const browser = await chromium.launch();
let gagal = 0, cacat = 0, totalPop = 0, totalSusut = 0;
const ringkas = [];

for (const bendahara of [false, true]) {
  const peran = bendahara ? 'b' : 'w';
  for (const lebar of LEBAR) {
    const { ctx, page } = await newCtx(browser, 'light', { bendahara });
    await page.setViewportSize({ width: lebar, height: 844 });
    await page.goto(URL, { waitUntil: 'networkidle' });
    if (!bendahara) await loginWarga(page);
    if (MUTASI) await page.addStyleTag({ content: MUT_CSS[MUTASI] });

    const tabs = (await page.locator('nav button').allInnerTexts()).map((t) => t.trim().split('\n')[0]);
    for (const tab of tabs) {
      await gotoTab(page, tab);
      await page.waitForTimeout(2400);
      if (MUTASI) await page.addStyleTag({ content: MUT_CSS[MUTASI] });
      const { hasil, populasi, maks, ragam, susut, dilewat } = await page.evaluate(PUNGUT, [AMBANG, LANTAI_KERAS]);
      totalPop += populasi; totalSusut += susut;

      /* Uji KONTROL — menguji PROBE, bukan menebak isi layar. Probe yang rusak
         (mis. membaca ukuran warisan satu kali lalu memakainya untuk semua)
         akan melaporkan satu nilai saja; app yang sehat selalu punya beberapa
         peran tipografi di layar yang sama. Ambangnya sengaja rendah (3) supaya
         ia menguji probe, bukan kekayaan halaman. */
      if (populasi === 0) { console.log(`  PROBE CACAT: ${peran}-${tab}@${lebar} populasi 0`); cacat++; continue; }
      if (ragam < 3) { console.log(`  PROBE CACAT: ${peran}-${tab}@${lebar} cuma ${ragam} ukuran berbeda — probe membaca nilai yang sama untuk semua`); cacat++; continue; }

      const uniq = new Map();
      for (const h of hasil) uniq.set(`${h.px}|${h.cls}|${h.teks}`, h);
      const item = [...uniq.values()].sort((a, b) => a.px - b.px);
      ringkas.push({ nama: `${peran}-${tab}@${lebar}`, populasi, dilewat, item });
      if (item.length) gagal++;
    }
    await ctx.close();
  }
}
await browser.close();

console.log('\n=== LANTAI HURUF · ambang APP (BUKAN WCAG) ===');
console.log(`  ambang                    : ${AMBANG}px — anak tangga TERKECIL (\`micro\`/\`overline\`)`);
console.log(`  populasi daun teks        : ${totalPop} di ${ringkas.length} layar-lebar`);
console.log(`  dimaafkan (data-susut)    : ${totalSusut}   ← susut-agar-muat, tetap >= lantai keras ${LANTAI_KERAS}px`);
const semua = ringkas.flatMap((r) => r.item);
console.log(`  DI BAWAH LANTAI           : ${semua.length} (unik per layar-lebar)`);

for (const r of ringkas.filter((x) => x.item.length)) {
  console.log(`\n  ${r.nama}   populasi ${r.populasi}`);
  for (const i of r.item.slice(0, 6)) console.log(`    ${String(i.px).padStart(5)}px${i.tembusKeras ? '  [TEMBUS LANTAI KERAS]' : ''}  "${i.teks}"  .${i.cls}`);
  if (r.item.length > 6) console.log(`    … +${r.item.length - 6} lagi`);
}

if (cacat) { console.log(`\nPROBE CACAT di ${cacat} layar — sapuan tak boleh LULUS dari populasi yang tak terukur.`); }
if (MUTASI && semua.length === 0) { console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tapi nol temuan — ${MUTASI === 1 ? 'probe tak mendarat' : 'lantai keras tak bergigi'}.`); process.exit(2); }
if (MUTASI === 2 && !semua.some((x) => x.tembusKeras)) { console.log('\nPROBE CACAT: MUTASI=2 tapi tak satu pun ditandai TEMBUS LANTAI KERAS.'); process.exit(2); }
console.log(`\n=== ${ringkas.length} layar-lebar diperiksa · ${gagal} layar punya teks di bawah ${AMBANG}px ===`);
process.exit(gagal || cacat ? 1 : 0);
