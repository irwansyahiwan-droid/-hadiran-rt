import { Home, CalendarDays, ArrowLeftRight, Wallet, Building2, type LucideIcon } from 'lucide-react';
import { haptic } from '../../lib/utils';
import { useScrollHide } from '../../hooks/useScrollDirection';

export type TabName = 'beranda' | 'jadwal' | 'talangan' | 'kas' | 'kas-rt';

interface BottomNavProps {
  active: TabName;
  onChange: (tab: TabName) => void;
  isWargaMode?: boolean;
}

const tabs: { id: TabName; label: string; icon: LucideIcon }[] = [
  { id: 'beranda',  label: 'Beranda',  icon: Home },
  { id: 'jadwal',   label: 'Jadwal',   icon: CalendarDays },
  { id: 'talangan', label: 'Talangan', icon: ArrowLeftRight },
  { id: 'kas',      label: 'Hadiran',  icon: Wallet },
  { id: 'kas-rt',   label: 'Kas RT',   icon: Building2 },
];

/** Label tab = SATU sumber, dipakai bar nav DAN judul dokumen (App.tsx).
 *  Jangan salin daftar di atas ke tempat lain. */
export const labelTab = (id: TabName) => tabs.find((t) => t.id === id)?.label ?? '';

export default function BottomNav({ active, onChange, isWargaMode }: BottomNavProps) {
  // Warga tidak punya tab Talangan — diakses lewat tombol "Lihat" di Beranda
  const visibleTabs = isWargaMode ? tabs.filter(t => t.id !== 'talangan') : tabs;

  // Auto-hide: scroll turun (masuk ke konten) → nav menyelinap turun keluar layar;
  // scroll naik → muncul lagi. Beri ruang baca list yg panjang. Dekat puncak (y<80)
  // selalu tampil. Listener scroll dibagi pakai (lihat hook).
  const tucked = useScrollHide({ threshold: 80 });

  return (
    <nav
      // Kapsul MELAYANG (3 Agu 2026, permintaan user — ala GitHub Mobile).
      // Menggantikan bar dok penuh-nempel-bawah (2 Jul, ala Google/myBCA/BYOND).
      // Safe-area kini jadi jarak DI BAWAH kapsul (bukan padding di dalam bar),
      // supaya kapsul betul-betul mengambang di atas home indicator.
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        // Geser 100% + buffer 8px (sisa hairline/bayangan atas) → nav bersih
        // total keluar layar; safe-area sudah ikut karena bagian dari tinggi bar.
        // Opacity fade = jaring pengaman andai ada sisa posisi sepiksel.
        // translate3d (bukan translateY) + backface-hidden + will-change →
        // PAKSA layer GPU stabil. Tanpa ini, iOS Safari kadang tak mempromosikan
        // elemen fixed ke compositor, lalu nav "melompat ke atas-tengah"
        // saat scroll (address-bar muncul/sembunyi me-relayout containing block).
        transform: tucked
          ? 'translate3d(0, calc(100% + 8px), 0)'
          : 'translate3d(0, 0, 0)',
        opacity: tucked ? 0 : 1,
        transition: 'transform 0.32s var(--ease-out-expo), opacity 0.26s ease',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* KAPSUL MELAYANG (3 Agu 2026, permintaan user — ala GitHub Mobile).
          Menggantikan bar dok penuh 2 Jul. Tinggi TOTAL sengaja dijaga tetap
          70px + safe-area (kapsul 58 + napas bawah 12) karena angka itu dipakai
          ulang di empat tempat sebagai `4.5rem`: padding-bawah <main> App, Fab,
          tombol sticky Absensi Jadwal, dan prompt PWA/Install. Mengubah tinggi
          di sini tanpa menyentuh keempatnya = konten ngumpet di belakang nav. */}
      <div
        className="px-3"
        // Tucked (scroll turun) = bar meluncur keluar layar: matikan interaksi
        // agar tak ada tap "hantu" yang tertangkap saat nav tak terlihat.
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
          pointerEvents: tucked ? 'none' : 'auto',
        }}
      >
      <div className="nav-pill relative max-w-lg mx-auto flex items-stretch h-[58px] rounded-full bg-white dark:bg-gray-900 px-1.5">
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => { if (!isActive) haptic(); onChange(id); }}
              className="press relative flex items-center justify-center flex-1 min-w-0 h-full select-none"
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Kapsul aktif MEMBUNGKUS ikon + label sekaligus — itu ciri utama
                  GitHub Mobile, beda dari M3 yang cuma memagari ikon. Lebarnya
                  hampir sepenuh slot (bukan memeluk teks seperti GitHub) karena
                  app ini punya 5 tab dgn label sepanjang "Talangan": di 320px
                  satu slot cuma ~59px, jadi kapsul yang memeluk teks akan
                  meluber. Indikator geser spring DILEPAS bersama pola lama —
                  kapsul di sini berpindah, bukan meluncur, persis GitHub. */}
              <span
                /* Kapsul NETRAL, bukan bertint brand — dan itu memang cara
                   GitHub: warna aksen tinggal di ikon & label, kapsulnya cuma
                   abu. Bukan cuma soal rupa; kapsul bertint teal sempat dipakai
                   dan menjatuhkan label aktif mode GELAP ke 4,09:1 (tint
                   MENERANGKAN latar tepat di bawah teks yang sudah pas-pasan).
                   Mode gelap sengaja CEKUNG (hitam/35%), bukan terang seperti
                   GitHub: menerangkan latar di sini selalu memakan kontras
                   #1A9B86, sedangkan mencekungkannya justru menaikkannya ke
                   5,51:1 — lebih tinggi dari pil polosnya sendiri (5,13).
                   Sejalan pula dgn aturan panel di permukaan gelap app ini yang
                   memang `bg-black/xx`, bukan `white/xx`. */
                className={`flex flex-col items-center justify-center gap-0.5 w-full h-[46px] rounded-full transition-colors duration-150 ${
                  isActive ? 'bg-black/[0.06] dark:bg-black/[0.35]' : ''
                }`}
              >
                <Icon
                  className={`w-[22px] h-[22px] shrink-0 transition-colors duration-150 ${isActive ? 'text-brand-link dark:text-brand-linkDark' : 'text-ink-sub dark:text-gray-300'}`}
                  strokeWidth={isActive ? 2.2 : 2}
                  fill={isActive ? 'currentColor' : 'none'}
                  style={{ fillOpacity: isActive ? 0.2 : 0, transition: 'fill-opacity 200ms ease-out' }}
                />
                <span
                  className={`text-micro leading-none whitespace-nowrap transition-colors duration-150 ${
                    isActive ? 'font-bold text-brand-link dark:text-brand-linkDark' : 'font-semibold text-ink-sub dark:text-gray-300'
                  }`}
                >
                  {label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
