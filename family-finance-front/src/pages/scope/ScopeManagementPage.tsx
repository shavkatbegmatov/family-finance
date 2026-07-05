import { useQuery } from '@tanstack/react-query';
import { Crown, Loader2, ShieldCheck } from 'lucide-react';
import { scopesApi } from '../../api/scopes.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { useScopeStore } from '../../store/scopeStore';
import { getScopeTypeMeta } from '../../components/scope/scopeTypeMeta';
import { ROLE_LABEL, ROLE_TONE } from '../../components/scope/scopeGrouping';
import type { Scope } from '../../types/scope.types';

const MY_SCOPES_QUERY_KEY = ['scopes', 'my'];

/**
 * Xonadonlarim (ADR-003: guruh tushunchasi olib tashlandi — xonadonlar har doim
 * mustaqil). Bu sahifa a'zo bo'lingan barcha kontekstlarni (xonadon, maktab, sinf)
 * va ulardagi rolni ko'rsatadi; boshqaruv (taklif, a'zolar) tegishli sahifalarda.
 */
export function ScopeManagementPage() {
  const setMyScopes = useScopeStore((s) => s.setMyScopes);

  const { data: scopes = [], isLoading } = useQuery({
    queryKey: MY_SCOPES_QUERY_KEY,
    queryFn: async () => {
      const list = (await scopesApi.getMyScopes()).data.data ?? [];
      setMyScopes(list); // ScopeSwitcher cache'ini ham yangilab boramiz
      return list;
    },
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Xonadonlarim"
        subtitle="Siz a'zo bo'lgan barcha kontekstlar va ulardagi rolingiz"
      />

      {isLoading && scopes.length === 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-base-100 p-4 text-sm text-base-content/60 lg:p-5">
          <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
        </div>
      )}

      {!isLoading && scopes.length === 0 && (
        <div className="rounded-2xl bg-base-100 p-8 text-center text-sm text-base-content/60">
          Hech qanday kontekstga a'zo emassiz.
        </div>
      )}

      {scopes.length > 0 && (
        <div className="rounded-2xl bg-base-100 p-4 shadow-sm lg:p-5">
          <div className="divide-y divide-base-200">
            {scopes.map((scope) => (
              <ScopeRow key={scope.id} scope={scope} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Bitta scope qatori — meta, raqam va rol. */
function ScopeRow({ scope }: { scope: Scope }) {
  const meta = getScopeTypeMeta(scope.type);
  const Icon = meta.icon;
  const role = scope.currentUserRole;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{scope.name}</span>
          {role === 'OWNER' && <Crown className="h-3 w-3 shrink-0 text-amber-400" />}
          {role === 'ADMIN' && <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />}
        </div>
        <span className="text-xs text-base-content/60">
          {meta.label}
          {scope.displayCode && ` · № ${scope.displayCode}`}
          {role && <span className={`ml-1.5 ${ROLE_TONE[role]}`}>· {ROLE_LABEL[role]}</span>}
        </span>
      </div>
    </div>
  );
}
