import { useEffect, useRef } from 'react';

interface Options {
  /** Dipanggil saat user menekan Escape (pelengkap useBackDismiss utk tombol Back HP). */
  onClose: () => void;
  /** Nama aksesibel dialog — dibacakan screen reader saat panel menerima fokus. */
  label: string;
  /** Default true. Set false bila Escape tak boleh menutup (mis. proses berjalan). */
  closeOnEsc?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ── Kunci scroll latar saat dialog terbuka ───────────────────────────────
   Tanpa ini, halaman di belakang ikut tergeser saat jari menyapu backdrop /
   sheet (makin terasa setelah sheet form sendiri bisa di-scroll: mencapai
   batas scroll-nya "merembet" menggeser halaman). Counter modul → beberapa
   dialog bertumpuk (mis. sheet membuka konfirmasi) tak saling buka-kunci.
   Sengaja overflow:hidden (BUKAN position:fixed) → tak melompatkan scroll &
   tak bentrok dgn restorasi scroll antar-tab (App) maupun .app-bg fixed.
   Full-screen overlay (yg punya overflow-y-auto sendiri) tetap bisa scroll
   internal — mengunci body tak memengaruhinya. */
let lockCount = 0;
let prevBodyOverflow = '';
let prevHtmlOverflow = '';
function lockScroll() {
  if (lockCount === 0) {
    prevBodyOverflow = document.body.style.overflow;
    prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  lockCount += 1;
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = prevBodyOverflow;
    document.documentElement.style.overflow = prevHtmlOverflow;
  }
}

/**
 * A11y untuk bottom-sheet / modal. Lengkapi semantik dialog + kelola fokus —
 * hal yang membedakan "kelihatan premium" dengan "betul-betul siap assistive tech":
 *
 * 1. Set `role="dialog" aria-modal="true"` + nama aksesibel (via `panelProps`).
 * 2. Pindahkan fokus ke panel saat buka → screen reader mengumumkan dialog.
 * 3. Perangkap Tab di dalam panel (fokus tak bocor ke konten di belakang backdrop).
 * 4. Tutup saat Escape (keyboard desktop).
 * 5. Kembalikan fokus ke elemen pemicu saat panel ditutup.
 *
 * useBackDismiss (tombol Back Android/browser) tetap dipakai berdampingan;
 * keduanya saling melengkapi, bukan menggantikan.
 *
 * Pakai: `const dlg = useDialog(open, { onClose, label: 'Detail transaksi' });`
 * lalu di elemen panel: `<div ref={dlg.panelRef} {...dlg.panelProps}>`.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  { onClose, label, closeOnEsc = true }: Options,
) {
  const panelRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;

    // Kunci scroll latar selama dialog hidup (lihat catatan di atas).
    lockScroll();

    // Fokus awal ke panel (tabindex -1) → dialog diumumkan sebelum isinya.
    panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const aktif = document.activeElement;
      if (e.shiftKey && (aktif === first || aktif === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && aktif === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      unlockScroll();
      // Kembalikan fokus ke pemicu (best-effort — elemen mungkin sudah unmount).
      prevFocus?.focus?.();
    };
  }, [active, closeOnEsc]);

  return {
    panelRef,
    panelProps: {
      role: 'dialog' as const,
      'aria-modal': true,
      'aria-label': label,
      tabIndex: -1,
    },
  };
}
