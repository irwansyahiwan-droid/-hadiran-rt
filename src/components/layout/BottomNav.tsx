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
      // Floating glass capsule (tren 2026, ala Arc/fintech modern): bar lepas
      // dari tepi → kapsul membulat melayang. Kaca (blur+saturate) + ring tepi
      // + bayangan berlapis → terasa "mengambang" di atas konten, bukan bilah
      // datar menempel dasar. Jarak bawah hormati safe-area (home indicator).
      className="fixed left-0 right-0 z-40 px-3 pointer-events-none"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 6px)',
        // Sertakan safe-area + margin lebar di geseran → nav bersih total keluar
        // layar walau di HP dgn home indicator. Opacity fade = jaring pengaman:
        // andai ada sisa posisi sepiksel pun, tetap tak terlihat. 100% = tinggi nav.
        // translate3d (bukan translateY) + backface-hidden + will-change →
        // PAKSA layer GPU stabil. Tanpa ini, iOS Safari kadang tak mempromosikan
        // fixed+backdrop-filter ke compositor, lalu nav "melompat ke atas-tengah"
        // saat scroll (address-bar muncul/sembunyi me-relayout containing block).
        transform: tucked
          ? 'translate3d(0, calc(100% + env(safe-area-inset-bottom) + 2.5rem), 0)'
          : 'translate3d(0, 0, 0)',
        opacity: tucked ? 0 : 1,
        transition: 'transform 0.32s var(--ease-out-expo), opacity 0.26s ease',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Permukaan SOLID (bukan kaca): putih murni → kapsul "pop" tegas di atas
          konten apa pun, tak ada warna latar yg menembus & menode bar. (Sebelumnya
          bg-white/82 + backdrop-blur; user minta non-transparan agar putih lebih
          nendang.) Tanpa backdrop-filter juga lebih hemat GPU & tak lagi perlu
          guard prefers-reduced-transparency utk bar ini. Ring tepi dinaikkan
          .06→.08 agar batas kapsul tetap "tercetak" di atas putih solid. Dark = gray-900 solid. */}
      <div
        className="nav-float relative max-w-lg mx-auto flex items-stretch h-[70px] rounded-[28px] bg-white dark:bg-gray-900 ring-1 ring-black/[0.08] dark:ring-white/10"
        // Tucked (scroll turun) = kapsul meluncur keluar layar: matikan interaksi
        // agar tak ada tap "hantu" yang tertangkap saat nav tak terlihat.
        style={{ pointerEvents: tucked ? 'none' : 'auto' }}
      >
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
            {/* Lozenge aktif 2026 — gradient brand 3-stop + hairline ring + tepi
                atas tersinari (inset highlight) + glow brand lebih hidup → pill
                aktif "menyala" dengan kedalaman kaca, bukan tint datar. */}
            <span className="absolute left-1/2 -translate-x-1/2 top-2 w-[68px] h-10 rounded-2xl bg-gradient-to-b from-brand-link/[0.22] via-brand-link/[0.12] to-brand-link/[0.06] ring-1 ring-brand-link/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_6px_18px_-5px_rgba(13,107,94,0.55)] dark:from-emerald-400/[0.26] dark:via-emerald-400/[0.14] dark:to-emerald-400/[0.06] dark:ring-emerald-400/25 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_6px_20px_-5px_rgba(52,211,153,0.5)]" />
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
              {/* Ikon aktif membesar (spring) + NAIK ~3px → duduk lebih tinggi
                  "terangkat ke dalam" lozenge (dock lift ala iOS), label tinggal
                  di bawah. Aktif juga DIISI (fill tint) → outline→solid ala iOS:
                  active state terbaca "padat", bukan sekadar beda warna. Durasi
                  300ms + ease-spring disamakan dgn pill & label → seluruh handoff
                  aktif mendarat bersamaan (nyambung dgn slide tab). */}
              <span
                className={`flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-[3px]' : 'scale-100'}`}
                style={{ transitionTimingFunction: 'var(--ease-spring)' }}
              >
                <Icon
                  className={`w-[26px] h-[26px] transition-colors duration-300 ${isActive ? 'text-brand-link dark:text-brand-linkDark' : 'text-gray-500 dark:text-gray-500'}`}
                  strokeWidth={isActive ? 2.2 : 2}
                  fill={isActive ? 'currentColor' : 'none'}
                  style={{ fillOpacity: isActive ? 0.2 : 0, transition: 'fill-opacity 300ms var(--ease-spring)' }}
                />
              </span>
              <span
                className={`text-micro leading-none mt-1 transition-colors duration-300 ${isActive ? 'font-bold text-brand-link dark:text-brand-linkDark' : 'font-semibold text-ink-faint dark:text-gray-400'}`}
                style={{ transitionTimingFunction: 'var(--ease-spring)' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
