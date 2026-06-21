import { useRef, useState } from 'react';
import { haptic } from '../lib/utils';

const DISMISS = 100;     // jarak tarik (px) ambang tutup
const VELOCITY = 0.5;    // px/ms — flick cepat langsung tutup walau jarak pendek
const DAMP = 0.2;        // resistansi saat menarik ke ATAS (overscroll)

/**
 * Drag-to-dismiss bottom sheet — terasa native (ala iOS/Vaul).
 * Sebar `handlers` pada area yang bisa ditarik (handle/panel) dan `style` pada
 * panel agar mengikuti jari + snap-back saat dilepas.
 *
 * Detail "tak terlihat" yang membuatnya terasa benar (prinsip gesture Emil):
 * - Velocity: flick cepat menutup walau belum lewat ambang jarak.
 * - Multi-touch: jari kedua diabaikan → sheet tak melompat saat ganti jari.
 * - Haptic: getar sekali saat menyeberang ambang (maju) + saat benar tertutup.
 * - Damping: tarik ke atas diberi resistansi, bukan dinding mati.
 */
export function useDragDismiss(onClose: () => void) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const vel = useRef(0);            // kecepatan sesaat (px/ms) dari dua sampel terakhir
  const active = useRef(false);
  const armed = useRef(false);      // sudah lewat ambang → haptic sekali
  const touchId = useRef<number | null>(null);
  const offsetRef = useRef(0);      // baca offset terkini di onTouchEnd tanpa stale closure

  const onTouchStart = (e: React.TouchEvent) => {
    if (active.current) return;     // sudah menyeret → abaikan jari kedua
    const t = e.touches[0];
    touchId.current = t.identifier;
    startY.current = lastY.current = t.clientY;
    lastT.current = performance.now();
    vel.current = 0;
    active.current = true;
    armed.current = false;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!active.current) return;
    // Hanya jari yang memulai seret (abaikan multi-touch).
    const t = Array.from(e.touches).find((x) => x.identifier === touchId.current);
    if (!t) return;

    const now = performance.now();
    const dt = now - lastT.current;
    if (dt > 0) vel.current = (t.clientY - lastY.current) / dt;
    lastY.current = t.clientY;
    lastT.current = now;

    const dy = t.clientY - startY.current;
    const next = dy > 0 ? dy : dy * DAMP; // tarik ke atas → resistansi
    offsetRef.current = next;
    setOffset(next);

    if (next > DISMISS && !armed.current) { armed.current = true; haptic(10); }
    else if (next < DISMISS) armed.current = false;
  };

  const onTouchEnd = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);

    const flick = vel.current > VELOCITY; // bergerak ke bawah dgn cepat
    if (offsetRef.current > DISMISS || (flick && offsetRef.current > 8)) {
      haptic(12);
      onClose();
    }

    armed.current = false;
    offsetRef.current = 0;
    setOffset(0);
  };

  const style: React.CSSProperties = {
    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
    transition: dragging ? 'none' : 'transform 0.32s var(--ease-out-expo)',
  };

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd }, style, dragging };
}
