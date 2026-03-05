import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

const ACTIVITY_STORAGE_KEY = 'ff:last-activity-at';
const BROADCAST_THROTTLE_MS = 5000;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_WARNING_MS = 60 * 1000;

interface UseIdleSessionTimeoutOptions {
  enabled?: boolean;
  timeoutMs?: number;
  warningMs?: number;
  syncAcrossTabs?: boolean;
}

interface UseIdleSessionTimeoutResult {
  showWarning: boolean;
  remainingSeconds: number;
  continueSession: () => void;
  logoutNow: () => void;
}

export function useIdleSessionTimeout(
  options: UseIdleSessionTimeoutOptions = {}
): UseIdleSessionTimeoutResult {
  const {
    enabled = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    warningMs = DEFAULT_WARNING_MS,
    syncAcrossTabs = true,
  } = options;

  const { isAuthenticated, logoutWithRedirect } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.ceil(warningMs / 1000)
  );

  const lastActivityRef = useRef(Date.now());
  const logoutDeadlineRef = useRef(Date.now() + timeoutMs);
  const warningTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const lastBroadcastAtRef = useRef(0);
  const lastActivityHandledAtRef = useRef(0);
  const hasLoggedOutRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const triggerAutoLogout = useCallback(() => {
    if (hasLoggedOutRef.current || !isAuthenticated) {
      return;
    }

    hasLoggedOutRef.current = true;
    clearTimers();
    setShowWarning(false);
    toast.error('Harakatsizlik tufayli sessiyangiz tugadi. Qayta kiring.');
    logoutWithRedirect(0, { captureCurrentPath: true });
  }, [clearTimers, isAuthenticated, logoutWithRedirect]);

  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    const updateCountdown = () => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((logoutDeadlineRef.current - Date.now()) / 1000)
      );
      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0) {
        triggerAutoLogout();
      }
    };

    updateCountdown();
    countdownTimerRef.current = window.setInterval(updateCountdown, 1000);
  }, [triggerAutoLogout]);

  const scheduleTimers = useCallback(
    (activityAt: number) => {
      clearTimers();

      if (!enabled || !isAuthenticated) {
        return;
      }

      const now = Date.now();
      const elapsed = Math.max(0, now - activityAt);
      const remainingToLogout = Math.max(0, timeoutMs - elapsed);
      const remainingToWarning = Math.max(0, timeoutMs - warningMs - elapsed);

      logoutDeadlineRef.current = now + remainingToLogout;

      warningTimerRef.current = window.setTimeout(() => {
        setShowWarning(true);
        startCountdown();
      }, remainingToWarning);

      logoutTimerRef.current = window.setTimeout(() => {
        triggerAutoLogout();
      }, remainingToLogout);
    },
    [
      clearTimers,
      enabled,
      isAuthenticated,
      startCountdown,
      timeoutMs,
      warningMs,
      triggerAutoLogout,
    ]
  );

  const pushActivityToStorage = useCallback(
    (activityAt: number, force: boolean) => {
      if (!syncAcrossTabs) {
        return;
      }

      if (!force && activityAt - lastBroadcastAtRef.current < BROADCAST_THROTTLE_MS) {
        return;
      }

      lastBroadcastAtRef.current = activityAt;
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(activityAt));
      } catch {
        // localStorage may be unavailable
      }
    },
    [syncAcrossTabs]
  );

  const applyActivity = useCallback(
    (activityAt: number, forceBroadcast: boolean) => {
      hasLoggedOutRef.current = false;
      lastActivityRef.current = activityAt;
      setShowWarning(false);
      setRemainingSeconds(Math.ceil(warningMs / 1000));
      scheduleTimers(activityAt);
      pushActivityToStorage(activityAt, forceBroadcast);
    },
    [pushActivityToStorage, scheduleTimers, warningMs]
  );

  const continueSession = useCallback(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }
    applyActivity(Date.now(), true);
  }, [applyActivity, enabled, isAuthenticated]);

  const logoutNow = useCallback(() => {
    if (hasLoggedOutRef.current || !isAuthenticated) {
      return;
    }
    hasLoggedOutRef.current = true;
    clearTimers();
    setShowWarning(false);
    logoutWithRedirect(0, { captureCurrentPath: true });
  }, [clearTimers, isAuthenticated, logoutWithRedirect]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      clearTimers();
      hasLoggedOutRef.current = false;
      setShowWarning(false);
      return;
    }

    let initialActivityAt = Date.now();

    if (syncAcrossTabs) {
      try {
        const rawValue = localStorage.getItem(ACTIVITY_STORAGE_KEY);
        const parsed = rawValue ? Number(rawValue) : NaN;
        if (Number.isFinite(parsed) && Date.now() - parsed < timeoutMs) {
          initialActivityAt = parsed;
        }
      } catch {
        // localStorage may be unavailable
      }
    }

    applyActivity(initialActivityAt, true);

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityHandledAtRef.current < 1000) {
        return;
      }
      lastActivityHandledAtRef.current = now;
      applyActivity(now, false);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (!syncAcrossTabs) {
        return;
      }

      if (event.storageArea !== localStorage || event.key !== ACTIVITY_STORAGE_KEY || !event.newValue) {
        return;
      }

      const incomingActivityAt = Number(event.newValue);
      if (!Number.isFinite(incomingActivityAt)) {
        return;
      }

      if (incomingActivityAt <= lastActivityRef.current) {
        return;
      }

      hasLoggedOutRef.current = false;
      lastActivityRef.current = incomingActivityAt;
      setShowWarning(false);
      setRemainingSeconds(Math.ceil(warningMs / 1000));
      scheduleTimers(incomingActivityAt);
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity);
    });
    window.addEventListener('storage', handleStorageChange);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearTimers();
    };
  }, [
    applyActivity,
    clearTimers,
    enabled,
    isAuthenticated,
    scheduleTimers,
    syncAcrossTabs,
    timeoutMs,
    warningMs,
  ]);

  return {
    showWarning,
    remainingSeconds,
    continueSession,
    logoutNow,
  };
}
