interface AvatarPeciProps {
  nama: string;
  className?: string;
}

function getColors(nama: string) {
  const code = (nama || 'A').toUpperCase().charCodeAt(0);
  if (code >= 65 && code <= 70) return { bg: 'bg-emerald-100', fill: '#047857' };
  if (code >= 71 && code <= 76) return { bg: 'bg-blue-100', fill: '#1d4ed8' };
  if (code >= 77 && code <= 82) return { bg: 'bg-amber-100', fill: '#b45309' };
  return { bg: 'bg-purple-100', fill: '#7e22ce' };
}

export default function AvatarPeci({ nama, className = 'w-10 h-10 rounded-2xl' }: AvatarPeciProps) {
  const { bg, fill } = getColors(nama);

  return (
    <div className={`${bg} ${className} flex items-center justify-center overflow-hidden shrink-0`}>
      <svg viewBox="0 0 32 32" fill="none" className="w-[75%] h-[75%]">
        {/* Peci */}
        <rect x="10" y="3" width="12" height="8" rx="2" fill={fill} />
        {/* Head */}
        <circle cx="16" cy="17" r="7" fill={fill} />
        {/* Shoulders */}
        <path d="M2 32 C2 24 8 21 16 21 C24 21 30 24 30 32 Z" fill={fill} />
      </svg>
    </div>
  );
}
