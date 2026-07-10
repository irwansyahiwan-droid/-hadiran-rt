import { useRef, useState, useEffect, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { haptic } from '../lib/utils';

const THRESHOLD = 70; // jarak tarik (px) untuk memicu refresh
const MAX = 110;       // jarak tarik maksimum
const RESIST = 0.5;    // resistansi tarikan

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

/** Pull-to-refresh ala native — tarik dari atas untuk memuat ulang. */
export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRef = useRef(0);
  const armed = useRef(false); // sudah lewat threshold (untuk haptic sekali)
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onStart(e: TouchEvent) {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      setAnimating(false);
    }

    function onMove(e: TouchEvent) {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        pulling.current = false;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const dist = Math.min(MAX, dy * RESIST);
      pullRef.current = dist;
      setPull(dist);
      if (dist >= THRESHOLD && !armed.current) {
        armed.current = true;
        haptic(10);
      } else if (dist < THRESHOLD) {
        armed.current = false;
      }
      if (dy > 4 && e.cancelable) e.preventDefault();
    }

    async function onEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      armed.current = false;
      setAnimating(true);
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          await onRefreshRef.current();
        } finally {
          setRefreshing(false);
          pullRef.current = 0;
          setPull(0);
        }
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [refreshing]);

  const progress = Math.min(pull / THRESHOLD, 1);
  const trans = animating ? 'transform 0.3s var(--ease-out-expo)' : 'none';

  return (
    <div ref={ref} className="relative">
      {/* Indikator */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
        style={{
          top: pull - 46,
          opacity: refreshing ? 1 : progress,
          transition: animating ? 'top 0.3s var(--ease-out-expo), opacity 0.3s' : 'none',
        }}
      >
        {/* .float (token overlay) — bukan shadow-lg mentah; indikator melayang di atas konten. */}
        <div className="float w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center ring-1 ring-gray-100 dark:ring-gray-700">
          <RefreshCw
            className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${refreshing ? 'animate-spin' : ''}`}
            style={refreshing ? undefined : { transform: `rotate(${progress * 280}deg)` }}
          />
        </div>
      </div>

      {/* transform hanya saat menarik — translateY(0) pun membuat containing block
          yang merusak posisi modal `position: fixed` di dalamnya. */}
      <div style={{ transform: pull > 0 ? `translateY(${pull}px)` : undefined, transition: trans }}>
        {children}
      </div>
    </div>
  );
}
