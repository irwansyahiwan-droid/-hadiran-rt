import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import FitAmount from './FitAmount';
import { ukuranMuat } from '../lib/utils';

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
/* Batas atasnya MENIRU `clamp(0.69rem, 3.1vw, 0.78rem)` yang lama, persis —
   supaya angka yang muat hari ini tampil sama sekali tak berubah (di 360px:
   11,16px). Perbaikan ini soal angka PANJANG; menaikkan ukuran semua nominal
   diam-diam adalah perubahan tampilan yang tak diminta siapa pun.
   Yang baru cuma LANTAInya: 9,6px, cukup untuk 9 digit ("Rp999.999.999") di
   kolom 75px dan masih terbaca — di bawah itu angkanya selamat tapi warga
   lansia yang kalah. */
const MAKS_KAKI_PX = 12.48;          // 0.78rem — pagar atas clamp lama
const MIN_CLAMP_PX = 11.04;          // 0.69rem — pagar bawah clamp lama
const MIN_KAKI_PX = 9.6;             // lantai BARU, hanya dipakai saat tak muat
const maksSekarang = () =>
  Math.min(MAKS_KAKI_PX, Math.max(MIN_CLAMP_PX, 0.031 * window.innerWidth));

export function HeroStats({ items, className = '' }: { items: HeroStat[]; className?: string }) {
  /* Nominal kaki MENYUSUT SEPERLUNYA, tidak lagi ber-`clamp()` tetap.
   *
   * Yang lama dikalibrasi ke satu panjang angka, dan komentarnya sendiri
   * mencatat sisa ruangnya nol: "angka sedigit lebih panjang langsung
   * menabrak". Sapuan populasi ekstrem (20 Agu 2026,
   * `EKSTREM=1 npm run audit:lebar`) membuktikan digit itu sudah dalam
   * jangkauan — pada kas 8 digit ketiga nominal SALING MENIMPA di 360px, dan
   * itu terlihat di screenshot, bukan disimpulkan dari angka. "Terkumpul"
   * adalah total kumulatif: ia cuma naik, tak pernah turun.
   *
   * SATU ukuran untuk ketiga kolom (dihitung dari nilai TERPANJANG), bukan
   * per-kolom: tiga angka bertetangga dengan tiga ukuran huruf berbeda terbaca
   * sebagai kesalahan, bukan sebagai penyesuaian.
   *
   * Yang menyusut hurufnya, BUKAN angkanya — "Rp55,2 jt" adalah pernyataan
   * yang berbeda dari "Rp55.200.000", dan kaki ini menyebut uang. */
  const rowRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [px, setPx] = useState(MAKS_KAKI_PX);   // diganti ukuran nyata di layout-effect
  const terpanjang = items.reduce((a, s2) => (String(s2.value).length > a.length ? String(s2.value) : a), '');

  useLayoutEffect(() => {
    const row = rowRef.current;
    const probe = probeRef.current;
    if (!row || !probe) return;
    const ukur = () => {
      /* Kolomnya dicari lewat penanda, BUKAN `firstElementChild`: probe
         pengukur juga anak dari baris ini, dan lebarnya 0 — memakainya membuat
         `ukuranMuat` menerima "tersedia = 0", mengembalikan ukuran penuh, dan
         perbaikannya diam-diam tak pernah bekerja (kejadian, terlihat di
         screenshot yang masih menimpa).
         Padding kolom (`px-0.5`) ikut dikurangi: `clientWidth` memuatnya, dan
         teks tak boleh memakai ruang itu. */
      const kolom = row.querySelector<HTMLElement>('[data-kaki-kolom]');
      if (!kolom) return;
      const cs = getComputedStyle(kolom);
      const isi = kolom.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      /* Probe diukur pada MAKS_KAKI_PX; skalakan dulu ke ukuran clamp yang
         berlaku di lebar layar ini, kalau tidak angka pendek akan ikut
         "diperbaiki" jadi lebih besar dari sebelumnya. */
      const maks = maksSekarang();
      const lebarPadaMaks = probe.getBoundingClientRect().width * (maks / MAKS_KAKI_PX);
      setPx(ukuranMuat(isi, lebarPadaMaks, maks, MIN_KAKI_PX));
    };
    ukur();
    const ro = new ResizeObserver(ukur);
    ro.observe(row);
    // Sora swap dari fallback → lebar berubah; ukur ulang (pola sama FitAmount).
    document.fonts?.ready.then(ukur).catch(() => {});
    return () => ro.disconnect();
  }, [terpanjang]);

  return (
    <div
      ref={rowRef}
      className={`relative grid border-t border-white/15 ${className}`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {/* Probe pengukur: nilai TERPANJANG pada ukuran maksimum, di luar alur &
          tak terlihat. `aria-hidden` + `visibility:hidden` supaya sapuan
          geometri tak salah menghitungnya sebagai teks yang meluber. */}
      <span
        ref={probeRef}
        aria-hidden="true"
        className="font-display font-extrabold tabular-nums"
        style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', whiteSpace: 'nowrap', fontSize: MAKS_KAKI_PX, pointerEvents: 'none' }}
      >
        {terpanjang}
      </span>
      {items.map((s, i) => {
        const Icon = s.icon;
        const sep = i < items.length - 1 ? 'border-r border-white/15' : '';
        const inner = (
          <>
            {Icon && <Icon className="h-[17px] w-[17px] text-white/80" />}
            <span className="mt-0.5 text-micro font-medium text-white/95">{s.label}</span>
            <span
              className="whitespace-nowrap font-display font-extrabold tabular-nums text-white"
              style={{ fontSize: px }}
            >
              {s.value}
            </span>
          </>
        );
        const box = `flex w-full min-w-0 flex-col items-center gap-1 px-0.5 ${sep}`;
        return s.onClick ? (
          <button
            key={s.label}
            data-kaki-kolom=""
            onClick={(e) => { e.stopPropagation(); s.onClick?.(); }}
            className={`press ${box} active:opacity-80`}
          >
            {inner}
          </button>
        ) : (
          <div key={s.label} data-kaki-kolom="" className={box}>{inner}</div>
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
  /** Kelas tambahan pada kartu hero — dipakai halaman yang lantainya BERBEDA
   *  di dua sisi ambang tumpuk 390px (mis. `min-h-[198px] max-[390px]:min-h-[238px]`).
   *  Lewat CSS, bukan `minHeight` angka: lantai yang ikut lebar layar tak bisa
   *  ditulis sbg satu nilai inline, dan mengejarnya dgn listener resize berarti
   *  lantai baru mendarat SESUDAH cat pertama — persis lompatan yang mau dicegah. */
  className?: string;
}

/**
 * Kartu hero saldo — SATU anatomi untuk Kas Hadiran, Kas RT, dan Talangan.
 *
 * Sebelum 30 Jul 2026 ketiganya menyalin bingkai yang sama lalu menyimpang:
 * label `text-caption font-semibold` di satu tempat & `text-micro font-bold` di
 * tempat lain, jarak tombol `-mr-2` vs `-mr-2 gap-0.5`, kaki kartu dua panel
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
  className = '',
}: HeroSaldoProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl hero-emerald ${className}`}
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
          <p className="flex min-w-0 items-center gap-2 text-[clamp(0.575rem,2.55vw,0.6875rem)] font-semibold uppercase tracking-[0.12em] text-white/90">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-white/80" />}
            <span className="potong-lentur">{label}</span>
            {info}
          </p>
          {actions && <div className="-mr-2 flex shrink-0 items-center">{actions}</div>}
        </div>

        {/* Baris nominal + pil status. DITUMPUK di bawah 360px, dan itu bukan
            kosmetik — di bawah ambang itu ketiga syaratnya tak bisa dipenuhi
            sekaligus di SATU baris:

              nominal utuh (angka uang tak boleh terpotong)
            + `minPx` 30px (lantai keterbacaan lansia — FitAmount berhenti
              menyusut di sini, sengaja)
            + pil "Defisit" `shrink-0` selebar 64px

            Terukur di 320px (lebar WAJIB §1.4.10) pada saldo NYATA RT ini
            (-Rp105.000): FitAmount mentok di lantai 30px, kotak nominal 166px
            sementara teksnya 173,7px — meluber 7,7px ke KANAN, tepat ke tempat
            pil duduk. Pil ber-`bg-rose-700` PEKAT, jadi ia mengecat digit
            terakhir: warga membaca "-Rp105.00" dgn angka nol tertutup badge.
            Kartunya `overflow-hidden`, jadi luberannya tak pernah menggeser
            halaman & tak pernah menyentuh `truncate` — itulah kenapa ia lolos
            `audit:reflow` (mengukur geser samping) MAUPUN `audit:potong`
            (mengukur `truncate`/`line-clamp`), dan `audit:lebar` yang memang
            memburu nominal meluber cuma berjalan di 360px, satu langkah di atas
            ambang tempat cacatnya lahir.

            Menumpuk memulihkan ketiganya tanpa mengorbankan satu pun: nominal
            dapat lebar kartu PENUH (FitAmount justru menaikkan hurufnya lagi),
            pil turun ke barisnya sendiri. Perilaku ini sudah jadi kanon di hero
            Beranda — `flex-wrap` di sana melakukan hal yang sama; HeroSaldo
            satu-satunya yang tak punya katupnya.

            AMBANGNYA 390px sejak 2 Sep 2026 — dinaikkan dari 359px atas
            permintaan user ("hero 360 naikin juga"), dan catatan lama yang
            MENOLAK ambang ini sengaja ditulis ulang di sini supaya tak
            dikembalikan diam-diam oleh sesi berikutnya.

            Penolakan lama berbunyi: "kartu tumbuh 192,7 -> 240,8px (+48) dan
            nominal melonjak ke 47px". Angkanya benar, LINGKUPNYA yang terlalu
            luas — ia mengira SEMUA hero tumbuh. Diukur ulang per-hero di 360px:

                Hadiran (punya pil "Defisit")  30 -> 40px · kartu 187 -> 233px
                Kas RT  (tanpa pil)            39 -> 39px · kartu 256 -> 256px

            Hanya hero BER-PIL yang tumbuh, karena hanya di sana ada dua anak
            yang berebut satu baris. Dan hero ber-pil itu justru yang tadinya
            duduk di 30px — LANTAI `minPx`, ukuran terkecil yang mungkin.

            Yang memicu peninjauan: user melaporkan hero "kecil", dan
            pengukuran menemukan ketidakmonotonan yang tak pernah terlihat —
            360px (30px) lebih KECIL daripada 320px (34px), justru karena 320
            sudah ditumpuk & dapat lebar penuh sementara 360 tidak. Layar lebih
            besar memberi angka lebih kecil; itu bukan trade-off, itu cacat.

            Sesudah ambang naik (Hadiran): 320 34px · 360 40px · 390 45px.
            Ongkosnya jujur: kartu +46px di 360 dan +40px di 390, dan di 390
            hero jadi lebih besar daripada di 430 (45 vs 40) karena baris tumpuk
            memberi lebar penuh. Itu diterima sadar-sadar — nominal uang yang
            terbaca menang atas tinggi kartu yang seragam.

            `minPx` 30px TIDAK diturunkan & jangan pernah diturunkan: itu lantai
            keterbacaan warga lansia. Kalau baris ini sesak lagi, naikkan
            ambangnya satu langkah lagi — bukan lantainya.

            `items-stretch` WAJIB saat menumpuk: dgn `items-start` lebar <p>
            menyusut jadi max-content, dan FitAmount membaca `clientWidth`
            untuk menghitung skalanya — ia akan mengukur kotak yang sudah
            terlanjur mengecil. */}
        <div className="mt-1 flex items-end gap-x-3 max-[390px]:flex-col max-[390px]:items-stretch max-[390px]:gap-y-2">
          <FitAmount
            measure={measure}
            maxPx={48}
            minPx={30}
            className="min-w-0 flex-1 font-display font-extrabold tracking-tighter tabular-nums text-white"
          >
            {amount}
          </FitAmount>
          {/* Pembungkus supaya pil tak ikut melar saat `items-stretch`; di >=360px
              ia flex-item biasa sehingga tampilan lama tak bergerak sama sekali. */}
          {/* `self-start` WAJIB seambang dgn tumpukan di atas (390px, bukan 359):
              saat menumpuk, induknya `items-stretch`, jadi tanpa ini pembungkus
              pil melar selebar baris (terukur 280px @360 · 310px @390 untuk pil
              64px). Pilnya sendiri tetap rata kiri sehingga TAK terlihat beda —
              itulah kenapa ambang yang tertinggal ini gampang lolos. Kalau ambang
              tumpuk digeser lagi, geser baris ini di commit yang SAMA. */}
          {status && <div className="flex shrink-0 items-end max-[390px]:self-start">{status}</div>}
        </div>

        {caption && <p className="mt-1 text-caption angka-prosa text-white/90">{caption}</p>}
        {children}
        {stats && stats.length > 0 && <HeroStats items={stats} className="mt-4 pt-5" />}
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
      /* `spin` di sini SELALU berarti "sedang bekerja" (muat ulang / menyiapkan
         kartu PNG), jadi keadaan itu ikut diberitahukan ke pembaca layar.
         Tombolnya sengaja TIDAK di-`disabled`: menonaktifkan tombol yang sedang
         difokus melempar fokus ke <body>, dan penjaga ketukan-ganda-nya sudah
         ada di latch sinkron `useAksiBerat()` — bukan di sini. */
      aria-busy={spin || undefined}
      className="press flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
    >
      <Icon className={`h-4 w-4 text-white/80 ${spin ? 'animate-spin' : ''}`} />
    </button>
  );
}
