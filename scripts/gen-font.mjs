// Membuat berkas font app dari @fontsource-variable — MENJEPIT SUMBU BOBOT ke
// 400..800, tangga yang `tailwind.config.js` sudah nyatakan.
//
// ── KENAPA ADA ──────────────────────────────────────────────────────────────
// `tailwind.config.js` menaruh `fontWeight` DI LUAR `extend` dgn hanya
// 400/500/600/700/800, dan komentarnya sendiri menjelaskan kenapa
// thin/extralight/light/black dibuang: "ia tersedia tanpa pernah dipilih,
// persis cara `shadow-xl` & `duration-150` masuk ke app ini."
//
// Tangga itu ditegakkan di CSS tapi TIDAK di berkas fontnya. Sampai 5 Sep 2026
// tiap HP warga tetap mengunduh sumbu bobot penuh 100..900 — bobot yang app
// sendiri sudah putuskan tak boleh dipakai. Pola yang sama dgn
// `theme.transitionDuration`: nilai di luar tangga dibikin MUSTAHIL, bukan
// dijanjikan tak dipakai. Di sini "mustahil" itu kebetulan juga lebih ringan:
//
//     inter  48.256 -> 37.028 B   (76,7%)
//     sora   33.652 -> 25.184 B   (74,8%)
//     total  81.908 -> 62.212 B   — hemat 19,3 kB dari jalur kritis 209 kB
//
// Font woff2 sudah terkompres di dalam, jadi brotli tak menyentuhnya sama
// sekali (terukur: 48.256 -> 48.254). 19,3 kB ini karena itu byte NYATA di
// kabel, bukan angka terdekode.
//
// ── KENAPA BUKAN SUBSET KARAKTER ────────────────────────────────────────────
// Subset karakter menghemat 13 kB LAGI, dan sempat dirender & diukur: nol
// glyph yang dipakai SUMBER hilang. Tapi yang dibuangnya memuat aksen GABUNGAN
// (U+0300..U+0323) dan spasi nol-lebar — dan nama warga datang dari basis data,
// bukan dari sumber yang bisa dipindai. Menukar risiko nama warga tercetak
// salah dgn 260 ms bukan tukar yang layak. Penjepit sumbu tak bisa
// menghilangkan glyph apa pun: terverifikasi cmap identik, 0 dibuang.
//
// ── KENAPA DIBANGKITKAN MANUAL, BUKAN SAAT BUILD ────────────────────────────
// Preseden `gen-og.mjs` & `gen-splash.mjs`: artefak dibangkitkan, DIKOMIT, dan
// build cuma memakainya. `npm run build` karena itu TIDAK butuh Python sama
// sekali — Vercel membangun seperti biasa. Yang butuh fontTools hanya orang
// yang menaikkan versi font.
//
// Prasyarat:  pip install fonttools brotli
// Pakai:      node scripts/gen-font.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const KELUAR = 'src/fonts';
const SUMBU = 'wght=400:800';
const FONT = [
  { nama: 'inter', src: 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2' },
  { nama: 'sora', src: 'node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2' },
];

/* Kait yang hilang harus MELEDAK, jangan dilewati (pelajaran ke-24). Generator
   yang diam-diam menyalin berkas asli akan mengembalikan persis keadaan yang
   ia ada untuk memperbaikinya, dan tak ada yang tahu. */
try {
  execFileSync('python3', ['-c', 'import fontTools, brotli'], { stdio: 'pipe' });
} catch {
  console.error('gen-font: fontTools/brotli tak terpasang.\n  pip install fonttools brotli');
  process.exit(1);
}

mkdirSync(KELUAR, { recursive: true });
let asli = 0;
let jadi = 0;
for (const { nama, src } of FONT) {
  if (!existsSync(src)) {
    console.error(`gen-font: sumber tak ada — ${src}\n  (paket @fontsource-variable/${nama} berubah tata letak?)`);
    process.exit(1);
  }
  const ttf = resolve(KELUAR, `.${nama}.tmp.ttf`);
  const out = resolve(KELUAR, `${nama}-latin.woff2`);
  execFileSync('python3', ['-m', 'fontTools.varLib.instancer', src, SUMBU, '-o', ttf], { stdio: 'pipe' });
  execFileSync('python3', ['-m', 'fontTools.ttLib', ttf, '--flavor', 'woff2', '-o', out], { stdio: 'pipe' });
  rmSync(ttf, { force: true });

  /* Penjaga: penjepit sumbu TAK BOLEH menghilangkan glyph. Kalau suatu hari
     ia melakukannya, itu bukan penghematan melainkan nama warga yang hilang
     hurufnya — dan generator wajib menolak, bukan mencetak "ok". */
  const cmp = execFileSync('python3', ['-c', `
from fontTools.ttLib import TTFont
import sys
a=set(TTFont(sys.argv[1]).getBestCmap()); b=set(TTFont(sys.argv[2]).getBestCmap())
print(len(a), len(b), len(a-b))`, src, out], { encoding: 'utf8' }).trim().split(/\s+/).map(Number);
  const [nA, nB, hilang] = cmp;
  if (hilang !== 0) {
    console.error(`gen-font: ${nama} KEHILANGAN ${hilang} glyph (${nA} -> ${nB}) — dibatalkan`);
    process.exit(1);
  }
  const a = statSync(src).size;
  const b = statSync(out).size;
  asli += a; jadi += b;
  console.log(`  ok ${nama.padEnd(6)} ${a} -> ${b} B  (${(b / a * 100).toFixed(1)}%)  glyph ${nA} -> ${nB}, 0 hilang`);
}
console.log(`total ${asli} -> ${jadi} B — hemat ${((asli - jadi) / 1024).toFixed(1)} kB di jalur kritis`);
