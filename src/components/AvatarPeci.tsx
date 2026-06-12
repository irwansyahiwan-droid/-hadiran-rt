interface AvatarPeciProps {
  nama: string;
  className?: string;
}

// Palet gradient lembut — dipilih via hash nama agar konsisten & bervariasi.
// Hue dijaga di keluarga hijau/biru/hangat/netral (tanpa violet/fuchsia) agar
// tetap satu bahasa dengan brand hijau; tiap entri wajib punya pasangan dark.
const PALETTE = [
  { bg: 'bg-gradient-to-br from-emerald-50 to-teal-100/80 dark:from-emerald-900/40 dark:to-teal-900/30',  text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-gradient-to-br from-blue-50 to-indigo-100/70 dark:from-blue-900/40 dark:to-indigo-900/30',   text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-gradient-to-br from-amber-50 to-orange-100/70 dark:from-amber-900/40 dark:to-orange-900/30',  text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-800/60 dark:to-slate-700/40', text: 'text-slate-700 dark:text-slate-300' },
  { bg: 'bg-gradient-to-br from-rose-50 to-pink-100/70 dark:from-rose-900/40 dark:to-pink-900/30',     text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-gradient-to-br from-cyan-50 to-sky-100/70 dark:from-cyan-900/40 dark:to-sky-900/30',      text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-gradient-to-br from-lime-50 to-green-100/70 dark:from-lime-900/40 dark:to-green-900/30',    text: 'text-lime-700 dark:text-lime-300' },
  { bg: 'bg-gradient-to-br from-teal-50 to-cyan-100/70 dark:from-teal-900/40 dark:to-cyan-900/30', text: 'text-teal-700 dark:text-teal-300' },
];

function hashName(nama: string): number {
  let h = 0;
  const s = nama || 'A';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function AvatarPeci({ nama, className = 'w-12 h-12 rounded-xl' }: AvatarPeciProps) {
  const { bg, text } = PALETTE[hashName(nama) % PALETTE.length];
  const initial = (nama || '?').charAt(0).toUpperCase();

  return (
    <div className={`${bg} ${className} flex items-center justify-center shrink-0`}>
      <span className={`text-base font-bold tracking-wide ${text}`}>{initial}</span>
    </div>
  );
}
