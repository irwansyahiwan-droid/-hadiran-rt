// Toast terpusat — pub-sub ringan tanpa Context plumbing.
// Pakai: showToast('Tersimpan') / showToast('Gagal', 'error').

export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;          // ms tampil (default 2600)
  actionLabel?: string;       // mis. "Urungkan"
  onAction?: () => void;      // dipanggil saat tombol aksi diklik
  onExpire?: () => void;      // dipanggil saat toast habis waktu tanpa aksi
}

type Listener = (t: ToastItem) => void;

let listeners: Listener[] = [];
let counter = 0;

export function showToast(message: string, type: ToastType = 'success'): void {
  const item: ToastItem = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}

/**
 * Toast "Urungkan" — menunda eksekusi `onCommit` selama `duration` ms (default 5 dtk).
 * Tekan Urungkan sebelum waktu habis → batal & jalankan `onUndo`. Jika tidak → `onCommit`.
 * Pola hapus aman ala Gmail (mencegah salah hapus permanen).
 */
export function showUndo(
  message: string,
  onCommit: () => void,
  opts: { onUndo?: () => void; duration?: number } = {},
): void {
  let done = false;
  const guard = (fn?: () => void) => { if (!done) { done = true; fn?.(); } };
  const item: ToastItem = {
    id: ++counter,
    message,
    type: 'info',
    duration: opts.duration ?? 5000,
    actionLabel: 'Urungkan',
    onAction: () => guard(opts.onUndo),
    onExpire: () => guard(onCommit),
  };
  listeners.forEach((l) => l(item));
}

export function subscribeToast(l: Listener): () => void {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}
