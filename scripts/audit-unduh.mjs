// Audit DUA DETIK PERTAMA — apa yang BENAR-BENAR diunduh warga di kunjungan
// pertama, dan kapan app berhenti berganti rupa.
//
// Kenapa alat SENDIRI, padahal sudah ada `audit:muat`: sapuan itu mengukur
// KAPAN app tercat (FCP & siap-pakai) dan tak pernah bertanya BERAPA yang
// dikirim untuk sampai ke sana, apa isinya, atau apakah ada yang ikut terbawa
// padahal baru dibutuhkan nanti. Dari 34 sapuan repo ini tak satu pun pernah
// menghitung byte kunjungan pertama — jadi 32,5 kB yang dihemat hari ini bisa
// kembali minggu depan tanpa satu pun laporan (pelajaran ke-33: ambang yang
// tak dijaga alat sama dengan ambang yang tak ada).
//
// ── KENAPA IA MEMEGANG SERVERNYA SENDIRI ────────────────────────────────────
// `vite preview` TIDAK MENGOMPRESI apa pun, sedangkan Vercel membalas brotli.
// Tiap angka "berapa kB diunduh" yang diukur lawannya PESIMIS ~2,5x: jalur
// kritis app ini 567 kB terdekode tapi 209 kB di kabel. Sapuan yang melaporkan
// angka terdekode akan menyuruh orang mengejar 350 kB yang tak pernah ada, dan
// — lebih buruk — tak bisa melihat penghematan yang nyata karena font woff2
// sudah terkompres di dalam (gzip menambah 0 byte: terukur 48256 -> 48254).
// Jadi sapuan ini menyalakan server statis mungil yang MENIRU Vercel: brotli
// q11 + `immutable` untuk /assets/ + fallback SPA seperti vercel.json.
//
// ── YANG DIVONIS ────────────────────────────────────────────────────────────
//   B  BERAT   generator ekspor (exceljs 942 kB, PDF triwulan 400 kB,
//              html2canvas 202 kB) TAK BOLEH ikut terunduh. Ambang 0 byte,
//              tak dinegosiasikan — itu 1,5 MB fitur bendahara di pipa warga.
//   U  UNDUH   total byte jalur kunjungan pertama lawan anggaran.
//   F  FONT    jarak antara "tombol Masuk terlihat" dan "font tiba". Ini yang
//              tak terlihat sapuan mana pun: app BISA DIPAKAI di 2,8 dtk lalu
//              BERGANTI RUPA di 5,2 dtk, dan tiap glyph di layar bergeser di
//              bawah jempol warga. `audit:lompat` tak melihatnya (ia mengukur
//              CLS sesudah layar tenang), `audit:muat` tak melihatnya (ia
//              berhenti di siap-pakai), `audit:gerak` tak melihatnya (font
//              bukan animasi).
//   S  SHELL   tiap aset yang dibutuhkan untuk MERENDER wajib ada di SHELL
//              service worker — TERMASUK font. Sampai 5 Sep 2026 SHELL berisi
//              40 entri dan NOL font, walau komentar `main.tsx` menyatakan
//              "ke-cache service worker -> font tetap ada saat offline".
//              Sebabnya struktural: SHELL diturunkan dari graf IMPOR,
//              sedangkan font dirujuk `url()` dari dalam CSS — bukan sisi
//              impor, jadi pemetanya tak pernah melihatnya. Kelas pelajaran
//              ke-31, belum ditutup untuk font.
//   K  KONTROL populasi & probe. Nol berkas, layar Login tak pernah muncul,
//              atau nol font diminta = PROBE CACAT (exit 2), BUKAN hijau.
//
// ── MUTASI (tiap vonis punya miliknya sendiri) ──────────────────────────────
//   MUTASI=1  suntik <script> statis ke chunk ekspor terberat  -> B & U merah
//   MUTASI=2  tunda tiap balasan .woff2 3 dtk                  -> F merah
//   MUTASI=3  buang font dari SHELL di sw.js yang disajikan    -> S merah
// Hijau tanpa mutasi tak membuktikan apa pun: probe yang tak pernah menyentuh
// apa-apa mencetak angka yang sama dengan app yang patuh.
//
// Pakai:  npm run audit:unduh          (butuh `npm run build` lebih dulu)
import { chromium } from 'playwright';
import http from 'node:http';
import zlib from 'node:zlib';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

/* DIST ada supaya dua build bisa DIBANDINGKAN tanpa saling menimpa (preseden
   `SHOT_OUT` di capture-screenshots.mjs). Akarnya SELALU dicetak di kepala
   laporan — sapuan yang bisa diarahkan diam-diam ke build lain adalah sapuan
   yang angkanya tak bisa dipercaya. */
