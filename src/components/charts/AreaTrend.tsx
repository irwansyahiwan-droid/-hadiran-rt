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
      {/* Warna dari token `pos` (4 Agu 2026), bukan hex sendiri.
          Dua hal sekaligus yang diperbaiki di sini:
          (1) `#0F6039` bukan token app mana pun — sisa era pra-flat yang
              tertinggal di satu berkas, jadi garis tren ini satu-satunya hijau
              yang tak pernah ikut saat ramp brand diturunkan.
          (2) Berkas ini TIDAK punya sisi gelap sama sekali, dan hijau tua di
              atas kartu `dark:bg-gray-900` cuma 2,28:1 — di bawah ambang 3:1
              untuk grafik informatif (§1.4.11): di mode gelap kartu "Tren
              Saldo" praktis kosong. Sapuan kontras yang ada tak menangkapnya
              karena keduanya menyampel teks, ikon, batas kontrol, & ring fokus
              — bukan stroke SVG.
          `currentColor` dipakai agar SATU kelas `text-*` mengatur garis DAN
          gradiennya; `<stop>` mewarisi warna teks induknya. */}
      <defs>
        <linearGradient id="areaTrendG" x1="0" y1="0" x2="0" y2="1" className="text-pos dark:text-pos-dark-fill">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaTrendG)" />
      <path
        d={line}
        fill="none"
        className="stroke-pos dark:stroke-pos-dark-fill"
        /* Penanda populasi utk `npm run audit:kontras-nonteks`. Tanda grafik
           tak bisa ditemukan lewat selektor generik (svg-nya aria-hidden,
           persis supaya pembaca layar tak membacanya) — itu sebabnya garis ini
           bertahun-tahun 2,28:1 di mode gelap tanpa ada yang lapor. Tiap tanda
           grafik BARU wajib ikut memasangnya, kalau tidak ia tak terukur. */
        data-grafik="garis-tren"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
