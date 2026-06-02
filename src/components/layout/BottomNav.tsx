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
  const visibleTabs = isWargaMode ? tabs.filter(t => t.id !== 'talangan') : tabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-pb dark:bg-gray-900 dark:border-gray-800 h-16">
      <div className="max-w-lg mx-auto flex items-center justify-around h-full px-2">
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex items-center justify-center flex-1 h-full transition-all duration-200"
            >
              {isActive ? (
                <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full transition-all duration-200">
                  <Icon className="w-[18px] h-[18px] text-green-600 dark:text-green-400" />
                  <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">{label}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5 transition-all duration-200">
                  <Icon className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500" />
                  <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 leading-none">{label}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
