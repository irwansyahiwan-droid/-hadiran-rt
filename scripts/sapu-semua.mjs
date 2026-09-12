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

/* URUTAN VISUAL — DUA sumbu, dan yang kedua baru ditambahkan 6 Sep 2026.

   (1) YANG PALING SERING MENEMUKAN CACAT LEBIH DULU, supaya rantai yang
       dihentikan di tengah tetap memberi kabar paling berguna. Itu alasan
       aslinya, dan ia masih memerintah bagian tengah daftar ini.

   (2) YANG PALING RAPUH DI DEPAN, YANG PALING TAHAN DI EKOR. Sumbu ini lahir
       dari garis dasar 6 Sep: `fallback-sora` — waktu itu TERAKHIR — keluar
       kode 1 TANPA satu baris ringkasan pun di dalam rantai, lalu EXIT=0 dgn
       vonis lengkap (40 permukaan · 948 teks · A 0 · B 0) saat dijalankan
       SENDIRIAN di mesin & build yang sama. `huruf` (ke-7) kehilangan satu
       layar di jalan yang sama, 27 → 26. Mesin yang sudah menyalakan 25
       Chromium bukan mesin yang sama dgn yang menyalakan satu.

   BATAS BUKTI, DIAKUI — ini SATU pengamatan kuat (fallback-sora) + satu lemah
   (27 → 26 bisa juga satu klik yang meleset), dan sebabnya BELUM terbukti.
   Tersangka pertama justru sudah DIPERIKSA & GUGUR: tak ada Chromium yang
   bocor. Tiap sapuan ber-browser di rantai ini memanggil `browser.close()`,
   dan tiap `process.exit()` yang ada duduk SEBELUM `chromium.launch()` atau
   SESUDAH `close()` — tak satu pun jalur keluar meninggalkan Chromium hidup.
   Jadi perubahan ini MEMINDAHKAN sapuan paling rapuh menjauh dari slot
   terburuk; ia tidak menyembuhkan sebabnya. Yang TIDAK dilakukan: melonggarkan
   vonis. Tak ada percobaan kedua, tak ada toleransi baru, tak ada lantai yang
   diturunkan — merah tetap merah persis seperti sebelumnya.

   KENAPA `fallback-sora` yang dipindah, dan ke DEPAN: ia sapuan paling
   bergantung-klik di repo ini — 40 permukaan, masing-masing dibuka pemicunya
   SENDIRI (target Kas RT, tambah jadwal, revisi jadwal dua langkah) — dan ekor
   antrean justru tempat jalur klik paling mungkin meleset. Ia juga KANARI
   LINGKUNGAN: tanpa DB hidup populasinya distarve dan ia keluar PROBE CACAT.
   Mengetahui itu di menit ke-2 alih-alih menit ke-25 murni untung, dan itu
   TIDAK melanggar sumbu (1) — sapuan yang memberi tahu bahwa seluruh jalan ini
   tak bisa dipercaya adalah kabar paling berguna yang bisa datang lebih dulu.

   KENAPA `unduh` yang menempati ekor: ia paling tak terpengaruh mesin yang
   sudah lelah — satu konteks, memegang server & port-nya SENDIRI (5198), punya
   watchdog 180 dtk sendiri sehingga tak bisa menggantungkan rantai, dan
   menolak build BASI sendiri. Gagal di ekor pun ia gagal dgn NAMA: tiap jalur
   keluarnya mencetak `PROBE CACAT: …` miliknya sendiri, jadi merah di slot
   terakhir tetap bisa dibaca tanpa menjalankannya ulang.

   BELUM TERBUKTI DARI SINI. Rantai penuh hanya sah di mesin ber-DB nyata.
   Yang membuktikan urutan ini menolong cuma satu hal: `fallback-sora` hijau
   DI DALAM rantai penuh, bukan cuma sendirian. Kalau ia tetap gugur di posisi
   ke-2, sumbu (2) yang salah — kembalikan urutannya dan cari sebab lain. */
