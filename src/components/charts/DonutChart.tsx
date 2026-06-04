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
  centerBottom?: string;
}

/** Donut chart SVG ringan — segmen proporsional + label tengah. */
export default function DonutChart({ data, size = 132, stroke = 18, centerTop, centerBottom }: DonutChartProps) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          className="stroke-gray-100 dark:stroke-gray-800"
        />
        {data.map((d, i) => {
          const frac = Math.max(0, d.value) / total;
          const dash = frac * c;
          const seg = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              style={{ transition: 'stroke-dasharray 0.6s var(--ease-out-expo)' }}
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      {(centerTop || centerBottom) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          {centerTop && <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{centerTop}</span>}
          {centerBottom && <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">{centerBottom}</span>}
        </div>
      )}
    </div>
  );
}
