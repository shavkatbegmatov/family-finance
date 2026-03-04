import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ListTodo, Trophy, ShoppingBag,
  Swords, Settings, Clock, ArrowLeftRight, PiggyBank, Award,
  ChevronDown,
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

  return (
    <div className="space-y-0">
      {/* Sub-navigation bar */}
      <div className="sticky top-16 z-20 -mx-4 lg:-mx-6 bg-base-100/95 backdrop-blur-md border-b border-base-200/80">
        <div className="px-4 lg:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1" role="tablist">
            {filteredPrimary.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                role="tab"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    'hover:bg-base-200/70 hover:text-base-content',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-base-content/60'
                  )
                }
              >
                <tab.icon className="h-4 w-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </NavLink>
            ))}

            {/* More dropdown for secondary tabs */}
            {filteredSecondary.length > 0 && (
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setShowMore(!showMore)}
                  className={clsx(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    'hover:bg-base-200/70',
                    isSecondaryActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-base-content/60'
                  )}
                >
                  <span>Boshqa</span>
                  <ChevronDown className={clsx(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    showMore && 'rotate-180'
                  )} />
                </button>

                <div
                  className={clsx(
                    'absolute left-0 top-full mt-1 w-52 rounded-xl bg-base-100 border border-base-200 shadow-xl z-50 transition-all duration-200 origin-top-left',
                    showMore
                      ? 'opacity-100 scale-100 visible'
                      : 'opacity-0 scale-95 invisible'
                  )}
                >
                  <div className="p-1.5">
                    {filteredSecondary.map((tab) => (
                      <NavLink
                        key={tab.path}
                        to={tab.path}
                        onClick={() => setShowMore(false)}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-base-content/70 hover:bg-base-200/70 hover:text-base-content'
                          )
                        }
                      >
                        <tab.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{tab.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
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
