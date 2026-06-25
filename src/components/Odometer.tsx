import { memo, useRef } from 'react';

interface OdometerProps {
  /** Nilai yang ditampilkan. Biasanya sudah di-animate via useCountUp agar digit berputar. */
  value: number;
  prefix?: string;
  className?: string;
  /** Durasi roll antar-digit (ms). Pendek agar mengikuti count-up dengan mulus. */
  duration?: number;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
// vertical-align top + lineHeight 1 agar semua bagian (Rp, separator, kolom digit)
// sejajar; inline-block menjaga letter-spacing (tracking-tighter) tetap berlaku.
const cell: React.CSSProperties = { lineHeight: 1, verticalAlign: 'top', display: 'inline-block' };

/**
 * Angka bergaya odometer — tiap digit adalah kolom 0-9 yang bergeser vertikal.
 * Saat `value` berubah (count-up saat mount, atau update realtime), digit
 * "berputar" ke posisi barunya. Menghormati prefers-reduced-motion.
 */
function Odometer({ value, prefix = 'Rp', className = '', duration = 220 }: OdometerProps) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const negative = value < 0;
  const grouped = Math.abs(Math.round(value)).toLocaleString('id-ID');
  const len = grouped.length;

  // Kolom di-key dari KANAN (satuan stabil) → saat angka bertambah panjang
  // (mis. 999→1.000), kolom lama tak remount (roll mulus) & hanya kolom baru
  // di depan yg "masuk dari kiri". `animatedKeys` permanen → kelas tak dicabut
  // di tengah animasi oleh re-render count-up tiap frame; CSS main sekali saat
  // mount. Mount awal TIDAK dianimasikan (seenMax disetel = panjang awal).
  const seenMax = useRef<number | null>(null);
  const animatedKeys = useRef<Set<number>>(new Set());
  if (!prefersReduced) {
    if (seenMax.current === null) {
      seenMax.current = len;
    } else if (len > seenMax.current) {
      for (let r = seenMax.current; r < len; r++) animatedKeys.current.add(r);
      seenMax.current = len;
    }
  }

  // Teks lengkap untuk pembaca layar — kolom digit 0-9 yg bertumpuk dibaca sbg
  // "0123456789" tanpa ini. Kolom visual di-aria-hidden, nilai asli diumumkan.
  const spoken = `${negative ? '-' : ''}${prefix}${grouped}`;

  return (
    <span
      className={`inline-block tabular-nums ${className}`}
      style={{ whiteSpace: 'nowrap' }}
      role="text"
      aria-label={spoken}
    >
      <span aria-hidden="true">
      {negative && <span style={cell}>-</span>}
      {prefix && <span style={cell}>{prefix}</span>}
      {grouped.split('').map((c, i) => {
        const rightIndex = len - 1 - i;
        const colIn = animatedKeys.current.has(rightIndex) ? 'odo-col-in' : '';
        if (c < '0' || c > '9') {
          return (
            <span key={`c${rightIndex}`} className={colIn} style={cell}>
              {c}
            </span>
          );
        }
        const d = Number(c);
        return (
          <span
            key={`c${rightIndex}`}
            className={`overflow-hidden ${colIn}`}
            style={{ ...cell, height: '1em' }}
          >
            <span
              style={{
                display: 'block',
                transform: `translateY(-${d}em)`,
                transition: prefersReduced
                  ? 'none'
                  : `transform ${duration}ms var(--ease-out-expo)`,
                willChange: 'transform',
              }}
            >
              {DIGITS.map((n) => (
                <span key={n} style={{ display: 'block', height: '1em', lineHeight: 1 }}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
      </span>
    </span>
  );
}

export default memo(Odometer);
