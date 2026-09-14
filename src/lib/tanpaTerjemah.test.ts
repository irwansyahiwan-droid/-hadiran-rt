import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Terjemahan otomatis peramban DIMATIKAN untuk app (14 Sep 2026, keputusan
 * user). Chrome di HP berbahasa Inggris menerjemahkan halaman berbahasa
 * Indonesia — nama warga & istilah app ("Kas Hadiran", "Sohibul Bait") ikut
 * berubah, dan di app kas nama yang salah sama menyesatkannya dgn angka salah.
 *
 * Sebelum memutuskan, simulasi terjemahan diukur di build lokal (2 peran,
 * 2.470 teks ditulis ulang ala Google Translate, pindah tab, cari, chip,
 * pratinjau saldo): NOL crash & NOL teks basi — jadi yang dicegah di sini
 * nama yang tertukar, bukan app yang rusak.
 *
 * Tak ada peramban uji yang bisa menjalankan Google Translate, jadi yang
 * dikunci DEKLARASINYA: tanpa uji ini, satu penyuntingan <html> membuangnya
 * diam-diam.
 */
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('terjemahan otomatis dimatikan', () => {
  it('<html> membawa translate="no" (diwarisi seluruh dokumen)', () => {
    const tag = html.match(/<html\b[^>]*>/)?.[0];
    expect(tag, 'tag <html> tak ketemu di index.html').toBeTruthy();
    expect(tag).toMatch(/\btranslate="no"/);
    expect(tag, 'lang wajib tetap id').toMatch(/\blang="id"/);
  });

  it('meta google notranslate ada (mematikan tawaran "Terjemahkan halaman?")', () => {
    expect(html).toMatch(/<meta name="google" content="notranslate"\s*\/?>/);
  });
});
