/**
 * Penjaga: `scripts/lib/palet.mjs` WAJIB membaca `warnaCetak.ts` dengan benar.
 *
 * Kenapa ada (5 Sep 2026): skrip penghasil gambar di `scripts/` berupa `.mjs`
 * dan tak bisa mengimpor TypeScript, jadi `palet.mjs` MENGURAI berkas TS-nya
 * sebagai teks. Parser teks bisa melenceng diam-diam — dan kalau ia melenceng,
 * yang keluar adalah `og-hadiran.jpg` berpalet salah di tiap pratayang link
 * WhatsApp, persis cacat yang `warnaCetak.ts` dibuat untuk menamatkan.
 *
 * Uji ini mengimpor KEDUANYA — modul TS yang asli dan hasil uraian `.mjs` —
 * lalu membandingkannya kunci per kunci. Bukan mencocokkan hex tulis-tangan:
 * angka harapan dari luar akan basi persis seperti palet yang disalin.
 *
 * Syarat KELENGKAPAN (bagian kedua) yang menutup kelasnya: menambah token
 * baru ke `warnaCetak.ts` tanpa mengajari `palet.mjs` membacanya membuat uji
 * ini MERAH. Tanpa syarat itu, penjaganya cuma menjaga kunci yang kebetulan
 * sudah ada — dan token berikutnya akan lolos diam-diam, yaitu bagaimana
 * seluruh keadaan ini bermula.
 */
import { describe, it, expect } from 'vitest';
import { CETAK } from './warnaCetak';
import { CETAK as MJS } from '../../scripts/lib/palet.mjs';

describe('palet.mjs — cermin warnaCetak.ts', () => {
  it('tiap nilai string sama persis dengan modul TS', () => {
    const kunci = (Object.keys(CETAK) as (keyof typeof CETAK)[])
      .filter((k) => typeof CETAK[k] === 'string' && String(CETAK[k]).startsWith('#'));
    /* Fixture wajib bermakna dulu — daftar kunci kosong membuat loop di
       bawahnya HAMPA dan uji ini lulus tanpa memeriksa apa pun. */
    expect(kunci.length, 'probe cacat: nol kunci hex terpungut').toBeGreaterThan(10);
    for (const k of kunci) {
      expect(String(MJS[k]), `token '${k}' salah dibaca palet.mjs`).toBe(String(CETAK[k]).toUpperCase());
    }
  });

  it('heroRamp terbaca utuh & berurutan', () => {
    expect(MJS.heroRamp).toEqual(CETAK.heroRamp.map((c) => c.toUpperCase()));
  });

  it('heroScrim terurai jadi komponen rgba yang sama', () => {
    const n = CETAK.heroScrim.match(/[\d.]+/g)!.map(Number);
    expect(MJS.heroScrim).toEqual(n);
  });

  /* KELENGKAPAN — ini yang menutup kelasnya, bukan tiga uji di atas. */
  it('tak ada token di warnaCetak.ts yang tak dikenal palet.mjs', () => {
    const hilang = Object.keys(CETAK).filter((k) => !(k in MJS));
    expect(hilang, `token baru di warnaCetak.ts belum diajarkan ke scripts/lib/palet.mjs: ${hilang.join(', ')}`).toEqual([]);
  });
});
