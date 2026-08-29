// Audit TANGGA ELEVASI (bayangan) — apakah "tinggi" di app ini punya ATURAN.
//
// Kenapa alat sendiri: tak ada satu pun sapuan lain yang bisa melihat ini.
// Bayangan tak pernah memotong teks, tak pernah menurunkan kontras (rasio
// hitungnya sempurna), tak pernah mengecilkan target sentuh, tak pernah
// menggeser tata letak. Ia cuma TINGGI — dan tinggi yang tak konsisten persis
// yang membuat permukaan app terasa "tak dipikirkan".
//
// Yang ditemukan waktu sapuan ini pertama ditulis (29 Agu 2026): SEBELAS resep
// elevasi berbeda, cuma TIGA bernama. Delapan sisanya nilai STOK Tailwind
// (`shadow-sm` ×7, `shadow-xl` ×1 — tak seorang pun pernah MEMILIH
// `0 20px 25px -5px rgb(0 0 0 / .1)` untuk app ini, ia cuma tersedia), dua
// nilai mentah di dalam className Login, dan tiga resep lokal komponen.
// Salah satunya bahkan merusak: `shadow-sm` menempel di `.btn-brand`, dan
// utility MENANG atas layer components — jadi tombol brand itu kehilangan
// bayangan bertintanya sendiri dan diganti abu generik.
//
// TIGA aturan yang dijaga:
//
//   1. KELAS      di .tsx hanya boleh anak tangga (.rest .lift .float
//                 .float-high), token medium Login, dan `shadow-none`
//                 (itu KEADAAN, bukan anak tangga). Kelas stok Tailwind
//                 sudah tak menerbitkan CSS sejak skala `boxShadow` ditimpa —
//                 jadi sisa pemakaiannya BUKAN cuma tak rapi, ia MATI diam-diam.
//
//   2. NILAI      `shadow-[...]` mentah di className dilarang. Nilai yang
//                 hidup di call-site tak bisa dijaga alat mana pun dan tak
//                 pernah punya pasangan mode gelap.
//
//   3. RESEP      tiap `box-shadow:` di index.css harus membaca token tangga,
//                 ATAU terdaftar di IZIN dengan alasannya. Ini yang mencegah
//                 resep ke-12 lahir di CSS minggu depan.
//
// TIGA golongan yang SENGAJA di luar tangga — memaksanya masuk itu perusakan,
// bukan kerapian (disiplin yang sama dgn `audit:spasi`):
//   FUNGSIONAL  cincin fokus, inset gloss, keadaan :active, reset :disabled
//   BERTINTA    bayangan yang membawa warna permukaannya sendiri
//   MEDIA LAIN  Login punya kanvas hijau gelap sendiri
//
// Keluar 1 kalau ada pelanggaran; 0 kalau bersih.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;
const CSS = new URL('../src/index.css', import.meta.url).pathname;

const TANGGA = ['rest', 'lift', 'float', 'float-high'];
const KELAS_SAH = new Set([...TANGGA, 'login-lift-logo', 'login-lift-cta']);

/* ── IZIN A — nilai mentah di className, golongan DEKORATIF ─────────────── */
const IZIN_KELAS = [
  ['pages/Beranda.tsx', 'shadow-[0_0_8px_2px_rgba(110,231,183,0.55)]',
   'glow titik "live" — cahaya, bukan elevasi: tak ada permukaan yang diangkatnya'],
];

