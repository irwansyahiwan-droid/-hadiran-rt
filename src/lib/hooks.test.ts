import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { heroRingkas, toggleHideAmount, buatAksiBerat } from './hooks';
import { subscribeToast } from './toast';

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
    expect(heroRingkas(740, 390)).toBe(false);
    expect(heroRingkas(844, 390)).toBe(false);
    expect(heroRingkas(1024, 768)).toBe(false);
  });

  /* ── Sumbu LEBAR (24 Agu 2026) ────────────────────────────────────────
     Ditambahkan sesudah `audit:lebar` diperluas ke 320px dan menemukan kaki
     stat 3 kolom saling bersentuhan di sana. Kekurangan ruang bisa datang
     dari sumbu mana pun; ambang tinggi saja membiarkan layar SEMPIT-tapi-
     TINGGI lolos, dan justru itu skenario reflow 400% zoom §1.4.10. */
  it('layar < 360px = ringkas walau TINGGInya cukup', () => {
    expect(heroRingkas(800, 359)).toBe(true);
    expect(heroRingkas(800, 320)).toBe(true);
    expect(heroRingkas(800, 360)).toBe(false);
  });

  it('360px — acuan terkecil app — tetap dapat kaki stat', () => {
    expect(heroRingkas(844, 360)).toBe(false);
    expect(heroRingkas(740, 390)).toBe(false);
  });

  it('dua sumbu independen: cukup SATU yang kurang', () => {
    expect(heroRingkas(640, 390)).toBe(true);   // pendek saja
    expect(heroRingkas(800, 320)).toBe(true);   // sempit saja
    expect(heroRingkas(640, 320)).toBe(true);   // dua-duanya
    expect(heroRingkas(800, 390)).toBe(false);  // dua-duanya cukup
  });

  /* `vw` opsional supaya pemanggil lama tetap sah — TAPI defaultnya wajib
     Infinity (bukan 0), kalau tidak setiap panggilan satu-argumen jadi
     "ringkas" dan kaki stat lenyap di SEMUA layar. */
  it('tanpa argumen lebar, hanya sumbu tinggi yang menentukan', () => {
    expect(heroRingkas(800)).toBe(false);
    expect(heroRingkas(640)).toBe(true);
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

/* ── Aksi berat (ekspor / cetak / bagikan) ────────────────────────
 * Yang diuji di sini INTINYA (`buatAksiBerat`), bukan hook React-nya — sengaja,
 * karena repo ini tak memasang testing-library dan menaruh logika ini di dalam
 * `useState` berarti ia cuma bisa diuji lewat browser. Semua sifat yang benar-
 * benar dipegang oleh warga ada di inti ini:
 *   - satu ketukan = satu berkas (bahkan saat ketukan kedua datang di TASK yang
 *     sama, sebelum React sempat me-render `disabled`);
 *   - keadaan sibuk tak berkedip untuk jalur cepat;
 *   - kegagalan chunk berakhir sebagai toast, bukan layar diam;
 *   - tombol tak pernah terkunci selamanya.
 */
describe('buatAksiBerat — penjaga aksi berat', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const rekamToast = () => {
    const keluar: string[] = [];
    const stop = subscribeToast((t) => keluar.push(`${t.type}:${t.message}`));
    return { keluar, stop };
  };

  it('dua ketukan di TASK yang sama cuma menjalankan aksi SEKALI', async () => {
    let jalan = 0;
    const inti = buatAksiBerat(() => {});
    // Persis bentuk ghost-click: dua panggilan berurutan tanpa await di antaranya.
    const a = inti.jalankan(async () => { jalan++; await new Promise((r) => setTimeout(r, 100)); });
    const b = inti.jalankan(async () => { jalan++; });
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all([a, b]);
    expect(jalan).toBe(1);
  });

  it('sesudah selesai, ketukan berikutnya diterima lagi', async () => {
    let jalan = 0;
    const inti = buatAksiBerat(() => {});
    await inti.jalankan(() => { jalan++; });
    await inti.jalankan(() => { jalan++; });
    expect(jalan).toBe(2);
    expect(inti.sedangSibuk()).toBe(false);
  });

  it('jalur CEPAT (~180ms, chunk sudah ter-cache) tak menyalakan sibuk sama sekali', async () => {
    /* 180ms bukan angka karangan: itu yang terukur untuk "Cetak PDF" Kas RT saat
       chunk-nya sudah ada (`audit:respon` bagian D). Pemintal yang menyala
       selama 180ms terbaca sebagai KEDIPAN, bukan sebagai kerja — dan kedipan
       itulah yang bikin app terasa murah, bukan menunggunya. */
    const jejak: boolean[] = [];
    const inti = buatAksiBerat((v) => jejak.push(v));
    const p = inti.jalankan(async () => { await new Promise((r) => setTimeout(r, 180)); });
    await vi.advanceTimersByTimeAsync(400);
    await p;
    expect(jejak).toEqual([]);
  });

  it('jalur LAMBAT menyalakan sibuk, dan menahannya cukup lama untuk terbaca', async () => {
    const jejak: boolean[] = [];
    const inti = buatAksiBerat((v) => jejak.push(v));
    const p = inti.jalankan(async () => { await new Promise((r) => setTimeout(r, 300)); });
    await vi.advanceTimersByTimeAsync(260);
    expect(jejak).toEqual([true]);          // 250ms: baru mengaku sibuk
    await vi.advanceTimersByTimeAsync(60);  // aksi selesai di 300ms…
    expect(jejak).toEqual([true]);          // …tapi sibuk BELUM dilepas (min 400ms)
    await vi.advanceTimersByTimeAsync(400);
    await p;
    expect(jejak).toEqual([true, false]);
  });

  it('aksi yang GAGAL (chunk basi → galat MIME) jadi toast, bukan layar diam', async () => {
    const { keluar, stop } = rekamToast();
    const inti = buatAksiBerat(() => {});
    await inti.jalankan(() => { throw new Error('Failed to fetch dynamically imported module'); },
      { gagal: 'Gagal membuat PDF.' });
    stop();
    expect(keluar).toEqual(['error:Gagal membuat PDF.']);
    expect(inti.sedangSibuk()).toBe(false);   // gagal pun tak boleh mengunci tombol
  });

  it('memberi KATA (toast) hanya kalau tunggunya panjang', async () => {
    const { keluar, stop } = rekamToast();
    const inti = buatAksiBerat(() => {});
    const p = inti.jalankan(async () => { await new Promise((r) => setTimeout(r, 2000)); },
      { mulai: 'Menyiapkan Excel…' });
    await vi.advanceTimersByTimeAsync(900);
    expect(keluar).toEqual([]);               // 900ms: cukup ikon, jangan berisik
    await vi.advanceTimersByTimeAsync(400);
    expect(keluar).toEqual(['info:Menyiapkan Excel…']);
    await vi.advanceTimersByTimeAsync(2000);
    await p;
    stop();
  });

  it('janji yang TAK PERNAH selesai tetap melepas tombolnya', async () => {
    const { keluar, stop } = rekamToast();
    const inti = buatAksiBerat(() => {}, 1000);
    inti.jalankan(() => new Promise(() => { /* menggantung selamanya */ }));
    await vi.advanceTimersByTimeAsync(1100);
    stop();
    expect(inti.sedangSibuk()).toBe(false);
    expect(keluar.some((t) => t.startsWith('error:Jaringan lambat'))).toBe(true);
  });
});
