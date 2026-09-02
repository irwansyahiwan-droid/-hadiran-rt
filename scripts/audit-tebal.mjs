// Audit TANGGA TEBAL huruf — apakah tebal di app ini dipilih dari PERAN.
//
// Kenapa alat sendiri: tangga tipografi app mengatur ukuran, tinggi baris, dan
// tracking — tapi tak pernah TEBAL. Jadi tebal jadi variabel bebas di 286
// call-site, dan tak ada satu pun sapuan yang peduli: tebal tak memotong teks,
// tak menurunkan kontras, tak menggeser tata letak.
//
// Yang ditemukan waktu sapuan ini pertama ditulis (29 Agu 2026): 8 dari 13
// kombinasi (jenis elemen × peran teks) memakai 2–3 tebal untuk pekerjaan yang
// sama. Yang paling telak BELAH PERSIS DUA — tombol `text-body` 13× semibold
// lawan 13× bold, badge `text-micro` 5× lawan 6× — dan itu mustahil lahir dari
// peran. Bahkan dua komponen BERSAMA tak sepakat: `Tag.tsx` semibold, badge
// `SectionTitle.tsx` bold, untuk pil kecil yang pekerjaannya sama persis.
//
// TANGGANYA bersumbu KERJA, bukan ukuran:
//   normal     redup      mundur di dalam teks yang ditekankan
//   medium     prosa      kalimat, caption, label grafik
//   semibold   nilai &    nominal, tombol, badge, item menu, eyebrow
//              kontrol
//   bold       judul      h1–h3, judul seksi & kartu
//   extrabold  angka      HANYA bersama `font-display` (Sora)
//
// CARA menjaganya = KOMPONEN & RESEP yang memiliki tebalnya, bukan aturan lint
// atas call-site (pelajaran `AvatarPeci`: keputusan itu tak boleh diambil di
// tempat pemanggil). Sapuan ini menjaga bahwa kepemilikan itu tak dibocorkan
// lagi, plus dua aturan yang memang bisa dinilai dari sumber.
//
// EMPAT aturan:
//   1. RESEP MILIK    call-site `.btn-brand`/`.btn-danger`/`.btn-secondary`
//                     TAK BOLEH menulis tebal — resepnya sudah punya.
//   2. KOMPONEN MILIK `<Tag>`/`<SectionTitle>` tak boleh dikirimi tebal lewat
//                     className.
//   3. EXTRABOLD      hanya boleh berdampingan dgn `font-display` (Sora).
//                     Di Inter ia jadi berat tanpa peran.
//   4. KONTROL        tombol & badge WAJIB `semibold` — dua jenis yang
//                     kerjanya bisa dibaca dari sumber tanpa tafsir.
//
// BATAS YANG DIAKUI: `<p>` memikul TIGA kerja sekaligus di app ini — judul
// ("Tren Saldo"), nilai (nominal), dan prosa. Jenisnya TIDAK bisa dibaca dari
// tag, jadi paragraf hanya DILAPORKAN (silang jenis × peran), tak divonis.
// Memaksakan satu tebal ke seluruh `<p>` akan meratakan judul dengan prosa —
// perusakan, bukan kerapian. Perbaikan sebenarnya = judul dirender sbg heading,
// dan itu perubahan SEMANTIK (a11y), di luar sumbu visual.
//
// Keluar 1 kalau ada pelanggaran; 0 kalau bersih.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;
const TANGGA = ['normal', 'medium', 'semibold', 'bold', 'extrabold'];
const RESEP = ['btn-brand', 'btn-danger', 'btn-secondary'];
const KOMPONEN = ['Tag', 'SectionTitle'];

/* ── IZIN — dgn alasan, satu per satu ──────────────────────────────────── */
const IZIN = [
  ['components/SuccessOverlay.tsx', 104, 'pil ber-`rounded-full` tapi isinya KALIMAT di atas scrim, bukan badge — prosa tetap medium'],
  ['components/BannerCarousel.tsx', 306, 'GAMBAR — teks di dalam ilustrasi "nota talangan", bukan teks app (disiplin izin `audit:spasi`)'],
];
const berizin = (nama, baris) => IZIN.some(([b, l]) => nama.endsWith(b) && l === baris);

const berkas = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(p)) berkas.push(p);
  }
})(SRC);

/** Jenis elemen dari blok 3 baris ke ATAS — JSX sering memecah tag & className. */
const jenisDari = (blok) => {
  if (/rounded-full/.test(blok) && /\btext-(micro|caption)\b/.test(blok) && !/<button|role="button"/.test(blok)) return 'badge';
  if (/<button|role="button"|<a\s/.test(blok)) return 'tombol';
  if (/<p\b/.test(blok)) return 'paragraf';
  if (/<h[1-3]\b/.test(blok)) return 'judul';
  return null;
};

const temuan = [];
const silang = new Map();
let diperiksa = 0;

