// SAPU SEMUA — jalankan seluruh sapuan berurutan, cetak SATU ringkasan.
//
// Kenapa alat ini ada: sebelum deploy, keadaan app tersebar di 20+ perintah.
// Membaca satu layar hijau/merah jauh lebih mungkin dilakukan daripada
// mengingat mana yang belum dijalankan — dan sapuan yang tak pernah dijalankan
// sama saja dengan sapuan yang tak ada.
//
// Sapuan STATIS jalan tanpa apa pun. Sapuan VISUAL butuh build produksi hidup;
// kalau `CAP_URL` tak menjawab, mereka DILEWATI dan dilaporkan sbg `dilewat` —
// BUKAN hijau. Laporan hijau dari sapuan yang tak pernah jalan itu kepercayaan
// palsu, persis kelas yang paling dihindari repo ini (cacat ke-23).
//
//   npm run sapu-semua
//   CAP_URL=https://hadiran-rt.vercel.app npm run sapu-semua   # lawan produksi
//   CEPAT=1 npm run sapu-semua                                 # statis saja
//
// Keluar 1 kalau ada sapuan merah ATAU ada yang dilewat karena preview mati.

import { spawnSync } from 'node:child_process';

const URL = process.env.CAP_URL || 'http://localhost:5199';
const CEPAT = !!process.env.CEPAT;

const STATIS = [
  ['typecheck', 'tsc --noEmit -p tsconfig.app.json'],
  ['lint', 'eslint .'],
  ['spasi', 'node scripts/audit-spasi.mjs'],
  ['bentuk', 'node scripts/audit-bentuk.mjs'],
  ['bayangan', 'node scripts/audit-bayangan.mjs'],
  ['tebal', 'node scripts/audit-tebal.mjs'],
  ['ikon', 'node scripts/audit-ikon.mjs'],
  ['test', 'vitest run'],
];

/* Urutan VISUAL: yang paling sering menemukan cacat lebih dulu, supaya
   sapuan yang dihentikan di tengah tetap memberi kabar paling berguna. */
const VISUAL = [
  ['keadaan', 'node scripts/audit-keadaan.mjs'],
  ['kontras', 'node scripts/audit-kontras.mjs'],
  ['kontras-deep', 'node scripts/audit-kontras-deep.mjs'],
  ['kontras-nonteks', 'node scripts/audit-kontras-nonteks.mjs'],
  ['mati', 'node scripts/audit-mati.mjs'],
  ['nama', 'node scripts/audit-nama.mjs'],
  ['huruf', 'node scripts/audit-huruf.mjs'],
  ['potong', 'node scripts/audit-potong.mjs'],
  /* §1.4.12 itu AA WAJIB, jadi ia MENGGAGALKAN rantai — bukan dilaporkan saja
     seperti bagian 200% `audit:potong`/`audit:reflow` (itu ambang APP, di atas
     AA). Keputusan user 2 Sep 2026, dgn mata terbuka: selama sisa temuannya
     belum ditutup, rantai pra-deploy memang merah. Merah yang jujur lebih baik
     daripada hijau yang tak mengukur syarat wajib. */
  ['jarak-teks', 'node scripts/audit-jarak-teks.mjs'],
  ['lebar', 'node scripts/audit-lebar-nominal.mjs'],
  ['sentuh', 'node scripts/audit-sentuh.mjs'],
  ['reflow', 'node scripts/audit-reflow.mjs'],
  ['sheet', 'node scripts/audit-sheet-geometri.mjs'],
  ['lompat', 'node scripts/audit-lompat.mjs'],
  ['gerak', 'node scripts/audit-gerak.mjs'],
  ['publik', 'node scripts/audit-publik.mjs'],
  /* `unduh` mengukur `dist/`, bukan CAP_URL — tapi ia ditaruh di VISUAL
     karena prasyaratnya SAMA: preview yang hidup menyajikan `dist`, jadi
     liveness-nya berarti build ada. Ia memegang server & port-nya SENDIRI
     (5198, dalam proses) sehingga tak menyentuh preview bersama — beda
     dgn `luring-pertama` yang MEMBUNUH pemegang port dan karena itu
     sengaja di luar rantai ini. Build BASI ditolaknya sendiri (PROBE
     CACAT), jadi ia tak bisa hijau dari build kemarin. */
  ['unduh', 'node scripts/audit-unduh.mjs'],
];

