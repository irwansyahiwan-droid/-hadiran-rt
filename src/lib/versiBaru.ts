/**
 * Versi baru app MENUNGGU — service worker baru ber-status `waiting`, aktif
 * begitu warga menekan "Muat ulang" (`SKIP_WAITING` → `controllerchange` →
 * reload, lihat `PwaUpdatePrompt`).
 *
 * Kenapa store, bukan kartu sendiri (23 Okt 2026, disetujui user): kabarnya
 * dulu kartu MENGAPUNG di bawah layar — tempat yang sama persis dgn kartu
 * "Pasang Hadiran RT" — sehingga di Safari iPhone kartu Pasang menutupinya
 * sepenuhnya, dan di halaman ber-FAB ia menutup FAB bendahara (Tambah transaksi
 * Kas RT, Setor ke Kas RT). Kini ia strip di `Header`, kembaran strip LURING &
 * BASI: status yang bertahan sampai keadaannya berubah. Pola store mungil
 * sama dgn `basi.ts` — Header duduk di luar pemberi kabarnya.
 */
import { useSyncExternalStore } from 'react';

let menunggu: ServiceWorker | null = null;
const pendengar = new Set<() => void>();

/** Service worker baru sudah terpasang & menunggu. */
export function tandaiVersiBaru(sw: ServiceWorker): void {
  if (menunggu === sw) return;
  menunggu = sw;
  pendengar.forEach((f) => f());
}

/** Aktifkan versi yang menunggu; reload-nya dipicu `controllerchange`. */
export function muatVersiBaru(): void {
  menunggu?.postMessage('SKIP_WAITING');
}

export function useVersiBaru(): boolean {
  return useSyncExternalStore(
    (f) => { pendengar.add(f); return () => pendengar.delete(f); },
    () => menunggu !== null,
    () => false,
  );
}
