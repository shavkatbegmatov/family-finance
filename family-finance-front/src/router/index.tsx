import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { PageLoader } from '../components/common/PageLoader';
import { PermissionCode } from '../hooks/usePermission';

// Auth pages (small, load immediately)
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage';

// Lazy-loaded main app pages
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TransactionsPage = lazy(() => import('../pages/transactions/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const AccountsPage = lazy(() => import('../pages/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })));
const AccountDetailPage = lazy(() => import('../pages/accounts/AccountDetailPage').then(m => ({ default: m.AccountDetailPage })));
const CategoriesPage = lazy(() => import('../pages/categories/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const BudgetPage = lazy(() => import('../pages/budget/BudgetPage').then(m => ({ default: m.BudgetPage })));
const SavingsPage = lazy(() => import('../pages/savings/SavingsPage').then(m => ({ default: m.SavingsPage })));
const DebtsPage = lazy(() => import('../pages/debts/DebtsPage').then(m => ({ default: m.DebtsPage })));
const FamilyMembersPage = lazy(() => import('../pages/family/FamilyMembersPage').then(m => ({ default: m.FamilyMembersPage })));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const RolesPage = lazy(() => import('../pages/roles/RolesPage').then(m => ({ default: m.RolesPage })));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AuditLogsPage = lazy(() => import('../pages/audit-logs/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const UsersPage = lazy(() => import('../pages/users/UsersPage').then(m => ({ default: m.UsersPage })));
const HouseholdPage = lazy(() => import('../pages/household/HouseholdPage').then(m => ({ default: m.HouseholdPage })));
const MemberDetailPage = lazy(() => import('../pages/household/MemberDetailPage').then(m => ({ default: m.MemberDetailPage })));
const FamilyGroupSettingsPage = lazy(() => import('../pages/settings/FamilyGroupSettings').then(m => ({ default: m.FamilyGroupSettings })));
const BanksPage = lazy(() => import('../pages/settings/BanksPage').then(m => ({ default: m.BanksPage })));

// Points layout & pages
const PointsLayout = lazy(() => import('../components/points/PointsLayout').then(m => ({ default: m.PointsLayout })));
const PointsDashboardPage = lazy(() => import('../pages/points/PointsDashboardPage').then(m => ({ default: m.PointsDashboardPage })));
const PointsParticipantsPage = lazy(() => import('../pages/points/PointsParticipantsPage').then(m => ({ default: m.PointsParticipantsPage })));
const PointsTasksPage = lazy(() => import('../pages/points/PointsTasksPage').then(m => ({ default: m.PointsTasksPage })));
const PointsLeaderboardPage = lazy(() => import('../pages/points/PointsLeaderboardPage').then(m => ({ default: m.PointsLeaderboardPage })));
const PointsHistoryPage = lazy(() => import('../pages/points/PointsHistoryPage').then(m => ({ default: m.PointsHistoryPage })));
const PointsConversionPage = lazy(() => import('../pages/points/PointsConversionPage').then(m => ({ default: m.PointsConversionPage })));
const PointsSavingsPage = lazy(() => import('../pages/points/PointsSavingsPage').then(m => ({ default: m.PointsSavingsPage })));
const PointsAchievementsPage = lazy(() => import('../pages/points/PointsAchievementsPage').then(m => ({ default: m.PointsAchievementsPage })));
const PointsShopPage = lazy(() => import('../pages/points/PointsShopPage').then(m => ({ default: m.PointsShopPage })));
const PointsChallengesPage = lazy(() => import('../pages/points/PointsChallengesPage').then(m => ({ default: m.PointsChallengesPage })));
const PointsSettingsPage = lazy(() => import('../pages/points/PointsSettingsPage').then(m => ({ default: m.PointsSettingsPage })));

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    handle: { title: 'Kirish' },
  },
  {
    path: '/register',
    element: <RegisterPage />,
    handle: { title: "Ro'yxatdan o'tish" },
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    handle: { title: "Parolni o'zgartirish" },
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute permission={PermissionCode.DASHBOARD_VIEW}>
            <LazyRoute><DashboardPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Bosh sahifa' },
      },
      {
        path: 'transactions',
        element: (
          <ProtectedRoute permission={PermissionCode.TRANSACTIONS_VIEW}>
            <LazyRoute><TransactionsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Tranzaksiyalar' },
      },
      {
        path: 'accounts',
        element: (
          <ProtectedRoute permission={PermissionCode.ACCOUNTS_VIEW}>
            <LazyRoute><AccountsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Hisoblar' },
      },
      {
        path: 'accounts/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.ACCOUNTS_VIEW}>
            <LazyRoute><AccountDetailPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Hisob tafsilotlari' },
      },
      {
        path: 'categories',
        element: (
          <ProtectedRoute permission={PermissionCode.CATEGORIES_VIEW}>
            <LazyRoute><CategoriesPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Kategoriyalar' },
      },
      {
        path: 'budget',
        element: (
          <ProtectedRoute permission={PermissionCode.BUDGETS_VIEW}>
            <LazyRoute><BudgetPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Byudjet' },
      },
      {
        path: 'savings',
        element: (
          <ProtectedRoute permission={PermissionCode.SAVINGS_VIEW}>
            <LazyRoute><SavingsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: "Jamg'armalar" },
      },
      {
        path: 'debts',
        element: (
          <ProtectedRoute permission={PermissionCode.DEBTS_VIEW}>
            <LazyRoute><DebtsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Qarzlar' },
      },
      {
        path: 'points',
        element: (
          <ProtectedRoute permission={PermissionCode.POINTS_VIEW}>
            <LazyRoute><PointsLayout /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Ball tizimi' },
        children: [
          {
            index: true,
            element: <LazyRoute><PointsDashboardPage /></LazyRoute>,
          },
          {
            path: 'participants',
            element: <LazyRoute><PointsParticipantsPage /></LazyRoute>,
            handle: { title: 'Ishtirokchilar' },
          },
          {
            path: 'tasks',
            element: <LazyRoute><PointsTasksPage /></LazyRoute>,
            handle: { title: 'Vazifalar' },
          },
          {
            path: 'leaderboard',
            element: (
              <ProtectedRoute permission={PermissionCode.POINTS_VIEW_LEADERBOARD}>
                <PointsLeaderboardPage />
              </ProtectedRoute>
            ),
            handle: { title: 'Reyting' },
          },
          {
            path: 'history/:id?',
            element: <LazyRoute><PointsHistoryPage /></LazyRoute>,
            handle: { title: 'Ball tarixi' },
          },
          {
            path: 'convert',
            element: (
              <ProtectedRoute permission={PermissionCode.POINTS_CONVERT}>
                <PointsConversionPage />
              </ProtectedRoute>
            ),
            handle: { title: 'Ayirboshlash' },
          },
          {
            path: 'savings',
            element: <LazyRoute><PointsSavingsPage /></LazyRoute>,
            handle: { title: "Jamg'arma va Investitsiya" },
          },
          {
            path: 'achievements',
            element: <LazyRoute><PointsAchievementsPage /></LazyRoute>,
            handle: { title: 'Yutuqlar' },
          },
          {
            path: 'shop',
            element: <LazyRoute><PointsShopPage /></LazyRoute>,
            handle: { title: "Do'kon" },
          },
          {
            path: 'challenges',
            element: <LazyRoute><PointsChallengesPage /></LazyRoute>,
            handle: { title: 'Musobaqalar' },
          },
          {
            path: 'settings',
            element: (
              <ProtectedRoute permission={PermissionCode.POINTS_MANAGE}>
                <PointsSettingsPage />
              </ProtectedRoute>
            ),
            handle: { title: 'Ball sozlamalari' },
          },
        ],
      },
      {
        path: 'family',
        element: (
          <ProtectedRoute permission={PermissionCode.FAMILY_VIEW}>
            <LazyRoute><FamilyMembersPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: "Oila a'zolari" },
      },
      {
        path: 'my-family',
        element: (
          <ProtectedRoute permission={PermissionCode.FAMILY_VIEW}>
            <LazyRoute><HouseholdPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Mening oilam' },
      },
      {
        path: 'my-family/members/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.FAMILY_VIEW}>
            <LazyRoute><MemberDetailPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: "A'zo profili" },
      },
      {
        path: 'my-family/settings',
        element: (
          <ProtectedRoute permission={PermissionCode.FAMILY_VIEW}>
            <LazyRoute><FamilyGroupSettingsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: "Guruh sozlamalari" },
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute permission={PermissionCode.REPORTS_VIEW}>
            <LazyRoute><ReportsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Hisobotlar' },
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute permission={PermissionCode.SETTINGS_VIEW}>
            <LazyRoute><SettingsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Sozlamalar' },
      },
      {
        path: 'banks',
        element: (
          <ProtectedRoute permission={PermissionCode.SETTINGS_VIEW}>
            <LazyRoute><BanksPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Banklar ro\'yxati' },
      },
      {
        path: 'roles',
        element: (
          <ProtectedRoute permission={PermissionCode.ROLES_VIEW}>
            <LazyRoute><RolesPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Rollar' },
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute permission={PermissionCode.NOTIFICATIONS_VIEW}>
            <LazyRoute><NotificationsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Bildirishnomalar' },
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute permission={PermissionCode.USERS_VIEW}>
            <LazyRoute><UsersPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Foydalanuvchilar' },
      },
      {
        path: 'audit-logs',
        element: (
          <ProtectedRoute permission={PermissionCode.SETTINGS_VIEW}>
            <LazyRoute><AuditLogsPage /></LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Audit Loglar' },
      },
      {
        path: 'profile',
        element: (
          <LazyRoute><ProfilePage /></LazyRoute>
        ),
        handle: { title: 'Profil' },
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
