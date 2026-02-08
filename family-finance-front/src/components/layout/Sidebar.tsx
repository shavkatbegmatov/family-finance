import type { CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  PieChart,
  Target,
  HandMetal,
  Users,
  BarChart3,
  Bell,
  Settings,
  X,
  Shield,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { PermissionCode } from '../../hooks/usePermission';
import clsx from 'clsx';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Bosh sahifa', permission: PermissionCode.DASHBOARD_VIEW },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Tranzaksiyalar', permission: PermissionCode.TRANSACTIONS_VIEW },
  { path: '/accounts', icon: Wallet, label: 'Hisoblar', permission: PermissionCode.ACCOUNTS_VIEW },
  { path: '/categories', icon: Tags, label: 'Kategoriyalar', permission: PermissionCode.CATEGORIES_VIEW },
  { path: '/budget', icon: PieChart, label: 'Byudjet', permission: PermissionCode.BUDGETS_VIEW },
  { path: '/savings', icon: Target, label: "Jamg'armalar", permission: PermissionCode.SAVINGS_VIEW },
  { path: '/debts', icon: HandMetal, label: 'Qarzlar', permission: PermissionCode.DEBTS_VIEW },
  { path: '/family', icon: Users, label: "Oila a'zolari", permission: PermissionCode.FAMILY_VIEW },
  { path: '/reports', icon: BarChart3, label: 'Hisobotlar', permission: PermissionCode.REPORTS_VIEW },
  { path: '/notifications', icon: Bell, label: 'Bildirishnomalar', permission: PermissionCode.NOTIFICATIONS_VIEW },
  { path: '/roles', icon: Shield, label: 'Rollar', permission: PermissionCode.ROLES_VIEW },
  { path: '/audit-logs', icon: FileText, label: 'Audit loglar', permission: PermissionCode.SETTINGS_VIEW },
  { path: '/settings', icon: Settings, label: 'Sozlamalar', permission: PermissionCode.SETTINGS_VIEW },
];

export function Sidebar() {
  const permissions = useAuthStore((state) => state.permissions);
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const filteredItems = menuItems.filter(
    (item) => permissions.has(item.permission)
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="button"
          aria-label="Menyuni yopish"
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-base-100/95 backdrop-blur transition-transform lg:sticky lg:translate-x-0',
          'border-r border-base-200 shadow-[var(--shadow-soft)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative flex h-16 items-center justify-between overflow-hidden border-b border-base-200 px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
              <span className="text-base font-bold">F</span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Family Finance</h1>
              <p className="text-[11px] text-base-content/60">
                Oilaviy moliya boshqaruvi
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm relative lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin" aria-label="Asosiy navigatsiya">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-base-content/40">
            Navigatsiya
          </p>
          <ul className="stagger-children flex flex-col gap-1 pb-4">
            {filteredItems.map((item, index) => (
              <li
                key={item.path}
                style={{ '--i': index } as CSSProperties}
              >
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'border-base-300 bg-base-200 text-base-content shadow-sm'
                        : 'border-transparent text-base-content/70 hover:border-base-300 hover:bg-base-200/70 hover:text-base-content'
                    )
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={clsx(
                          'grid h-9 w-9 place-items-center rounded-lg transition',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-base-200/70 text-base-content/50 group-hover:text-primary'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                      </span>
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
