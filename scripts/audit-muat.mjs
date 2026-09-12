// Audit MUAT AWAL di kondisi HP warga: CPU 4× lambat + 400 kbps / latensi 400 ms.
//
// Kenapa ada: "premium" bukan cuma piksel — 300 KK membuka app ini dari Android
// kelas bawah dengan sinyal seadanya. Yang diukur:
//   FCP        — kapan splash pra-React (#app-splash) benar-benar tercat
//   siap-pakai — kapan tombol masuk warga (#masuk-warga) bisa dipakai
//   Supabase   — kapan balasan data pertama datang (null = belum ada request;
//                gate warga itu lokal, jadi muat awal memang tak menyentuh DB)
//
// Temuan yang melahirkan skrip ini (30 Jul 2026): FCP 2296 ms padahal splash-nya
// inline. Penyebabnya `<link rel=stylesheet>` render-blocking — dibuktikan dengan
// memblokir CSS: FCP jatuh ke 524 ms. Sesudah stylesheet dibuat non-blocking
// (plugin css-non-blocking di vite.config.ts) FCP jadi 520 ms dan siap-pakai TAK
// berubah (3945 vs 3948 ms). Jangan menilai ini dari ukuran chunk: yang menentukan
// adalah round-trip + apa yang memblokir paint.
//
// ─────────────────────────────────────────────────────────────────────────────
// VONIS (12 Sep 2026) — sampai hari ini skrip ini **meteran, bukan penjaga**:
// 75 baris tanpa satu pun baris vonis, selalu keluar 0, dan TIDAK terdaftar di
// `sapu-semua`. Padahal app ini MEMBELI waktu muat secara sadar: commit 900e80e
// (5 Sep) memilih varian X — preload Inter + Sora `optional` — sesudah tiga
// varian diukur sisi-sisi, menutup kedip huruf sistem 843 ms & geseran kartu
// ~24px. Harga yang disepakati waktu itu 531 ms. Tak ada satu alat pun yang
// akan berubah merah kalau harga itu berlipat. Itu bentuk pelajaran ke-33
// persis — **ambang yang tak dijaga alat sama dengan ambang yang tak ada** —
// dan repo ini sudah membayarnya tiga kali (AAA, lantai huruf, §1.4.12).
//
// YANG DIJAGA: **harga FONT di jalur kritis**, bukan waktu muat mutlak.
//   Angka mutlak TIDAK BISA jadi ambang — terbukti: kode yang PERSIS SAMA
//   membaca siap-pakai 3291 ms di mesin user (5 Sep) dan 3543 ms di mesin lain
//   (12 Sep). Ambang mutlak akan merah karena mesinnya, bukan karena app-nya.
//   Yang machine-independent adalah SELISIH dua lengan yang diukur di JALAN
//   YANG SAMA: sekali dgn font, sekali dgn seluruh woff2 ditolak. Itu invarian
//   "dokumen dibandingkan dgn DIRINYA SENDIRI" yang sudah dipakai penjaga
//   kertas (`cetakIsi.test.ts`), dipindah ke sumbu waktu.
//
//   Selisihnya bahkan punya ramalan FISIK: 37.128 B ÷ (400 kbps ÷ 8) = 725 ms.
//   Terukur 722 ms di `main` dan 735 ms di 900e80e — dua build berbeda, selisih
//   2% dari ramalan. Itu sebabnya ia layak jadi ambang: ia hampir tak bergerak
//   oleh mesin, dan bergerak TELAK begitu ada font kedua masuk jalur kritis
//   (varian Y yang dulu ditolak = preload Sora juga, +494 ms) atau fontnya
//   membesar.
//
// YANG **TIDAK** DIJAGA DI SINI, dan jangan dikira begitu:
//   · Waktu muat MUTLAK — dilaporkan, tak pernah jadi vonis (machine-dependent).
//   · Anggaran BYTE kunjungan pertama — itu milik `audit:unduh` bagian U, yang
//     memang menghitung byte dan karenanya deterministik.
//   · Kedip/geseran huruf — itu `audit:unduh` bagian F & `audit:fallback-sora`.
//   Penjaga ini menutup satu celah yang tak dimiliki siapa pun: BERAPA HARGA
//   yang sedang dibayar untuk keputusan font itu, hari ini.
//
// Jalankan lawan build produksi, bukan dev server:
//   npm run build && npx vite preview --port 5199
//   npm run audit:muat
//   APP_URL=https://hadiran-rt.vercel.app npm run audit:muat   (brotli nyata)
//
// MUTASI (wajib dipakai sebelum percaya pada hijau — pelajaran ke-5 cara kerja):
//   MUTASI=1  lengan kontrol ikut mem-preload Sora → meniru varian Y yang dulu
//             ditolak user. Harga WAJIB melewati anggaran → MERAH.
//   MUTASI=2  lengan "tanpa font" berhenti menolak apa pun (route diteruskan).
//             Selisih jadi ~0 dan vonis A akan terbaca HIJAU — justru itu
//             gunanya: uji KONTROL wajib menangkapnya sbg PROBE CACAT. Tanpa
//             mutasi ini, "app hemat" dan "probe-ku tak pernah menggigit"
//             mencetak angka yang sama (pelajaran `audit:fallback-sora`).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const APP_ASLI = process.env.APP_URL || process.env.CAP_URL || 'http://localhost:5199';
const RUNS = +(process.env.RUNS || 3);
const CPU = +(process.env.CPU || 4);
const KBPS = +(process.env.KBPS || 400);
const LATENCY = +(process.env.LATENCY || 400);
const MUT = process.env.MUTASI || '';

