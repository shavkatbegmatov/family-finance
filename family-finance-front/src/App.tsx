import { useEffect, useCallback } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import { useUIStore } from './store/uiStore';
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

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position={isMobile ? 'top-center' : 'top-right'}
        toastOptions={{
          duration: 3000,
          className: 'bg-base-100 text-base-content border border-base-300',
          style: {
            borderRadius: '14px',
            padding: '12px 14px',
          },
        }}
      />
      <PWAUpdateNotification />
    </QueryClientProvider>
  );
}

export default App;
