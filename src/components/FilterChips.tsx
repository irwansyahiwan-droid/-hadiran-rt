import { useState } from 'react';
import { ArrowDownUp, Check } from 'lucide-react';
import { haptic } from '../lib/utils';

interface ChipOption<T extends string> {
  id: T;
  label: string;
}

/**
 * Sort opsional di kanan. Dua bentuk:
 *  - `onCycle`  : tombol siklus (cocok utk 2 state — kedua state terlihat 1 tap).
 *  - `options`  : popover daftar (WAJIB utk 3+ state — state tak boleh tersembunyi
 *                 di balik tombol siklus yg harus ditebak/diketuk berulang).
 */
type SortProp<S extends string> =
  | { label: string; onCycle: () => void }
  | { value: S; options: readonly ChipOption<S>[]; onChange: (id: S) => void };

interface FilterChipsProps<T extends string, S extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Tombol sort opsional di kanan (ml-auto). */
  sort?: SortProp<S>;
  /** Bungkus chip agar membungkus ke baris baru (mis. Riwayat dgn banyak filter). */
  wrap?: boolean;
  className?: string;
}

/**
 * Baris filter chip seragam untuk seluruh halaman (Beranda, Kas RT, Kas Hadiran,
 * Talangan, Riwayat). Touch target 44px (WCAG 2.5.5 / Apple HIG), warna brand
 * terpusat, haptic per tap. SATU sumber kebenaran — jangan salin markup chip lagi.
 */
export default function FilterChips<T extends string, S extends string = string>({
  options,
  value,
  onChange,
  sort,
  wrap,
  className = '',
}: FilterChipsProps<T, S>) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortLabel = sort
    ? 'options' in sort
      ? (sort.options.find((o) => o.id === sort.value)?.label ?? sort.options[0]?.label ?? '')
      : sort.label
    : '';

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

      {sort && 'options' in sort && (
        <div className="relative ml-auto shrink-0">
          <button
            type="button"
            onClick={() => { haptic(); setSortOpen((o) => !o); }}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-label={`Urutkan: ${sortLabel}`}
            className="press inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-control dark:border-gray-700"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            {sortLabel}
          </button>

          {sortOpen && (
            <>
              {/* Penangkap klik di luar → tutup */}
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div
                role="listbox"
                aria-label="Pilihan urutan"
                className="absolute right-0 top-full mt-2 z-50 min-w-[10rem] py-1.5 rounded-2xl bg-white dark:bg-gray-900 border border-line dark:border-gray-800 float origin-top-right"
              >
                {sort.options.map((o) => {
                  const selected = o.id === sort.value;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => { if (!selected) haptic(); sort.onChange(o.id); setSortOpen(false); }}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm text-left transition-colors ${
                        selected
                          ? 'font-semibold text-brand-link dark:text-brand-linkDark'
                          : 'font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      {o.label}
                      {selected && <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {sort && !('options' in sort) && (
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
