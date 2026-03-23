import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSessionMonitor } from '../../hooks/useSessionMonitor';
import { useCrossTabSync } from '../../hooks/useCrossTabSync';
import { useIdleSessionTimeout } from '../../hooks/useIdleSessionTimeout';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { PasswordChangeModal } from '../common/PasswordChangeModal';
import { SessionTimeoutModal } from '../common/SessionTimeoutModal';
import { OfflineIndicator } from '../common/OfflineIndicator';
import { useFamilyTreeStore } from '../../store/familyTreeStore';

export function MainLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isSidebarPinned = useFamilyTreeStore((s) => s.isSidebarPinned);
  const activeModal = useFamilyTreeStore((s) => s.activeModal);
  const {
    showWarning,
    remainingSeconds,
    continueSession,
    logoutNow,
  } = useIdleSessionTimeout({
    enabled: isAuthenticated,
    timeoutMs: 30 * 60 * 1000,
    warningMs: 60 * 1000,
    syncAcrossTabs: true,
  });

  const isPinnedFamilyDetailOpen =
    location.pathname.startsWith('/family') &&
    isSidebarPinned &&
    activeModal?.type === 'personDetail';

  // Professional session monitoring:
  // - Checks session every 60 seconds
  // - Validates session when tab becomes visible
  // - Auto-logout if session revoked from another device
  useSessionMonitor({
    enabled: true,
    pollingInterval: 60000, // 60 seconds
    checkOnFocus: true,
  });

  // Cross-tab session synchronization:
  // - Detects logout in other tabs and syncs immediately
  // - Prevents user from being logged in on one tab and logged out on another
  useCrossTabSync();

  // Show password change modal if user must change password
  useEffect(() => {
    if (user?.mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [user?.mustChangePassword]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden text-base-content">
      <Sidebar />
      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${isPinnedFamilyDetailOpen ? 'sm:pr-[360px]' : ''}`}>
        <Header />
        <OfflineIndicator />
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden px-4 pb-20 pt-4 lg:px-8 lg:pb-6">
          <Outlet />
        </main>
        <Footer />
        <BottomNav />
      </div>

      {/* Password Change Modal - shows if user mustChangePassword */}
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
