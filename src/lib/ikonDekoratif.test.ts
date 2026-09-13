import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Mengunci plugin `ikonDekoratif` di vite.config.ts: ikon lucide tanpa nama
 * dipasangi `aria-hidden="true"` saat build.
 *
 * Penjaga NYATA-nya build itu sendiri (kait yang hilang MELEDAK) dan probe
 * pohon aksesibilitas yang mengukurnya. Uji ini cuma membuat dua kegagalan
 * yang TAK meledak sendiri jadi CEPAT: plugin yang dicabut dari `plugins`
 * (pengaman `throw` di dalamnya tak pernah jalan), dan upgrade lucide yang
 * mengubah bentuk `createLucideIcon.js` sebelum ada yang menjalankan build.
 * Kalau salah satunya lolos, ratusan ikon kembali dibacakan TalkBack sebagai
 * "gambar" tanpa nama, dan tak satu pun sapuan piksel melihat bedanya.
 */
const akar = resolve(__dirname, '../..');
const baca = (p: string) => readFileSync(resolve(akar, p), 'utf8');

describe('ikon lucide dekoratif bawaan', () => {
  it('vite.config.ts memasang plugin ikonDekoratif', () => {
    const cfg = baca('vite.config.ts');
    expect(cfg).toContain('function ikonDekoratif');
    expect(cfg, 'plugin tak terdaftar di `plugins`').toMatch(/plugins:\s*\[[^\]]*ikonDekoratif\(\)/);
  });

  it('kait `...rest` masih ada di createLucideIcon.js versi terpasang', () => {
    const src = baca('node_modules/lucide-react/dist/esm/createLucideIcon.js');
    expect(src, 'bentuk createLucideIcon berubah — perbarui KAIT di vite.config.ts').toMatch(
      /className: \["lucide", `lucide-\$\{toKebabCase\(iconName\)\}`, className\]\.join\(" "\),\n\s*\.\.\.rest/,
    );
  });
});
