import { useEffect, useState } from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  stroke?: number;
  centerTop?: string;
  format?: (v: number) => string;
}

/** Donut interaktif — beranimasi menggambar saat load; ketuk segmen/legend
 *  untuk menyorot & menampilkan nilainya di tengah. */
export default function DonutChart({
  data,
  size = 132,
  stroke = 18,
  centerTop = 'Total',
  format = (v) => v.toLocaleString('id-ID'),
}: DonutChartProps) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const centerLabel = active !== null ? data[active].label : centerTop;
  const centerValue = active !== null ? data[active].value : total;
  const centerColor = active !== null ? data[active].color : undefined;
  // Share % dari total — hanya saat segmen aktif (delight + nilai analitis, tak ramai saat diam)
  const centerPct = active !== null ? Math.round((Math.max(0, data[active].value) / total) * 100) : null;
  // Font tengah adaptif: angka penuh (mis. Rp1.710.000) bisa panjang → kecilkan agar muat
  const centerStr = format(centerValue);
  const centerSize = centerStr.length >= 12 ? 'text-[10px]' : centerStr.length >= 9 ? 'text-[12px]' : 'text-sm';

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {/* Grafik dekoratif — data disampaikan via legend tombol di bawah (terbaca SR) */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true" focusable="false">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-gray-800" />
          {data.map((d, i) => {
            const frac = Math.max(0, d.value) / total;
            const dash = mounted ? frac * c : 0;
            const dimmed = active !== null && active !== i;
            const seg = (
              <circle
                key={i}
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color}
                strokeWidth={active === i ? stroke + 5 : stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                onClick={() => setActive((a) => (a === i ? null : i))}
                className="cursor-pointer"
                style={{
                  opacity: dimmed ? 0.35 : 1,
                  transition: `stroke-dasharray 0.7s var(--ease-out-expo) ${i * 0.08}s, opacity 0.25s, stroke-width 0.2s`,
                }}
              />
            );
            offset += frac * c;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint dark:text-gray-500 truncate max-w-full">{centerLabel}</span>
          <span className={`${centerSize} font-bold tabular-nums leading-tight whitespace-nowrap text-gray-900 dark:text-gray-100`} style={centerColor ? { color: centerColor } : undefined}>{centerStr}</span>
          {centerPct !== null && (
            <span
              className="pop mt-1 px-1.5 py-px rounded-full text-[10px] font-bold tabular-nums leading-none"
              style={{ color: centerColor, background: `${centerColor}1A` }}
            >
              {centerPct}% dari total
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        {data.map((d, i) => {
          const pct = Math.round((Math.max(0, d.value) / total) * 100);
          return (
          <button
            key={d.label}
            onClick={() => setActive((a) => (a === i ? null : i))}
            aria-pressed={active === i}
            aria-label={`${d.label}: ${format(d.value)}, ${pct}% dari total`}
            className={`press w-full flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${
              active === i ? 'bg-gray-100/80 dark:bg-gray-800' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className={`text-xs truncate ${active === i ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{d.label}</span>
            <span className="ml-auto shrink-0 text-xs font-bold text-gray-800 dark:text-gray-200 tabular-nums whitespace-nowrap">{format(d.value)}</span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
