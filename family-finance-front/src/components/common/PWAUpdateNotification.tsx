import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

/**
 * PWA yangilanish bildirishnomasi.
 * Yangi versiya mavjud bo'lganda toast ko'rsatadi.
 */
export function PWAUpdateNotification() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
      <div className="flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 p-4 shadow-xl">
        <RefreshCw className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Yangi versiya mavjud</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => updateServiceWorker(true)}
        >
          Yangilash
        </button>
      </div>
    </div>
  );
}
