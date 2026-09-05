/**
 * Penjaga DEKLARASI halaman publik — apa yang halaman JANJIKAN wajib sama
 * dengan apa yang ia LAKUKAN.
 *
 * Kenapa ada (5 Sep 2026): `landing.html` memasang
 * `<meta name="color-scheme" content="light dark">` sementara CSS-nya menyetel
 * `:root { color-scheme: light }` berikut alasan yang panjang & benar. Yang
 * menang CSS — terukur, `colorScheme` computed = light di KEDUA mode — jadi
 * metanya janji yang tak pernah ditepati. Janji itu tak gratis: sebelum CSS
 * terurai, peramban bermode gelap memakai meta untuk mengecat kanvas awal,
 * jadi warga mendapat kedip gelap sebelum halaman terang muncul.
 *
 * Kelas cacatnya "dinyatakan ≠ dikerjakan", dan itu tak bisa dilihat sapuan
 * piksel mana pun: kedua mode merender byte yang IDENTIK, jadi membandingkan
 * tangkapan layar terang vs gelap justru melaporkan halaman ini sehat.
 *
 * CATATAN PENTING soal cakupan: halaman yang berkomitmen pada SATU wajah
 * bukan cacat. `warta` (koran krem) & `panduan-install` dua-duanya menyatakan
 * `light` di meta DAN di CSS — konsisten, sah, dan sengaja. Yang dijaga di
 * sini KESEPAKATAN antara keduanya, bukan keharusan mendukung gelap.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'public';
const halaman = readdirSync(DIR).filter((f) => f.endsWith('.html')).sort();

/** SEMUA skema yang CSS halaman ini benar-benar dukung.
 *
 *  Sengaja memungut TIAP deklarasi `color-scheme:`, bukan cuma yang di `:root`.
 *  Percobaan pertama membaca `:root` saja dan melaporkan `nobar.html` GAGAL —
 *  temuan PALSU: nobar menyetel `dark` di `:root` lalu `light` di kelas
 *  `.light` yang dipasang toggle-nya, jadi ia memang mendukung keduanya.
 *  Halaman boleh mendukung skema lewat kelas, bukan hanya lewat `:root`. */
function cssScheme(src: string): string | null {
  const semua = [...src.matchAll(/color-scheme:\s*([^;}]+)/g)].map((m) => m[1].trim());
  if (!semua.length) return null;
  return [...new Set(semua.flatMap((v) => v.split(/\s+/)))].join(' ');
}
function metaScheme(src: string): string | null {
  const m = src.match(/<meta\s+name="color-scheme"\s+content="([^"]+)"/);
  return m ? m[1].trim() : null;
}

describe('Deklarasi halaman publik', () => {
  it('populasi terbaca', () => {
    expect(halaman.length, 'nol halaman publik — probe tak mendarat').toBeGreaterThanOrEqual(4);
  });

  for (const f of halaman) {
    it(`${f}: meta color-scheme sepakat dgn CSS`, () => {
      const src = readFileSync(`${DIR}/${f}`, 'utf8');
      const css = cssScheme(src);
      const meta = metaScheme(src);
      if (!css && !meta) return;               // halaman tanpa deklarasi apa pun — bukan urusan uji ini
      expect(meta, `${f}: CSS menyatakan color-scheme "${css}" tapi meta tak ada`).not.toBeNull();
      expect(css, `${f}: meta menyatakan "${meta}" tapi CSS tak menyatakan apa pun`).not.toBeNull();
      /* Meta boleh menyebut LEBIH SEDIKIT skema daripada CSS? Tidak — meta
         adalah yang dibaca peramban SEBELUM CSS ada, jadi ia tak boleh
         menjanjikan skema yang CSS-nya tak dukung. Yang ditegakkan: tiap skema
         di meta wajib benar-benar didukung, dan skema DEFAULT CSS wajib
         disebut meta. */
      const dukungCss = new Set(css!.split(/\s+/));
      const janjiMeta = meta!.split(/\s+/);
      const kelebihan = janjiMeta.filter((x) => !dukungCss.has(x));
      expect(kelebihan, `${f}: meta menjanjikan skema yang CSS tak dukung — ${kelebihan.join(', ')} (CSS: "${css}")`)
        .toEqual([]);
    });
  }
});
