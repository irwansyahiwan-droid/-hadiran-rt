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
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="relative w-28 h-24 mb-4">
        {/* Backdrop lembut — amber (beda dari emerald empty). */}
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-amber-100/70 to-amber-50/40 dark:from-gray-800 dark:to-gray-800/50" />

        {/* Elemen dekoratif mengambang. */}
        <span className="blob absolute -top-1 right-3 w-2.5 h-2.5 rounded-full bg-amber-300/80" />
        <span className="blob absolute bottom-2 -left-1 w-3.5 h-3.5 rounded-md bg-orange-300/70" style={{ animationDelay: '-4s' }} />
        <span className="blob absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-amber-400/70" style={{ animationDelay: '-8s' }} />

        {/* Tile ikon di tengah — token `lift` (bahasa kartu crisp), bukan shadow generik. */}
        <div className="empty-bob lift absolute inset-0 m-auto w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
          <Icon className="w-7 h-7 text-warn dark:text-amber-400" strokeWidth={1.7} />
        </div>
      </div>

      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>
      {subtitle && (
        <p className="text-xs text-ink-faint dark:text-gray-400 mt-1 max-w-[240px] leading-relaxed">{subtitle}</p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="press btn-brand mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          <RotateCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} strokeWidth={2.2} />
          {retrying ? 'Memuat…' : 'Coba lagi'}
        </button>
      )}
    </div>
  );
}
