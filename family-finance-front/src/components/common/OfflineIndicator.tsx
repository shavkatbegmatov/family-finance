import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Internet aloqasi yo'qligini ko'rsatuvchi banner.
 * navigator.onLine o'zgarishlarini kuzatadi.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-warning-content">
      <WifiOff className="h-4 w-4" />
      Internet aloqasi yo'q
    </div>
  );
}
