import { urutanTab, type TabName } from '../components/layout/tabs';

/**
 * Tautan per tab — `hadiran-rt.vercel.app/jadwal` membuka tab Jadwal
 * (14 Sep 2026, keputusan user: path pendek, bukan `?tab=`).
 *
 * Kenapa ada: tautan yang dibagikan bendahara ke grup WA dulu SELALU mendarat
 * di Beranda — warga yang disuruh "cek jadwal" harus mencari tab-nya sendiri.
 *
 * Slug `kas` → `hadiran` karena label tab-nya "Hadiran"; `id` internal tetap
 * `'kas'` (lihat tabs.ts). Slug adalah JANJI PUBLIK: begitu tautan tersebar di
 * chat, mengganti nama slug mematahkan setiap pesan lama — jangan diubah.
 * `/info`, `/warta`, `/nobar` milik halaman publik (vercel.json) dan tak boleh
 * dipakai sbg slug.
 */
export const SLUG_TAB: Record<TabName, string> = {
  beranda: '',
  jadwal: 'jadwal',
  talangan: 'talangan',
  kas: 'hadiran',
  'kas-rt': 'kas-rt',
};

export function pathTab(tab: TabName): string {
  return `/${SLUG_TAB[tab]}`;
}

/** `null` = path bukan milik tab mana pun (pemanggil jatuh ke Beranda). */
export function tabDariPath(pathname: string): TabName | null {
  const p = pathname.toLowerCase().replace(/\/+$/, '');
  if (p === '' || p === '/index.html') return 'beranda';
  const slug = p.replace(/^\//, '');
  return urutanTab.find((t) => SLUG_TAB[t] === slug && slug !== '') ?? null;
}

/**
 * Klik pada `<a href="/jadwal">` milik app (15 Sep 2026).
 *
 * Navigasi di KONTEN (Lihat semua, banner talangan, kaki hero, CTA carousel)
 * kini tautan sungguhan, bukan `<button onClick>` — supaya tekan-lama di Android
 * menawarkan "Salin alamat link" / "Buka di tab baru" dan bendahara bisa
 * Ctrl/⌘-klik ke tab peramban baru. Klik BIASA tetap pindah tab di tempat
 * (tanpa memuat ulang app); klik bermodifier dibiarkan ke peramban. Klik
 * TENGAH memicu `auxclick`, bukan `click`, jadi ia tak pernah sampai ke sini.
 */
export function klikTautanSpa(
  e: { defaultPrevented: boolean; button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; preventDefault: () => void },
  pindah: () => void,
): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  pindah();
}
