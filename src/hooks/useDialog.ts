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
