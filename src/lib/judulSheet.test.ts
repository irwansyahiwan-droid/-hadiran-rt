import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Judul sheet/dialog = `<h2>` (30 Sep 2026, keputusan rasa user, `537d5f2`).
 * Aturan global `h1, h2` di index.css memberinya Sora + tracking rapat +
 * `text-wrap: balance`, sama dgn setiap judul lain di app. Sebelas judul sheet
 * dulu `<h3>` dan diam-diam jatuh ke Inter — tak satu sapuan pun protes, karena
 * tak ada yang tahu huruf apa yang SEHARUSNYA dipakai sebuah heading.
 *
 * Aturan `h3` di CSS sudah dibuang bersama pemakainya, jadi `<h3>` baru akan
 * tampil Inter TANPA text-wrap balance: kunci di sini, bukan janji di komentar.
 */
const akar = fileURLToPath(new URL('../', import.meta.url));

function berkasTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return berkasTsx(p);
    return e.name.endsWith('.tsx') && !e.name.includes('.test.') ? [p] : [];
  });
}

const semua = berkasTsx(akar).map((p) => ({ p: p.slice(akar.length), isi: readFileSync(p, 'utf8') }));

describe('judul sheet satu huruf dgn seluruh app', () => {
  it('pemindaian menemukan populasinya (kontrol: uji ini tak lulus dari nol berkas)', () => {
    /* Dihitung per JUDUL, bukan per berkas, dan ambangnya di bawah populasi hari
       ini (14 judul): kontrol ini menjaga pola pindai tetap hidup, bukan jumlah
       sheet — menghapus satu sheet secara sah tak boleh memerahkannya. */
    const judulDialog = semua.flatMap((f) => f.isi.match(/<h2 className="[^"]*text-subtitle/g) ?? []);
    expect(semua.length).toBeGreaterThan(40);
    expect(judulDialog.length, 'judul sheet ber-<h2> text-subtitle tak ketemu — pola pindai basi?').toBeGreaterThanOrEqual(8);
  });

  it('tak ada <h3> di app — judul sheet/dialog wajib <h2> (Sora lewat aturan global)', () => {
    const pelanggar = semua.filter((f) => /<h3[\s>]/.test(f.isi)).map((f) => f.p);
    expect(pelanggar, `pakai <h2> untuk judul sheet: ${pelanggar.join(', ')}`).toEqual([]);
  });
});
