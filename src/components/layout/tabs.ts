import { Home, CalendarDays, ArrowLeftRight, Wallet, Building2, type LucideIcon } from 'lucide-react';

/**
 * Daftar tab bawah — SATU sumber untuk seluruh app.
 *
 * Dulu tinggal di dalam `BottomNav.tsx` bersama komponennya. Dipisah ke berkas
 * sendiri karena dua alasan yang saling menguatkan:
 *
 *  1. Fast Refresh mati kalau satu berkas mengekspor komponen DAN nilai lain
 *     (`react-refresh/only-export-components`). Selama `labelTab` ikut
 *     diekspor dari sana, tiap ubahan kecil di nav memicu reload penuh —
 *     persis file yang paling sering disetel saat menggarap nav.
 *  2. `TAB_ORDER` di App.tsx dulu MENYALIN daftar ini apa adanya, padahal
 *     komentar di BottomNav sendiri melarangnya ("jangan salin daftar ke
 *     tempat lain"). Sekarang urutannya diturunkan dari sini, jadi menambah
 *     atau menggeser tab cukup di satu tempat — bukan dua yang bisa berbeda
 *     diam-diam lalu bikin arah animasi geser tab salah.
 *
 * Label di sini dipakai bar nav DAN judul dokumen (`document.title`).
 */

export type TabName = 'beranda' | 'jadwal' | 'talangan' | 'kas' | 'kas-rt';

/** Tab "kas" sengaja berlabel "Hadiran" (kas arisan) — `id` tetap `'kas'`
 *  supaya rute/navigasi lama tak berubah. Lihat memory nav-fab-ux-2026. */
export const tabs: { id: TabName; label: string; icon: LucideIcon }[] = [
  { id: 'beranda',  label: 'Beranda',  icon: Home },
  { id: 'jadwal',   label: 'Jadwal',   icon: CalendarDays },
  { id: 'talangan', label: 'Talangan', icon: ArrowLeftRight },
  { id: 'kas',      label: 'Hadiran',  icon: Wallet },
  { id: 'kas-rt',   label: 'Kas RT',   icon: Building2 },
];

/** Urutan tab kiri→kanan. Dipakai untuk arah animasi geser & navigasi swipe. */
export const urutanTab: TabName[] = tabs.map((t) => t.id);

/** Warga tak punya tab Talangan — diaksesnya lewat tombol "Lihat" di Beranda.
 *  Satu tempat, dipakai bar nav maupun swipe, supaya keduanya tak pernah beda. */
export const tabTerlihat = (isWargaMode: boolean) =>
  isWargaMode ? tabs.filter((t) => t.id !== 'talangan') : tabs;

export const labelTab = (id: TabName) => tabs.find((t) => t.id === id)?.label ?? '';
