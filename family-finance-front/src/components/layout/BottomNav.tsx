import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  MoreHorizontal,
  Tags,
  PieChart,
  Target,
  HandMetal,
  Users,
  Bell,
  Settings,
  UserCircle,
  UserCog,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';
import clsx from 'clsx';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  permission: string;
}

const primaryItems: NavItem[] = [
  { path: '/', icon: LayoutDashboard, label: 'Bosh sahifa', permission: PermissionCode.DASHBOARD_VIEW },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Tranzaksiyalar', permission: PermissionCode.TRANSACTIONS_VIEW },
  { path: '/accounts', icon: Wallet, label: 'Hisoblar', permission: PermissionCode.ACCOUNTS_VIEW },
  { path: '/reports', icon: BarChart3, label: 'Hisobotlar', permission: PermissionCode.REPORTS_VIEW },
];

const moreItems: NavItem[] = [
  { path: '/categories', icon: Tags, label: 'Kategoriyalar', permission: PermissionCode.CATEGORIES_VIEW },
  { path: '/budget', icon: PieChart, label: 'Byudjet', permission: PermissionCode.BUDGETS_VIEW },
  { path: '/savings', icon: Target, label: "Jamg'armalar", permission: PermissionCode.SAVINGS_VIEW },
  { path: '/debts', icon: HandMetal, label: 'Qarzlar', permission: PermissionCode.DEBTS_VIEW },
  { path: '/family', icon: Users, label: "Oila a'zolari", permission: PermissionCode.FAMILY_VIEW },
  { path: '/notifications', icon: Bell, label: 'Bildirishnomalar', permission: PermissionCode.NOTIFICATIONS_VIEW },
  { path: '/users', icon: UserCog, label: 'Foydalanuvchilar', permission: PermissionCode.USERS_VIEW },
  { path: '/settings', icon: Settings, label: 'Sozlamalar', permission: PermissionCode.SETTINGS_VIEW },
  { path: '/profile', icon: UserCircle, label: 'Profil', permission: '' },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const permissions = useAuthStore((state) => state.permissions);
  const location = useLocation();

  const filteredPrimary = primaryItems.filter((item) => permissions.has(item.permission));
  const filteredMore = moreItems.filter((item) => !item.permission || permissions.has(item.permission));

  // Check if current path is in the "more" menu
  const isMoreActive = filteredMore.some((item) => location.pathname === item.path);

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu sheet */}
      {moreOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-base-200 bg-base-100 pb-20 shadow-2xl lg:hidden">
          <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
            <span className="text-sm font-semibold">Boshqa sahifalar</span>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => setMoreOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 p-3">
            {filteredMore.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-base-content/60 active:bg-base-200'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-base-200 bg-base-100/95 backdrop-blur lg:hidden">
        <div className="flex items-stretch justify-around">
          {filteredPrimary.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-base-content/50 active:text-base-content'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={clsx('h-5 w-5', isActive && 'stroke-[2.5]')} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={clsx(
              'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
              isMoreActive || moreOpen
                ? 'text-primary'
                : 'text-base-content/50 active:text-base-content'
            )}
          >
            <MoreHorizontal className={clsx('h-5 w-5', (isMoreActive || moreOpen) && 'stroke-[2.5]')} />
            <span className="text-[10px] font-medium">Yana</span>
          </button>
        </div>
      </nav>
    </>
  );
}