const ROOT = process.env.DIST || 'dist';
const PORT = +(process.env.PORT_UJI || 5198);
const APP = `http://localhost:${PORT}`;
const MUTASI = +(process.env.MUTASI || 0);

/* Anggaran. Bukan angka karangan — diukur dari garis dasar 5 Sep 2026 lalu
   diberi kelonggaran satu langkah, dengan disiplin yang sama seperti lantai
   populasi `sapu-semua`: KETAT, karena populasi app ini stabil antar-jalan.
   Kalau app memang tumbuh, PERBARUI angkanya — jangan longgarkan diam-diam. */
const ANGGARAN_KB = 200;   // jalur kunjungan pertama, di kabel (brotli)
const ANGGARAN_BERKAS = 22;
const KEDIP_MS = 400;      // jarak "layar dipakai" -> "font tiba"
const LANTAI_BERKAS = 14;  // populasi separuh = laporan hijau palsu (cacat ke-23)

/* Chunk yang HARUS tetap lazy. Dicocokkan dari nama berkas dist, bukan daftar
   tulisan tangan — nama ber-hash isi berubah tiap build. */
const BERAT = ['generateKasHadiranExcel', 'generateLaporanTriwulanPDF', 'html2canvas'];

// ── server yang MENIRU Vercel ────────────────────────────────────────────────
const TIPE = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain' };
const KOMPRES = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.txt']);
const memo = new Map();

if (!existsSync(join(ROOT, 'index.html'))) {
  console.log('PROBE CACAT: dist/index.html tak ada — jalankan `npm run build` dulu');
  process.exit(2);
}

/* BUILD BASI = HIJAU PALSU. Sapuan ini mengukur `dist/`, bukan sumber — jadi
   sesudah mengubah kode dan LUPA membangun ulang, ia dgn patuh mengukur build
   kemarin lalu melaporkan hijau untuk perubahan yang belum pernah ada di sana.
   Kelas yang sama dgn cacat ke-23 & pelajaran ke-27 ("push berhasil" bukan
   bukti "live"): laporan hijau dari langkah yang tak pernah diperiksa. */
const mtimeTerbaru = (dir) => {
  let t = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? mtimeTerbaru(f) : statSync(f).mtimeMs);
  }
  return t;
};
const tSumber = Math.max(mtimeTerbaru('src'), statSync('index.html').mtimeMs, statSync('vite.config.ts').mtimeMs);
const tBuild = statSync(join(ROOT, 'index.html')).mtimeMs;
if (tSumber > tBuild) {
  console.log(`PROBE CACAT: ${ROOT}/ lebih tua dari sumber (${Math.round((tSumber - tBuild) / 1000)} dtk) — jalankan \`npm run build\` dulu`);
  process.exit(2);
}

const aset = readdirSync(join(ROOT, 'assets'));
const cariAset = (awalan) => aset.find((f) => f.startsWith(awalan)) ?? null;

const srv = http.createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let f = join(ROOT, p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(ROOT, 'index.html'); // fallback SPA (vercel.json)
  const ext = extname(f);

  /* MUTASI=2 — tunda font, tanpa menyentuh apa pun yang lain. Meniru persis
     penyakit yang F ada untuk melihat: font yang tiba SESUDAH layar dipakai. */
  if (MUTASI === 2 && ext === '.woff2') await new Promise((r) => setTimeout(r, 3000));

  let raw = readFileSync(f);
  if (MUTASI === 1 && f.endsWith('index.html')) {
    const berat = cariAset('generateKasHadiranExcel');
    raw = Buffer.from(String(raw).replace('</head>', `<script type="module" src="/assets/${berat}"></script></head>`));
  }
  if (MUTASI === 3 && f.endsWith('sw.js')) {
    raw = Buffer.from(String(raw).replace(/"[^"]*\.woff2",?/g, ''));
  }

  const acc = req.headers['accept-encoding'] || '';
  const enc = KOMPRES.has(ext) ? (acc.includes('br') ? 'br' : acc.includes('gzip') ? 'gzip' : null) : null;
  const kunci = f + '|' + enc + '|' + MUTASI;
  let body = memo.get(kunci);
  if (!body) {
    body = enc === 'br' ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } })
      : enc === 'gzip' ? zlib.gzipSync(raw, { level: 9 }) : raw;
    memo.set(kunci, body);
  }
  const h = { 'Content-Type': TIPE[ext] || 'application/octet-stream', 'Content-Length': body.length };
  if (enc) h['Content-Encoding'] = enc;
  h['Cache-Control'] = p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
  res.writeHead(200, h);
  res.end(body);
});
await new Promise((ok) => srv.listen(PORT, ok));

const tamat = (kode) => { srv.close(); process.exit(kode); };
const wd = setTimeout(() => { console.log('PROBE CACAT: watchdog 180 dtk'); tamat(2); }, 180_000);
wd.unref?.();

