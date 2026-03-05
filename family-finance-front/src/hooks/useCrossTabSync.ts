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

      // Case 1: Access token removed (logout in another tab)
      if (event.key === 'accessToken' && event.oldValue && !event.newValue) {
        toast.error('Siz boshqa tabda chiqib ketdingiz', {
          duration: 3000,
          icon: '🔒',
        });
        logoutWithRedirect(500);
      }

      // Case 2: auth store changed to signed out state in another tab
      if (event.key === 'auth-storage' && event.newValue && isSignedOutAuthStorage(event.newValue)) {
        logoutWithRedirect(500);
      }

      // Case 3: Entire localStorage cleared
      if (event.key === null && event.oldValue === null && event.newValue === null) {
        toast.error('Session tozalandi', {
          duration: 2000,
        });
        logoutWithRedirect(500);
      }

      // Case 4: New login in another tab (token changed)
      if (event.key === 'accessToken' && event.oldValue && event.newValue &&
          event.oldValue !== event.newValue) {
        toast('Boshqa tabda yangi session boshlandi', {
          duration: 3000,
          icon: '🔄',
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated, logoutWithRedirect]);
}