/* ── IZIN B — resep box-shadow di index.css, satu per satu dgn alasan ───── */
const IZIN_CSS = [
  // ── FUNGSIONAL: bukan tinggi, tapi keadaan atau penanda ──────────────────
  ['0 0 0 2px #FFFFFF', 'cincin fokus §2.4.13 — putih, satu-satunya warna yang aman di DUA tema'],
  ['0 0 0 2px #047857', 'cincin fokus .field terang'],
  ['0 0 0 2px #34D399', 'cincin fokus .field gelap'],
  ['none', 'reset elevasi saat :disabled — keadaan, bukan anak tangga'],
  ['inset 0 1px 0 0 rgba(255,255,255,0.18), 0 1px 3px -1px rgba(13,80,50,0.3)',
   '.btn-brand:active — bayangan MENDARAT saat ditekan; pasangan wajib dari resep diam'],
  ['inset 0 1px 0 0 rgba(255,255,255,0.18), 0 1px 3px -1px rgba(136,19,55,0.3)',
   '.btn-danger:active — idem, kembar .btn-brand'],

  // ── BERTINTA: geometri ikut tangga, WARNA milik permukaannya sendiri ─────
  ['inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 2px 6px -1px rgba(13, 80, 50, 0.30)',
   '.btn-brand — kontak bertinta hijau tombolnya sendiri + glossy top edge (satu-satunya kilap app)'],
  ['inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 2px 6px -1px rgba(136, 19, 55, 0.30)',
   '.btn-danger — kembar .btn-brand, tinta rose'],
  ['0 -1px 0 0 #D3E0D8, 0 -8px 24px -12px rgba(8, 30, 19, 0.14)',
   '.nav-dock — ambient NAIK (bar nempel tepi bawah; drop ke bawah itu bahasa kapsul) + hairline token `line`'],
  ['0 -1px 0 0 rgba(255, 255, 255, 0.14), 0 -8px 24px -12px rgba(0, 0, 0, 0.6)',
   '.nav-dock gelap — hairline jadi ring cahaya; tinta hitam BENAR di atas kanvas near-black'],

  // ── MEDIA LAIN: Login punya kanvas hijau gelap sendiri ───────────────────
  ['var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 16px 38px -12px rgba(0, 0, 0, 0.60)', '.login-lift-logo — lihat blok "Login = MEDIA TERSENDIRI" di index.css'],
  ['var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 12px 32px -12px rgba(0, 0, 0, 0.65)', '.login-lift-cta — idem'],
  ['0 2px 0 0 rgba(255, 255, 255, 0.90) inset, 0 8px 32px -8px rgba(11, 80, 50, 0.18), 0 24px 56px -16px rgba(4, 50, 30, 0.22)',
   '.login-card — glassmorphism yang sudah dideklarasikan "KHUSUS Login, tidak boleh di tempat lain"'],
  ['0 1px 0 0 rgba(255, 255, 255, 0.10) inset, 0 8px 32px -8px rgba(0, 0, 0, 0.50), 0 24px 56px -16px rgba(0, 0, 0, 0.60)',
   '.login-card gelap — pasangan resep di atas'],
];

/* ── kumpulan berkas ───────────────────────────────────────────────────── */
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
let diperiksa = 0;

/* ── aturan 1 & 2: kelas di .tsx ───────────────────────────────────────── */
const STOK = /\bshadow-(sm|md|lg|xl|2xl|inner)\b/g;
const ARBITRARY = /\bshadow-\[[^\]]+\]/g;

for (const p of berkas) {
  const nama = relative(SRC, p);
  /* Komentar BLOK dikosongkan, BUKAN dibuang — kalau dibuang, nomor baris di
     laporan bergeser dan menyuruh orang melihat baris yang salah. */
  const isi = readFileSync(p, 'utf8')
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n');
  isi.forEach((baris, i) => {
    /* Komentar JSX/JS tetap menerbitkan NAMA yang bisa menyesatkan pembaca,
       tapi tidak menerbitkan CSS — jadi ia bukan pelanggaran. Disaring supaya
       sapuan tak berteriak untuk kalimat penjelasan. (Kebalikan cacat
       `cc1534a`: di sana nama kelas di komentar JUSTRU menerbitkan CSS.) */
    const kode = baris.replace(/\{?\/\*.*?\*\/\}?/g, '').replace(/^\s*\*.*$/, '').replace(/\/\/.*$/, '');

    for (const m of kode.matchAll(STOK)) {
      diperiksa++;
      temuan.push({ nama, baris: i + 1, kelas: m[0], sebab: 'kelas STOK Tailwind — skala boxShadow sudah ditimpa, ini tak menerbitkan CSS apa pun (mati diam-diam)' });
    }
    for (const m of kode.matchAll(ARBITRARY)) {
      diperiksa++;
      const izin = IZIN_KELAS.some(([b, k]) => nama.endsWith(b) && k === m[0]);
      if (!izin) temuan.push({ nama, baris: i + 1, kelas: m[0], sebab: 'nilai MENTAH di className — tak bisa dijaga alat & tak punya pasangan mode gelap' });
    }
    for (const t of TANGGA) {
      const re = new RegExp(`className=[^>]*?["\`\\s]${t}[\\s"\`]`);
      if (re.test(kode)) { diperiksa++; dipakai.set(t, (dipakai.get(t) || 0) + 1); }
    }
  });
}

