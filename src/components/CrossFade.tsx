import { useEffect, useState, type ReactNode } from 'react';

interface CrossFadeProps {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Cross-fade skeleton → konten. Saat data siap, konten memudar masuk
 * sementara skeleton (ditumpuk di atasnya) memudar keluar lalu dilepas.
 */
export default function CrossFade({ loading, skeleton, children, className = '' }: CrossFadeProps) {
  const [showSkeleton, setShowSkeleton] = useState(loading);

  useEffect(() => {
    if (loading) {
      setShowSkeleton(true);
      return;
    }
    const t = setTimeout(() => setShowSkeleton(false), 380);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <div className={`relative ${className}`}>
      {!loading && <div className="cf-in">{children}</div>}
      {showSkeleton && (
        <div className={!loading ? 'cf-out absolute inset-0' : ''} aria-hidden={!loading}>
          {skeleton}
        </div>
      )}
    </div>
  );
}
