import { useLayoutEffect, useRef, useState } from 'react';

interface FitAmountProps {
  /** String FINAL angka untuk mengukur lebar (mis. "-Rp12.500.000"). Pakai nilai
   *  akhir, BUKAN nilai animasi count-up → ukuran font stabil saat digit berputar. */
  measure: string;
  /** Ukuran maksimum (px) saat angka pendek & muat penuh. Default 48 (≈ text-5xl). */
  maxPx?: number;
  /** Lantai keterbacaan (px) — tak pernah lebih kecil dari ini. Default 30. */
  minPx?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Nominal "fit-to-width" — tampilkan angka SEBESAR MUNGKIN yang masih muat satu
 * baris di kartunya. Angka pendek dapat ukuran penuh (maxPx); angka panjang
 * menyusut HANYA seperlunya, tak pernah terpotong `overflow-hidden`. Dibuat untuk
 * warga lansia: prioritas keterbacaan nominal besar tanpa mengorbankan keutuhan
 * angka di HP sempit. Mewarisi font/letter-spacing/tabular dari `className`
 * (mis. font-display font-extrabold tracking-tighter tabular-nums) lewat sebuah
 * span-probe tak terlihat yang diukur pada maxPx.
 */
export default function FitAmount({ measure, maxPx = 48, minPx = 30, className = '', children }: FitAmountProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(maxPx);

  useLayoutEffect(() => {
    const el = ref.current;
    const pr = probe.current;
    if (!el || !pr) return;

    const fit = () => {
      const avail = el.clientWidth;
      const w = pr.getBoundingClientRect().width; // lebar angka pada maxPx
      if (!avail || !w) return;
      const safe = avail * 0.985; // sisakan ~1.5% agar tepi tak mepet
      const next = w <= safe ? maxPx : Math.max(minPx, Math.floor((safe / w) * maxPx));
      setSize(next);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    // Lebar berubah saat font Sora selesai swap dari fallback → ukur ulang.
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [measure, maxPx, minPx]);

  return (
    <p
      ref={ref}
      className={className}
      // Legibility shadow SATU lapis (hijau-tinta gelap, bukan hitam) — teks putih
      // nominal duduk di gradient hijau hero. Dulu 3 lapis (termasuk blur 10px):
      // itu halo, dan halo dilarang DESIGN.stitch §7 — angka paling penting di app
      // justru jadi satu-satunya elemen ber-emboss. Ramp hero sudah diredupkan di
      // pass kontras 13 Jul (#157A45, putih lolos AA tanpa bantuan shadow), jadi
      // sisanya cuma pemisah glyph tipis: 1px, tanpa sebaran.
      style={{ position: 'relative', fontSize: size, lineHeight: 1.05, textShadow: '0 1px 2px rgba(3,28,18,0.35)' }}
    >
      {children}
      {/* Probe pengukur — tak terlihat & di luar alur; font/letter-spacing diwarisi
          dari <p>, fontSize dipaksa maxPx agar rasio skala konsisten. Diklip oleh
          kartu hero (overflow-hidden) → tak pernah memicu scroll horizontal. */}
      <span
        ref={probe}
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', whiteSpace: 'nowrap', fontSize: maxPx, pointerEvents: 'none' }}
      >
        {measure}
      </span>
    </p>
  );
}
