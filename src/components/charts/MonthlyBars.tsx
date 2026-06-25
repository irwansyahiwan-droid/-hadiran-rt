import { useEffect, useState } from 'react';

export interface MonthBar {
  label: string;
  masuk: number;
  keluar: number;
}

/** Bar chart bulanan — masuk (hijau) vs keluar (merah), bar tumbuh saat load. */
export default function MonthlyBars({ data }: { data: MonthBar[] }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [data]);

  const max = Math.max(1, ...data.flatMap((d) => [d.masuk, d.keluar]));
  const H = 96; // tinggi area bar

  // Ringkasan untuk pembaca layar — chart visual (title tooltip) hanya terbaca mouse.
  const summary = data
    .map((d) => `${d.label}: masuk ${d.masuk.toLocaleString('id-ID')}, keluar ${d.keluar.toLocaleString('id-ID')}`)
    .join('. ');

  return (
    <div role="img" aria-label={`Grafik pemasukan & pengeluaran bulanan. ${summary}`}>
      <div className="flex items-end justify-between gap-2" style={{ height: H }} aria-hidden="true">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex items-end justify-center gap-1 h-full">
            <div
              className="w-1/2 max-w-[14px] rounded-t-md bg-emerald-500/90"
              style={{ height: grown ? `${(d.masuk / max) * 100}%` : 0, transition: `height 0.55s var(--ease-out-expo) ${i * 0.04}s` }}
              title={`Masuk: ${d.masuk.toLocaleString('id-ID')}`}
            />
            <div
              className="w-1/2 max-w-[14px] rounded-t-md bg-rose-400/90"
              style={{ height: grown ? `${(d.keluar / max) * 100}%` : 0, transition: `height 0.55s var(--ease-out-expo) ${i * 0.04 + 0.02}s` }}
              title={`Keluar: ${d.keluar.toLocaleString('id-ID')}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-2 mt-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-micro font-medium text-ink-faint dark:text-gray-400">{d.label}</span>
        ))}
      </div>
    </div>
  );
}
