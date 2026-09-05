/**
 * ASET GAMBAR — satu-satunya sapuan yang melihat PIKSEL berkas jadi.
 *
 * ── Kenapa ada (5 Sep 2026) ───────────────────────────────────────────────
 * Ke-34 sapuan repo ini membaca DOM. JPEG dan PNG tak punya DOM. Akibatnya
 * ada satu kelas aset yang TAK PERNAH terlihat siapa pun, dan dua di antaranya
 * sudah basi berbulan-bulan tanpa satu pun laporan:
 *
 *   public/og-hadiran.jpg      gambar di TIAP pratayang link WhatsApp.
 *                              Gradiennya naik ke L64,8 — 26 anak tangga L
 *                              lebih terang dari stop paling terang hero app.
 *                              Teksnya duduk di 4,7–6,6:1 sementara seluruh
 *                              permukaan keluaran lain diangkat ke >= 7.
 *   public/screenshots/*.png   "TANGKAPAN LAYAR ASLI" di landing. Kanvasnya
 *                              #ECF1F7 (biru-abu, rona ~215°) sementara app
 *                              sudah lama #CFE6D8 (rona 159°). Ia mendahului
 *                              migrasi rona Hutan (24 Agu) DAN pass kroma
 *                              (30 Agu).
 *
 * `audit:publik` menyusuri markup keempat halaman publik dan `audit:kontras-deep`
 * mengukur kontrasnya; keduanya bersih — karena piksel yang gagal hidup di
 * dalam `<img>`. Pelajaran ke-32 menyebut daftar "titik sinkron kanvas" dan
 * memperingatkan bahwa berhenti di CSS berarti gagal. Sapuan ini yang
 * menegakkan sisa daftarnya.
 *
 * Nilai harapan DIBACA dari `warnaCetak.ts` (lewat `scripts/lib/palet.mjs`),
 * bukan hex tulis-tangan: angka harapan dari luar akan basi persis seperti
 * aset yang dijaganya.
 *
 * ── Validasi ──────────────────────────────────────────────────────────────
 * KEDUA bagian terbukti DUA ARAH lawan BERKAS NYATA, bukan sintetis — dan itu
 * bukti yang lebih kuat daripada mutasi, karena kedua sisinya benar-benar
 * pernah ada di repo ini:
 *
 *   bagian S  aset LAMA (kanvas biru) → 3/3 MERAH, `#ECF1F7 ≠ #CFE6D8,
 *             beda 31/255`. Aset BARU (tembakan 5 Sep) → 3/3 HIJAU.
 *   bagian O  gambar LAMA `#30AA71` = 2,95:1 MERAH; gambar BARU `#0E5132`
 *             = 9,37:1 HIJAU, dgn populasi piksel IDENTIK (366.336) — jadi
 *             vonisnya berubah karena ISI, bukan karena populasi menyusut.
 *
 *   node scripts/audit-aset.mjs
 *   MUTASI=1   harapan kanvas dibalik ke nilai LAMA → bagian S wajib MERAH
 *              (bukti probe membaca piksel, bukan selalu hijau)
 *   MUTASI=2   batas hero dilonggarkan ke nilai lama → bagian O wajib
 *              MENERIMA gambar lama (bukti ambangnya yang bekerja)
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { CETAK } from './lib/palet.mjs';

const MUTASI = process.env.MUTASI || '';

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const kontrasPutih = (rgb) => 1.05 / (lum(rgb) + 0.05);
const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

/* Ambang. Kanvas PNG itu lossless jadi harapannya SAMA PERSIS; toleransi 2/255
   hanya untuk menyerap perbedaan pembulatan encoder, bukan untuk melonggarkan. */
const KANVAS = MUTASI === '1' ? '#ECF1F7' : CETAK.canvas;
const TOLERANSI = 2;
/* Hero: bukan kesamaan (JPEG lossy) melainkan BATAS — tak boleh ada hijau yang
   lebih terang dari stop paling terang hero app. Itu invarian yang benar-benar
   dilanggar gambar lama, dan ia tahan terhadap kompresi. */
const HERO_REF = MUTASI === '2' ? '#1FA862' : CETAK.heroRamp[0];
const HERO_MIN_CR = kontrasPutih(toRgb(HERO_REF)) - 0.35;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('about:blank');

