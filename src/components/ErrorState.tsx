import { CloudOff, RotateCw, type LucideIcon } from 'lucide-react';

interface ErrorStateProps {
  /** Judul singkat — default "Gagal memuat data". */
  title?: string;
  /** Penjelasan manusiawi + arahan (BUKAN raw error). */
  subtitle?: string;
  /** Aksi muat ulang. Tombol "Coba lagi" hanya tampil bila ada. */
  onRetry?: () => void;
  /** Spinner pada tombol saat percobaan ulang berjalan. */
  retrying?: boolean;
  icon?: LucideIcon;
  className?: string;
}

/** Error state — sejajar EmptyState (scene berlapis + tile ikon mengambang),
 *  tapi bernada amber (sinyal "ada yang salah", bukan "kosong") + tombol "Coba
 *  lagi". Pesan selalu manusiawi; jangan oper raw error ke sini. */
export default function ErrorState({
  title = 'Gagal memuat data',
  subtitle = 'Sambungan mungkin terputus. Periksa internet lalu coba lagi.',
  onRetry,
  retrying = false,
  icon: Icon = CloudOff,
  className = '',
}: ErrorStateProps) {
  return (
    /* `data-keadaan` = penanda OPT-IN untuk `audit:keadaan` (preseden `data-grafik`
       & `data-ptr`) — lihat catatan kembarnya di EmptyState.tsx. */
    <div data-keadaan="gagal" className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="relative w-28 h-24 mb-4">
        {/* Backdrop lembut — amber (beda dari emerald empty). */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-100/70 to-amber-50/40 dark:from-gray-800 dark:to-gray-800/50" />

        {/* Tiga bintik dekoratif DIBUANG (6 Agu) — kembar EmptyState. Kelas
            `.blob` sudah tak ada sejak 10 Jul (jadi tak pernah mengambang), dan
            salah satunya `orange-300`: hue yang TIDAK ADA di palet app sama
            sekali — kanon §2 menetapkan satu amber. */}

        {/* Emblem ketupat — DITAMBAHKAN agar layar gagal punya anatomi yang SAMA
            dgn layar kosong (latar bertint + emblem + tile), cuma beda warna
            semantik. Dulu yang kosong punya emblem identitas RT, yang gagal cuma
            punya konfeti: dua layar sejenis, dua bahasa. */}
        <span aria-hidden className="absolute inset-0 m-auto w-[68px] h-[68px] rotate-45 rounded-[15px] border border-amber-400/35 dark:border-amber-300/15" />

        {/* Tile ikon di tengah — token `lift` (bahasa kartu crisp), bukan shadow generik. */}
        <div className="empty-bob lift absolute inset-0 m-auto w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
          <Icon className="w-7 h-7 text-warn dark:text-amber-400" />
        </div>
      </div>

      <p className="text-balance text-body font-bold text-gray-700 dark:text-gray-200">{title}</p>
      {subtitle && (
        <p className="text-pretty text-caption text-ink-faint dark:text-gray-400 mt-1 max-w-[240px] leading-relaxed">{subtitle}</p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="press btn-brand mt-5 inline-flex items-center gap-2 px-5 py-3 text-body"
        >
          <RotateCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Memuat…' : 'Coba lagi'}
        </button>
      )}
    </div>
  );
}
