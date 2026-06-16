import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  className?: string;
}

/** Empty state ilustratif — scene berlapis: backdrop lembut + elemen
 *  dekoratif mengambang + tile ikon mengambang di tengah. */
export default function EmptyState({ icon: Icon, title, subtitle, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="relative w-28 h-24 mb-4">
        {/* Backdrop lembut */}
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-emerald-100/70 to-emerald-50/40 dark:from-gray-800 dark:to-gray-800/50" />

        {/* Elemen dekoratif mengambang */}
        <span className="blob absolute -top-1 right-3 w-2.5 h-2.5 rounded-full bg-amber-300/80" />
        <span className="blob absolute bottom-2 -left-1 w-3.5 h-3.5 rounded-md bg-emerald-300/70" style={{ animationDelay: '-4s' }} />
        {/* Teal brand, bukan biru — aturan config: biru = sinyal status, bukan accent dekoratif. */}
        <span className="blob absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-teal-300/70" style={{ animationDelay: '-8s' }} />

        {/* Tile ikon di tengah — token `lift` (crisp card language), bukan shadow-lg generik. */}
        <div className="pop lift absolute inset-0 m-auto w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
          <Icon className="w-7 h-7 text-emerald-500 dark:text-emerald-400" strokeWidth={1.7} />
        </div>
      </div>

      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>
      {subtitle && (
        <p className="text-xs text-ink-faint dark:text-gray-400 mt-1 max-w-[230px] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
