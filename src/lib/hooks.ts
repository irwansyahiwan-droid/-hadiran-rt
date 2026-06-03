import { useState, useEffect } from 'react';

export function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    setCurrent(0);
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return current;
}