for (const p of berkas) {
  const nama = relative(SRC, p);
  /* Komentar dikosongkan, BUKAN dibuang — nomor baris di laporan harus benar. */
  const isi = readFileSync(p, 'utf8')
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n');

  isi.forEach((baris, i) => {
    const m = baris.match(/\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/);
    if (!m) return;
    diperiksa++;
    const tebal = m[1];
    const no = i + 1;

    if (!TANGGA.includes(tebal)) {
      temuan.push({ nama, baris: no, apa: `font-${tebal}`, sebab: 'di luar tangga — skala fontWeight sudah ditimpa, ini tak menerbitkan CSS apa pun (mati diam-diam)' });
      return;
    }

    // 1. resep sudah memiliki tebalnya
    const resep = RESEP.find((r) => baris.includes(r));
    if (resep) temuan.push({ nama, baris: no, apa: `font-${tebal}`, sebab: `resep .${resep} sudah memiliki tebalnya — call-site menimpanya` });

    // 3. extrabold hanya bersama font-display
    if (tebal === 'extrabold' && !baris.includes('font-display') && !berizin(nama, no)) {
      temuan.push({ nama, baris: no, apa: 'font-extrabold', sebab: 'extrabold hanya untuk angka besar & wordmark di `font-display` (Sora)' });
    }

    // 4. tombol & badge wajib semibold
    const blok = isi.slice(Math.max(0, i - 3), i + 1).join(' ');
    const jenis = jenisDari(blok);
    if (jenis) {
      const peran = (baris.match(/\btext-(display|headline|title|subtitle|amount|body|caption|micro|overline)\b/) || [, '(ukuran lain)'])[1];
      const k = `${jenis}  ·  text-${peran}`;
      if (!silang.has(k)) silang.set(k, {});
      silang.get(k)[tebal] = (silang.get(k)[tebal] || 0) + 1;
      /* Anak tangga KONTROL = `semibold` — KECUALI di `text-micro` (11px), yang
         wajib `bold`. Bukan kelonggaran: di 11px selisih 600 vs 700 terbaca sbg
         teks MEMUDAR, bukan sbg hierarki (terukur 2 Sep 2026 — 22 badge turun
         700 → 600 waktu tangga ini lahir, dan user melaporkannya sbg "font
         kecilnya jadi pudar"). Sumbu lain repo ini sudah memakai prinsip yang
         sama: tangga IKON menurunkan stroke dari UKURAN. Ditulis sbg ATURAN,
         bukan baris IZIN, supaya badge 11px BERIKUTNYA ikut terjaga — izin
         hanya menutup satu call-site & membiarkan kelasnya terbuka. */
      const wajib = peran === 'micro' ? 'bold' : 'semibold';
      if ((jenis === 'tombol' || jenis === 'badge') && tebal !== wajib && !berizin(nama, no)) {
        temuan.push({ nama, baris: no, apa: `font-${tebal}`, sebab: `${jenis} text-${peran} = anak tangga KONTROL → wajib font-${wajib}` });
      }
    }
  });

  // 2. komponen tak boleh dikirimi tebal
  const teks = readFileSync(p, 'utf8').replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (m) => m.replace(/[^\n]/g, ' '));
  for (const K of KOMPONEN) {
    /* `[^<>]*` — BUKAN `[^>]*`: props JSX bisa memuat elemen bersarang
       (`action={<button className="… font-semibold">}`), dan pola serakah
       menelan tebal milik anak lalu menyalahkan komponen induknya. Terjadi
       sekali di JadwalWarga:578 saat sapuan ini pertama dijalankan. */
    for (const m of teks.matchAll(new RegExp(`<${K}\\b[^<>]*>`, 'gs'))) {
      const w = m[0].match(/\bfont-(normal|medium|semibold|bold|extrabold)\b/);
      if (!w) continue;
      const baris = teks.slice(0, m.index).split('\n').length;
      temuan.push({ nama, baris, apa: `font-${w[1]}`, sebab: `<${K}> memiliki tebalnya sendiri — jangan dikirim lewat className` });
    }
  }
}

/* ── laporan ───────────────────────────────────────────────────────────── */
const perBerkas = new Map();
for (const t of temuan) {
  if (!perBerkas.has(t.nama)) perBerkas.set(t.nama, []);
  perBerkas.get(t.nama).push(t);
}
for (const [nama, daftar] of [...perBerkas].sort()) {
  console.log(`\n  ${nama}`);
  for (const t of daftar) console.log(`    :${String(t.baris).padEnd(4)} ${t.apa.padEnd(16)} ${t.sebab}`);
}

console.log('\n  ── silang JENIS × PERAN (paragraf hanya dilaporkan, tak divonis) ──');
console.log('  ' + 'jenis · peran'.padEnd(34) + TANGGA.map((t) => t.slice(0, 8).padStart(10)).join(''));
for (const [k, r] of [...silang].sort((a, b) => {
  const s = (x) => Object.values(x[1]).reduce((p, q) => p + q, 0);
  return s(b) - s(a);
})) {
  const total = Object.values(r).reduce((a, b) => a + b, 0);
  if (total < 3) continue;
  const n = Object.keys(r).length;
  const dom = Math.max(...Object.values(r)) / total;
  const tanda = n === 1 ? '' : dom < 0.8 ? '   ← campur' : '';
  console.log('  ' + k.padEnd(34) + TANGGA.map((t) => String(r[t] || '·').padStart(10)).join('') + tanda);
}

console.log(`\n=== ${diperiksa} pemakaian tebal diperiksa · ${IZIN.length} izin · ${temuan.length} di luar tangga ===`);
process.exit(temuan.length ? 1 : 0);