/* ANGGARAN. Bukan angka karangan: harga terukur hari ini 722 ms (`main`) &
   735 ms (900e80e), ramalan fisik 725 ms. Plafon 900 ms menyisakan ~24%
   kelonggaran untuk derau mesin — yang terukur cuma 13 ms — sambil tetap
   MERAH telak kalau font kedua masuk jalur kritis (+494 ms untuk Sora) atau
   Inter tumbuh lebih dari ~9 kB.

   ANGGARAN INI **JANGAN** DITURUNKAN DARI UKURAN FONT. Penjaga yang plafonnya
   ikut tumbuh bersama benda yang dijaganya bukan penjaga — ia cuma mencatat
   apa pun yang terjadi. Kalau fontnya memang perlu membesar, itu keputusan
   user & angka di bawah ini yang diperbarui, sadar-sadar. */
const ANGGARAN_SIAP = +(process.env.ANGGARAN_SIAP || 900);
const ANGGARAN_FCP = +(process.env.ANGGARAN_FCP || 160);

const KELUARGA_BODY = 'Inter';

/* ── 0. MUTASI=1 hidup di lapisan SERVER, bukan di intersepsi ────────────────
   Percobaan pertama menyisipkan preload kedua lewat `route.fulfill`, dan itu
   CACAT: balasan yang di-fulfill Playwright TIDAK melewati emulasi jaringan
   CDP. Gejalanya telanjang di laporannya sendiri — FCP lengan kontrol jatuh ke
   140 ms, padahal latensi yang diemulasikan saja 400 ms, jadi angka itu
   MUSTAHIL (pelajaran ke-7: angka mustahil di laporanmu sendiri adalah
   vonisnya). Akibatnya dokumen tiba gratis, jadwal seluruh muat bergeser, dan
   font keduanya tak pernah benar-benar berebut kabel: mutasinya "lulus" tanpa
   menguji apa pun.

   Jadi mutasi ini menyajikan `dist/` dari servernya SENDIRI dgn index.html yang
   sudah memuat preload kedua — byte sungguhan lewat tumpukan jaringan yang
   sungguhan, persis seperti varian Y yang dulu ditolak user. Preseden memegang
   port sendiri: `audit:unduh`. */
