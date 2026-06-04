import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('hadiran-theme') === 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('hadiran-theme', isDark ? 'dark' : 'light');

    // Status bar HP ikut tema aktif (override meta theme-color statis).
    const color = isDark ? '#030712' : '#E8ECF2';
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', color));
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}
