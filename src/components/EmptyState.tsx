import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  className?: string;
  /** Aksi lanjut yang jelas — wajib untuk empty-state hasil filter (mis. "Reset filter"). */
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
}

/** Empty state ilustratif — scene berlapis: backdrop lembut + elemen
 *  dekoratif mengambang + tile ikon mengambang di tengah. */
export default function EmptyState({ icon: Icon, title, subtitle, className = '', action }: EmptyStateProps) {
  return (
    /* `data-keadaan` = penanda OPT-IN untuk `audit:keadaan` (preseden `data-grafik`
       & `data-ptr`): sapuan itu kini menandai tiap teks berangka di layar gagal
       sebagai klaim palsu, dan isi Empty/ErrorState harus dikecualikan — tak ada
       ciri struktural yang membedakannya dari teks halaman biasa. */
    <div data-keadaan="kosong" className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="relative w-28 h-24 mb-4">
        {/* Backdrop lembut */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-100/70 to-emerald-50/40 dark:from-gray-800 dark:to-gray-800/50" />

        {/* Tiga bintik dekoratif DIBUANG (6 Agu). Kelas `.blob` yang membuatnya
            mengambang sudah dihapus 10 Jul, jadi yang tersisa cuma tiga titik
            DIAM — komentar lama masih bilang "mengambang" padahal tak ada yang
            bergerak. Warnanya pun tiga hue di luar aturan: amber-300 itu
            keluarga WARN (warna semantik dipakai sebagai hiasan), teal-300 hijau
            ketiga di app yang seharusnya punya satu aksen. Sisanya —
            latar bertint + emblem ketupat + tile ikon — persis yang diminta
            kanon §4: "a small illustration or tinted icon tile", bukan konfeti. */}
        {/* Emblem ketupat (anyaman) — identitas RT yang samar membingkai ikon →
            empty-state terasa "milik app ini", bukan SaaS generik. Emerald (bukan
            emas: jaga scope `--gold-songket` honor). Statik di belakang tile yang
            mengambang → parallax halus. */}
        <span aria-hidden className="absolute inset-0 m-auto w-[68px] h-[68px] rotate-45 rounded-[15px] border border-emerald-400/35 dark:border-emerald-300/15" />

        {/* Tile ikon di tengah — token `lift` (crisp card language), bukan shadow-lg
            generik. `empty-bob` = pop masuk lalu mengambang halus (scene bernapas). */}
        <div className="empty-bob lift absolute inset-0 m-auto w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
          <Icon className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
        </div>
      </div>

      <p className="text-balance text-body font-bold text-gray-700 dark:text-gray-200">{title}</p>
      {subtitle && (
        <p className="text-pretty text-caption text-ink-faint dark:text-gray-400 mt-1 max-w-[230px] leading-relaxed">{subtitle}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="press mt-4 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-body font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200/60 dark:ring-emerald-800/40 active:bg-emerald-100 dark:active:bg-emerald-900/30 transition-colors"
        >
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
