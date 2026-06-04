import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  className?: string;
}

/** Empty state premium — badge gradient + ikon, judul, subjudul. */
export default function EmptyState({ icon: Icon, title, subtitle, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="pop relative w-16 h-16 rounded-2xl flex items-center justify-center mb-3.5
        bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-gray-800 dark:to-gray-800
        ring-1 ring-emerald-100/80 dark:ring-gray-700">
        <div className="absolute inset-0 rounded-2xl bg-emerald-400/10 blur-md" aria-hidden="true" />
        <Icon className="relative w-7 h-7 text-emerald-500 dark:text-emerald-400" strokeWidth={1.7} />
      </div>
      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[230px] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
