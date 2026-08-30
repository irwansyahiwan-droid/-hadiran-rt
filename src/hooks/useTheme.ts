import { useEffect, useState } from 'react';

export function useTheme() {
  // Belum pernah toggle → TERANG, apa pun preferensi OS. Warga yang mampir dari
  // link landing/WA harus selalu melihat tampilan yang sama; gelap hanya bila
  // dipilih sendiri lewat toggle. Logika sama dgn inline script di index.html
  // yang memasang .dark sebelum paint pertama — jaga tetap sinkron.
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hadiran-theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('hadiran-theme', isDark ? 'dark' : 'light');

    // Status bar HP ikut tema aktif (override meta theme-color statis).
    // Light: senada permukaan Header — sejak palet Hutan `.bg-white` bukan lagi
    // putih murni melainkan #F8FCF9, jadi near-putih SEJUK (#FAFBFC) yang lama
    // justru MELAHIRKAN seam yang nilai ini ada untuk mencegah.
    //
    // Ini kembaran skrip pra-React di index.html. Keduanya menyetel meta yang
    // SAMA dan WAJIB dijaga sepasang: memperbaiki satu saja berarti bar status
    // balik ke palet lama begitu warga menekan toggle tema (persis yang terjadi
    // 26 Agu 2026 — index.html diperbaiki, hook ini terlewat).
    const color = isDark ? '#00190B' : '#F8FCF9';
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', color));
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}
