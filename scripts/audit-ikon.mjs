// Audit TANGGA IKON — apakah ukuran & bobot ikon di app ini punya ATURAN.
//
// Kenapa alat sendiri: ikon tak pernah memotong teks, tak menurunkan kontras
// teks, tak menggeser tata letak. Ia cuma BENTUK & BOBOT — dan bobot yang tak
// konsisten persis yang membuat deretan ikon terasa "tak dipikirkan".
//
// Yang ditemukan waktu sapuan ini pertama ditulis (29 Agu 2026): 170 pemakaian
// lucide, 11 UKURAN berbeda, 9 nilai stroke, dan 7 ukuran memakai LEBIH DARI
// SATU stroke — 16px sendirian dipakai dengan LIMA (warisan, 2,2, 2,25, 2,5, 0).
//
// Tapi stroke berat itu BUKAN kecerobohan. Diperiksa call-site per call-site,
// polanya rapi: `Check`/`X` 12–14px di dalam pil memakai 2,5–3 karena ikon
// kecil ber-stroke tipis HILANG, dan chevron memakai 2,25 karena ia cuma dua
// goresan sehingga optis lebih ringan. Aturannya sudah ada di kepala orang —
// cuma belum punya nama, jadi diterapkan dgn tangan lalu menyimpang. Bentuk
// masalah yang sama dgn tangga tebal huruf.
//
// TANGGANYA (lihat blok "TANGGA IKON" di index.css untuk stroke-nya):
//   12px  .w-3     stroke 2,25   bersama text-micro    — badge / pil
//   14px  .w-3.5   stroke 2      bersama text-caption
//   16px  .w-4     stroke 1,75   bersama text-body     — baris, tombol (dasar)
//   20px  .w-5     stroke 1,6    mandiri               — tombol ikon, toolbar
//   + pengecualian BERNAMA: keluarga chevron, +0,25 di atas rungnya.
//
// DUA aturan yang dijaga:
//   1. UKURAN  hanya empat rung itu. Golongan GAMBAR lewat daftar IZIN.
//   2. BOBOT   call-site TAK BOLEH menulis `strokeWidth` — stroke DITURUNKAN
//              dari ukuran di CSS. Kecuali `0` (ikon ber-fill: itu KEADAAN,
//              bukan bobot) dan GAMBAR.
//
// GOLONGAN GAMBAR: ikon DI DALAM ilustrasi dekoratif bukan bagian tangga —
// membulatkannya ke rung tata letak sama saja dgn membulatkan titik path SVG.
// Disiplin & bentuk daftar izin sama dgn `audit:spasi` / `audit:bentuk`.
//
// BATAS YANG DIAKUI: populasi dibaca STATIS dari impor `lucide-react`, jadi
// ikon yang DIKIRIM SEBAGAI PROP (`<Icon>` di HeroSaldo, StatRow) tak terlihat
// — kelas yang sama dgn `::placeholder` & Odometer di sapuan lain: apa pun
// yang tak bisa dinamai selektor statis hilang dari populasi. Stroke-nya tetap
// terjaga karena aturannya hidup di CSS, bukan di call-site.
//
// Keluar 1 kalau ada pelanggaran; 0 kalau bersih.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;
const RUNG = { 12: '.w-3  · text-micro', 14: '.w-3\\.5 · text-caption', 16: '.w-4  · text-body', 20: '.w-5  · mandiri' };

/* ── IZIN — golongan GAMBAR, satu per satu dengan alasan ─────────────────── */
/* Bentuk kunci, dan kenapa BUKAN nomor baris. Entri terakhir dulu ditulis
   `pages/Talangan.tsx:520`, dan tiap kali seseorang menyunting apa pun DI ATAS
   baris itu izinnya meleset lalu sapuan memerah untuk ikon yang tak berubah
   sedikit pun — terjadi 30 Agu 2026 waktu subjudul "Per <tanggal>" menambah 6
   baris (520 → 526). Alarm yang berbunyi karena berkasnya bergeser melatih
   orang mengabaikan alarm. Kuncinya sekarang `berkas#Ikon@px`: tetap sempit
   (satu ikon, satu ukuran, satu berkas) tapi tak peduli ia duduk di baris
   berapa. Bentuk `berkas:baris` masih didukung untuk entri yang memang butuh. */