const VISUAL = [
  ['keadaan', 'node scripts/audit-keadaan.mjs'],
  /* `fallback-sora` menuntut DATA NYATA, bukan cuma preview hidup: dua
     permukaannya (target Kas RT, revisi jadwal) hanya ADA kalau DB-nya
     berisi, dan luapan teks bergantung pada STRING nyata — nama warga,
     keterangan. Di lingkungan tanpa Supabase ia keluar PROBE CACAT, dan itu
     memang jawaban yang benar: hijau dari populasi yang distarve adalah
     kepercayaan palsu (cacat ke-23). Itu juga yang membuatnya berguna di
     DEPAN — lihat sumbu (2). */
  ['fallback-sora', 'node scripts/audit-fallback-sora.mjs'],
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
     CACAT), jadi ia tak bisa hijau dari build kemarin. Sifat-sifat itu
     pula yang membuatnya paling tahan di EKOR — lihat sumbu (2). */
  ['unduh', 'node scripts/audit-unduh.mjs'],
  /* `muat` masuk rantai 12 Sep 2026. Sampai hari itu ia **meteran, bukan
     penjaga**: 75 baris tanpa satu pun baris vonis, selalu exit 0, dan tak
     pernah terdaftar di sini — padahal app ini MEMBELI waktu muat sadar-sadar
     (commit 900e80e memilih varian X seharga 531 ms untuk menutup kedip huruf
     843 ms). Pelajaran ke-33 persis: ambang yang tak dijaga alat sama dengan
     ambang yang tak ada.

     Yang ia vonis adalah SELISIH dua lengan di jalan yang sama (dgn font vs
     seluruh woff2 ditolak), bukan waktu muat MUTLAK — angka mutlak
     machine-dependent dan akan merah karena mesinnya. Karena vonisnya selisih
     se-jalan, ia tahan terhadap kontensi rantai: kedua lengan melambat
     bersama. Terbukti di mutasinya sendiri — server statis Node membuat angka
     mutlak melar 2779 → 7263 ms sementara selisihnya tetap menuding benar. */
  ['muat', 'node scripts/audit-muat.mjs'],
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
  /* Populasi = PERMUKAAN, bukan jumlah teks. Jumlah teks bergerak mengikuti
     isi DB (69 warga hari ini, 300 KK yang dijanjikan), jadi lantai berbasis
     teks salah tiap kali datanya tumbuh. Jumlah permukaan properti APP. */
  'fallback-sora':  [/(\d+) permukaan diperiksa/, 38],
  /* Populasi = jumlah MUAT yang benar-benar diukur (2 lengan × RUNS). Ia
     properti KONFIGURASI, bukan data, jadi lantainya persis — bukan ~95%:
     kalau satu lengan gagal separuh jalan, selisihnya dihitung dari median
     yang lebih tipis dan vonisnya berdiri di atas lebih sedikit bukti. */
  muat:             [/(\d+) muat diukur/, 6],
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

/* Buang urutan kendali ANSI sebelum mencocokkan pola populasi.
   Kenapa: 6 Sep 2026 `test` dilaporkan POLA POPULASI HILANG dua jalan
   berturut-turut sementara baris `Tests  404 passed (404)` JELAS ADA di
   keluarannya — terbaca langsung di ekor yang dicetak laporan. Barisnya ada,
   polanya tetap meleset, jadi yang memisahkan keduanya sesuatu yang TAK
   TERLIHAT di teks terrender: pewarnaan menyisipkan `\x1b[..m` di antara
   `Tests` dan angkanya, sehingga `\s+` tak pernah cocok.
   Penjaga yang membaca teks MENTAH karena itu bergantung pada apakah anak
   proses kebetulan mewarnai keluarannya — dan itu berbeda antar-mesin. */
const bersih = (t) => t.replace(/\u001B\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g, '');

/* Kalau pola TETAP meleset sesudah dibersihkan, tunjukkan BYTE-nya — tanpa ini
   pembacanya cuma tahu "berubah bentuk" dan harus menebak bentuk barunya. */
function petunjukPola(pola, teks) {
  const jangkar = (pola.source.match(/^[A-Za-z][A-Za-z ]*/) || [''])[0].trim();
  if (!jangkar) return '';
  const baris = teks.split('\n').filter((l) => l.includes(jangkar)).slice(0, 2);
  return baris.length ? `  (baris yang memuat "${jangkar}": ${baris.map((l) => JSON.stringify(l.trim().slice(0, 90))).join(' ')})` : `  (tak ada baris memuat "${jangkar}")`;
}