// ── kunjungan pertama, 400 kbps / CPU 4x ────────────────────────────────────
const browser = await chromium.launch();
/* `serviceWorkers: 'block'` — yang diukur di sini KUNJUNGAN PERTAMA, dan di
   kunjungan pertama SW memang belum mengontrol halaman (ia didaftarkan dari
   React, sesudah login). Bagian S memeriksa isi SHELL secara STATIS dari
   dist/sw.js, jadi tak butuh SW hidup. */
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  try { localStorage.setItem('hadiran-welcome-v2', '1'); localStorage.setItem('hadiran-theme', 'light'); } catch { /* abaikan */ }
});
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8,
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const t0 = Date.now();
const R = [];
page.on('requestfinished', async (r) => {
  let enc = 0;
  try { enc = Number((await (await r.response()).allHeaders())['content-length'] || 0); } catch { /* balasan hilang */ }
  R.push({ t: Date.now() - t0, url: r.url().replace(APP, ''), enc });
});

await page.goto(APP, { waitUntil: 'commit', timeout: 150_000 });
/* Saat app BISA DIPAKAI = tombol Masuk benar-benar punya kotak, bukan `load`
   (yang menunggu prefetch idle juga) dan bukan FCP (yang cuma splash). */
const pakai = await page.evaluate(() => new Promise((ok) => {
  const cek = () => {
    const el = document.getElementById('masuk-warga');
    if (el && el.getBoundingClientRect().height > 0) return ok(Math.round(performance.now()));
    requestAnimationFrame(cek);
  };
  cek();
})).catch(() => null);
await page.waitForTimeout(11_000);   // biarkan prefetch idle & font mendarat
const fcp = await page.evaluate(() => {
  const e = performance.getEntriesByName('first-contentful-paint')[0];
  return e ? Math.round(e.startTime) : null;
});
await browser.close();

// ── vonis ───────────────────────────────────────────────────────────────────
const kB = (n) => (n / 1024).toFixed(1);
const total = R.reduce((s, r) => s + r.enc, 0);
const font = R.filter((r) => /\.woff2$/.test(r.url));
const gagal = [];

console.log(`\n═══ DUA DETIK PERTAMA · 400 kbps · CPU 4x · akar ${ROOT}${MUTASI ? `  [MUTASI=${MUTASI}]` : ''} ═══`);
console.log(`FCP ${fcp} ms · tombol Masuk terlihat ${pakai} ms`);
console.log(`${R.length} berkas diperiksa · ${kB(total)} kB di kabel (brotli, seperti Vercel)\n`);

// K — kontrol lebih dulu: laporan hijau dari populasi kosong itu kepercayaan palsu
if (pakai == null) { console.log('PROBE CACAT: layar Login tak pernah muncul'); tamat(2); }
if (R.length === 0) { console.log('PROBE CACAT: nol berkas terukur'); tamat(2); }
if (font.length === 0) { console.log('PROBE CACAT: nol font diminta — bagian F tak menguji apa pun'); tamat(2); }
if (R.length < LANTAI_BERKAS) {
  console.log(`POPULASI TURUN: ${R.length} berkas < lantai ${LANTAI_BERKAS} — sapuan mengukur separuh`);
  tamat(1);
}

// B — generator berat wajib TIDAK ikut
console.log('── B. generator ekspor tetap lazy ──');
for (const nama of BERAT) {
  const f = cariAset(nama);
  const kena = R.filter((r) => f && r.url.includes(f));
  const berat = kena.reduce((s, r) => s + r.enc, 0);
  const ok = kena.length === 0;
  console.log(`   ${ok ? 'ok  ' : 'GAGAL'} ${nama.padEnd(28)} ${ok ? '0 byte' : `${kB(berat)} kB IKUT TERUNDUH`}`);
  if (!ok) gagal.push(`B: ${nama} ikut di jalur kunjungan pertama (${kB(berat)} kB)`);
}

// U — anggaran byte & berkas
console.log('\n── U. anggaran kunjungan pertama ──');
const uOk = total <= ANGGARAN_KB * 1024 && R.length <= ANGGARAN_BERKAS;
console.log(`   ${uOk ? 'ok  ' : 'GAGAL'} ${kB(total)} kB / ${ANGGARAN_KB} kB · ${R.length} berkas / ${ANGGARAN_BERKAS}`);
if (!uOk) gagal.push(`U: ${kB(total)} kB dalam ${R.length} berkas (anggaran ${ANGGARAN_KB} kB / ${ANGGARAN_BERKAS})`);
for (const r of [...R].sort((a, b) => b.enc - a.enc).slice(0, 8)) {
  console.log(`        ${String(r.t).padStart(5)}ms ${kB(r.enc).padStart(7)} kB  ${r.url}`);
}