/* ── LANTAI POPULASI ────────────────────────────────────────────────────────
   Kenapa ada (3 Sep 2026): `sapu-semua` pernah mencetak **24 hijau** dari jalan
   yang diam-diam mengukur SEPARUH populasinya — `sentuh` 410 → 360 kontrol dan
   `sheet` 13 → 7 permukaan, sementara tiap sapuan tetap keluar 0. Diperiksa
   ulang satu per satu, keduanya pulih; itu flake mesin, dan justru itu
   masalahnya: **tak ada yang memberi tahu pembacanya bahwa laporan itu berdiri
   di atas populasi separuh.**

   Cacat ke-23 dulu mengajarkan "sapuan tak boleh LULUS dari populasi KOSONG".
   Populasi yang tinggal separuh lolos sampai hari ini, karena tiap sapuan
   memang menemukan 0 temuan pada apa pun yang sempat diukurnya.

   Lantainya SENGAJA ketat (~95% dari garis dasar terukur), bukan longgar:
   populasi app ini stabil antar-jalan (`sentuh` 410/412/410, `sheet` 13 selalu),
   jadi toleransi 15% justru akan meloloskan penurunan 12% yang memicu penjaga
   ini dibuat. Kalau DATA memang berubah (warga bertambah), lantai ini WAJIB
   diperbarui — dan pesannya menyuruh begitu, bukan menyuruh melonggarkan.

   Pola yang TAK COCOK = masalah, bukan "aman": keluaran sapuan yang berubah
   bentuk membuat penjaga ini buta, dan penjaga buta yang diam persis kelas
   cacat yang mau ditutup. */
const LANTAI = {
  /* `test` ikut dijaga: vitest yang diam-diam menjalankan separuh berkasnya
     tetap mencetak "passed". Populasinya JUMLAH TES, bukan berkas — berkas
     bisa tetap 23 sementara isinya menyusut. */
  test:             [/Tests\s+(\d+) passed/, 270],
  spasi:            [/(\d+) pemakaian spasi diperiksa/, 980],
  bentuk:           [/(\d+) pemakaian radius diperiksa/, 405],
  bayangan:         [/(\d+) pemakaian elevasi diperiksa/, 93],
  tebal:            [/(\d+) pemakaian tebal diperiksa/, 244],
  ikon:             [/(\d+) pemakaian ikon diperiksa/, 163],
  keadaan:          [/(\d+) layar diperiksa/, 34],
  kontras:          [/TOTAL sampel:\s*(\d+)/, 1140],
  /* 2140 → 2386 (5 Sep 2026): PART L naik dari 1 halaman publik jadi 3
     (panduan-install & warta belum pernah diukur sekali pun), dan perbaikan
     sampling titik atas/bawah membuat lebih banyak elemen cukup titik untuk
     TERUKUR sama sekali. Garis dasar baru 2512; lantai ~95%. */
  'kontras-deep':   [/TOTAL sampel:\s*(\d+)/, 2386],
  'kontras-nonteks':[/TOTAL\s+(\d+) sampel/, 700],
  mati:             [/(\d+) sampel, \d+ tombol unik/, 140],
  nama:             [/(\d+) kontrol di \d+ layar/, 500],
  huruf:            [/populasi daun teks\s*:\s*(\d+)/, 6300],
  potong:           [/A\. 390px[^:]*:\s*\d+ temuan \/ (\d+) layar/, 15],
  'jarak-teks':     [/populasi teks terukur\s*:\s*(\d+)/, 5700],
  lebar:            [/(\d+) konteks diperiksa/, 112],
  reflow:           [/(\d+) layar diperiksa/, 9],
  gerak:            [/(\d+) tab diperiksa/, 13],
  sentuh:           [/TARGET SENTUH @360px — (\d+) kontrol/, 390],
  sheet:            [/(\d+) permukaan diukur/, 12],
  lompat:           [/(\d+) layar diukur/, 8],
  publik:           [/(\d+) halaman diperiksa/, 7],
  /* Populasi = berkas yang benar-benar diminta di kunjungan pertama.
     Garis dasar 19; lantai ~95%. Turun di bawahnya berarti sapuan
     mengukur separuh jalur kritis lalu tetap melapor 0 temuan. */
  unduh:            [/(\d+) berkas diperiksa/, 18],
};
/* TANPA LANTAI — daftar ini KOSONG sejak 3 Sep 2026, dan mekanismenya sengaja
   dipertahankan. `lebar`, `reflow` & `gerak` dulu di sini karena keluarannya
   tak menyebut satu pun angka populasi; ketiganya kini mencetaknya (`konteks
   diperiksa` / `layar diperiksa` / `tab diperiksa`) dan pindah ke LANTAI.
   Kalau nanti ada sapuan BARU yang belum mencetak populasinya, taruh di sini —
   supaya celahnya tercetak tiap jalan, bukan jadi catatan yang nyaman. */
const TANPA_LANTAI = {};

/* MUTASI=1 menaikkan tiap lantai 10× — SEMUA sapuan berlantai wajib melapor
   POPULASI TURUN. Tanpa ini penjaga baru cuma janji: hijau tak membuktikan
   apa pun kalau ia tak pernah bisa merah. */
const KALI = process.env.MUTASI === '1' ? 10 : 1;

function periksaPopulasi(nama, keluaran) {
  const aturan = LANTAI[nama];
  if (!aturan) return null;
  const [pola, dasar] = aturan;
  const lantai = Math.round(dasar * KALI);
  if (lantai === 0) return null;
  const m = keluaran.match(pola);
  if (!m) return { turun: true, pesan: 'POLA POPULASI HILANG — keluaran sapuan berubah bentuk, penjaga ini jadi buta' };
  const n = +m[1];
  if (n < lantai) return { turun: true, pesan: `POPULASI TURUN ${n} < lantai ${lantai} — periksa flake vs perubahan data; kalau nyata, perbarui LANTAI` };
  return { turun: false, n };
}

