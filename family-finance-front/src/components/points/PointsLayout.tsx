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
          'group flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-content shadow-sm'
            : 'text-base-content/60 hover:bg-base-200/80 hover:text-base-content'
        )
      }
    >
      <tab.icon className="h-4 w-4 flex-shrink-0" />
      <span>{tab.label}</span>
    </NavLink>
  );

  return (
    <div className="space-y-0">
      {/* Sub-navigation bar */}
      <div className="sticky top-16 z-20 -mx-4 lg:-mx-6 bg-base-100/95 backdrop-blur-md border-b border-base-200/60">
        <div className="px-4 lg:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2" role="tablist">
            {filteredPrimary.map(renderTab)}

            {/* More dropdown for secondary tabs */}
            {filteredSecondary.length > 0 && (
              <>
                {/* Divider */}
                <div className="h-5 w-px bg-base-300/60 mx-1 flex-shrink-0" />

                <div className="relative" ref={moreRef}>
                  <button
                    onClick={() => setShowMore(!showMore)}
                    className={clsx(
                      'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200',
                      isSecondaryActive
                        ? 'bg-primary text-primary-content shadow-sm'
                        : 'text-base-content/60 hover:bg-base-200/80 hover:text-base-content'
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
                      'absolute right-0 top-full mt-2 w-56 rounded-xl bg-base-100 border border-base-200/80 shadow-lg z-50 transition-all duration-200 origin-top-right',
                      showMore
                        ? 'opacity-100 scale-100 visible'
                        : 'opacity-0 scale-95 invisible pointer-events-none'
                    )}
                  >
                    <div className="p-1.5">
                      <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-base-content/40">
                        Qo'shimcha
                      </div>
                      {filteredSecondary.map((tab) => (
                        <NavLink
                          key={tab.path}
                          to={tab.path}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                              isActive
                                ? 'bg-primary/10 text-primary'
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

      {/* Page content */}
      <div className="pt-6">
        <Outlet />
      </div>
    </div>
  );
}
