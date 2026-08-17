import type { ReactNode } from 'react';

/** Nada angka — dipetakan ke token semantik, bukan hex baru. */
type StatTone = 'ink' | 'pos' | 'info' | 'neg' | 'warn';

const TONE: Record<StatTone, string> = {
  ink:  'text-ink dark:text-gray-100',
  pos:  'text-pos dark:text-emerald-400',
  info: 'text-blue-600 dark:text-blue-400',      /* status 'titip' — sejajar Tag tone info */
  neg:  'text-neg dark:text-rose-400',
  warn: 'text-warn dark:text-amber-400',
};

export interface StatItem {
  label: string;
  value: ReactNode;
  tone?: StatTone;
}

/**
 * Baris statistik seragam untuk seluruh app (Beranda, Jadwal, JadwalWarga).
 *
 * SATU kartu putih dengan kolom bergaris (`divide-x`) — BUKAN kartu terpisah
 * per angka. Sebelumnya ada dua dialek untuk pekerjaan yang sama: Beranda pakai
 * satu kartu berkolom, Jadwal pakai 3–4 kartu `lift` yang berdiri sendiri →
 * layar terasa seperti dua produk. Angka pakai Sora (font-display) + tabular
 * supaya sejajar rapi; warna hanya lewat token semantik di TONE.
 *
 * SATU sumber kebenaran — jangan salin markup stat card lagi.
 */
export default function StatRow({
  items,
  className = '',
}: {
  items: StatItem[];
  className?: string;
}) {
  const cols = items.length;
  /* 4 kolom di layar 390px butuh padding lebih rapat & angka satu tingkat lebih
     kecil agar label ("Tdk Hadir") tidak terpotong. */
  const tight = cols >= 4;

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift ${tight ? 'px-3 py-4' : 'px-5 py-5'} ${className}`}
    >
      <div
        className="grid divide-x divide-line dark:divide-gray-800"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {items.map((s) => (
          <div key={s.label} className={`flex flex-col items-center gap-0.5 ${tight ? 'px-1.5' : 'px-3'}`}>
            <span
              /* NOL tidak berhak atas warna.
                 Warna di app ini dipakai sebagai SINYAL (pos/neg/warn/info), dan
                 nol adalah kabar bahwa tak ada yang perlu disinyalkan. Sebelum
                 ini "0 Titip" tetap dicat biru pekat sekuat "12 Tidak Hadir"
                 yang merah — jadi baris statistik Jadwal menyalakan EMPAT warna
                 sekaligus (tinta, hijau, biru, merah) di satu kartu selebar
                 358px, dan yang paling mencolok justru angka yang tak berisi
                 apa-apa. Nol jatuh ke `ink-faint`: tetap terbaca (10,4:1),
                 tapi berhenti berteriak. Baris yang sama kini menyalakan tiga.

                 Perbandingan sengaja longgar (`==` lewat String) supaya nol
                 dari mana pun ikut — number 0 maupun string '0'. */
              className={`font-display font-bold tabular-nums ${tight ? 'text-xl' : 'text-2xl'} ${
                String(s.value) === '0' ? 'text-ink-faint dark:text-gray-400' : TONE[s.tone ?? 'ink']
              }`}
            >
              {s.value}
            </span>
            <span className="text-caption text-ink-sub dark:text-gray-400 font-medium text-center leading-tight">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
