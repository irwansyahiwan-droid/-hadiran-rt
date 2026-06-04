export interface MonthBar {
  label: string;
  masuk: number;
  keluar: number;
}

/** Bar chart bulanan — masuk (hijau) vs keluar (merah), SVG ringan. */
export default function MonthlyBars({ data }: { data: MonthBar[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.masuk, d.keluar]));
  const H = 96; // tinggi area bar

  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: H }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex items-end justify-center gap-1 h-full">
            <div
              className="w-1/2 max-w-[14px] rounded-t-md bg-emerald-500/90"
              style={{ height: `${(d.masuk / max) * 100}%`, transition: 'height 0.5s var(--ease-out-expo)' }}
              title={`Masuk: ${d.masuk.toLocaleString('id-ID')}`}
            />
            <div
              className="w-1/2 max-w-[14px] rounded-t-md bg-rose-400/90"
              style={{ height: `${(d.keluar / max) * 100}%`, transition: 'height 0.5s var(--ease-out-expo)' }}
              title={`Keluar: ${d.keluar.toLocaleString('id-ID')}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-2 mt-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">{d.label}</span>
        ))}
      </div>
    </div>
  );
}
