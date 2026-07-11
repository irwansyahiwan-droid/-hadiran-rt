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

export default function BottomNav({ active, onChange, isWargaMode }: BottomNavProps) {
  // Warga tidak punya tab Talangan — diakses lewat tombol "Lihat" di Beranda
  const visibleTabs = isWargaMode ? tabs.filter(t => t.id !== 'talangan') : tabs;
  const activeIndex = visibleTabs.findIndex(t => t.id === active);

  // Auto-hide: scroll turun (masuk ke konten) → nav menyelinap turun keluar layar;
  // scroll naik → muncul lagi. Beri ruang baca list yg panjang. Dekat puncak (y<80)
  // selalu tampil. Listener scroll dibagi pakai (lihat hook).
  const tucked = useScrollHide({ threshold: 80 });

  return (
    <nav
      // Bar DOK bawah (2 Jul 2026, permintaan user — ala Google/myBCA/BYOND BSI):
      // bar penuh NEMPEL ke tepi bawah layar, bukan lagi kapsul melayang. Latar
      // bar mengisi sampai belakang home indicator (safe-area = padding DI DALAM
      // bar, bukan jarak di bawahnya).
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
      {/* Permukaan SOLID putih penuh selebar layar (dark = gray-900), pemisah
          cuma hairline + bayangan naik tipis via .nav-dock — bar dok datar ala
          app bank, tanpa ring/radius kapsul. Slot tombol tetap max-w-lg di
          tengah agar sejajar kolom konten di layar lebar. */}
      <div
        className="nav-dock bg-white dark:bg-gray-900"
        // Tucked (scroll turun) = bar meluncur keluar layar: matikan interaksi
        // agar tak ada tap "hantu" yang tertangkap saat nav tak terlihat.
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          pointerEvents: tucked ? 'none' : 'auto',
        }}
      >
      <div className="relative max-w-lg mx-auto flex items-stretch h-[70px]">
        {/* Indikator pill meluncur (spring) — slot selebar tombol, pill di area ikon.
            Row TANPA padding horizontal agar slot = lebar tombol persis. */}
        {activeIndex >= 0 && (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 pointer-events-none transition-transform duration-300"
            style={{
              width: `${100 / visibleTabs.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
              transitionTimingFunction: 'var(--ease-spring)',
            }}
          >
            {/* Pill aktif ala Google (Material 3): tonal DATAR — satu fill tint
                brand, tanpa gradient/ring/glow. Bentuk stadium (rounded-full)
                w-16 h-8 mengikuti spec indikator M3 (64×32, ikon 24). Yang
                bergerak hanya pill-nya (slide spring antar slot). */}
            <span className="absolute left-1/2 -translate-x-1/2 top-3 w-16 h-8 rounded-full bg-brand-link/[0.14] dark:bg-brand-linkDark/[0.2]" />
          </div>
        )}
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => { if (!isActive) haptic(); onChange(id); }}
              className="press relative flex flex-col items-center justify-center flex-1 w-full h-full py-2 select-none"
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Ala Google/M3: ikon DIAM di tempat (tanpa scale/lift) — yang
                  berpindah hanya pill tonal di belakangnya. Ikon 24px duduk di
                  blok h-8 yg sejajar persis dgn pill. Aktif tetap DIISI (fill
                  tint) → outline→solid, active terbaca "padat" bukan cuma warna. */}
              <span className="flex items-center justify-center w-16 h-8">
                {/* Warna 150ms (bukan 300): nav ditekan puluhan kali sehari →
                    respons harus crisp; gerak "hidup" cukup dari pill spring. */}
                <Icon
                  className={`w-6 h-6 transition-colors duration-150 ${isActive ? 'text-brand-link dark:text-brand-linkDark' : 'text-gray-500 dark:text-gray-500'}`}
                  strokeWidth={isActive ? 2.2 : 2}
                  fill={isActive ? 'currentColor' : 'none'}
                  style={{ fillOpacity: isActive ? 0.2 : 0, transition: 'fill-opacity 200ms ease-out' }}
                />
              </span>
              {/* Timing spring DIHAPUS dari warna: kurva overshoot (>1) meng-
                  extrapolate interpolasi warna melewati target (kilat aneh).
                  Spring hanya utk transform (pill); warna = ease standar. */}
              <span
                className={`text-micro leading-none mt-1 transition-colors duration-150 ${isActive ? 'font-bold text-brand-link dark:text-brand-linkDark' : 'font-semibold text-ink-faint dark:text-gray-400'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
