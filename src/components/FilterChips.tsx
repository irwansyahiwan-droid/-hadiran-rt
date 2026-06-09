import { ArrowDownUp } from 'lucide-react';
import { haptic } from '../lib/utils';

interface ChipOption<T extends string> {
  id: T;
  label: string;
}

interface FilterChipsProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Tombol sort opsional di kanan (ml-auto). */
  sort?: { label: string; onCycle: () => void };
  /** Bungkus chip agar membungkus ke baris baru (mis. Riwayat dgn banyak filter). */
  wrap?: boolean;
  className?: string;
}

/**
 * Baris filter chip seragam untuk seluruh halaman (Beranda, Kas RT, Kas Hadiran,
 * Talangan, Riwayat). Touch target 44px (WCAG 2.5.5 / Apple HIG), warna brand
 * terpusat, haptic per tap. SATU sumber kebenaran — jangan salin markup chip lagi.
 */
export default function FilterChips<T extends string>({
  options,
  value,
  onChange,
  sort,
  wrap,
  className = '',
}: FilterChipsProps<T>) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1.5 ${wrap ? 'flex-wrap' : ''}`}>
        {options.map((f) => {
          const active = value === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { if (!active) haptic(); onChange(f.id); }}
              aria-pressed={active}
              className={`press shrink-0 inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-full text-xs font-semibold transition-colors ${
                active
                  ? 'bg-brand text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-control dark:border-gray-700'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      {sort && (
        <button
          type="button"
          onClick={() => { haptic(); sort.onCycle(); }}
          aria-label={`Urutkan: ${sort.label}`}
          className="press ml-auto shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-control dark:border-gray-700"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          {sort.label}
        </button>
      )}
    </div>
  );
}
