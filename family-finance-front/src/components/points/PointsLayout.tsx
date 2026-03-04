import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ListTodo, Trophy, ShoppingBag,
  Swords, Settings, Clock, ArrowLeftRight, PiggyBank, Award,
  MoreHorizontal,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { PermissionCode } from '../../hooks/usePermission';
import { useAuthStore } from '../../store/authStore';

interface TabItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
  end?: boolean;
}

const PRIMARY_TABS: TabItem[] = [
  { label: 'Bosh sahifa', path: '/points', icon: LayoutDashboard, permission: PermissionCode.POINTS_VIEW, end: true },
  { label: 'Ishtirokchilar', path: '/points/participants', icon: Users, permission: PermissionCode.POINTS_VIEW },
  { label: 'Vazifalar', path: '/points/tasks', icon: ListTodo, permission: PermissionCode.POINTS_VIEW },
  { label: 'Reyting', path: '/points/leaderboard', icon: Trophy, permission: PermissionCode.POINTS_VIEW_LEADERBOARD },
  { label: "Do'kon", path: '/points/shop', icon: ShoppingBag, permission: PermissionCode.POINTS_VIEW },
  { label: 'Musobaqalar', path: '/points/challenges', icon: Swords, permission: PermissionCode.POINTS_VIEW },
  { label: 'Sozlamalar', path: '/points/settings', icon: Settings, permission: PermissionCode.POINTS_MANAGE },
];

const SECONDARY_TABS: TabItem[] = [
  { label: 'Ball tarixi', path: '/points/history', icon: Clock, permission: PermissionCode.POINTS_VIEW },
  { label: 'Ayirboshlash', path: '/points/convert', icon: ArrowLeftRight, permission: PermissionCode.POINTS_CONVERT },
  { label: "Jamg'arma", path: '/points/savings', icon: PiggyBank, permission: PermissionCode.POINTS_VIEW },
  { label: 'Yutuqlar', path: '/points/achievements', icon: Award, permission: PermissionCode.POINTS_VIEW },
];

export function PointsLayout() {
  const permissions = useAuthStore((state) => state.permissions);
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const filteredPrimary = PRIMARY_TABS.filter(tab => permissions.has(tab.permission));
  const filteredSecondary = SECONDARY_TABS.filter(tab => permissions.has(tab.permission));

  const isSecondaryActive = filteredSecondary.some(tab => location.pathname.startsWith(tab.path));
  const activeSecondaryTab = filteredSecondary.find(tab => location.pathname.startsWith(tab.path));

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  const renderTab = (tab: TabItem) => (
    <NavLink
      key={tab.path}
      to={tab.path}
      end={tab.end}
      role="tab"
      className={({ isActive }) =>
        clsx(
          'points-nav-link',
          isActive
            ? 'points-nav-link-active'
            : 'points-nav-link-inactive'
        )
      }
    >
      <tab.icon className="h-4 w-4 flex-shrink-0" />
      <span>{tab.label}</span>
    </NavLink>
  );

  return (
    <div className="flex flex-col -mt-4 -mx-4 lg:-mx-8" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="points-nav-shell flex-shrink-0 z-20">
        <div className="px-4 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto py-2.5 scrollbar-hide" role="tablist">
            {filteredPrimary.map(renderTab)}

            {filteredSecondary.length > 0 && (
              <>
                <div className="h-5 w-px bg-base-300/60 mx-1 flex-shrink-0" />

                <div className="relative" ref={moreRef}>
                  <button
                    onClick={() => setShowMore(!showMore)}
                    className={clsx(
                      'points-nav-link',
                      isSecondaryActive
                        ? 'points-nav-link-active'
                        : 'points-nav-link-inactive'
                    )}
                  >
                    {isSecondaryActive && activeSecondaryTab ? (
                      <>
                        <activeSecondaryTab.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{activeSecondaryTab.label}</span>
                      </>
                    ) : (
                      <>
                        <MoreHorizontal className="h-4 w-4 flex-shrink-0" />
                        <span>Boshqa</span>
                      </>
                    )}
                  </button>

                  <div
                    className={clsx(
                      'absolute right-0 top-full mt-2 w-64 rounded-2xl bg-base-100 border border-base-200/80 shadow-lg z-50 transition-all duration-200 origin-top-right',
                      showMore
                        ? 'opacity-100 scale-100 visible'
                        : 'opacity-0 scale-95 invisible pointer-events-none'
                    )}
                  >
                    <div className="p-2">
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/40">
                        Qo'shimcha
                      </div>
                      {filteredSecondary.map((tab) => (
                        <NavLink
                          key={tab.path}
                          to={tab.path}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                              isActive
                                ? 'bg-primary/12 text-primary'
                                : 'text-base-content/70 hover:bg-base-200/70 hover:text-base-content'
                            )
                          }
                        >
                          <div className={clsx(
                            'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                              location.pathname.startsWith(tab.path)
                                ? 'bg-primary/15 text-primary'
                                : 'bg-base-200/60 text-base-content/50'
                            )}>
                            <tab.icon className="h-4 w-4" />
                          </div>
                          <span>{tab.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-8 pt-6 pb-6">
        <Outlet />
      </div>
    </div>
  );
}
