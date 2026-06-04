// Toast terpusat — pub-sub ringan tanpa Context plumbing.
// Pakai: showToast('Tersimpan') / showToast('Gagal', 'error').

export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (t: ToastItem) => void;

let listeners: Listener[] = [];
let counter = 0;

export function showToast(message: string, type: ToastType = 'success'): void {
  const item: ToastItem = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}

export function subscribeToast(l: Listener): () => void {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}
