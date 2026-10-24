import { WifiOff } from 'lucide-react';
import { useOnline } from '../../hooks/useOnline';

/**
 * Strip LURING — hanya ada saat perangkat benar-benar terputus, jadi nol biaya
 * ruang ketika online. Kenapa perlu: app ini merender dari snapshot (pola SWR
 * pageCache), sehingga tanpa sinyal layar tetap menampilkan nominal LAMA yang
 * terlihat persis seperti data terkini — terukur 31 Jul: Rp4.485.000 tampil
 * sama saja offline maupun online, tanpa satu pun tanda. Untuk app kas, angka
 * yang mungkin basi wajib mengaku. Tidak bisa ditutup: begitu sinyal kembali,
 * strip ini hilang sendiri.
 *
 * SATU komponen untuk `Header` DAN `OverlayHeader` (24 Okt 2026, disetujui
 * user). Overlay menutup layar penuh — termasuk Header tempat strip ini dulu
 * satu-satunya tinggal — jadi Riwayat Aktivitas yang terbuka saat sinyal hilang
 * memajang 94 nominal tanpa satu pun tanda (terukur). Di dalam overlay ia juga
 * `role="status"`: dialog `aria-modal`, jadi strip di luar dialog tak dijamin
 * terdengar.
 */
export default function StripLuring() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="border-t border-amber-200/70 bg-amber-50 px-5 py-2 dark:border-amber-800/40 dark:bg-amber-900/25"
    >
      <p className="mx-auto flex max-w-lg items-center justify-center gap-2 text-center text-balance text-micro font-semibold text-warn dark:text-amber-300">
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Tanpa sinyal — angka yang tampil salinan terakhir
      </p>
    </div>
  );
}
