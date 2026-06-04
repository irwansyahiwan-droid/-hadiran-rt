import { useRef, useState } from 'react';

const DISMISS = 100; // jarak tarik (px) untuk menutup sheet

/**
 * Drag-to-dismiss untuk bottom sheet.
 * Sebar `handlers` pada area yang bisa ditarik (panel/handle),
 * dan `style` pada panel agar mengikuti jari + snap-back saat dilepas.
 */
export function useDragDismiss(onClose: () => void) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    active.current = true;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!active.current) return;
    const dy = e.touches[0].clientY - startY.current;
    setOffset(dy > 0 ? dy : dy * 0.2); // tarik ke atas diberi resistansi
  };
  const onTouchEnd = () => {
    active.current = false;
    setDragging(false);
    if (offset > DISMISS) {
      onClose();
    }
    setOffset(0);
  };

  const style: React.CSSProperties = {
    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
    transition: dragging ? 'none' : 'transform 0.32s var(--ease-out-expo)',
  };

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd }, style, dragging };
}
