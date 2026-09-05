/**
 * Palet keluaran untuk skrip `.mjs` — SATU sumber dgn `src/lib/warnaCetak.ts`.
 *
 * ── Kenapa berkas ini ada (5 Sep 2026) ────────────────────────────────────
 * `warnaCetak.ts` dibuat 4 Agu justru untuk menamatkan kelas cacat "tiap
 * berkas keluaran menyimpan paletnya sendiri lalu membeku di generasi token
 * yang berbeda". Tiga berkas TypeScript ikut masuk. Yang TIDAK ikut: skrip
 * penghasil GAMBAR di `scripts/`, karena ia `.mjs` dan tak bisa mengimpor TS.
 *
 * Ongkosnya terukur: `og-hadiran.jpg` — gambar yang muncul di TIAP pratayang
 * link WhatsApp, wajah luar yang paling sering dilihat — memaku 18 hex
 * sendiri. Gradiennya berangkat dari nilai hero app (L38,9) lalu naik ke
 * L64,8; hijau seterang itu tak ada di mana pun dalam produk. Glow-nya
 * `rgba(45,212,150,.32)`, yaitu nilai yang app sendiri sudah turunkan ke
 * .18/.05 di pass kontras maksimal. Teksnya duduk di 4,4–5,7:1 sementara
 * seluruh permukaan keluaran lain sengaja diangkat ke >= 7.
 *
 * ── Kenapa MENGURAI, bukan menyalin ───────────────────────────────────────
 * Menyalin nilainya ke sini akan mengulang persis cacat yang mau ditutup:
 * yang menyalin tak punya cara tahu kalau sumbernya berubah. Jadi berkas ini
 * MEMBACA `warnaCetak.ts` dan mengurai nilainya saat dijalankan.
 *
 * Uraiannya SENGAJA cerewet: kunci yang tak ketemu MELEDAK, tidak
 * dikembalikan `undefined`. Pelajaran ke-24 — kait yang hilang harus meledak,
 * jangan dilewati; daftar warna kosong yang lolos diam-diam akan menghasilkan
 * gambar hitam-putih yang "berhasil dibuat" tanpa satu pun tanda.
 *
 * Uraiannya dikunci uji (`src/lib/paletMjs.test.ts`) yang mengimpor MODUL TS
 * aslinya lalu membandingkannya elemen per elemen — jadi parser ini tak bisa
 * diam-diam melenceng dari sumbernya, dan `warnaCetak.ts` tak bisa menambah
 * kunci tanpa berkas ini ikut tahu.
 */
import { readFileSync } from 'node:fs';

const SRC = new URL('../../src/lib/warnaCetak.ts', import.meta.url);
const teks = readFileSync(SRC, 'utf8');

/** Ambil satu nilai string: `nama: '#RRGGBB',`. Tak ketemu = MELEDAK. */
function hex(nama) {
  const m = teks.match(new RegExp(`\\b${nama}\\s*:\\s*'(#[0-9A-Fa-f]{6})'`));
  if (!m) throw new Error(`palet.mjs: kunci '${nama}' tak ada di warnaCetak.ts — jangan lanjut dgn nilai tebakan`);
  return m[1].toUpperCase();
}

/** Ambil `heroRamp: ['#..','#..','#..']`. Panjangnya WAJIB 3. */
function ramp() {
  const m = teks.match(/heroRamp\s*:\s*\[([^\]]+)\]/);
  if (!m) throw new Error("palet.mjs: 'heroRamp' tak ada di warnaCetak.ts");
  const stops = [...m[1].matchAll(/'(#[0-9A-Fa-f]{6})'/g)].map((x) => x[1].toUpperCase());
  if (stops.length !== 3) throw new Error(`palet.mjs: heroRamp harus 3 stop, dapat ${stops.length}`);
  return stops;
}

/** Ambil `heroScrim: 'rgba(r, g, b, a)'` → [r,g,b,a]. */
function scrim() {
  const m = teks.match(/heroScrim\s*:\s*'rgba\(([^)]+)\)'/);
  if (!m) throw new Error("palet.mjs: 'heroScrim' tak ada di warnaCetak.ts");
  const n = m[1].split(',').map((s) => Number(s.trim()));
  if (n.length !== 4 || n.some(Number.isNaN)) throw new Error(`palet.mjs: heroScrim tak terbaca: ${m[1]}`);
  return n;
}

export const CETAK = {
  canvas: hex('canvas'), surface: hex('surface'), line: hex('line'), divider: hex('divider'),
  ink: hex('ink'), sub: hex('sub'), faint: hex('faint'), muted: hex('muted'),
  brand: hex('brand'), pos: hex('pos'), neg: hex('neg'), warn: hex('warn'),
  posTint: hex('posTint'), negTint: hex('negTint'),
  heroRamp: ramp(),
  heroScrim: scrim(),
};

/** `rgba(...)` dgn alfa yang bisa disetel — dipakai glow & fill kaca. */
export const rgba = (hexStr, a) => {
  const h = hexStr.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
};
