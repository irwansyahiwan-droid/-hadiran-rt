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
];

const hidup = () => {
  const r = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '5', URL], { encoding: 'utf8' });
  return r.stdout?.trim() === '200';
};

const jalan = (cmd) => {
  const r = spawnSync('npx', ['--no-install', ...cmd.split(' ')], {
    encoding: 'utf8', env: { ...process.env, CAP_URL: URL, APP_URL: URL },
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
    hasil.push({ n, status: kode === 0 ? 'hijau' : 'MERAH', ket: ringkas(keluaran), dtk });
    process.stdout.write(kode === 0 ? '.' : 'x');
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
