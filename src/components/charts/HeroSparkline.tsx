import { useEffect, useId, useRef, useState } from 'react';

interface HeroSparklineProps {
  /** Deret kumulatif (mis. total kas terkumpul per tarikan selesai). */
  points: number[];
  height?: number;
}

/**
 * Sparkline "hidup" khusus dipasang DI DALAM hero gelap (gradient emerald).
 * Garis & area terang (emerald muda → transparan) + titik ujung berdenyut.
 * Berbeda dari `AreaTrend` (varian kartu putih) — sengaja dipisah agar
 * pewarnaannya pas di atas kanvas hijau tanpa mengganggu pemakaian di KasRT.
 *
 * Garis menggambar sendiri (draw-on) sekali saat mount; dihormati oleh guard
 * `prefers-reduced-motion` global di index.css.
 */
export default function HeroSparkline({ points, height = 40 }: HeroSparklineProps) {
  const gid = useId().replace(/:/g, '');
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [drawn, setDrawn] = useState(false);

  // Ukur panjang garis untuk animasi stroke-dasharray (draw-on).
  useEffect(() => {
    if (pathRef.current) {
      setLen(pathRef.current.getTotalLength());
      // tick berikutnya: lepas dashoffset → garis "tertarik" keluar
      const t = requestAnimationFrame(() => setDrawn(true));
      return () => cancelAnimationFrame(t);
    }
  }, [points.length]);

  if (points.length < 2) return null;

  const W = 100;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padTop = 6;
  const padBottom = 4;
  const stepX = W / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - padBottom - ((p - min) / range) * (height - padTop - padBottom);
    return { x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
  const area = `${line} L${W},${height} L0,${height} Z`;

  const last = coords[coords.length - 1];
  // Titik ujung dirender sbg div overlay (persen) agar tetap BULAT —
  // svg pakai preserveAspectRatio=none yg akan menggepengkan <circle>.
  const dotLeft = `${(last.x / W) * 100}%`;
  const dotTop = `${(last.y / height) * 100}%`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`hsArea${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#hsArea${gid})`} className="hs-area" />
        <path
          ref={pathRef}
          d={line}
          fill="none"
          stroke="#D1FAE5"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={
            len
              ? {
                  strokeDasharray: len,
                  strokeDashoffset: drawn ? 0 : len,
                  transition: 'stroke-dashoffset 1100ms var(--ease-out-expo)',
                }
              : undefined
          }
        />
      </svg>
      {/* Titik ujung berdenyut + glow — penanda "nilai terkini" */}
      <span
        className="hs-dot"
        style={{ left: dotLeft, top: dotTop, opacity: drawn ? 1 : 0 }}
      />
    </div>
  );
}
