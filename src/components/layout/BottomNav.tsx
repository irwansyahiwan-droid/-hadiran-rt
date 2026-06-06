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
  const slot = 100 / visibleTabs.length; // lebar satu slot tab (%)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-line/70 dark:bg-gray-900/80 dark:border-gray-800/70"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -10px 30px -20px rgba(16,24,40,0.35)' }}
    >
      <div className="relative max-w-lg mx-auto flex items-stretch justify-around h-16">
        {/* Satu pill bersama yang MELUNCUR ke tab aktif (shared layout, bukan fade per-tab) */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1.5 flex items-center justify-center transition-transform duration-[380ms]"
          style={{
            width: `${slot}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transitionTimingFunction: 'var(--ease-spring)',
            opacity: activeIndex < 0 ? 0 : 1,
          }}
        >
          <span className="w-14 h-9 rounded-2xl bg-[#0D6B5E]/10 dark:bg-[#1A9B86]/15" />
        </span>

        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => { if (!isActive) haptic(); onChange(id); }}
              className="press relative flex flex-col items-center justify-center flex-1 w-full h-full py-2"
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`flex items-center justify-center transition-transform duration-300 ${isActive ? '-translate-y-0.5' : ''}`}
                style={{ transitionTimingFunction: 'var(--ease-spring)' }}>
                <Icon
                  className={`w-[25px] h-[25px] transition-colors duration-200 ${isActive ? 'text-brand-link dark:text-[#1A9B86]' : 'text-gray-400 dark:text-gray-500'}`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
              </span>
              <span className={`text-[11px] leading-none mt-1 transition-all duration-200 ${isActive ? 'font-bold text-brand-link dark:text-[#1A9B86]' : 'font-semibold text-gray-400 dark:text-gray-500'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
