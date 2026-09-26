import { useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export function useTheme() {
  // Belum pernah toggle → TERANG, apa pun preferensi OS. Warga yang mampir dari
  // link landing/WA harus selalu melihat tampilan yang sama; gelap hanya bila
  // dipilih sendiri lewat toggle. Logika sama dgn inline script di index.html
  // yang memasang .dark sebelum paint pertama — jaga tetap sinkron.
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hadiran-theme') === 'dark';
  });

  /* `useLayoutEffect`, bukan `useEffect`: kelas `.dark` WAJIB terpasang di
     commit yang SAMA dgn perubahan state, supaya `startViewTransition` di
     `toggle` memotret keadaan baru — efek pasif bisa jatuh sesudah potretnya.

     `tema-berganti` mematikan SEMUA transisi CSS selama satu frame. Tanpa itu
     tema tak berganti serentak: terukur 26 Sep 2026, 311 dari 321 elemen
     langsung berganti tapi Header memudar 0,3 dtk & label bar nav 0,16 dtk —
     pita putih yang tertinggal di atas halaman yang sudah gelap. */
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('tema-berganti');
    root.classList.toggle('dark', isDark);
    void root.offsetHeight; // paksa gaya baru dihitung SELAGI transisi mati
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('tema-berganti')));
    localStorage.setItem('hadiran-theme', isDark ? 'dark' : 'light');

    // Status bar HP ikut tema aktif (override meta theme-color statis).
    // Light: senada permukaan Header. Nilainya IKUT `.bg-white`, dan sejak
    // 30 Agu 2026 kartu kembali putih murni (#FFFFFF) — lihat blok "MAZHAB
    // TONAL" di index.css. Near-putih SEJUK (#FAFBFC) yang lama justru
    // MELAHIRKAN seam yang nilai ini ada untuk mencegah, jadi ia mengikuti
    // kartu, bukan berdiri sendiri.
    //
    // Ini kembaran skrip pra-React di index.html. Keduanya menyetel meta yang
    // SAMA dan WAJIB dijaga sepasang: memperbaiki satu saja berarti bar status
    // balik ke palet lama begitu warga menekan toggle tema (persis yang terjadi
    // 26 Agu 2026 — index.html diperbaiki, hook ini terlewat).
    const color = isDark ? '#001709' : '#FFFFFF';
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', color));
  }, [isDark]);

  /* Pudar-silang satu halaman (View Transitions) di peramban yang punya —
     Chrome/Android & Safari 18. Tanpa itu, atau bila pengguna minta kurangi
     gerak, tema tetap berganti serentak (lihat `tema-berganti`). */
  const toggle = () => {
    const ganti = () => flushSync(() => setIsDark(d => !d));
    const diam = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!diam && typeof document.startViewTransition === 'function') document.startViewTransition(ganti);
    else ganti();
  };

  return { isDark, toggle };
}
