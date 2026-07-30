import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import FitAmount from './FitAmount';

/** Satu kolom statistik di kaki hero. `onClick` menjadikannya tombol navigasi. */
export interface HeroStat {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  onClick?: () => void;
}

/**
 * Kaki statistik hero — kolom bergaris, BUKAN panel bertumpuk.
 *
 * Dulu ada dua bentuk untuk pekerjaan yang sama: Beranda memakai kolom
 * ber-`border-r` di bawah satu garis, sementara Kas RT & Talangan memakai dua
 * kotak `bg-black/10` (kotak di dalam kotak). Bentuk kanonik = kolom: lebih
 * ringan, menskala ke 2 atau 3 kolom, dan tak menambah permukaan di atas
 * permukaan — selaras arah Material-flat.
 *
 * Dipakai langsung oleh slide hero Beranda (yang bingkainya milik carousel)
 * maupun oleh `HeroSaldo` di bawah ini → satu sumber, tak bisa drift.
 */
export function HeroStats({ items, className = '' }: { items: HeroStat[]; className?: string }) {
  return (
    <div
      className={`grid border-t border-white/15 ${className}`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((s, i) => {
        const Icon = s.icon;
        const sep = i < items.length - 1 ? 'border-r border-white/15' : '';
        const inner = (
          <>
            {Icon && <Icon className="h-[17px] w-[17px] text-white/80" strokeWidth={1.7} />}
            <span className="mt-0.5 text-micro font-medium text-white/95">{s.label}</span>
            {/* clamp: nominal kolom harus muat di 360px tanpa membungkus (3 kolom
                = ±100px per kolom). Sora + tabular → sejajar antar kolom. */}
            <span className="whitespace-nowrap text-[clamp(0.72rem,3.1vw,0.78rem)] font-display font-extrabold tabular-nums text-white">
              {s.value}
            </span>
          </>
        );
        const box = `flex w-full min-w-0 flex-col items-center gap-1 px-0.5 ${sep}`;
        return s.onClick ? (
          <button
            key={s.label}
            onClick={(e) => { e.stopPropagation(); s.onClick?.(); }}
            className={`press ${box} active:opacity-80`}
          >
            {inner}
          </button>
        ) : (
          <div key={s.label} className={box}>{inner}</div>
        );
      })}
    </div>
  );
}

interface HeroSaldoProps {
  /** Ikon kecil di kiri label (opsional). */
  icon?: LucideIcon;
  /** Label micro huruf besar, mis. "Saldo Bersih Kas RT". */
  label: string;
  /** Slot setelah label — biasanya `<InfoTip tone="onDark">`. */
  info?: ReactNode;
  /** Tombol-tombol pojok kanan (mata, bagikan). Dibungkus baris seragam. */
  actions?: ReactNode;
  /** String FINAL nominal utk mengukur lebar FitAmount (bukan nilai animasi). */
  measure: string;
  /** Isi nominal (Odometer / teks ter-mask). */
  amount: ReactNode;
  /** Pil status di samping nominal, mis. "Defisit". */
  status?: ReactNode;
  /** Satu baris keterangan di bawah nominal. */
  caption?: ReactNode;
  /** Slot bebas setelah caption (mis. chip "Sudah disetor ke Kas RT"). */
  children?: ReactNode;
  /** Kaki statistik (2–3 kolom). Kosongkan bila kartu di bawahnya sudah memuat angka yang sama. */
  stats?: HeroStat[];
  /** Lantai tinggi — sinkron dgn skeleton halaman agar CrossFade tak melompat. */
  minHeight?: number;
}

/**
 * Kartu hero saldo — SATU anatomi untuk Kas Hadiran, Kas RT, dan Talangan.
 *
 * Sebelum 30 Jul 2026 ketiganya menyalin bingkai yang sama lalu menyimpang:
 * label `text-xs font-semibold` di satu tempat & `text-micro font-bold` di
 * tempat lain, jarak tombol `-mr-2` vs `-mr-1.5 gap-0.5`, kaki kartu dua panel
 * di dua halaman dan tak ada sama sekali di halaman ketiga. Warna hero sudah
 * disatukan lebih dulu (satu `.hero-emerald`, lihat index.css); ini menyatukan
 * strukturnya.
 *
 * Urutan baca yang dijamin: label → nominal (+status) → keterangan → kaki.
 * Hero Beranda TIDAK memakai komponen ini karena bingkainya milik
 * `BannerCarousel` (kartu slide), tapi kakinya memakai `HeroStats` yang sama.
 */
export default function HeroSaldo({
  icon: Icon,
  label,
  info,
  actions,
  measure,
  amount,
  status,
  caption,
  children,
  stats,
  minHeight,
}: HeroSaldoProps) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl hero-emerald"
      style={{ boxShadow: 'var(--hero-shadow)', minHeight }}
    >
      <div className="hero-sheen pointer-events-none absolute inset-0" />

      <div className="relative p-6">
        {/* Label & aksi satu baris: label `min-w-0` mengalah, tombol `shrink-0`
            → di 360px tak bisa saling timpa (cacat yang pernah nyata di hero
            Beranda). */}
        <div className="flex items-center justify-between gap-3">
          {/* Ukuran label ikut lebar layar — spek yang SAMA dgn eyebrow hero
              Beranda. Label terpanjang ("Total Talangan Belum Lunas", 26 huruf)
              butuh 206px pada 11px sementara ruang sisa cuma 196px di 360px →
              tanpa clamp, kata terakhir hilang ditelan ellipsis. */}
          <p className="flex min-w-0 items-center gap-2 text-[clamp(0.575rem,2.55vw,0.6875rem)] font-bold uppercase tracking-[0.12em] text-white/90">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-white/80" />}
            <span className="truncate">{label}</span>
            {info}
          </p>
          {actions && <div className="-mr-2 flex shrink-0 items-center">{actions}</div>}
        </div>

        <div className="mt-1 flex items-end gap-x-2.5">
          <FitAmount
            measure={measure}
            maxPx={48}
            minPx={30}
            className="min-w-0 flex-1 font-display font-extrabold tracking-tighter tabular-nums text-white"
          >
            {amount}
          </FitAmount>
          {status}
        </div>

        {caption && <p className="mt-1 text-xs text-white/90">{caption}</p>}
        {children}
        {stats && stats.length > 0 && <HeroStats items={stats} className="mt-4 pt-[18px]" />}
      </div>
    </div>
  );
}

/** Tombol aksi pojok hero (mata / bagikan) — ukuran & hover seragam. */
export function HeroAction({
  icon: Icon,
  label,
  onClick,
  spin,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  spin?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="press flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
    >
      <Icon className={`h-4 w-4 text-white/80 ${spin ? 'animate-spin' : ''}`} />
    </button>
  );
}
