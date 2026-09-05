import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Mengunci pengaturan font ke berkas yang BENAR-BENAR dikirim.
 *
 * Kenapa ada: sampai 5 Sep 2026 font datang dari dua baris
 * `import '@fontsource-variable/…'` di main.tsx, dan itu mengirim sumbu bobot
 * PENUH 100..900 — termasuk thin/extralight/light/black yang
 * `tailwind.config.js` sudah putuskan tak boleh dipakai. Sekarang berkasnya
 * dibangkitkan `scripts/gen-font.mjs` dgn sumbu dijepit 400..800 (81.908 ->
 * 62.448 B, hemat 19,0 kB DI KABEL — woff2 sudah terkompres di dalam, jadi
 * brotli tak menyentuhnya).
 *
 * Yang dijaga di sini adalah hal yang TAK BISA dilihat sapuan mana pun:
 * mengembalikan satu baris import fontsource membuat app mengirim KEDUA
 * kumpulan font sekaligus, dan tak ada satu pun laporan yang berubah — bundel
 * tetap terbangun, tiap uji tetap hijau, tiap sapuan piksel tetap hijau
 * (rupanya memang identik). Yang berubah cuma 82 kB di pipa warga.
 */
const akar = resolve(__dirname, '../..');
const baca = (p: string) => readFileSync(resolve(akar, p), 'utf8');

const FONT = ['src/fonts/inter-latin.woff2', 'src/fonts/sora-latin.woff2'];

describe('font app', () => {
  it('berkas hasil gen-font.mjs ada & ukurannya masuk akal', () => {
    for (const f of FONT) {
      expect(existsSync(resolve(akar, f)), `${f} tak ada — jalankan node scripts/gen-font.mjs`).toBe(true);
      const n = statSync(resolve(akar, f)).size;
      /* Batas bawah menangkap berkas rusak/kosong; batas ATAS-lah yang
         menangkap regresi yang sebenarnya — menyalin berkas fontsource asli
         (48.256 & 33.652 B) ke sini akan lolos tiap uji lain. */
      expect(n, `${f} = ${n} B`).toBeGreaterThan(15_000);
      expect(n, `${f} = ${n} B — sumbu bobot tampaknya TIDAK dijepit`).toBeLessThan(40_000);
    }
  });

  it('index.css menunjuk berkas itu, dgn sumbu bobot tangga app', () => {
    const css = baca('src/index.css');
    for (const f of FONT) {
      const nama = f.split('/').pop();
      expect(css, `@font-face tak menunjuk ${nama}`).toContain(`./fonts/${nama}`);
    }
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    expect(faces.length, 'jumlah @font-face berubah').toBe(2);
    for (const blok of faces) {
      /* Tangga `fontWeight` di tailwind.config.js: 400..800. Kalau deklarasi
         di sini mengaku 100..900 sementara berkasnya cuma memuat 400..800,
         peramban akan MENGINTERPOLASI di luar rentang yang ada — bobot yang
         dijanjikan CSS tapi tak dimiliki berkasnya. */
      expect(blok).toMatch(/font-weight:\s*400 800/);
    }
  });

  it('main.tsx TIDAK lagi mengimpor fontsource (kalau kembali, 82 kB ikut senyap)', () => {
    const main = baca('src/main.tsx');
    expect(main).not.toMatch(/@fontsource/);
  });

  it('Sora dipasang optional — kalau kembali ke swap, kedip 1.898 ms ikut kembali', () => {
    const css = baca('src/index.css');
    const sora = (css.match(/@font-face\s*\{[^}]*\}/g) ?? []).find((b) => b.includes('sora-latin'));
    expect(sora, 'blok @font-face Sora tak ketemu').toBeTruthy();
    expect(sora!, 'Sora bukan `optional` lagi').toMatch(/font-display:\s*optional/);
  });

  it('vite.config.ts masih memasang plugin preload font body', () => {
    /* Penjaga NYATA-nya `audit:unduh` bagian F: tanpa preload, Inter tiba
       +843 ms sesudah layar bisa dipakai dan sapuan itu merah. Uji ini cuma
       membuat kegagalannya CEPAT — plugin yang dicabut dari daftar `plugins`
       tak meledak sendiri (pengaman `throw` di dalamnya hanya berjalan kalau
       pluginnya memang jalan), jadi kedipnya kembali tanpa satu pun tanda
       sampai seseorang mengingat menjalankan sapuannya. */
    const cfg = baca('vite.config.ts');
    expect(cfg).toContain('function preloadFontBody');
    expect(cfg, 'plugin preload tak terdaftar di `plugins`').toMatch(/plugins:\s*\[[^\]]*preloadFontBody\(\)/);
  });

  it('unicode-range disalin persis dari subset latin fontsource', () => {
    /* Kalau rentang ini menyempit, karakter yang HARI INI dirender Inter/Sora
       diam-diam pindah ke font sistem — perubahan rupa yang tak satu pun
       sapuan piksel bisa lihat, karena ia cuma muncul untuk data tertentu. */
    const css = baca('src/index.css');
    const wajib = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
    expect(css.split(wajib).length - 1, 'rentang unicode latin berubah').toBe(2);
  });
});
