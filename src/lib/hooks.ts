import { useState, useEffect, useRef } from 'react';

/**
 * Menganimasikan angka menuju `target`.
 * - Mount pertama: menghitung naik dari 0.
 * - Perubahan berikutnya (mis. setelah refresh): menganimasikan dari nilai
 *   sebelumnya, bukan reset ke 0 — terasa halus, bukan menyentak.
 * - Menghormati `prefers-reduced-motion` (langsung ke nilai akhir).
 */
export function useCountUp(target: number, duration = 1000): number {
  const [current, setCurrent] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      fromRef.current = target;
      setCurrent(target);
      return;
    }

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setCurrent(Math.round(from + delta * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}