const hidup = () => {
  const r = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '5', URL], { encoding: 'utf8' });
  return r.stdout?.trim() === '200';
};

const jalan = (cmd) => {
  const r = spawnSync('npx', ['--no-install', ...cmd.split(' ')], {
    /* MUTASI SENGAJA TIDAK diteruskan. Di sini `MUTASI=1` berarti SATU hal:
       naikkan tiap lantai populasi 10x. Tapi hampir tiap sapuan punya knob
       `MUTASI` SENDIRI dgn arti yang sama sekali berbeda (audit-unduh
       menyuntik chunk ekspor 214 kB, audit-gerak memaksa animation-delay,
       audit-mundur mematikan pushState). Diteruskan, satu perintah menjalankan
       DUA eksperimen sekaligus dan populasinya bergeser justru saat lantainya
       sedang diuji — uji lantai lalu "lulus" karena sebab yang salah.
       Validasi lantai dulu terbukti 5/5 hanya di jalur STATIS, dan di sana
       kebetulan tak ada satu pun sapuan ber-MUTASI, jadi tabrakannya tak
       pernah terlihat. Mutasi sapuan dijalankan sendiri-sendiri, memang. */
    encoding: 'utf8', env: { ...process.env, MUTASI: '', CAP_URL: URL, APP_URL: URL },
  });
  return { kode: r.status, keluaran: (r.stdout || '') + (r.stderr || '') };
};

/* Ringkasan diambil dari baris `=== … ===` milik tiap sapuan — tiap sapuan
   sudah mencetak vonisnya sendiri di sana, jadi tak ada aturan kedua di sini
   yang bisa menyimpang dari aturan sapuannya. */
const ringkas = (t) => {
  const m = [...t.matchAll(/^===\s*(.+?)\s*===$/gm)].pop();
  if (m) return m[1].slice(0, 76);
  const g = [...t.matchAll(/^\s*✖?\s*(\d+ problems.*)$/gm)].pop();
  return g ? g[1].slice(0, 76) : '(tanpa ringkasan)';
};

const hasil = [];
const bagian = async (nama, daftar, lewati) => {
  for (const [n, cmd] of daftar) {
    if (lewati) { hasil.push({ n, status: 'dilewat', ket: 'preview mati' }); process.stdout.write('·'); continue; }
    const t0 = Date.now();
    const { kode, keluaran } = jalan(cmd);
    const dtk = Math.round((Date.now() - t0) / 1000);
    const pop = periksaPopulasi(n, keluaran);
    const merah = kode !== 0 || pop?.turun;
    const ket = pop?.turun ? `${pop.pesan}  ·  ${ringkas(keluaran)}` : ringkas(keluaran);
    hasil.push({ n, status: merah ? 'MERAH' : 'hijau', ket, dtk });
    process.stdout.write(merah ? 'x' : '.');
  }
};

console.log(`sapu-semua → ${URL}${CEPAT ? '  (CEPAT: statis saja)' : ''}`);
process.stdout.write('  statis  ');
await bagian('statis', STATIS, false);
process.stdout.write('\n');

let lewatiVisual = CEPAT;
if (!CEPAT && !hidup()) {
  lewatiVisual = true;
  console.log(`\n  ! ${URL} tak menjawab — sapuan visual DILEWAT (bukan hijau).`);
  console.log('    Hidupkan dulu:  npm run build && npx vite preview --port 5199\n');
}
if (!CEPAT) { process.stdout.write('  visual  '); await bagian('visual', VISUAL, lewatiVisual); process.stdout.write('\n'); }

console.log('\n─────────────────────────────────────────────────────────────────────');
{
  const buta = Object.keys(TANPA_LANTAI).filter((k) => hasil.some((h) => h.n === k && h.status !== 'dilewat'));
  if (buta.length) console.log(`  (tanpa lantai populasi: ${buta.join(', ')} — masih bisa mengukur separuh tanpa ketahuan)`);
}
for (const h of hasil) {
  const tanda = h.status === 'hijau' ? '  hijau ' : h.status === 'MERAH' ? '  MERAH ' : '  lewat ';
  console.log(`${tanda} ${h.n.padEnd(16)} ${h.dtk !== undefined ? String(h.dtk).padStart(3) + 's' : '   '}  ${h.ket}`);
}
const merah = hasil.filter((h) => h.status === 'MERAH');
const lewat = hasil.filter((h) => h.status === 'dilewat');
console.log('─────────────────────────────────────────────────────────────────────');
console.log(`${hasil.length} sapuan · ${hasil.length - merah.length - lewat.length} hijau · ${merah.length} MERAH · ${lewat.length} dilewat`);
if (merah.length) console.log(`  merah: ${merah.map((h) => h.n).join(', ')}`);
if (lewat.length && !CEPAT) console.log('  DILEWAT bukan hijau — jangan deploy atas dasar ini.');
process.exit(merah.length || (lewat.length && !CEPAT) ? 1 : 0);
