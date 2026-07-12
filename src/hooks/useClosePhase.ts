import { useRef, useState } from 'react';

/**
 * Fase keluar dua-langkah untuk elemen ber-animasi exit yang unmount-nya
 * dipegang parent: `requestClose()` menyalakan `closing` (call-site menukar
 * kelas ke animasi keluar), lalu `onClose` dipanggil setelah `ms` — unmount
 * terjadi SETELAH animasi selesai, bukan pop seketika.
 *
 * Pasangan useDragDismiss.dismiss() untuk elemen TANPA luncuran drag:
 * modal tengah (.pop → .pop-out), sub-page full-screen (.page-in-right →
 * .page-out-right), popover (.pop-menu → .pop-menu-out). Samakan `ms` dgn
 * durasi animasi keluarnya.
 *
 * Idempoten (panggilan kedua saat closing diabaikan) & hormati
 * prefers-reduced-motion (transisi global 0.001ms → tutup langsung tanpa delay).
 */
export function useClosePhase(onClose: () => void, ms: number) {
  const [closing, setClosing] = useState(false);
  const pending = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  function requestClose() {
    if (pending.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCloseRef.current();
      return;
    }
    pending.current = true;
    setClosing(true);
    window.setTimeout(() => {
      onCloseRef.current();
      // Reset SETELAH unmount → siap dipakai lagi saat elemen dibuka ulang.
      pending.current = false;
      setClosing(false);
    }, ms);
  }

  return { closing, requestClose };
}
