// Audit TANGGA SPASI — apakah jarak di app ini punya IRAMA, atau cuma angka.
//
// Kenapa alat sendiri, dan kenapa STATIS (tanpa Playwright):
// sapuan geometri lain (`audit:potong`, `audit:lebar`, `audit:sentuh`) menilai
// hasil AKHIR — cukup/tidak, terpotong/tidak. Semuanya lolos dengan spasi yang
// serampangan: `gap-1.5` di satu baris dan `gap-2` di baris sebelahnya sama-sama
// muat, sama-sama bisa disentuh, dan tak satu pun sapuan itu peduli. Yang hilang
// justru yang dilihat mata: selisih 2px tak terbaca sebagai HIERARKI, ia terbaca
// sebagai KEBISINGAN. App terasa "biasa saja" bukan karena satu jarak salah,
// tapi karena ada 29 nilai jarak yang berbeda dan tak satu pun berarti apa-apa.
//
// Pelajaran ke-28 (lihat CLAUDE.md): tangga TIPOGRAFI berhasil karena nilai di
// luar tangga jadi MUSTAHIL, bukan karena kami berjanji tidak memakainya.
// Sapuan ini melakukan hal yang sama untuk spasi.
//
// TIGA GOLONGAN, dan hanya golongan pertama yang diatur:
//
//   1. IRAMA      jarak antar-isi nyata (gap, space-y, bantalan kartu).
//                 WAJIB di tangga. Ini yang dibaca mata sebagai hierarki.
//
//   2. FUNGSIONAL jarak yang terikat ukuran komponen lain, bukan irama —
//                 ruang bebas bottom-nav (`pb-10/14/28`), inset ikon di dalam
//                 input (`pl-9`, `pr-11`), safe-area. Angkanya lahir dari
//                 pengukuran, bukan dari selera. Dibebaskan: >= 36px, dan
//                 `calc(env(safe-area-*))`.
//
//   3. GAMBAR     geometri ilustrasi dekoratif (`AbsensiArt`, `TarikanArt`,
//                 kerangka indikator). Itu GAMBAR, bukan tata letak — memaksa
//                 koordinat gambar ke tangga irama sama salahnya dengan
//                 membulatkan titik path SVG. Dibebaskan lewat daftar IZIN
//                 di bawah, satu per satu, dengan alasan tertulis.
//
// Keluar 1 kalau ada pelanggaran irama; 0 kalau bersih.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const AKAR = new URL('../src', import.meta.url).pathname;

/* ── TANGGA SPASI — delapan anak tangga, masing-masing punya peran ─────────
   0.5   2px   rambut     label ke nilainya
   1     4px   rapat      ikon ke teks
   2     8px   kelompok   di dalam satu kelompok
   3    12px   baris      antar-baris dalam daftar
   4    16px   ringkas    bantalan kartu padat
   5    20px   kartu      bantalan kartu baku
   6    24px   lega       bantalan hero & sheet
   8    32px   seksi      irama antar-seksi halaman
   Sengaja TIDAK ADA 1.5 / 2.5 / 3.5 / 7: selisih 2px tak terbaca sebagai
   hierarki, ia cuma bikin dua nilai bersaing tanpa pemenang. */
const TANGGA = new Set(['0', '0.5', '1', '2', '3', '4', '5', '6', '8']);

/** Nilai >= 36px dianggap FUNGSIONAL (ruang bebas / inset), bukan irama. */
const AMBANG_FUNGSIONAL = 9;

const AWALAN = String.raw`(?:-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y))`;
const RE_ANGKA = new RegExp(String.raw`(?<![\w-])(${AWALAN})-(\d+(?:\.\d+)?)(?![\w.\[-])`, 'g');
const RE_SIKU = new RegExp(String.raw`(?<![\w-])(${AWALAN})-\[([^\]]+)\]`, 'g');

