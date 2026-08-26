// Audit TANGGA BENTUK (radius) — apakah sudut di app ini punya ATURAN.
//
// Kenapa alat sendiri: tak ada satu pun sapuan lain yang bisa melihat ini.
// Radius tak pernah memotong teks, tak pernah menurunkan kontras, tak pernah
// mengecilkan target sentuh. Ia cuma BENTUK — dan bentuk yang tak konsisten
// persis yang membedakan "app buatan sendiri" dari "app buatan perusahaan".
//
// Yang ditemukan waktu sapuan ini pertama ditulis: `AvatarPeci` — SATU
// komponen — tampil dengan EMPAT bentuk sudut berbeda tergantung siapa yang
// memanggilnya (`w-8 rounded-lg`, `w-9 rounded-xl`, `w-10 rounded-xl`,
// `w-11 rounded-2xl`), dan tile 44px di app punya TIGA radius berbeda.
// Tak ada pemanggil yang salah; yang salah adalah keputusan itu boleh
// diambil di tempat pemanggil.
//
// DUA aturan yang dijaga:
//
//   1. TANGGA   radius hanya boleh salah satu dari: lg(8) · xl(12) ·
//               2xl(16) · 3xl(24) · full. Tidak ada `md`(6) — selisih 2px
//               dari lg tak terbaca sebagai bentuk, cuma sebagai kebisingan.
//
//   2. UKURAN→BENTUK   untuk tile PERSEGI (w-N h-N), radius diturunkan dari
//               sisinya, ±30%: 28–44px → xl · 48–72px → 2xl · >=76px → 3xl.
//               `rounded-full` selalu boleh: itu keputusan "benda ini bulat"
//               (avatar, titik, pil), bukan keputusan radius.
//
// GAMBAR (ilustrasi dekoratif) dibebaskan lewat daftar IZIN — sama seperti
// `audit:spasi`. Membulatkan geometri gambar ke tangga tata letak sama saja
// dengan membulatkan titik path SVG.
//
// Keluar 1 kalau ada pelanggaran; 0 kalau bersih.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const AKAR = new URL('../src', import.meta.url).pathname;

const TANGGA = new Set(['none', 'lg', 'xl', '2xl', '3xl', 'full']);
const PX = { none: 0, lg: 8, xl: 12, '2xl': 16, '3xl': 24 };

/** Bentuk yang BENAR untuk tile persegi bersisi `px`. */
const bentukUntuk = (px) =>
  px >= 28 && px <= 44 ? 'xl' : px >= 48 && px <= 72 ? '2xl' : px >= 76 ? '3xl' : null;

/* ── IZIN — golongan GAMBAR, satu per satu dengan alasan ─────────────────── */
const IZIN = [
  ['components/BannerCarousel.tsx', 'rounded-[26px]', 'bingkai iPhone di ilustrasi kartu "app"'],
  ['components/BannerCarousel.tsx', 'rounded-[23px]', 'layar di dalam bingkai iPhone (26 − tebal bingkai 3)'],
  ['components/BannerCarousel.tsx', 'rounded-[11px]', 'baris mini-absensi (ilustrasi)'],
  ['components/BannerCarousel.tsx', 'rounded-[14px]', 'nota talangan miring (ilustrasi)'],
  ['components/BannerCarousel.tsx', 'rounded-[5px]',  'batang grafik Kas RT (ilustrasi)'],
  ['components/SuccessOverlay.tsx', 'rounded-[2px]',  'serpih konfeti'],
  ['components/EmptyState.tsx',     'rounded-[15px]', 'ornamen bujur sangkar miring 45° (aria-hidden)'],
  ['components/ErrorState.tsx',     'rounded-[15px]', 'ornamen bujur sangkar miring 45° (aria-hidden)'],
];
const berizin = (berkas, kelas) => IZIN.some(([b, k]) => berkas.endsWith(b) && k === kelas);

function berkasSrc(dir, keluar = []) {
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) berkasSrc(p, keluar);
    else if (/\.tsx?$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

const RE_RADIUS = /(?<![\w-])rounded(?:-[trblse]{1,2})?-(\[[^\]]+\]|none|sm|md|lg|xl|2xl|3xl|full)(?![\w-])/g;
const RE_PERSEGI = /\b(?:w-(\d+(?:\.\d+)?)\s+h-\1|h-(\d+(?:\.\d+)?)\s+w-\2)\b/;

const temuan = [];
const dipakai = new Map();
let diperiksa = 0;

for (const jalur of berkasSrc(AKAR)) {
  const nama = relative(AKAR, jalur);
  readFileSync(jalur, 'utf8').split('\n').forEach((teks, i) => {
    for (const m of teks.matchAll(RE_RADIUS)) {
      diperiksa++;
      const nilai = m[1];
      const kelas = m[0];
      if (nilai.startsWith('[')) {
        if (!berizin(nama, kelas)) temuan.push({ nama, baris: i + 1, kelas, sebab: 'nilai arbitrer' });
        continue;
      }
      if (!TANGGA.has(nilai)) {
        temuan.push({ nama, baris: i + 1, kelas, sebab: `di luar tangga (${PX[nilai] ?? '?'}px)` });
        continue;
      }
      dipakai.set(nilai, (dipakai.get(nilai) ?? 0) + 1);

      /* Aturan 2 — hanya untuk tile persegi, dan `full` selalu lolos. */
      if (nilai === 'full' || nilai === 'none') continue;
      const sq = RE_PERSEGI.exec(teks);
      if (!sq) continue;
      const px = parseFloat(sq[1] ?? sq[2]) * 4;
      const benar = bentukUntuk(px);
      if (benar && benar !== nilai) {
        temuan.push({ nama, baris: i + 1, kelas, sebab: `tile ${px}px seharusnya rounded-${benar}` });
      }
    }
  });
}

const perBerkas = new Map();
for (const t of temuan) {
  if (!perBerkas.has(t.nama)) perBerkas.set(t.nama, []);
  perBerkas.get(t.nama).push(t);
}
for (const [nama, daftar] of [...perBerkas].sort()) {
  console.log(`\n  ${nama}`);
  for (const t of daftar) console.log(`    :${String(t.baris).padEnd(4)} ${t.kelas.padEnd(20)} ${t.sebab}`);
}

console.log('\n  ── anak tangga yang terpakai ──');
for (const [k, n] of [...dipakai].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(n).padStart(4)}×  rounded-${k}${PX[k] !== undefined ? ` (${PX[k]}px)` : ''}`);
}
console.log(`\n=== ${diperiksa} pemakaian radius diperiksa · ${IZIN.length} izin gambar · ${temuan.length} di luar aturan ===`);
process.exit(temuan.length ? 1 : 0);
