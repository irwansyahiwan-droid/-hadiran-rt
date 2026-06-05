import { useRef } from 'react';

/**
 * Deteksi swipe horizontal pada area konten → ganti tab.
 * - onLeft  : geser jari ke KIRI  = tab berikutnya
 * - onRight : geser jari ke KANAN = tab sebelumnya
 *
 * Mengabaikan gerak vertikal (scroll / pull-to-refresh) dan multi-touch,
 * serta butuh jarak & kecepatan minimum agar tidak salah picu saat tap.
 */
export function useSwipeNavigate(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length !== 1) { start.current = null; return; }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Date.now() - s.t > 600) return;       // terlalu lambat = bukan swipe
      if (Math.abs(dx) < 64) return;            // jarak minimum
      if (Math.abs(dx) < Math.abs(dy) * 1.8) return; // harus dominan horizontal
      if (dx < 0) onLeft(); else onRight();
    },
  };
}
