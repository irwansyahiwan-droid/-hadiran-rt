import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { urutanTab } from '../components/layout/tabs';
import { SLUG_TAB, pathTab, tabDariPath } from './tautanTab';

/* Populasi dari `urutanTab`, bukan daftar salinan: tab baru tanpa slug yang
   bisa dibalik merah di sini, bukan lolos lalu mendarat di Beranda. */
describe('tautan per tab', () => {
  it('tiap tab bolak-balik path → tab tanpa kehilangan', () => {
    for (const t of urutanTab) expect(tabDariPath(pathTab(t)), t).toBe(t);
  });

  it('slug unik — dua tab tak boleh berbagi tautan', () => {
    const slug = urutanTab.map((t) => SLUG_TAB[t]);
    expect(new Set(slug).size).toBe(slug.length);
  });

  it('bentuk yang akan diketik/ditempel orang tetap dikenali', () => {
    expect(tabDariPath('/')).toBe('beranda');
    expect(tabDariPath('')).toBe('beranda');
    expect(tabDariPath('/index.html')).toBe('beranda');
    expect(tabDariPath('/jadwal/')).toBe('jadwal');
    expect(tabDariPath('/Kas-RT')).toBe('kas-rt');
    expect(tabDariPath('/hadiran')).toBe('kas');
  });

  it('path asing → null (jatuh ke Beranda), id internal bukan slug', () => {
    expect(tabDariPath('/kas')).toBeNull();          // id internal, BUKAN tautan publik
    expect(tabDariPath('/tidak-ada')).toBeNull();
    expect(tabDariPath('/jadwal/lain')).toBeNull();
  });

  it('slug tak bentrok dgn halaman publik di vercel.json', () => {
    const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    const publik: string[] = vercel.rewrites
      .map((r: { source: string }) => r.source)
      .filter((s: string) => /^\/[a-z-]+$/.test(s));
    expect(publik.length, 'rewrite halaman publik tak ketemu — uji ini jadi buta').toBeGreaterThan(0);
    for (const t of urutanTab) expect(publik, t).not.toContain(pathTab(t));
  });
});