function periksaPopulasi(nama, keluaran) {
  const aturan = LANTAI[nama];
  if (!aturan) return null;
  const [pola, dasar] = aturan;
  const lantai = Math.round(dasar * KALI);
  if (lantai === 0) return null;
  const teks = bersih(keluaran);
  const m = teks.match(pola);
  if (!m) return { turun: true, pesan: 'POLA POPULASI HILANG — keluaran sapuan berubah bentuk, penjaga ini jadi buta' + petunjukPola(pola, teks) };
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
    /* maxBuffer bawaan Node cuma 1 MB, dan kalau terlampaui keluarannya DIPOTONG
       lalu `status` jadi null — sapuan sehat akan terbaca gagal, dan penjaga
       populasi akan menyalahkan "bentuk keluaran" untuk sesuatu yang sebenarnya
       cuma terpotong. Sapuan piksel bisa mencetak ribuan baris. */
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    kode: r.status,
    keluaran: (r.stdout || '') + (r.stderr || ''),
    /* Kenapa prosesnya berakhir, kalau bukan lewat exit code biasa. `status`
       null berarti mati oleh sinyal atau gagal di-spawn — dua hal yang TIDAK
       boleh dilaporkan sebagai "populasi berubah bentuk". */
    sebab: r.error?.code || (r.signal ? `sinyal ${r.signal}` : null),
  };
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
    /* Jam MONOTONIK, bukan `Date.now()` — kebal terhadap lompatan wall-clock
       (koreksi NTP, jam mesin diubah). Dilaporkan 6 Sep 2026 dari mesin dev:
       `mati` tercatat 13.331 dtk (3,7 jam) & `kontras-nonteks` 5.097 dtk,
       padahal seluruh jalannya jauh lebih pendek.

       BATAS YANG DIAKUI: penyebab angka itu BELUM terbukti, dan perubahan ini
       belum tentu menutupnya. Rumusnya cuma satu & bersatuan detik untuk SEMUA
       sapuan, jadi "sebagian melaporkan milidetik" mustahil secara struktural;
       yang tersisa dua kemungkinan — mesin TIDUR di tengah rantai (dan apakah
       `performance.now()` ikut menghitung tidur itu bergantung platform:
       libuv memakai jam yang pada macOS modern justru TETAP berjalan saat
       tidur), atau sapuannya memang menggantung selama itu. Yang bisa
       dipercaya cuma vonis hijau/merahnya; kolom durasi adalah petunjuk,
       bukan bukti. */
    const t0 = performance.now();
    const { kode, keluaran, sebab } = jalan(cmd);
    const dtk = Math.round((performance.now() - t0) / 1000);
    const pop = periksaPopulasi(n, keluaran);
    const merah = kode !== 0 || pop?.turun;
    /* URUTAN SEBAB — ini inti perbaikan 6 Sep 2026. Dulu vonis populasi selalu
       menang, jadi sapuan yang GAGAL dilaporkan sbg "POLA POPULASI HILANG —
       keluaran sapuan berubah bentuk". Kalimat itu menyalahkan bentuk keluaran
       untuk sesuatu yang sebenarnya kegagalan proses, dan terbukti menyesatkan:
       `test` merah karena dua vitest beradu, tapi laporannya menyuruh orang
       memeriksa pola — lalu satu sesi penuh dihabiskan mengejar hipotesis versi
       Node yang salah, sementara `vitest run` sendirian lulus 404.
       Penjaga populasi hanya berhak bicara kalau sapuannya SELESAI NORMAL;
       kalau tidak, yang dilaporkan kegagalannya, dan populasinya cuma catatan. */
    let ket;
    if (kode !== 0) {
      const kenapa = sebab ? `proses berakhir: ${sebab}` : `keluar dgn kode ${kode}`;
      const catatan = pop?.turun ? `  ·  (populasi tak terbaca — wajar untuk sapuan yang gagal)` : '';
      ket = `${kenapa}  ·  ${ringkas(keluaran)}${catatan}`;
    } else {
      ket = pop?.turun ? `${pop.pesan}  ·  ${ringkas(keluaran)}` : ringkas(keluaran);
    }
    /* EKOR KELUARAN sapuan yang gagal ikut disimpan. Tanpa ini, laporan bilang
       "keluar dgn kode 1" dan berhenti di situ — pembacanya tahu SESUATU gagal
       tapi tak tahu apa, jadi tiap merah menuntut satu putaran bolak-balik
       menjalankan ulang sapuan itu sendirian. Terjadi persis begitu 6 Sep 2026
       pada `test`: merah dua jalan berturut-turut sementara `vitest run`
       sendirian lulus 404/404, dan sebabnya tak terbaca dari laporan mana pun.
       Kelas yang sama dgn pelajaran ke-40 — penjaga yang tak menyebut sebabnya
       memaksa orang menebak. */
    const ekor = merah
      ? keluaran.split('\n').filter((l) => l.trim()).slice(-6).map((l) => l.slice(0, 150))
      : null;
    hasil.push({ n, status: merah ? 'MERAH' : 'hijau', ket, dtk, ekor });
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
  if (h.ekor?.length) for (const l of h.ekor) console.log(`${' '.repeat(24)}| ${l}`);
}
const merah = hasil.filter((h) => h.status === 'MERAH');
const lewat = hasil.filter((h) => h.status === 'dilewat');
console.log('─────────────────────────────────────────────────────────────────────');
console.log(`${hasil.length} sapuan · ${hasil.length - merah.length - lewat.length} hijau · ${merah.length} MERAH · ${lewat.length} dilewat`);
if (merah.length) console.log(`  merah: ${merah.map((h) => h.n).join(', ')}`);
if (lewat.length && !CEPAT) console.log('  DILEWAT bukan hijau — jangan deploy atas dasar ini.');
process.exit(merah.length || (lewat.length && !CEPAT) ? 1 : 0);
