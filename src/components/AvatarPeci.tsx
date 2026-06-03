interface AvatarPeciProps {
  nama: string;
  className?: string;
}

function getColors(nama: string) {
  const code = (nama || 'A').toUpperCase().charCodeAt(0);
  if (code >= 65 && code <= 70) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (code >= 71 && code <= 76) return { bg: 'bg-blue-100', text: 'text-blue-700' };
  if (code >= 77 && code <= 82) return { bg: 'bg-amber-100', text: 'text-amber-700' };
  return { bg: 'bg-purple-100', text: 'text-purple-700' };
}

export default function AvatarPeci({ nama, className = 'w-12 h-12 rounded-xl' }: AvatarPeciProps) {
  const { bg, text } = getColors(nama);
  const initial = (nama || '?').charAt(0).toUpperCase();

  return (
    <div className={`${bg} ${className} flex items-center justify-center shrink-0`}>
      <span className={`text-lg font-bold ${text}`}>{initial}</span>
    </div>
  );
}
