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
            {/* Tinggi final selalu terpasang; grow via transform:scaleY (origin-bottom)
                → animasi di compositor, tak memicu layout tiap frame spt animasi height. */}
            {/* Token `pos`/`neg`, BUKAN emerald-600/rose-500 (4 Agu 2026).
                Bar informatif wajib ≥3:1 di atas kartunya (WCAG 1.4.11) dan
                versi lama memang lolos — tapi ia lolos dengan HIJAU & MERAH
                yang berbeda dari nominal di kartu tepat di sebelahnya, jadi
                satu layar membawa dua hijau + dua merah sekaligus (dilarang
                DESIGN.stitch §7). Token justru lebih kontras di terang
                (8,96 & 8,78 lawan putih) dan akhirnya membuat mode GELAP punya
                warna sama sekali — dulu tak ada `dark:` di sini, jadi bar gelap
                memakai warna yang disetel untuk kartu putih.
                Legend dot di KasRT.tsx wajib ikut pasangan ini. */}
            <div
              className="w-1/2 max-w-[14px] origin-bottom rounded-t-lg bg-pos dark:bg-pos-dark-fill"
              data-grafik="bar-masuk"
              style={{ height: `${(d.masuk / max) * 100}%`, transform: grown ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 0.55s var(--ease-out-expo) ${i * 0.04}s` }}
              title={`Masuk: ${d.masuk.toLocaleString('id-ID')}`}
            />
            <div
              className="w-1/2 max-w-[14px] origin-bottom rounded-t-lg bg-neg dark:bg-neg-dark-fill"
              data-grafik="bar-keluar"
              style={{ height: `${(d.keluar / max) * 100}%`, transform: grown ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 0.55s var(--ease-out-expo) ${i * 0.04 + 0.02}s` }}
              title={`Keluar: ${d.keluar.toLocaleString('id-ID')}`}
            />
          </div>
        ))}
      </div>
      {/* `min-w-0` pada tiap label: `flex-1` saja TIDAK cukup — flex item punya
          `min-width:auto`, jadi label menolak menyusut di bawah lebar teksnya
          dan barisan label mendorong halaman geser samping saat teks dasar
          browser 200%. `truncate` menjaga potongnya rapi. */}
      <div className="flex justify-between gap-2 mt-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 min-w-0 truncate text-center text-micro font-medium text-ink-faint dark:text-gray-400">{d.label}</span>
        ))}
      </div>
    </div>
  );
}