// F — kedip font
/* Yang divonis BUKAN "kapan berkasnya tiba" melainkan "apakah teks di layar
   BERGANTI RUPA sesudah warga mulai membaca". Bedanya nyata: `font-display:
   optional` memberi jendela blok ~100 ms lalu TIDAK PERNAH menukar — berkas
   yang tiba di detik ke-5 tak menggeser satu glyph pun, dan melaporkannya
   sebagai temuan berarti menyuruh orang membetulkan yang justru sedang
   bekerja (aturan alat repo ini, sudah 12x dibayar). `block` juga di luar
   populasi: ia menahan teks, bukan menukarnya — cacat yang BERBEDA, dan
   bukan yang diukur di sini.
   Nilainya dibaca dari CSS yang BENAR-BENAR dikirim, bukan dari sumber:
   yang menentukan perilaku itu berkas di dist. */
const cssDist = readdirSync(join(ROOT, 'assets')).filter((f) => f.endsWith('.css'));
const displayFont = new Map();
for (const nama of cssDist) {
  const teks = readFileSync(join(ROOT, 'assets', nama), 'utf8');
  for (const blok of teks.match(/@font-face\{[^}]*\}/g) ?? []) {
    const berkas = blok.match(/url\(\s*["']?\/?([^"')\s]+\.woff2)/)?.[1];
    if (!berkas) continue;
    displayFont.set('/' + berkas, (blok.match(/font-display:\s*([a-z]+)/)?.[1] ?? 'auto'));
  }
}
const MENUKAR = new Set(['auto', 'swap', 'fallback']);   // yang bisa menggeser glyph sesudah paint
console.log('\n── F. font tiba sebelum warga membaca ──');
let fDinilai = 0;
for (const f of font) {
  const nama = f.url.split('/').pop();
  const disp = displayFont.get(f.url) ?? 'auto';
  if (!MENUKAR.has(disp)) {
    console.log(`   -    ${nama.padEnd(46)} font-display:${disp} — tak pernah menukar, di luar populasi`);
    continue;
  }
  fDinilai++;
  const kedip = f.t - pakai;
  const ok = kedip <= KEDIP_MS;
  console.log(`   ${ok ? 'ok  ' : 'GAGAL'} ${nama.padEnd(46)} tiba ${String(f.t).padStart(5)}ms  (${kedip > 0 ? '+' : ''}${kedip} ms thd layar dipakai, :${disp})`);
  if (!ok) gagal.push(`F: ${nama} tiba ${kedip} ms SESUDAH layar dipakai — teks berganti rupa di bawah jempol warga`);
}
/* Kalau SETIAP font dikecualikan, F tak memvonis apa pun — dan sapuan yang
   populasinya habis wajib mengaku, bukan mencetak hijau (cacat ke-23). */
if (fDinilai === 0) { console.log('\nPROBE CACAT: tiap font di luar populasi F — tak ada yang divonis'); tamat(2); }

// S — font di SHELL service worker
console.log('\n── S. aset render ada di SHELL service worker ──');
let sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
if (MUTASI === 3) sw = sw.replace(/"[^"]*\.woff2",?/g, '');
const m = sw.match(/const SHELL = (\[[^\]]*\]);/);
if (!m) { console.log('PROBE CACAT: SHELL tak terbaca di dist/sw.js'); tamat(2); }
const shell = JSON.parse(m[1]);
console.log(`   SHELL ${shell.length} entri`);
/* Yang WAJIB ada = tiap berkas yang benar-benar diminta halaman di kunjungan
   pertama (kecuali navigasi & skrip Vercel yang memang bukan aset kita).
   Diturunkan dari PENGAMATAN, bukan daftar tulisan tangan — daftar tangan
   itulah yang dulu melewatkan font. */
const wajib = [...new Set(R.map((r) => r.url).filter((u) => u.startsWith('/assets/')))];
const hilang = wajib.filter((u) => !shell.includes(u));
console.log(`   ${hilang.length === 0 ? 'ok  ' : 'GAGAL'} ${wajib.length} aset render diperiksa · ${hilang.length} tak ada di SHELL`);
for (const u of hilang) {
  console.log(`        HILANG  ${u}`);
  gagal.push(`S: ${u} dipakai untuk merender tapi TIDAK dipracache — luring kunjungan pertama kehilangannya`);
}

console.log(`\n═══ ${gagal.length} bermasalah ═══`);
for (const g of gagal) console.log('  · ' + g);
if (MUTASI && gagal.length === 0) {
  console.log(`\nPROBE CACAT: MUTASI=${MUTASI} tetap hijau — mutasinya tak menggigit`);
  tamat(2);
}
tamat(gagal.length ? 1 : 0);