async function piksel(file, fn) {
  const b64 = readFileSync(file).toString('base64');
  const mime = file.endsWith('.jpg') ? 'jpeg' : 'png';
  return page.evaluate(async ([b64, mime, fnSrc]) => {
    const img = new Image(); img.src = `data:image/${mime};base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    return (0, eval)(`(${fnSrc})`)(x, img.width, img.height);
  }, [b64, mime, fn.toString()]);
}

let gagal = 0, populasi = 0;

// ── S. Tangkapan layar: kanvas WAJIB = token `sunken` ─────────────────────
console.log(`\n=== S. TANGKAPAN LAYAR — kanvas wajib ${KANVAS} ===`);
const DIR = 'public/screenshots';
const shots = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.png')).sort() : [];
for (const f of shots) {
  /* Kanvas = piksel PALING TERANG di talang kiri, BUKAN modusnya.
     CACAT ALAT (5 Sep 2026, diperbaiki di hari yang sama ia lahir): probe
     pertama memakai MODUS dan melaporkan `3-kas.png` GAGAL dgn `#CAE1D3`,
     beda 5/255. Itu temuan PALSU — kanvasnya benar. Yang menggelapkan adalah
     BAYANGAN KARTU (`lift`) yang menyapu talang; Kas RT halaman paling padat
     kartunya (hero + target + insight bertumpuk), jadi di sanalah piksel
     berbayang MENGALAHKAN kanvas telanjang sbg modus. Dua angka di laporan
     probe itu sendiri sudah menunjukkannya & sempat kuabaikan: populasinya
     cuma 4.763px (lawan 56.685 & 22.807 di dua berkas lain — kanvas yg benar2
     salah warna tetap punya populasi BESAR), dan arah selisihnya selalu lebih
     GELAP, tak pernah lebih terang.

     Bayangan hanya bisa MENGGELAPKAN, dan di talang tak ada satu pun piksel
     putih (diverifikasi: 0 dari 5 berkas uji) — jadi piksel paling terang di
     situ ADALAH kanvas tanpa bayangan, secara konstruksi. Kesamaannya tetap
     PERSIS; yang berubah besaran yang diukur, bukan ambangnya.

     Diuji lawan LIMA berkas nyata: tiga tembakan baru → #CFE6D8 semua, dan
     dua berkas LAMA berkanvas biru → #ECF1F7, tetap ketahuan basi. Modus
     gagal di satu dari lima; tertevrang benar di lima dari lima.

     Talang dipersempit ke x 0,3–1,5% (dari 1,5–4,5%) supaya menjauh dari tepi
     kartu — bukan itu yang memperbaiki vonisnya, tapi ia mengurangi porsi
     piksel berbayang sehingga `putih` & populasi lebih mudah dibaca manusia. */
  const top = await piksel(`${DIR}/${f}`, (x, w, h) => {
    const x0 = Math.max(1, w * 0.003 | 0), lebar = Math.max(2, w * 0.012 | 0);
    const d = x.getImageData(x0, h * 0.20 | 0, lebar, h * 0.65 | 0).data;
    let best = null, bl = -1, putih = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      n++;
      const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (L > bl) { bl = L; best = [d[i], d[i + 1], d[i + 2]]; }
      /* Prasyarat metode ini: tak boleh ada putih di talang. Kalau suatu hari
         ada, vonisnya jadi tak sah — dan itu WAJIB diakui, bukan lolos diam2. */
      if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) putih++;
    }
    return { rgb: best, n, putih };
  });
  populasi++;
  const want = toRgb(KANVAS);
  const beda = Math.max(...top.rgb.map((v, i) => Math.abs(v - want[i])));
  if (top.putih > 0) {
    gagal++;
    console.log(`  ! TAK TERUKUR ${f} — ada ${top.putih} piksel putih di talang, prasyarat "tertevrang = kanvas" tak berlaku`);
    continue;
  }
  const ok = beda <= TOLERANSI;
  if (!ok) gagal++;
  console.log(`  ${ok ? 'ok  ' : 'GAGAL'} ${f.padEnd(16)} kanvas ${toHex(top.rgb)} (${top.n}px talang)${ok ? '' : `  ≠ ${KANVAS}, beda ${beda}/255`}`);
}
if (!shots.length) { console.log('  ! PROBE CACAT: nol screenshot di ' + DIR); gagal++; }

