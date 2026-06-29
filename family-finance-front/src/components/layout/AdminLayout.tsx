import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSessionMonitor } from '../../hooks/useSessionMonitor';
import { useCrossTabSync } from '../../hooks/useCrossTabSync';
import { useIdleSessionTimeout } from '../../hooks/useIdleSessionTimeout';
import { AdminSidebar } from './AdminSidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { PasswordChangeModal } from '../common/PasswordChangeModal';
import { SessionTimeoutModal } from '../common/SessionTimeoutModal';
import { OfflineIndicator } from '../common/OfflineIndicator';

/**
 * SUPER_ADMIN platforma paneli layout'i — oddiy oilaviy {@link MainLayout}'dan ALOHIDA.
 *
 * Farqlar: {@link AdminSidebar} (moliya/oila menyularsiz), ScopeSwitcher YO'Q (super admin'da
 * scope yo'q — Header'da avtomatik yashirinadi), QuickEntryFab YO'Q (super admin yozmaydi),
 * moliyaviy klaviatura yorliqlari YO'Q. Session monitoring + idle timeout + majburiy parol
 * almashtirish (seeder'dagi mustChangePassword) SAQLANADI — xavfsizlik.
 *
 * Ikki tomonlama guard: faqat super admin kira oladi; oddiy user '/' ga qaytariladi.
 * MainLayout esa super admin'ni '/admin' ga yo'naltiradi.
 */
export function AdminLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useSessionMonitor({ enabled: true, pollingInterval: 60000, checkOnFocus: true });
  useCrossTabSync();

  const { showWarning, remainingSeconds, continueSession, logoutNow } = useIdleSessionTimeout({
    enabled: isAuthenticated,
    timeoutMs: 30 * 60 * 1000,
    warningMs: 60 * 1000,
    syncAcrossTabs: true,
  });

  useEffect(() => {
    if (user?.mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [user?.mustChangePassword]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Faqat super admin — oddiy foydalanuvchi oilaviy UI'ga qaytariladi.
  if (!user?.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden text-base-content">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <OfflineIndicator />
        <main className="pb-safe-nav flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 pt-3 lg:px-8 lg:pb-6 lg:pt-4">
          <Outlet />
        </main>
        <Footer />
      </div>

      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <SessionTimeoutModal
        isOpen={showWarning}
        remainingSeconds={remainingSeconds}
        onContinue={continueSession}
        onLogout={logoutNow}
      />
    </div>
  );
}
