import { useEffect, useState } from 'react';

export function useTheme() {
  // Belum pernah toggle → ikut preferensi OS (logika sama dgn inline script
  // di index.html yang memasang .dark sebelum paint pertama — jaga tetap sinkron).
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('hadiran-theme');
    if (stored !== null) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('hadiran-theme', isDark ? 'dark' : 'light');

    // Status bar HP ikut tema aktif (override meta theme-color statis).
    // Light: near-putih agar SEAMLESS dgn Header (bg-white/95 ≈ #FDFDFE) —
    // hilangkan seam abu di pucuk layar. Header selalu sticky di atas, jadi
    // tak ada momen hero hijau menyentuh status bar.
    const color = isDark ? '#0A0E1A' : '#FAFBFC'; // dark = kanvas Pass 9 (was #030712)
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', color));
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}
