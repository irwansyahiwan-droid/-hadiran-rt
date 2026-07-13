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
    // Light: near-putih agar SEAMLESS dgn Header (bg-white/95 ≈ #FDFDFE) —
    // hilangkan seam abu di pucuk layar. Header selalu sticky di atas, jadi
    // tak ada momen hero hijau menyentuh status bar.
    const color = isDark ? '#030712' : '#FAFBFC';
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', color));
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}
