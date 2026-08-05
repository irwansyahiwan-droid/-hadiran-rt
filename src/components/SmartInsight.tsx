import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { formatRupiahPlain } from '../lib/utils';

interface SmartInsightProps {
  label: string;       // mis. "Pemasukan bulan ini"
  current: number;     // nilai periode BERJALAN (belum selesai)
  previous: number;    // nilai periode pembanding (sudah selesai penuh)
  className?: string;
}

/** Kenapa persentasenya tak ditampilkan — menentukan kalimat penggantinya. */
export type AlasanTanpaPersen = 'tanpa-pembanding' | 'periode-berjalan-kosong';

export interface HasilBanding {
  pct: number | null;
  alasan: AlasanTanpaPersen | null;
}

/**
 * Boleh tidaknya periode BERJALAN dipersenkan terhadap periode SEBELUMNYA.
 *
 * Aturan tambahan (5 Agu 2026): kalau periode berjalan masih NOL, persentase
 * TIDAK ditampilkan sama sekali. Sebelumnya ia dihitung apa adanya, sehingga
 * kartu "Kas masuk bulan ini" memampangkan "-100% vs bulan lalu" merah dengan
 * panah turun — membandingkan bulan yang baru jalan beberapa hari lawan bulan
 * lalu yang penuh.
 *
 * Itu bukan kasus langka. Di data RT ini pemasukan pertama tiap bulan mendarat
 * di tanggal 31, 8, —, 12, 2, 7, 5 (Jan–Jul; Maret tanpa pemasukan sama
 * sekali). Artinya alarm merah itu muncul 1–2 minggu pertama HAMPIR SETIAP
 * BULAN, dan sepanjang Januari & Maret — padahal kasnya sehat, iurannya
 * memang datang di tengah bulan. Warga (mode lihat-saja) ikut melihatnya.
 *
 * Nominalnya tetap ditampilkan — "Rp0" itu fakta yang berguna. Yang ditahan
 * cuma persentase & rona alarmnya, sampai ada angka yang layak dibandingkan.
 *
 * Fungsi MURNI supaya aturannya bisa diuji tanpa merender React.
 */
export function bandingPeriode(current: number, previous: number): HasilBanding {
  if (previous <= 0) return { pct: null, alasan: 'tanpa-pembanding' };
  if (current <= 0) return { pct: null, alasan: 'periode-berjalan-kosong' };
  return { pct: Math.round(((current - previous) / previous) * 100), alasan: null };
}

const KALIMAT: Record<AlasanTanpaPersen, string> = {
  'tanpa-pembanding': 'Belum ada data bulan lalu untuk dibandingkan',
  'periode-berjalan-kosong': 'Belum ada pemasukan bulan ini',
};

/**
 * Insight ringkas: ubah angka jadi cerita — "naik 12% vs bulan lalu".
 * Tampil hanya bila ada data pembanding yang berarti.
 */
export default function SmartInsight({ label, current, previous, className = '' }: SmartInsightProps) {
  const { pct, alasan } = bandingPeriode(current, previous);
  const dir = pct === null ? 'flat' : pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';

  const tone =
    dir === 'up'
      ? { ic: TrendingUp, c: 'text-pos dark:text-pos-dark', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
      : dir === 'down'
      ? { ic: TrendingDown, c: 'text-neg dark:text-neg-dark', bg: 'bg-rose-50 dark:bg-rose-900/20' }
      : { ic: Minus, c: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };
  const Ic = tone.ic;

  return (
    <div className={`flex items-center gap-3 rounded-3xl border border-line dark:border-gray-800/60 bg-white dark:bg-gray-900 lift px-4 py-3 ${className}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone.bg}`}>
        <Sparkles className={`w-[18px] h-[18px] ${tone.c}`} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-caption font-bold text-gray-800 dark:text-gray-100 leading-tight">
          {label} <span className="font-display tabular-nums">{formatRupiahPlain(current)}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
          {pct === null ? (
            KALIMAT[alasan!]
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
