// Toast terpusat — pub-sub ringan tanpa Context plumbing.
// Pakai: showToast('Tersimpan') / showToast('Gagal', 'error').

export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;          // ms tampil MINIMUM — dipanjangkan kalau pesannya butuh (lihat `durasiTampil`)
  actionLabel?: string;       // mis. "Urungkan"
  onAction?: () => void;      // dipanggil saat tombol aksi diklik
  onExpire?: () => void;      // dipanggil saat toast habis waktu tanpa aksi
}

/* ── Berapa lama toast hidup ───────────────────────────────────────────────
   Dulu SEMUA toast 2,6 dtk. Aturan kata app (akibat · jalan keluar · sebut
   bendanya) membuat galat memanjang sampai 15 kata, durasinya tidak ikut —
   19 dari 38 pesan tak sempat terbaca pada 200 kata/menit, dan yang hilang
   justru ujungnya: jalan keluarnya ("Muat ulang lalu coba lagi").
   Waktu baca = 500 ms untuk melihat toast muncul + 300 ms/kata (200 kpm, laju
   orang dewasa rata-rata — warga lansia lebih lambat, karena itu toast juga
   BERHENTI selama dipegang, lihat Toaster). Galat punya lantai lebih tinggi:
   ia yang membawa jalan keluar. Waktu baca dipagari 10 dtk supaya pesan yang
   kebablasan panjang tak menutupi Header terlalu lama; `duration` eksplisit
   (mis. jendela Urungkan) tetap dihormati sbg MINIMUM. Dijaga `toast.test.ts`
   & `audit:toast` bagian T4. */
export const DURASI_DASAR_MS = 2600;
export const DURASI_GALAT_MS = 4000;
export const DURASI_BACA_MAKS_MS = 10_000;

export function jumlahKata(teks: string): number {
  return teks.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function durasiTampil(t: Pick<ToastItem, 'message' | 'type' | 'duration' | 'actionLabel'>): number {
  const lantai = t.duration ?? (t.type === 'error' ? DURASI_GALAT_MS : DURASI_DASAR_MS);
  const baca = 500 + (jumlahKata(t.message) + jumlahKata(t.actionLabel ?? '')) * 300;
  return Math.max(lantai, Math.min(baca, DURASI_BACA_MAKS_MS));
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

/* ── Pengumuman TANPA toast ────────────────────────────────────────────────
   Untuk perubahan yang sudah TERLIHAT di layar tapi tak punya peristiwa yang
   dibacakan pembaca layar. Kasusnya (14 Sep 2026): Enter di kolom kosong yang
   SUDAH difokus memunculkan galat inline, dan karena fokusnya tak berpindah,
   TalkBack tak membacakan apa pun. Toast terlihat di sana akan jadi pesan kedua
   yang dobel dgn galat di bawah kolom — yang dibutuhkan cuma suaranya.
   Diteruskan ke region live PERMANEN milik Toaster (lihat catatan di sana). */
type PendengarUmum = (pesan: string, penting: boolean) => void;
let pendengarUmum: PendengarUmum[] = [];

export function umumkanSaja(pesan: string, penting = false): void {
  pendengarUmum.forEach((l) => l(pesan, penting));
}

export function subscribeUmum(l: PendengarUmum): () => void {
  pendengarUmum.push(l);
  return () => {
    pendengarUmum = pendengarUmum.filter((x) => x !== l);
  };
}

export function subscribeToast(l: Listener): () => void {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}
