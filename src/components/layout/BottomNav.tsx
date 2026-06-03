import { Home, CalendarDays, ArrowLeftRight, Wallet, Building2 } from 'lucide-react';

export type TabName = 'beranda' | 'jadwal' | 'talangan' | 'kas' | 'kas-rt';

interface BottomNavProps {
  active: TabName;
  onChange: (tab: TabName) => void;
  isWargaMode?: boolean;
}

const tabs: { id: TabName; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'beranda',  label: 'Beranda',  icon: Home },
  { id: 'jadwal',   label: 'Jadwal',   icon: CalendarDays },
  { id: 'talangan', label: 'Talangan', icon: ArrowLeftRight },
  { id: 'kas',      label: 'Kas',      icon: Wallet },
  { id: 'kas-rt',   label: 'Kas RT',   icon: Building2 },
];

export default function BottomNav({ active, onChange, isWargaMode }: BottomNavProps) {
  // Warga tidak punya tab Talangan — diakses lewat tombol "Lihat" di Beranda
  const visibleTabs = isWargaMode ? tabs.filter(t => t.id !== 'talangan') : tabs;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-100 dark:bg-gray-900/95 dark:border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around h-16 px-2">
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex flex-col items-center justify-center flex-1 w-full h-full py-2 transition-all duration-150 active:scale-95 active:opacity-80"
            >
              <Icon className={`w-[26px] h-[26px] transition-colors duration-200 ${isActive ? 'text-[#0D6B5E] dark:text-[#1A9B86]' : 'text-gray-400 dark:text-gray-500'}`} />
              <span className={`text-[11px] font-semibold leading-none mt-1 transition-colors duration-200 ${isActive ? 'text-[#0D6B5E] dark:text-[#1A9B86]' : 'text-gray-400 dark:text-gray-500'}`}>
                {label}
              </span>
              <div className={`w-1 h-1 rounded-full bg-[#0D6B5E] dark:bg-[#1A9B86] mx-auto mt-0.5 transition-all duration-200 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
