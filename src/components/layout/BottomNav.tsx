import { Home, CalendarDays, ArrowLeftRight, Wallet, Building2, type LucideIcon } from 'lucide-react';
import { haptic } from '../../lib/utils';

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
  { id: 'kas',      label: 'Kas',      icon: Wallet },
  { id: 'kas-rt',   label: 'Kas RT',   icon: Building2 },
];

export default function BottomNav({ active, onChange, isWargaMode }: BottomNavProps) {
  // Warga tidak punya tab Talangan — diakses lewat tombol "Lihat" di Beranda
  const visibleTabs = isWargaMode ? tabs.filter(t => t.id !== 'talangan') : tabs;
  const activeIndex = visibleTabs.findIndex(t => t.id === active);

  return (
    <nav
      // Material iOS tab bar: blur + saturate → warna konten di belakang "menyala"
      // lewat kaca, bukan abu kusam (blur polos). Hairline atas tetap.
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/75 backdrop-blur-xl backdrop-saturate-150 border-t border-line/70 dark:bg-gray-900/80 dark:border-gray-800/70"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        boxShadow: '0 -10px 30px -20px rgba(16,24,40,0.35)',
      }}
    >
      <div className="relative max-w-lg mx-auto flex items-stretch h-16">
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
            {/* Lozenge aktif 2026 — gradient brand + hairline ring + glow lembut
                (ganti flat tint) → active state terasa "menyala" & punya kedalaman. */}
            <span className="absolute left-1/2 -translate-x-1/2 top-1.5 w-16 h-9 rounded-2xl bg-gradient-to-b from-brand-link/[0.16] to-brand-link/[0.05] ring-1 ring-brand-link/20 shadow-[0_4px_14px_-4px_rgba(13,107,94,0.45)] dark:from-emerald-400/[0.20] dark:to-emerald-400/[0.05] dark:ring-emerald-400/20 dark:shadow-[0_4px_16px_-4px_rgba(52,211,153,0.4)]" />
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
              {/* Ikon aktif sedikit membesar (spring) → penekanan ekspresif tapi tetap presisi di pill */}
              <span
                className={`flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
                style={{ transitionTimingFunction: 'var(--ease-spring)' }}
              >
                <Icon
                  className={`w-[25px] h-[25px] transition-colors duration-200 ${isActive ? 'text-brand-link dark:text-brand-linkDark' : 'text-gray-500 dark:text-gray-500'}`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
              </span>
              <span className={`text-[11px] leading-none mt-1 transition-all duration-200 ${isActive ? 'font-bold text-brand-link dark:text-brand-linkDark' : 'font-semibold text-ink-faint dark:text-gray-400'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