async function serverMutasi() {
  const DIST = 'dist';
  const asli = await readFile(join(DIST, 'index.html'), 'utf8').catch(() => null);
  if (!asli) {
    console.log('  PROBE CACAT: MUTASI=1 butuh `dist/` lokal (jalankan `npm run build` dulu); ia tak bisa memutasi produksi.');
    process.exit(2);
  }
  const sora = [...asli.matchAll(/["'(]([^"'()]*sora[^"'()]*\.woff2)["')]/gi)].map((m) => m[1])[0]
    ?? await (async () => {
      const hrefCss = [...asli.matchAll(/rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
      for (const h of hrefCss) {
        const t = await readFile(join(DIST, h.replace(/^\//, '')), 'utf8').catch(() => '');
        const m = t.match(/url\(([^)]*sora[^)]*\.woff2)\)/i);
        if (m) return m[1].replace(/["']/g, '');
      }
      return null;
    })();
  if (!sora) {
    console.log('  PROBE CACAT: MUTASI=1 tak menemukan woff2 Sora di bundel — tak ada font kedua untuk disisipkan.');
    process.exit(2);
  }
  const mutan = asli.replace('</head>', `  <link rel="preload" href="${sora}" as="font" type="font/woff2" crossorigin>\n  </head>`);
  if (mutan === asli) {
    console.log('  PROBE CACAT: MUTASI=1 gagal menyisipkan preload kedua ke index.html.');
    process.exit(2);
  }
  const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  };
  const srv = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-cache' });
      return res.end(mutan);
    }
    const f = join(DIST, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const b = await readFile(f).catch(() => null);
    if (!b) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(b);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, tutup: () => srv.close() };
}

const mutasiSrv = MUT === '1' ? await serverMutasi() : null;
const APP = mutasiSrv ? mutasiSrv.url : APP_ASLI;

/* ── 1. Apa yang sedang dibeli? Baca dari yang BENAR-BENAR DIKIRIM ───────────
   Bukan dari `dist/` di disk: sapuan ini boleh diarahkan ke produksi, dan di
   sana yang berlaku adalah HTML yang dilayani, bukan build lokal yang mungkin
   basi. Kalau preload-nya tak ada, kedua lengan mengukur hal yang sama dan
   selisih ~0 akan terbaca "hijau" — kepercayaan palsu, jadi PROBE CACAT. */
const html = await (await fetch(APP, { headers: { 'cache-control': 'no-cache' } })).text();
const preloads = [...html.matchAll(/<link[^>]+rel="preload"[^>]*as="font"[^>]*>/g)].map((m) => m[0]);
const hrefPreload = preloads.map((t) => t.match(/href="([^"]+)"/)?.[1]).filter(Boolean);
/* Font yang TIDAK di-preload hidup di CSS (`src:url(...)`), bukan di HTML —
   Sora salah satunya. Memungut woff2 dari index.html saja membuat MUTASI=1
   diam-diam tak pernah mendaftarkan rutenya, dan mutasinya lulus sbg "hijau"
   tanpa pernah terjadi. Kelas yang sama dgn pelajaran ke-36: daftar yang
   diturunkan dari SATU jenis sisi graf buta terhadap sisi yang lain. */
const hrefCss = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
let css = '';
for (const h of [...new Set(hrefCss)]) css += await (await fetch(new URL(h, APP))).text();
const semuaWoff2 = [
  ...[...html.matchAll(/href="([^"]+\.woff2)"/g)].map((m) => m[1]),
  ...[...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1].replace(/["']/g, '')),
];

let byteFont = 0;
for (const h of hrefPreload) {
  const r = await fetch(new URL(h, APP));
  byteFont += (await r.arrayBuffer()).byteLength;
}

/* ── 2. Dua lengan, satu jalan ───────────────────────────────────────────── */
const br = await chromium.launch();

async function lengan({ blokirFont, label }) {
  const hasil = [];
  let ditolak = 0;
  let terima = 0;
  let statusFont = 'tak-diukur';

  for (let run = 0; run < RUNS; run++) {
    // Konteks BARU tiap run = cache terpisah → tiap run benar-benar "muat pertama".
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      // Lewati WelcomeSheet biar tak menutupi layar; tema terang supaya konsisten.
      localStorage.setItem('hadiran-welcome-v2', '1');
      localStorage.setItem('hadiran-theme', 'light');
    });

    if (blokirFont) {
      await ctx.route(/\.woff2(\?|$)/, async (r) => {
        /* MUTASI=2: pura-pura memblokir, sebenarnya meneruskan. Vonis A akan
           hijau palsu; uji kontrol B2/B3 yang harus menangkapnya. */
        if (MUT === '2') return r.continue();
        ditolak++;
        return r.abort();
      });
    }

    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (KBPS * 1024) / 8,
      uploadThroughput: (KBPS * 1024) / 8,
      latency: LATENCY,
    });

    const t0 = Date.now();
    let tSupa = null;
    /* Bukti yang DETERMINISTIK bahwa fontnya benar-benar melintasi kabel.
       Versi pertama memvonis dari `document.fonts` pada satu titik waktu, dan
       itu BALAPAN, bukan properti: di produksi CSS (non-blocking, 86 kB) baru
       terparse SESUDAH tombol muncul, jadi belum ada satu pun @font-face
       terdaftar dan lengan kontrol terbaca `tak-ada` → PROBE CACAT palsu pada
       produksi yang justru sedang mengandung temuan. Balasan yang diterima
       tidak punya balapan itu. */
    p.on('response', (r) => { if (/\.woff2(\?|$)/.test(r.url()) && r.status() < 400) terima++; });
    p.on('response', (r) => { if (/supabase\.co/.test(r.url()) && tSupa === null) tSupa = Date.now() - t0; });

    await p.goto(APP, { waitUntil: 'domcontentloaded' });
    await p.locator('#masuk-warga').waitFor({ timeout: 60000 });
    const tSiap = Date.now() - t0;

    const fcp = await p.evaluate(() => {
      const e = performance.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint');
      return e ? Math.round(e.startTime) : 0;
    });
    /* Status face-nya, bukan cuma "berkasnya tiba": yang menentukan apakah
       glyph-nya benar-benar dipakai saat tombolnya muncul. */
    statusFont = await p.evaluate((fam) => {
      const f = [...document.fonts].find((x) => x.family.includes(fam));
      return f ? f.status : 'tak-ada';
    }, KELUARGA_BODY);

    hasil.push({ fcp, tSiap, tSupa });
    await ctx.close();
  }
  return { label, hasil, ditolak, terima, statusFont };
}

const med = (arr, k) => {
  const v = arr.map((h) => h[k]).filter((x) => x != null).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};

const kontrol = await lengan({ blokirFont: false, label: 'dgn font' });
const tanpa = await lengan({ blokirFont: true, label: 'tanpa font' });
await br.close();

/* ── 3. Laporan ──────────────────────────────────────────────────────────── */
const diukur = kontrol.hasil.length + tanpa.hasil.length;
const fcpK = med(kontrol.hasil, 'fcp');
const fcpT = med(tanpa.hasil, 'fcp');
const siapK = med(kontrol.hasil, 'tSiap');
const siapT = med(tanpa.hasil, 'tSiap');
const dFcp = fcpK - fcpT;
const dSiap = siapK - siapT;

console.log(`${APP} · CPU ${CPU}× · ${KBPS} kbps · latensi ${LATENCY} ms · ${RUNS} run/lengan${MUT ? ` · MUTASI=${MUT}` : ''}`);
console.log(`preload font : ${hrefPreload.length ? hrefPreload.join(', ') : '(tak ada)'} · ${byteFont} B`);
console.log(`dgn font     FCP ${fcpK} ms · siap-pakai ${siapK} ms · ${kontrol.terima} woff2 diterima · face ${kontrol.statusFont}   ${JSON.stringify(kontrol.hasil)}`);
console.log(`tanpa font   FCP ${fcpT} ms · siap-pakai ${siapT} ms · ${tanpa.terima} woff2 diterima · ${tanpa.ditolak} ditolak · face ${tanpa.statusFont}   ${JSON.stringify(tanpa.hasil)}`);
console.log(`Supabase pertama ${med(kontrol.hasil, 'tSupa') ?? '—'} ms  (angka MUTLAK di atas dilaporkan saja — machine-dependent, bukan vonis)`);
console.log('');

/* ── 4. Uji KONTROL — semuanya PROBE CACAT (exit 2), bukan "aman" ─────────── */
const cacat = [];
if (hrefPreload.length === 0) cacat.push('HTML yang dilayani tak memuat <link rel=preload as=font> — tak ada harga untuk dijaga, dan selisih ~0 akan terbaca hijau');
if (byteFont === 0) cacat.push('berkas font yang di-preload berukuran 0 B — tak terambil');
if (tanpa.ditolak === 0) cacat.push('lengan "tanpa font" TIDAK menolak satu permintaan pun — probe tak menggigit');
if (tanpa.terima > 0) cacat.push(`lengan "tanpa font" tetap MENERIMA ${tanpa.terima} woff2 — blokirnya tak berlaku`);
if (tanpa.statusFont === 'loaded') cacat.push(`lengan "tanpa font" tetap memuat face ${KELUARGA_BODY} — blokirnya tak berlaku`);
if (kontrol.terima === 0) cacat.push('lengan kontrol TIDAK menerima satu woff2 pun — yang diukur bukan keadaan yang dibeli');
/* Mutasi WAJIB membuktikan dirinya mendarat. Tanpa baris ini, MUTASI=1
   yang gagal menyisipkan apa pun akan mencetak angka normal & terbaca sbg
   "penjaganya lemah" — padahal yang tak terjadi mutasinya. */
if (MUT === '1' && hrefPreload.length < 2) cacat.push(`MUTASI=1 hanya menyajikan ${hrefPreload.length} preload font — font kedua tak pernah sampai ke kabel`);
if (diukur < RUNS * 2) cacat.push(`populasi kurang: ${diukur} dari ${RUNS * 2} muat`);

if (cacat.length) {
  for (const c of cacat) console.log(`  PROBE CACAT: ${c}`);
  console.log(`\n=== harga font di jalur kritis · ${diukur} muat diukur · PROBE CACAT ===`);
  process.exit(2);
}

/* ── 5. Vonis ────────────────────────────────────────────────────────────── */
const temuan = [];
if (dSiap > ANGGARAN_SIAP) temuan.push(`siap-pakai +${dSiap} ms > anggaran ${ANGGARAN_SIAP} ms`);
if (dFcp > ANGGARAN_FCP) temuan.push(`FCP +${dFcp} ms > anggaran ${ANGGARAN_FCP} ms`);

console.log(`HARGA FONT di jalur kritis  siap-pakai +${dSiap} ms (anggaran ${ANGGARAN_SIAP}) · FCP +${dFcp} ms (anggaran ${ANGGARAN_FCP})`);
for (const t of temuan) console.log(`  MELEWATI ANGGARAN: ${t}`);
if (temuan.length) {
  console.log('  → periksa: font kedua masuk jalur kritis? preload ganda? berkas fontnya tumbuh?');
  console.log('     Kalau kenaikannya memang DISENGAJA & disetujui user, perbarui ANGGARAN_* di berkas ini — jangan longgarkan diam-diam.');
}

console.log(`\n=== harga font di jalur kritis: siap +${dSiap} ms · FCP +${dFcp} ms · ${diukur} muat diukur · ${temuan.length} bermasalah ===`);
process.exit(temuan.length ? 1 : 0);
