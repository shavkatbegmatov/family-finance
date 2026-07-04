import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Crown, Search } from 'lucide-react';
import { scopesApi } from '../../api/scopes.api';
import { PageHeader } from '../../components/layout/PageHeader';
import type { Scope, ScopeType } from '../../types/scope.types';

const SCOPE_TYPE_LABEL: Record<ScopeType, string> = {
  GROUP: 'Guruh',
  HOUSEHOLD: 'Xonadon',
  PROJECT: 'Loyiha',
  EVENT: 'Tadbir',
  FUND: "Jamg'arma",
  TRUSTEE: 'Ishonchli vakil',
  PROPERTY: 'Mulk',
};

const SCOPE_TYPE_TONE: Record<ScopeType, string> = {
  GROUP: 'badge-primary',
  HOUSEHOLD: 'badge-secondary',
  PROJECT: 'badge-accent',
  EVENT: 'badge-info',
  FUND: 'badge-success',
  TRUSTEE: 'badge-warning',
  PROPERTY: 'badge-ghost',
};

/**
 * SUPER_ADMIN — platformadagi barcha oilalar (scope'lar) nazorati (read-only).
 * Metadata ro'yxati: nomi, turi, egasi, a'zolar soni. Moliyaviy drill-down keyingi faza.
 */
export function AdminFamiliesPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-scopes'],
    queryFn: async () => (await scopesApi.getAllScopes()).data.data,
  });

  const scopes = useMemo<Scope[]>(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.ownerUserName?.toLowerCase().includes(q) ||
        s.uniqueCode?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const groupCount = useMemo(() => (data ?? []).filter((s) => s.type === 'GROUP').length, [data]);
  const householdCount = useMemo(
    () => (data ?? []).filter((s) => s.type === 'HOUSEHOLD').length,
    [data],
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Oilalar"
        subtitle="Platformadagi barcha guruh va xonadonlar (faqat ko'rish)"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Jami scope" value={(data ?? []).length} />
        <StatCard label="Guruhlar" value={groupCount} />
        <StatCard label="Xonadonlar" value={householdCount} />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nomi, egasi yoki kod bo'yicha qidirish..."
          className="input input-bordered w-full pl-9"
        />
      </div>

      {isLoading && <p className="py-8 text-center text-base-content/60">Yuklanmoqda...</p>}
      {isError && (
        <p className="py-8 text-center text-error">Oilalar ro'yxatini yuklab bo'lmadi.</p>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scopes.map((scope) => (
            <Link
              key={scope.id}
              to={`/admin/families/${scope.id}`}
              className="block rounded-2xl border border-base-200 bg-base-100 p-4 transition hover:border-primary/30 hover:bg-base-200/40 lg:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{scope.name}</h3>
                  {scope.ownerUserName && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-base-content/60">
                      <Crown className="h-3 w-3 flex-none" />
                      {scope.ownerUserName}
                    </p>
                  )}
                </div>
                <span className={`badge ${SCOPE_TYPE_TONE[scope.type]} badge-sm flex-none`}>
                  {SCOPE_TYPE_LABEL[scope.type]}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-base-content/60">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {scope.memberCount ?? 0} a'zo
                </span>
                {scope.uniqueCode && (
                  <span className="font-mono text-base-content/50">{scope.uniqueCode}</span>
                )}
              </div>
            </Link>
          ))}
          {scopes.length === 0 && (
            <p className="col-span-full py-8 text-center text-base-content/60">
              {search ? 'Qidiruv bo\'yicha hech narsa topilmadi.' : 'Hozircha oila yo\'q.'}
            </p>
          )}
        </div>
      )}
    </div>
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
