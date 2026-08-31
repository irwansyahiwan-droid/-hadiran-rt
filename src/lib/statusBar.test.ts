import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Penjaga BAR STATUS OS — warna ikon jam/sinyal/baterai di paling atas layar.
 *
 * Kenapa uji, bukan sapuan: warna ikonnya bukan milik app. Android Chrome
 * MENURUNKANNYA dari luminansi `theme-color`, iOS dari
 * `apple-mobile-web-app-status-bar-style`. Tak ada satu piksel pun di dalam
 * halaman yang bisa disampel Playwright untuk membuktikannya — yang bisa
 * diperiksa NILAI yang kita kirim ke OS, dan itu statis.
 *
 * Aturan Chrome (praktis): luminansi relatif > 0,5 → OS memakai ikon GELAP.
 * Jadi di mode TERANG `theme-color` WAJIB terang; kalau ia melenceng jadi gelap,
 * ikonnya berbalik jadi putih di atas latar putih dan jam warga hilang.
 *
 * Ini bukan kekhawatiran karangan: pelajaran ke-27 di CLAUDE.md mencatat
 * `theme-color` statis pernah tertinggal di `#FAFBFC` — warna yang bahkan tak
 * pernah sama dengan kanvas mana pun — dan tak ada yang menangkapnya sampai
 * seseorang memeriksa produksi dengan tangan. Nilai yang dikirim ke OS punya
 * TIGA salinan (meta statis, skrip pra-React, `useTheme`), dan salinan yang
 * tak diuji selalu menyimpang; kembarannya sudah terjadi 26 Agu ketika
 * index.html diperbaiki tapi `useTheme` terlewat.
 */

const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminansi = (hex: string) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8'));
const useTheme = readFileSync(new URL('../hooks/useTheme.ts', import.meta.url), 'utf8');

/** Nilai `isDark ? 'X' : 'Y'` di useTheme — SATU sumber untuk kedua tema. */
const pasangan = useTheme.match(/isDark \? '(#[0-9A-Fa-f]{6})' : '(#[0-9A-Fa-f]{6})'/);

describe('bar status OS', () => {
  it('nilai runtime `useTheme` bisa dibaca — kalau kaitnya hilang, uji ini MELEDAK, bukan lolos diam-diam', () => {
    expect(pasangan, 'pola `isDark ? gelap : terang` di useTheme.ts tak ketemu').not.toBeNull();
  });

  it('mode TERANG mengirim warna terang → OS memilih ikon GELAP', () => {
    const statis = html.match(/<meta name="theme-color" content="(#[0-9A-Fa-f]{6})"/)?.[1];
    expect(statis, 'meta theme-color statis tak ketemu di index.html').toBeTruthy();
    // Tiga salinan yang sampai ke OS sebelum & sesudah React hidup.
    for (const [nama, warna] of [
      ['meta statis (sebelum React)', statis!],
      ['manifest.theme_color', manifest.theme_color as string],
      ['useTheme (terang)', pasangan![2]],
    ] as const) {
      expect(luminansi(warna), `${nama} = ${warna} terlalu gelap; OS akan memakai ikon PUTIH di atas layar terang`).toBeGreaterThan(0.5);
    }
  });

  it('mode GELAP mengirim warna gelap → OS memilih ikon terang', () => {
    expect(luminansi(pasangan![1]), `useTheme (gelap) = ${pasangan![1]} terlalu terang`).toBeLessThan(0.5);
  });

  it('iOS diminta memakai ikon gelap (`default`), BUKAN `black-translucent`', () => {
    const gaya = html.match(/name="apple-mobile-web-app-status-bar-style" content="([a-z-]+)"/)?.[1];
    /* `black-translucent` menaruh isi halaman DI BAWAH bar status dan memaksa
       ikon PUTIH — di app berkanvas terang itu berarti jam yang tak terbaca. */
    expect(gaya).toBe('default');
  });
});
