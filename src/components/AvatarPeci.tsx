interface AvatarPeciProps {
  nama: string;
  className?: string;
}

function getColors(nama: string) {
  const code = (nama || 'A').toUpperCase().charCodeAt(0);
  if (code >= 65 && code <= 70) return { bg: 'bg-gradient-to-br from-emerald-50 to-teal-100/80', text: 'text-emerald-700' };
  if (code >= 71 && code <= 76) return { bg: 'bg-gradient-to-br from-blue-50 to-indigo-100/70', text: 'text-blue-700' };
  if (code >= 77 && code <= 82) return { bg: 'bg-gradient-to-br from-amber-50 to-orange-100/70', text: 'text-amber-700' };
  return { bg: 'bg-gradient-to-br from-violet-50 to-purple-100/70', text: 'text-purple-700' };
}

export default function AvatarPeci({ nama, className = 'w-12 h-12 rounded-xl' }: AvatarPeciProps) {
  const { bg, text } = getColors(nama);
  const initial = (nama || '?').charAt(0).toUpperCase();

  return (
    <div className={`${bg} ${className} flex items-center justify-center shrink-0`}>
      <span className={`text-base font-bold tracking-wide ${text}`}>{initial}</span>
    </div>
  );
}