const IZIN = [
  ['components/BannerCarousel.tsx', 'ilustrasi kartu promo — centang/silang/koin di dalam gambar mini-app'],
  ['components/SuccessOverlay.tsx', 'mahkota & centang perayaan — ilustrasi, bukan ikon antarmuka'],
  ['components/ErrorBoundary.tsx', 'segitiga peringatan besar layar galat — ornamen, satu-satunya isi layar'],
  ['pages/Talangan.tsx#CheckCircle2@40', 'penanda keadaan tuntas — ornamen, bukan ikon baris'],
];
const berizin = (nama, baris, ikon, px) => IZIN.some(([b]) => {
  if (b.includes('#')) {
    const [f, sisa] = b.split('#');
    const [ik, ukuran] = sisa.split('@');
    return nama.endsWith(f) && ik === ikon && (!ukuran || +ukuran === px);
  }
  const [f, l] = b.split(':');
  return nama.endsWith(f) && (!l || +l === baris);
});

const berkas = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(p)) berkas.push(p);
  }
})(SRC);

const temuan = [];
const dipakai = new Map();
const silang = new Map();
let diperiksa = 0;

for (const p of berkas) {
  const nama = relative(SRC, p);
  /* Komentar dikosongkan, BUKAN dibuang — nomor baris di laporan harus benar. */
  const teks = readFileSync(p, 'utf8').replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (m) => m.replace(/[^\n]/g, ' '));
  const imp = new Set([...teks.matchAll(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g)]
    .flatMap((m) => m[1].split(',').map((x) => x.trim().split(/\s+as\s+/).pop().trim())).filter(Boolean));
  if (!imp.size) continue;
  const L = teks.split('\n');

  for (const m of teks.matchAll(/<([A-Z][A-Za-z0-9]*)\b([^<>]*?)\/?>/gs)) {
    if (!imp.has(m[1])) continue;
    const props = m[2];
    const baris = teks.slice(0, m.index).split('\n').length;
    diperiksa++;

    /* className bisa berupa template literal `{`...`}` — pola yang menuntut
       kutip TEPAT setelah `className=` membaca 20 ikon sbg "tanpa ukuran"
       padahal semuanya punya. Cacat POPULASI, bukan temuan. */
    const cls = (props.match(/className=\{?[`"']([^`"']*)[`"']/) || [, ''])[1];
    const arb = cls.match(/[wh]-\[(\d+(?:\.\d+)?)(px|rem)\]/);
    const sk = cls.match(/\b[wh]-(\d+(?:\.\d+)?)\b/);
    const px = arb ? (arb[2] === 'rem' ? +arb[1] * 16 : +arb[1]) : sk ? +sk[1] * 4 : null;

    /* Izin diuji SESUDAH ukuran diketahui — kunci `#Ikon@px` butuh keduanya. */
    if (berizin(nama, baris, m[1], px)) continue;

    if (px === null) {
      temuan.push({ nama, baris, apa: m[1], sebab: 'ikon tanpa kelas ukuran — ia mewarisi 24px bawaan lucide, ukuran yang tak pernah dipilih siapa pun' });
    } else if (!RUNG[px]) {
      temuan.push({ nama, baris, apa: `${m[1]} ${px}px`, sebab: `di luar tangga (12 · 14 · 16 · 20) — lipat ke rung terdekat, atau daftarkan sbg GAMBAR` });
    } else {
      dipakai.set(px, (dipakai.get(px) || 0) + 1);
      const sekitar = L.slice(Math.max(0, baris - 3), baris + 2).join(' ');
      const peran = (sekitar.match(/\btext-(display|headline|title|subtitle|amount|body|caption|micro|overline)\b/) || [, '(tanpa teks)'])[1];
      if (!silang.has(px)) silang.set(px, new Map());
      silang.get(px).set(peran, (silang.get(px).get(peran) || 0) + 1);
    }

    const sw = props.match(/strokeWidth=\{([\d.]+)\}/);
    if (sw && +sw[1] !== 0) {
      temuan.push({ nama, baris, apa: `${m[1]} strokeWidth=${sw[1]}`, sebab: 'bobot DITURUNKAN dari ukuran di index.css — call-site tak boleh menuliskannya (kecuali 0 utk ikon ber-fill)' });
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
  for (const t of daftar) console.log(`    :${String(t.baris).padEnd(4)} ${t.apa.padEnd(26)} ${t.sebab}`);
}

console.log('\n  ── anak tangga yang terpakai ──');
for (const px of [12, 14, 16, 20]) console.log(`    ${String(dipakai.get(px) || 0).padStart(4)}×  ${String(px + 'px').padEnd(5)} ${RUNG[px]}`);

console.log('\n  ── ukuran × peran teks di sebelahnya ──');
for (const px of [12, 14, 16, 20]) {
  const m = silang.get(px); if (!m) continue;
  console.log(`    ${String(px + 'px').padStart(5)}  ${[...m].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}×${n}`).join('  ')}`);
}

console.log(`\n=== ${diperiksa} pemakaian ikon diperiksa · ${IZIN.length} izin gambar · ${temuan.length} di luar tangga ===`);
process.exit(temuan.length ? 1 : 0);
