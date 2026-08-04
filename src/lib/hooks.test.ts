import { describe, it, expect, beforeEach } from 'vitest';
import { heroRingkas, toggleHideAmount } from './hooks';

/**
 * `hooks.ts` sebelumnya tanpa uji sama sekali. Yang diuji di sini SENGAJA hanya
 * bagian yang tak butuh me-render React (repo ini tak memasang testing-library):
 * satu ambang geometri dan satu state global. Sisanya (`useCountUp`,
 * `useExitAnim`, `useTinggiLayar`) butuh render — dibiarkan, dan itu diakui,
 * bukan ditutup dengan uji pura-pura.
 */

describe('heroRingkas — ambang hero ringkas', () => {
  /* Ambang ini dibaca TIGA tempat serempak (kartu hero, skeleton-nya, dan
     cardHeight di BannerCarousel). Kalau salah satu memakai ambang sendiri,
     skeleton & kartu beda tinggi → layar MELONCAT saat data datang. Uji ini
     mengunci batasnya supaya "kira-kira 700" tak pernah jadi 699 di satu tempat
     dan 701 di tempat lain. */
  it('layar < 700px = ringkas, >= 700px = penuh', () => {
    expect(heroRingkas(699)).toBe(true);
    expect(heroRingkas(700)).toBe(false);
  });

  it('HP pendek nyata (iPhone SE 667, Android 640) dapat hero ringkas', () => {
    expect(heroRingkas(667)).toBe(true);
    expect(heroRingkas(640)).toBe(true);
  });

  it('HP normal & tablet tetap hero penuh', () => {
    expect(heroRingkas(740)).toBe(false);
    expect(heroRingkas(844)).toBe(false);
    expect(heroRingkas(1024)).toBe(false);
  });
});

/* Suite ini berjalan di lingkungan NODE (repo tak memasang jsdom), jadi
   `localStorage` tak ada. `hooks.ts` sendiri sudah tahan itu — tulisannya
   dibungkus try/catch — tapi berarti tanpa dudukan ini ujinya cuma menguji
   bahwa penulisan DIAM-DIAM GAGAL, bukan bahwa nilainya bertahan. Dudukan
   in-memory secukupnya: yang diuji perilaku `toggleHideAmount`, bukan
   implementasi peramban. */
const dudukanPenyimpanan = () => {
  const isi = new Map<string, string>();
  return {
    getItem: (k: string) => isi.get(k) ?? null,
    setItem: (k: string, v: string) => void isi.set(k, String(v)),
    removeItem: (k: string) => void isi.delete(k),
    clear: () => isi.clear(),
    key: (i: number) => [...isi.keys()][i] ?? null,
    get length() { return isi.size; },
  } as Storage;
};

describe('toggleHideAmount — sembunyikan nominal bertahan di localStorage', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = dudukanPenyimpanan();
  });

  /* Mode sembunyi-nominal adalah privasi: warga menyalakannya saat membuka app
     di tempat ramai. Kalau ia tak bertahan, nominal muncul lagi sendiri di
     pembukaan berikutnya — persis saat yang ingin dihindari. */
  it('menulis nilainya ke localStorage tiap kali ditoggle', () => {
    const kunci = 'hadiran-hide-amount';
    const awal = localStorage.getItem(kunci);

    toggleHideAmount();
    const sesudah1 = localStorage.getItem(kunci);
    expect(sesudah1).toMatch(/^[01]$/);
    expect(sesudah1).not.toBe(awal);

    toggleHideAmount();
    const sesudah2 = localStorage.getItem(kunci);
    expect(sesudah2).toMatch(/^[01]$/);
    expect(sesudah2).not.toBe(sesudah1); // benar-benar berganti, bukan menulis nilai sama
  });

  it('dua toggle mengembalikan ke keadaan semula', () => {
    const kunci = 'hadiran-hide-amount';
    toggleHideAmount();
    const tengah = localStorage.getItem(kunci);
    toggleHideAmount();
    toggleHideAmount();
    expect(localStorage.getItem(kunci)).toBe(tengah);
  });
});