// ── O. Pratayang link: tak boleh ada hijau lebih terang dari hero app ─────
console.log(`\n=== O. PRATAYANG LINK — hijau tak boleh lebih terang dari ${HERO_REF} (>= ${HERO_MIN_CR.toFixed(2)}:1 lawan putih) ===`);
for (const f of ['public/og-hadiran.jpg']) {
  if (!existsSync(f)) { console.log(`  ! DILEWAT ${f} tak ada`); continue; }
  /* Populasi = PITA TEPI kartu (5% terluar), bukan se-gambar.
     Percobaan pertama memungut "tiap piksel yang g-nya dominan" se-gambar dan
     melaporkan `#FEFFFD = 1,00:1` — putih. Dua sebabnya, dua-duanya cacat ALAT:
     (a) derau kroma JPEG membuat piksel teks putih punya g satu tingkat di atas
         r/b, jadi lolos saringan "g dominan";
     (b) koin lambang memuat hijau ASLI yang memang lebih terang dari ramp hero
         (`#1C7C3A` ≈ 6,4:1) — memvonisnya berarti menyalahkan artwork lambang
         untuk aturan yang berlaku pada LATAR.
     Pita tepi kebal keduanya: koin & seluruh teks duduk jauh di dalam bantalan
     84px, jadi yang tersisa cuma gradient. Saringan cast >= 12 tetap dipasang
     sbg jaring kedua. */
  const t = await piksel(f, (x, w, h) => {
    const tepiX = Math.max(2, w * 0.05 | 0), tepiY = Math.max(2, h * 0.05 | 0);
    const pita = [
      x.getImageData(0, 0, w, tepiY),                 // atas
      x.getImageData(0, h - tepiY, w, tepiY),         // bawah
      x.getImageData(0, tepiY, tepiX, h - 2 * tepiY), // kiri
      x.getImageData(w - tepiX, tepiY, tepiX, h - 2 * tepiY), // kanan
    ];
    let maxL = -1, px = null, n = 0;
    for (const im of pita) {
      const d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
        if (g - Math.max(r, b) < 12) continue;   // wajib BENAR-BENAR hijau
        n++;
        const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (L > maxL) { maxL = L; px = [r, g, b]; }
      }
    }
    return { px, n };
  });
  populasi++;
  if (!t.px || t.n < 10000) { console.log(`  ! PROBE CACAT: cuma ${t.n} piksel hijau di ${f}`); gagal++; continue; }
  const cr = kontrasPutih(t.px);
  const ok = cr >= HERO_MIN_CR;
  if (!ok) gagal++;
  console.log(`  ${ok ? 'ok  ' : 'GAGAL'} ${f.split('/').pop().padEnd(16)} hijau paling terang ${toHex(t.px)} = ${cr.toFixed(2)}:1 lawan putih (${t.n} px hijau)`);
}

// ── P. Splash iOS: di-BAKE pada tone kanvas ───────────────────────────────
console.log(`\n=== P. SPLASH iOS — latar wajib ${KANVAS} ===`);
const SDIR = 'public/splash';
const splash = existsSync(SDIR) ? readdirSync(SDIR).filter((f) => f.endsWith('.png')).sort() : [];
for (const f of splash) {
  const rgb = await piksel(`${SDIR}/${f}`, (x) => [...x.getImageData(4, 4, 1, 1).data].slice(0, 3));
  populasi++;
  const want = toRgb(KANVAS);
  const beda = Math.max(...rgb.map((v, i) => Math.abs(v - want[i])));
  const ok = beda <= TOLERANSI;
  if (!ok) gagal++;
  if (!ok) console.log(`  GAGAL ${f.padEnd(24)} latar ${toHex(rgb)} ≠ ${KANVAS}`);
}
console.log(`  ${splash.length} splash diperiksa`);

await browser.close();
console.log(`\n=== ${populasi} aset diperiksa · ${gagal} bermasalah ===`);
if (MUTASI) console.log(`  (MUTASI=${MUTASI} aktif)`);
process.exit(gagal ? 1 : 0);
