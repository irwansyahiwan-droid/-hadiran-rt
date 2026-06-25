interface AreaTrendProps {
  points: number[];
  height?: number;
}

/** Area + garis tren SVG ringan (mis. saldo dari waktu ke waktu). */
export default function AreaTrend({ points, height = 84 }: AreaTrendProps) {
  if (points.length < 2) return null;

  const W = 100;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 6;
  const stepX = W / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - pad - ((p - min) / range) * (height - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c}`).join(' ');
  const area = `${line} L${W},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id="areaTrendG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaTrendG)" />
      <path
        d={line}
        fill="none"
        stroke="#0F6039"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
