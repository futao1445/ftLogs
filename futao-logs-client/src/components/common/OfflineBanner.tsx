'use client';

import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    setOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="w-full text-center py-1.5 text-xs font-medium animate-[fadeIn_0.2s_ease-out]"
      style={{
        background: 'rgba(251, 191, 36, 0.12)',
        color: 'var(--gold)',
        borderBottom: '1px solid rgba(251, 191, 36, 0.15)',
      }}
    >
      ⚡ 网络已断开，部分功能不可用
    </div>
  );
}
