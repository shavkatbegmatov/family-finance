import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCog,
  Shield,
  Building2,
  FileText,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { scopesApi } from '../../api/scopes.api';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';

interface AdminLink {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const CONTROL_LINKS: AdminLink[] = [
  { to: '/admin/users', label: 'Foydalanuvchilar', description: 'Akkauntlar, rol va status', icon: UserCog },
  { to: '/admin/families', label: 'Oilalar', description: 'Urug\' va xonadonlar nazorati', icon: Users },
  { to: '/admin/audit-logs', label: 'Audit loglar', description: 'Tizimdagi barcha amallar', icon: FileText },
];

const SETTINGS_LINKS: AdminLink[] = [
  { to: '/admin/roles', label: 'Rollar va huquqlar', description: 'RBAC sozlamalari', icon: Shield },
  { to: '/admin/banks', label: 'Banklar', description: 'Global banklar ro\'yxati', icon: Building2 },
  { to: '/admin/settings', label: 'Tizim sozlamalari', description: 'Platforma konfiguratsiyasi', icon: Settings },
];

/** SUPER_ADMIN bosh sahifasi — platforma holati va nazorat/sozlamalar tezkor havolalari. */
export function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: scopes } = useQuery({
    queryKey: ['admin-scopes'],
    queryFn: async () => (await scopesApi.getAllScopes()).data.data,
  });

  const clanCount = (scopes ?? []).filter((s) => s.type === 'CLAN').length;
  const householdCount = (scopes ?? []).filter((s) => s.type === 'HOUSEHOLD').length;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader title="Platforma boshqaruvi" subtitle="Super admin nazorat paneli" />

      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 lg:p-5">
        <ShieldCheck className="h-8 w-8 flex-none text-primary" />
        <div>
          <p className="font-semibold">Xush kelibsiz, {user?.fullName || user?.username}</p>
          <p className="text-sm text-base-content/60">
            Siz platforma operatorisiz — nazorat (faqat ko'rish) va global sozlamalar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Urug'lar" value={clanCount} />
        <StatCard label="Xonadonlar" value={householdCount} />
        <StatCard label="Jami scope" value={(scopes ?? []).length} />
      </div>

      <section className="space-y-3">
        <h2 className="section-title text-base">Nazorat</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CONTROL_LINKS.map((link) => (
            <AdminCard key={link.to} {...link} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title text-base">Global sozlamalar</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SETTINGS_LINKS.map((link) => (
            <AdminCard key={link.to} {...link} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminCard({ to, label, description, icon: Icon }: AdminLink) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-base-200 bg-base-100 p-4 transition hover:border-primary/30 hover:bg-base-200/40 lg:p-5"
    >
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold group-hover:text-primary">{label}</h3>
        <p className="mt-0.5 text-sm text-base-content/60">{description}</p>
      </div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-base-200 bg-base-100 p-4">
      <p className="text-xs text-base-content/60">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
