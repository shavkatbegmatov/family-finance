import { useMemo, type ComponentType, type CSSProperties } from 'react';
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
  Home,
  BarChart3,
  Bell,
  Settings,
  X,
  Shield,
  UserCog,
  FileText,
  Building2,
  Trophy,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { PermissionCode, type PermissionCodeType } from '../../hooks/usePermission';
import clsx from 'clsx';

interface MenuItem {
  path: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  permission: PermissionCodeType;
}

interface MenuGroup {
  /** Bo'lim sarlavhasi (sidebar'da kichik uppercase yorliq sifatida ko'rinadi). */
  section: string;
  items: MenuItem[];
}

/**
 * Sidebar navigatsiyasi ma'no jihatdan bo'limlarga ajratilgan.
 * Har bir bo'lim ruxsatga ko'ra filtrlanadi — bo'sh bo'lim umuman ko'rinmaydi.
 */
const menuGroups: MenuGroup[] = [
  {
    section: 'Asosiy',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Bosh sahifa', permission: PermissionCode.DASHBOARD_VIEW },
      { path: '/reports', icon: BarChart3, label: 'Hisobotlar', permission: PermissionCode.REPORTS_VIEW },
      { path: '/notifications', icon: Bell, label: 'Bildirishnomalar', permission: PermissionCode.NOTIFICATIONS_VIEW },
    ],
  },
  {
    section: 'Moliya',
    items: [
      { path: '/transactions', icon: ArrowLeftRight, label: 'Tranzaksiyalar', permission: PermissionCode.TRANSACTIONS_VIEW },
      { path: '/accounts', icon: Wallet, label: 'Hisoblar', permission: PermissionCode.ACCOUNTS_VIEW },
      { path: '/budget', icon: PieChart, label: 'Byudjet', permission: PermissionCode.BUDGETS_VIEW },
      { path: '/savings', icon: Target, label: "Jamg'armalar", permission: PermissionCode.SAVINGS_VIEW },
      { path: '/debts', icon: HandMetal, label: 'Qarzlar', permission: PermissionCode.DEBTS_VIEW },
      { path: '/categories', icon: Tags, label: 'Kategoriyalar', permission: PermissionCode.CATEGORIES_VIEW },
    ],
  },
  {
    section: 'Oila',
    items: [
      { path: '/my-family', icon: Home, label: 'Mening oilam', permission: PermissionCode.FAMILY_VIEW },
      { path: '/family', icon: Users, label: "Oila a'zolari", permission: PermissionCode.FAMILY_VIEW },
      { path: '/points', icon: Trophy, label: 'Ball tizimi', permission: PermissionCode.POINTS_VIEW },
    ],
  },
  {
    section: 'Boshqaruv',
    items: [
      { path: '/users', icon: UserCog, label: 'Foydalanuvchilar', permission: PermissionCode.USERS_VIEW },
      { path: '/roles', icon: Shield, label: 'Rollar', permission: PermissionCode.ROLES_VIEW },
      { path: '/banks', icon: Building2, label: 'Banklar', permission: PermissionCode.SETTINGS_VIEW },
      { path: '/audit-logs', icon: FileText, label: 'Audit loglar', permission: PermissionCode.SETTINGS_VIEW },
      { path: '/settings', icon: Settings, label: 'Sozlamalar', permission: PermissionCode.SETTINGS_VIEW },
    ],
  },
];

export function Sidebar() {
  const permissions = useAuthStore((state) => state.permissions);
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // Har bir bo'limdagi ruxsat etilgan elementlarni filtrlash; bo'sh bo'limlarni
  // butunlay olib tashlash. animIndex — barcha bo'limlar bo'ylab uzluksiz
  // stagger animatsiyasi uchun global indeks.
  const visibleGroups = useMemo(() => {
    let animIndex = 0;
    return menuGroups
      .map((group) => ({
        section: group.section,
        items: group.items
          .filter((item) => permissions.has(item.permission))
          .map((item) => ({ ...item, animIndex: animIndex++ })),
      }))
      .filter((group) => group.items.length > 0);
  }, [permissions]);

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
          <div className="flex flex-col gap-5 pb-4">
            {visibleGroups.map((group) => (
              <div key={group.section} role="group" aria-label={group.section}>
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-base-content/40">
                  {group.section}
                </p>
                <ul className="stagger-children flex flex-col gap-1">
                  {group.items.map((item) => (
                    <li
                      key={item.path}
                      style={{ '--i': item.animIndex } as CSSProperties}
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
              </div>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
