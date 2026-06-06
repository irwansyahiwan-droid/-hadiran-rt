import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { formatRupiahPlain } from '../lib/utils';

interface SmartInsightProps {
  label: string;       // mis. "Pemasukan bulan ini"
  current: number;     // nilai periode sekarang
  previous: number;    // nilai periode pembanding
  className?: string;
}

/**
 * Insight ringkas: ubah angka jadi cerita — "naik 12% vs bulan lalu".
 * Tampil hanya bila ada data pembanding yang berarti.
 */
export default function SmartInsight({ label, current, previous, className = '' }: SmartInsightProps) {
  const hasBase = previous > 0;
  const pct = hasBase ? Math.round(((current - previous) / previous) * 100) : null;
  const dir = pct === null ? 'flat' : pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';

  const tone =
    dir === 'up'
      ? { ic: TrendingUp, c: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
      : dir === 'down'
      ? { ic: TrendingDown, c: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' }
      : { ic: Minus, c: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };
  const Ic = tone.ic;

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-line dark:border-gray-800/60 bg-white dark:bg-gray-900 lift px-4 py-3 ${className}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone.bg}`}>
        <Sparkles className={`w-[18px] h-[18px] ${tone.c}`} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100 leading-tight">
          {label} <span className="tabular-nums">{formatRupiahPlain(current)}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
          {pct === null ? (
            'Belum ada data bulan lalu untuk dibandingkan'
          ) : (
            <>
              <Ic className={`w-3.5 h-3.5 ${tone.c}`} strokeWidth={2.5} />
              <span className={`font-semibold ${tone.c} tabular-nums`}>
                {pct > 0 ? '+' : ''}{pct}%
              </span>
              <span>vs bulan lalu</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
