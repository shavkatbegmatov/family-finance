import { useEffect, useState } from 'react';
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
  Plus,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';
import { useQuickEntryStore } from '../../store/quickEntryStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import clsx from 'clsx';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  permission: string;
}

// Asosiy panel elementlari — markaziy FAB chap/o'ngga 2 tadan taqsimlaydi.
const homeItem: NavItem = { path: '/', icon: LayoutDashboard, label: 'Bosh', permission: PermissionCode.DASHBOARD_VIEW };
const txItem: NavItem = { path: '/transactions', icon: ArrowLeftRight, label: 'Amallar', permission: PermissionCode.TRANSACTIONS_VIEW };
const accountsItem: NavItem = { path: '/accounts', icon: Wallet, label: 'Hisoblar', permission: PermissionCode.ACCOUNTS_VIEW };
const reportsItem: NavItem = { path: '/reports', icon: BarChart3, label: 'Hisobot', permission: PermissionCode.REPORTS_VIEW };

const moreItems: NavItem[] = [
  { path: '/reports', icon: BarChart3, label: 'Hisobotlar', permission: PermissionCode.REPORTS_VIEW },
  { path: '/budget', icon: PieChart, label: 'Byudjet', permission: PermissionCode.BUDGETS_VIEW },
  { path: '/savings', icon: Target, label: "Jamg'arma", permission: PermissionCode.SAVINGS_VIEW },
  { path: '/debts', icon: HandMetal, label: 'Qarzlar', permission: PermissionCode.DEBTS_VIEW },
  { path: '/categories', icon: Tags, label: 'Kategoriya', permission: PermissionCode.CATEGORIES_VIEW },
  { path: '/family', icon: Users, label: "Oila", permission: PermissionCode.FAMILY_VIEW },
  { path: '/notifications', icon: Bell, label: 'Bildirishnoma', permission: PermissionCode.NOTIFICATIONS_VIEW },
  { path: '/users', icon: UserCog, label: 'Foydalanuvchi', permission: PermissionCode.USERS_VIEW },
  { path: '/settings', icon: Settings, label: 'Sozlamalar', permission: PermissionCode.SETTINGS_VIEW },
  { path: '/profile', icon: UserCircle, label: 'Profil', permission: '' },
];

/** Bitta pastki navigatsiya tugmasi (ikonka + yorliq, aktiv holatda pill highlight). */
function NavTab({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        clsx(
          'group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-1 tap-sm',
          isActive ? 'text-primary' : 'text-base-content/50 active:text-base-content'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={clsx(
              'grid place-items-center rounded-full px-4 py-1 transition-colors duration-200',
              isActive ? 'bg-primary/12' : 'bg-transparent'
            )}
          >
            <item.icon className={clsx('h-[22px] w-[22px]', isActive && 'stroke-[2.4]')} />
          </span>
          <span className="w-full truncate text-center text-[10px] font-semibold leading-none">
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTrapRef = useFocusTrap(moreOpen);

  // Esc bosilganda "Yana" varag'ini yopish (tashqi klaviaturali planshetlar uchun)
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);
  const permissions = useAuthStore((state) => state.permissions);
  const openQuickEntry = useQuickEntryStore((s) => s.open);
  const location = useLocation();

  const has = (perm: string) => !perm || permissions.has(perm);
  const canCreate = permissions.has(PermissionCode.TRANSACTIONS_CREATE);

  const filteredMore = moreItems.filter((item) => has(item.permission));
  const isMoreActive = filteredMore.some((item) => location.pathname === item.path);

  const moreTab: NavItem = { path: '#more', icon: MoreHorizontal, label: 'Yana', permission: '' };

  // Markaziy FAB bo'lganda: chapda 2, o'ngda 2 element. Aks holda 5 ta oddiy tugma.
  const leftItems = [homeItem, txItem].filter((i) => has(i.permission));
  const rightItems = canCreate
    ? [accountsItem].filter((i) => has(i.permission))
    : [accountsItem, reportsItem].filter((i) => has(i.permission));

  return (
    <>
      {/* "Yana" menyusi — overlay + pastki varaq */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-base-300/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      {moreOpen && (
        <div
          ref={moreTrapRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Barcha bo'limlar"
          className="animate-slide-up fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-base-200 bg-base-100 shadow-2xl outline-none lg:hidden"
        >
          <div className="flex flex-col items-center pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-base-300" />
          </div>
          <div className="flex items-center justify-between px-5 pb-1 pt-3">
            <span className="font-display text-base font-bold">Barcha bo'limlar</span>
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-base-200 text-base-content/70 tap-sm"
              onClick={() => setMoreOpen(false)}
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            className="grid grid-cols-4 gap-1.5 px-3 pt-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            {filteredMore.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-col items-center gap-2 rounded-2xl px-1 py-3.5 text-center tap-sm',
                    isActive ? 'bg-primary/10 text-primary' : 'text-base-content/70 active:bg-base-200'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        'grid h-11 w-11 place-items-center rounded-2xl',
                        isActive ? 'bg-primary/15 text-primary' : 'bg-base-200/80 text-base-content/60'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="w-full truncate text-xs font-medium leading-tight">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Pastki navigatsiya paneli */}
      <nav
        className="app-shell-blur fixed inset-x-0 bottom-0 z-40 border-t border-base-200/80 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex h-[var(--bottom-nav-height)] items-stretch justify-around px-1.5">
          {leftItems.map((item) => (
            <NavTab key={item.path} item={item} />
          ))}

          {/* Markaziy FAB — tezkor tranzaksiya qo'shish */}
          {canCreate && (
            <div className="flex w-16 flex-none items-start justify-center">
              <button
                type="button"
                onClick={() => openQuickEntry('EXPENSE')}
                aria-label="Yangi tranzaksiya"
                className="brand-gradient -mt-5 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-[var(--shadow-brand)] ring-4 ring-base-100 tap"
              >
                <Plus className="h-7 w-7" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {rightItems.map((item) => (
            <NavTab key={item.path} item={item} />
          ))}

          {/* "Yana" tugmasi */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={clsx(
              'group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-1 tap-sm',
              isMoreActive || moreOpen ? 'text-primary' : 'text-base-content/50 active:text-base-content'
            )}
          >
            <span
              className={clsx(
                'grid place-items-center rounded-full px-4 py-1 transition-colors duration-200',
                isMoreActive || moreOpen ? 'bg-primary/12' : 'bg-transparent'
              )}
            >
              <MoreHorizontal className={clsx('h-[22px] w-[22px]', (isMoreActive || moreOpen) && 'stroke-[2.4]')} />
            </span>
            <span className="text-[10px] font-semibold leading-none">{moreTab.label}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
