import { useRef, useState } from 'react';
import { haptic } from '../lib/utils';

const DISMISS = 100;     // jarak tarik (px) ambang tutup
const VELOCITY = 0.5;    // px/ms — flick cepat langsung tutup walau jarak pendek
const DAMP = 0.2;        // resistansi saat menarik ke ATAS (overscroll)
const EXIT_MS = 300;     // ≈ transisi transform 0.32s — unmount SETELAH panel selesai meluncur

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
 * - Exit MELUNCUR: dismiss tidak unmount seketika — panel meneruskan gerak
 *   turun dari posisi jari (transition retarget, interruptible) baru onClose.
 *   `dismiss()` diekspos agar tombol/backdrop/Escape memakai luncuran yang
 *   sama; `dismissing` untuk fade backdrop di call-site (.sheet-backdrop-out).
 */
export function useDragDismiss(onClose: () => void) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const dismissingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const vel = useRef(0);            // kecepatan sesaat (px/ms) dari dua sampel terakhir
  const active = useRef(false);
  const armed = useRef(false);      // sudah lewat ambang → haptic sekali
  const touchId = useRef<number | null>(null);
  const offsetRef = useRef(0);      // baca offset terkini di onTouchEnd tanpa stale closure

  /* Luncurkan panel keluar layar dari POSISI SEKARANG (offset drag ikut
     terbawa — transisi transform retarget, bukan keyframe yang restart dari 0),
     lalu onClose setelah luncuran selesai. Idempoten: panggilan kedua diabaikan. */
  const dismiss = () => {
    if (dismissingRef.current) return;
    // Reduced-motion: transisi global sudah 0.001ms → tutup langsung tanpa delay.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCloseRef.current();
      return;
    }
    dismissingRef.current = true;
    setDismissing(true);
    offsetRef.current = window.innerHeight;
    setOffset(window.innerHeight);
    window.setTimeout(() => {
      onCloseRef.current();
      // Reset SETELAH unmount → hook (hidup di level halaman) siap utk buka berikutnya.
      dismissingRef.current = false;
      setDismissing(false);
      offsetRef.current = 0;
      setOffset(0);
    }, EXIT_MS);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (active.current || dismissingRef.current) return; // sudah menyeret / sedang keluar → abaikan
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
    armed.current = false;

    const flick = vel.current > VELOCITY; // bergerak ke bawah dgn cepat
    if (offsetRef.current > DISMISS || (flick && offsetRef.current > 8)) {
      haptic(12);
      dismiss();                    // meneruskan luncuran dari posisi jari
      return;
    }

    offsetRef.current = 0;
    setOffset(0);                   // snap-back (transisi menyala lagi di bawah)
  };

  const style: React.CSSProperties = {
    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
    transition: dragging ? 'none' : 'transform 0.32s var(--ease-out-expo)',
    // Saat meluncur keluar: panel "mati rasa" — tap susulan tak nyangkut.
    pointerEvents: dismissing ? 'none' : undefined,
  };

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd }, style, dragging, dismissing, dismiss };
}
