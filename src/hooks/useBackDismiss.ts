import { useEffect, useRef } from 'react';

/**
 * Integrasi tombol "Back" HP / browser dengan lapisan yang bisa ditutup
 * (overlay, bottom sheet, modal, tab non-Beranda). Tanpa ini, menekan Back
 * akan KELUAR dari aplikasi alih-alih menutup panel — terasa tidak native.
 *
 * Cara kerja: tiap lapisan aktif mendorong satu entri history. Tombol Back
 * memunculkan `popstate` → kita tutup lapisan TERATAS saja (back-stack
 * terpusat agar tidak saling tabrak saat bertumpuk). Menutup lewat tombol di
 * UI memanggil `history.back()` sendiri agar history tetap sinkron.
 */

interface Layer { id: number; close: () => void }

const stack: Layer[] = [];
let seq = 0;
let inited = false;
let ignorePop = false;

function init() {
  if (inited || typeof window === 'undefined') return;
  inited = true;
  window.addEventListener('popstate', () => {
    if (ignorePop) { ignorePop = false; return; }
    const top = stack.pop();
    if (top) top.close();
  });
}

function registerBack(close: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  init();
  const id = ++seq;
  stack.push({ id, close });
  window.history.pushState({ backId: id }, '');
  return () => {
    const i = stack.findIndex((e) => e.id === id);
    if (i === -1) return;          // sudah ditutup via tombol Back HP
    stack.splice(i, 1);
    ignorePop = true;              // jangan jalankan close lagi saat kita pop sendiri
    window.history.back();
  };
}

/**
 * @param active true saat lapisan terbuka.
 * @param onClose dipanggil saat user menekan Back (atau saat ditutup programatik).
 */
export function useBackDismiss(active: boolean, onClose: () => void): void {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!active) return;
    return registerBack(() => ref.current());
  }, [active]);
}