/* ── aturan 3: resep di index.css ──────────────────────────────────────── */
const css = readFileSync(CSS, 'utf8');
/* Buang komentar dulu: `box-shadow` disebut belasan kali di dalam penjelasan
   (mis. `transition-property`), dan menghitungnya sbg resep = populasi salah. */
const cssKode = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const barisKode = cssKode.split('\n');

let buf = null;
barisKode.forEach((baris, i) => {
  if (buf !== null) {
    buf.teks += ' ' + baris.trim();
    if (baris.includes(';')) { nilaiResep(buf.teks, buf.baris); buf = null; }
    return;
  }
  const m = baris.match(/box-shadow\s*:(.*)$/);
  if (!m) return;
  if (baris.includes(';')) nilaiResep(m[1], i + 1);
  else buf = { teks: m[1], baris: i + 1 };
});

function nilaiResep(nilai, baris) {
  diperiksa++;
  const v = nilai.replace(/;.*$/, '').replace(/\s+/g, ' ').trim();
  if (/var\(--(shadow-(rest|card|float|high)|hero-shadow)\)/.test(v)) return;   // membaca token tangga
  if (IZIN_CSS.some(([n]) => v === n)) return;
  /* PENUH=1 mencetak nilai utuh — dipakai saat MENGISI daftar IZIN, supaya
     alasannya ditulis untuk resep yang benar-benar ada, bukan dari ingatan. */
  temuan.push({ nama: 'index.css', baris, kelas: process.env.PENUH ? v : v.slice(0, 62), sebab: 'resep box-shadow yang tak membaca token tangga & tak terdaftar di IZIN' });
}

/* ── nama token: tak boleh ada anak tangga ke-5 diam-diam ──────────────── */
const TOKEN_SAH = new Set(['--shadow-rest', '--shadow-card', '--shadow-float', '--shadow-high', '--hero-shadow']);
for (const m of cssKode.matchAll(/(--shadow-[a-z-]+)\s*:/g)) {
  if (TOKEN_SAH.has(m[1])) continue;
  /* Baris dihitung dari offset — laporan yang menyebut `:0` menyuruh orang
     melihat baris yang tak ada, dan itu membuat sapuannya sendiri tak dipercaya. */
  const baris = cssKode.slice(0, m.index).split('\n').length;
  temuan.push({ nama: 'index.css', baris, kelas: m[1], sebab: 'token elevasi di luar tangga — anak tangga ke-5 lahir tanpa nama peran' });
}

/* ── laporan ───────────────────────────────────────────────────────────── */
const perBerkas = new Map();
for (const t of temuan) {
  if (!perBerkas.has(t.nama)) perBerkas.set(t.nama, []);
  perBerkas.get(t.nama).push(t);
}
for (const [nama, daftar] of [...perBerkas].sort()) {
  console.log(`\n  ${nama}`);
  for (const t of daftar) console.log(`    :${String(t.baris).padEnd(4)} ${t.kelas.padEnd(46)} ${t.sebab}`);
}

console.log('\n  ── anak tangga yang terpakai ──');
const PERAN = {
  rest: 'kontrol kecil di atas kartu',
  lift: 'kartu di atas kanvas',
  float: 'popover / menu / sheet',
  'float-high': 'melayang di atas scrim',
};
for (const t of TANGGA) console.log(`    ${String(dipakai.get(t) || 0).padStart(4)}×  .${t.padEnd(11)} ${PERAN[t]}`);

console.log(`\n=== ${diperiksa} pemakaian elevasi diperiksa · ${IZIN_KELAS.length + IZIN_CSS.length} izin · ${temuan.length} di luar tangga ===`);
process.exit(temuan.length ? 1 : 0);
