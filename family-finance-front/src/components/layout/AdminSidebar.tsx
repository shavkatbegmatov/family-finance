import { useMemo, type ComponentType, type CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Shield,
  Building2,
  FileText,
  GraduationCap,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode, type PermissionCodeType } from '../../hooks/usePermission';
import { BrandLogo } from '../common/BrandLogo';
import clsx from 'clsx';

interface MenuItem {
  path: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  permission: PermissionCodeType;
  end?: boolean;
}

interface MenuGroup {
  section: string;
  items: MenuItem[];
}

/**
 * SUPER_ADMIN admin paneli navigatsiyasi — oddiy oilaviy Sidebar'dan ALOHIDA.
 * Faqat NAZORAT (read-only) va GLOBAL SOZLAMALAR bo'limlari; moliya/oila menyulari yo'q.
 * Har element ruxsatga ko'ra filtrlanadi (SUPER_ADMIN roli kerakli huquqlarni beradi).
 */
const menuGroups: MenuGroup[] = [
  {
    section: 'Nazorat',
    items: [
      { path: '/admin', icon: LayoutDashboard, label: 'Bosh sahifa', permission: PermissionCode.DASHBOARD_VIEW, end: true },
      { path: '/admin/users', icon: UserCog, label: 'Foydalanuvchilar', permission: PermissionCode.USERS_VIEW },
      { path: '/admin/families', icon: Users, label: 'Oilalar', permission: PermissionCode.FAMILY_VIEW },
      { path: '/admin/schools', icon: GraduationCap, label: 'Maktab arizalari', permission: PermissionCode.FAMILY_VIEW },
      { path: '/admin/audit-logs', icon: FileText, label: 'Audit loglar', permission: PermissionCode.SETTINGS_VIEW },
    ],
  },
  {
    section: 'Sozlamalar',
    items: [
      { path: '/admin/roles', icon: Shield, label: 'Rollar va huquqlar', permission: PermissionCode.ROLES_VIEW },
      { path: '/admin/banks', icon: Building2, label: 'Banklar', permission: PermissionCode.SETTINGS_VIEW },
      { path: '/admin/settings', icon: Settings, label: 'Tizim sozlamalari', permission: PermissionCode.SETTINGS_VIEW },
    ],
  },
];

export function AdminSidebar() {
  const permissions = useAuthStore((state) => state.permissions);

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
    <aside className="hidden w-72 flex-col border-r border-base-200 bg-base-100/95 shadow-[var(--shadow-soft)] backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div className="relative flex h-16 items-center overflow-hidden border-b border-base-200 px-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10" />
        <BrandLogo size={36} subtitle="Platforma boshqaruvi" className="relative" />
      </div>

      <div className="flex items-center gap-2 border-b border-base-200 px-5 py-2.5 text-xs font-semibold text-primary">
        <ShieldCheck className="h-4 w-4" />
        <span>Super Admin rejimi</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin" aria-label="Admin navigatsiya">
        <div className="flex flex-col gap-5 pb-4">
          {visibleGroups.map((group) => (
            <div key={group.section} role="group" aria-label={group.section}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">
                {group.section}
              </p>
              <ul className="stagger-children flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.path} style={{ '--i': item.animIndex } as CSSProperties}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        clsx(
                          'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                          isActive
                            ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                            : 'border-transparent text-base-content/70 hover:border-base-300 hover:bg-base-200/70 hover:text-base-content'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={clsx(
                              'grid h-9 w-9 place-items-center rounded-lg transition',
                              isActive
                                ? 'bg-primary/15 text-primary'
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
  );
}
