import { useEffect, useCallback } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { useIsMobile } from './hooks/useMediaQuery';
import { PWAUpdateNotification } from './components/common/PWAUpdateNotification';

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
      <RouterProvider router={router} />
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