/* ── IZIN — golongan GAMBAR & kontrak geometri, satu per satu.
   Bukan "belum sempat dirapikan": tiap baris di sini adalah keputusan. */
const IZIN = [
  ['components/BannerCarousel.tsx', 'mx-[9px]',  'kerangka indikator — geometri PERSIS indikator asli (kotak sentuh 24px)'],
  ['components/BannerCarousel.tsx', 'p-[3px]',   'bingkai iPhone & cincin koin — tebal bingkai gambar, bukan bantalan'],
  ['components/BannerCarousel.tsx', 'gap-[9px]', 'jarak baris mini-absensi di dalam ilustrasi'],
  ['components/BannerCarousel.tsx', 'px-[10px]', 'baris mini-absensi (ilustrasi)'],
  ['components/BannerCarousel.tsx', 'py-[8px]',  'baris mini-absensi (ilustrasi)'],
  ['components/BannerCarousel.tsx', 'gap-[5px]', 'tumpukan koin & baris label nota (ilustrasi)'],
  ['components/BannerCarousel.tsx', 'px-[16px]', 'nota talangan miring (ilustrasi)'],
  ['components/BannerCarousel.tsx', 'py-[11px]', 'nota talangan miring (ilustrasi)'],
  ['components/BannerCarousel.tsx', 'gap-[7px]', 'batang grafik Kas RT (ilustrasi)'],
];
const berizin = (berkas, kelas) =>
  IZIN.some(([b, k]) => berkas.endsWith(b) && k === kelas);

/* ── Kumpulkan berkas ──────────────────────────────────────────────────── */
function berkasSrc(dir, keluar = []) {
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) berkasSrc(p, keluar);
    else if (/\.(tsx?|css)$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

const temuan = [];
const dipakai = new Map();   // kelas irama → berapa kali
let diperiksa = 0;

for (const jalur of berkasSrc(AKAR)) {
  const isi = readFileSync(jalur, 'utf8');
  const nama = relative(AKAR, jalur);
  const baris = isi.split('\n');

  baris.forEach((teks, i) => {
    for (const m of teks.matchAll(RE_ANGKA)) {
      diperiksa++;
      const kelas = `${m[1]}-${m[2]}`;
      const angka = parseFloat(m[2]);
      if (angka >= AMBANG_FUNGSIONAL) continue;          // golongan FUNGSIONAL
      if (TANGGA.has(m[2])) { dipakai.set(kelas, (dipakai.get(kelas) ?? 0) + 1); continue; }
      temuan.push({ nama, baris: i + 1, kelas, sebab: 'di luar tangga' });
    }
    for (const m of teks.matchAll(RE_SIKU)) {
      diperiksa++;
      const kelas = `${m[1]}-[${m[2]}]`;
      if (/env\(safe-area/.test(m[2])) continue;          // golongan FUNGSIONAL
      if (berizin(nama, kelas)) continue;                 // golongan GAMBAR
      temuan.push({ nama, baris: i + 1, kelas, sebab: 'nilai arbitrer' });
    }
  });
}

/* ── Laporan ───────────────────────────────────────────────────────────── */
const perBerkas = new Map();
for (const t of temuan) {
  if (!perBerkas.has(t.nama)) perBerkas.set(t.nama, []);
  perBerkas.get(t.nama).push(t);
}

for (const [nama, daftar] of [...perBerkas].sort()) {
  console.log(`\n  ${nama}`);
  for (const t of daftar) console.log(`    :${String(t.baris).padEnd(4)} ${t.kelas.padEnd(22)} ${t.sebab}`);
}

console.log('\n  ── anak tangga yang terpakai ──');
for (const [kelas, n] of [...dipakai].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`    ${String(n).padStart(4)}×  ${kelas}`);
}

console.log(`\n=== ${diperiksa} pemakaian spasi diperiksa · ${IZIN.length} izin gambar · ${temuan.length} di luar irama ===`);
process.exit(temuan.length ? 1 : 0);
