import { useEffect, useCallback, useState, type ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { authSession } from './auth/authSession';
import { getAccessToken } from './auth/tokenStore';
import { useIsMobile } from './hooks/useMediaQuery';
import { PWAUpdateNotification } from './components/common/PWAUpdateNotification';

/**
 * D12-PR5: access token faqat xotirada — sahifa yuklanganda (persist'da isAuthenticated=true,
 * lekin token yo'q) router render qilinishidan OLDIN httpOnly cookie orqali jimgina refresh
 * qilinadi. Aks holda birinchi so'rovlar 401 olib, har biri alohida refresh'ga urinardi va
 * login sahifasi bir zum "miltillardi". Tiklanmasa — logout, router /login'ga yo'naltiradi.
 */
function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(
    () => !useAuthStore.getState().isAuthenticated || Boolean(getAccessToken()),
  );

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    authSession.bootstrapSession().then((restored) => {
      if (cancelled) return;
      if (!restored) {
        useAuthStore.getState().logout({ revokeServerSession: false });
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-100" aria-busy="true">
        <span className="loading loading-spinner loading-lg text-primary" aria-label="Sessiya tiklanmoqda" />
      </div>
    );
  }

  return <>{children}</>;
}

// Global theme hook - applies theme on app load
function useTheme() {
  const { themeMode, getEffectiveTheme } = useUIStore();

  const applyTheme = useCallback(() => {
    document.documentElement.setAttribute('data-theme', getEffectiveTheme());
  }, [getEffectiveTheme]);

  useEffect(() => {
    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, applyTheme]);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Apply theme globally
  useTheme();
  const isMobile = useIsMobile();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster
        position={isMobile ? 'top-center' : 'top-right'}
        gutter={12}
        containerClassName="app-toast-viewport"
        containerStyle={{
          top: isAuthenticated ? 'var(--toast-top-offset)' : 'var(--toast-public-top-offset)',
          bottom: 'var(--toast-bottom-offset)',
          zIndex: 80,
        }}
        toastOptions={{
          duration: 3500,
          className: 'app-toast bg-base-100 text-base-content border border-base-300',
          style: {
            borderRadius: '16px',
            padding: '12px 14px',
            maxWidth: isMobile ? 'calc(100vw - 32px)' : '390px',
          },
        }}
      />
      <PWAUpdateNotification />
    </QueryClientProvider>
  );
}

export default App;
