import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { sessionsApi } from '../api/sessions.api';
import { useAuthStore } from '../store/authStore';

interface UseSessionMonitorOptions {
  enabled?: boolean;
  pollingInterval?: number; // in milliseconds
  checkOnFocus?: boolean;
}

/**
 * Professional session monitoring hook with:
 * - Periodic polling validation
 * - Tab visibility detection (checks session on tab focus)
 * - Automatic logout on session revocation
 */
export function useSessionMonitor(options: UseSessionMonitorOptions = {}) {
  const {
    enabled = true,
    pollingInterval = 60000, // Default: 60 seconds
    checkOnFocus = true,
  } = options;

  const { logoutWithRedirect, isAuthenticated } = useAuthStore();
  const isValidatingRef = useRef(false);
  const lastCheckTimeRef = useRef(Date.now());

  const validateSession = useCallback(async () => {
    // Prevent concurrent validations
    if (isValidatingRef.current || !isAuthenticated) {
      return;
    }

    // Rate limiting: Don't check more than once every 10 seconds
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 10000) {
      return;
    }

    isValidatingRef.current = true;
    lastCheckTimeRef.current = now;

    try {
      const isValid = await sessionsApi.validateCurrentSession();

      if (!isValid) {
        toast.error('Sessioningiz boshqa qurilmadan tugatilgan. Qayta kiring.', {
          duration: 4000,
          icon: '🔒',
        });
        logoutWithRedirect(1000);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401 || axiosError?.response?.status === 403) {
        // Axios interceptor handles logout automatically
      }
      // Network errors — silently ignore, don't logout
    } finally {
      isValidatingRef.current = false;
    }
  }, [isAuthenticated, logoutWithRedirect]);

  // Periodic polling
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    const intervalId = setInterval(() => {
      validateSession();
    }, pollingInterval);

    // Initial check after 5 seconds (give time for app to initialize)
    const timeoutId = setTimeout(() => {
      validateSession();
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [enabled, isAuthenticated, pollingInterval, validateSession]);

  // Visibility API - check session when tab becomes visible
  useEffect(() => {
    if (!enabled || !checkOnFocus || !isAuthenticated) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, checkOnFocus, isAuthenticated, validateSession]);

  // Focus event as fallback for older browsers
  useEffect(() => {
    if (!enabled || !checkOnFocus || !isAuthenticated) {
      return;
    }

    const handleFocus = () => {
      validateSession();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, checkOnFocus, isAuthenticated, validateSession]);
}
