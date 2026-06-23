interface AvatarPeciProps {
  nama: string;
  className?: string;
}

/**
 * Avatar inisial — SATU warna netral (slate) untuk semua anggota.
 * Sebelumnya 8 gradient warna-warni (hash nama) → ramai & terasa "indie".
 * Netral tenang ala Linear/Mercury: fokus ke data, bukan ke avatar.
 */
export default function AvatarPeci({ nama, className = 'w-12 h-12 rounded-xl' }: AvatarPeciProps) {
  const initial = (nama || '?').charAt(0).toUpperCase();

  return (
    <div className={`bg-slate-100 dark:bg-slate-800 ring-1 ring-black/[0.05] dark:ring-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${className} flex items-center justify-center shrink-0`}>
      <span className="text-base font-bold tracking-wide text-slate-600 dark:text-slate-300">{initial}</span>
    </div>
  );
}
