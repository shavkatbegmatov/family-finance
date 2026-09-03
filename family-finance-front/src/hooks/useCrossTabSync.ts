import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const isSignedOutAuthStorage = (value: string | null) => {
  if (!value) {
    return true;
  }

  try {
    const parsed = JSON.parse(value) as { state?: { isAuthenticated?: boolean } };
    return parsed.state?.isAuthenticated === false;
  } catch {
    return false;
  }
};

/**
 * Cross-tab session synchronization hook
 *
 * Detects when user logs out or session expires in another tab
 * and synchronizes the logout across all tabs.
 *
 * Uses browser's storage event API to listen for localStorage changes.
 *
 * D12-PR5: tokenlar endi localStorage'da emas (access token xotirada, refresh token httpOnly
 * cookie'da) — logout/login holati faqat persist qilingan `auth-storage` (isAuthenticated,
 * user) orqali sinxronlanadi; access tokenning o'zi tablar orasida `authSession`
 * (BroadcastChannel) bilan bo'lishiladi.
 */
export function useCrossTabSync() {
  const { logoutWithRedirect, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      // Only handle storage events from other tabs (event.storageArea is not null)
      if (!event.storageArea) {
        return;
      }

      // Case 2: auth store changed in another tab
      if (event.key === 'auth-storage' && event.newValue) {
        if (isSignedOutAuthStorage(event.newValue)) {
          logoutWithRedirect(500);
        } else {
          // Boshqa FOYDALANUVCHI login qilgan bo'lsa (id o'zgargan) — to'liq qayta
          // yuklab rehydrate qilamiz. Aks holda bu tab eski user UI holatini ushlab
          // turib, axios yangi user tokeni bilan so'rov yuborardi (cross-user aralashuv).
          try {
            const parsed = JSON.parse(event.newValue) as { state?: { user?: { id?: number } } };
            const newUserId = parsed.state?.user?.id ?? null;
            const currentUserId = useAuthStore.getState().user?.id ?? null;
            if (newUserId != null && currentUserId != null && newUserId !== currentUserId) {
              window.location.reload();
            }
          } catch {
            // ignore — noto'g'ri JSON
          }
        }
      }

      // Case 3: Entire localStorage cleared
      if (event.key === null && event.oldValue === null && event.newValue === null) {
        toast.error('Session tozalandi', {
          duration: 2000,
        });
        logoutWithRedirect(500);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated, logoutWithRedirect]);
}
