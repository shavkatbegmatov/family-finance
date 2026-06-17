import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Crown, Loader2, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useScopeStore } from '../../store/scopeStore';
import { scopesApi } from '../../api/scopes.api';
import type { ApiResponse } from '../../types';
import type { Scope } from '../../types/scope.types';
import { SCOPE_TYPE_META } from './scopeTypeMeta';
import { useSwitchScope } from '../../hooks/useSwitchScope';
import { groupScopesByClan, ROLE_LABEL, ROLE_TONE } from './scopeGrouping';
import { getApiErrorMessage } from '../../utils/apiError';

/**
 * SCOPE_CHANGED_EVENT endi {@link useSwitchScope} hook'ida e'lon qilingan — bu yerdan
 * re-export (mavjud import qiluvchilar, masalan useScopeChangeEffect, buzilmasligi uchun).
 */
export { SCOPE_CHANGED_EVENT } from '../../hooks/useSwitchScope';

// =============================================================================
// Component
// =============================================================================

interface ScopeSwitcherProps {
  className?: string;
}

/**
 * Header'da ko'rinadigan ScopeSwitcher dropdown.
 *
 * <p>Foydalanuvchining barcha scope'larini Clan bo'yicha guruhlab ko'rsatadi.
 * Tanlanganda backend'ga `switch-scope` so'rovi yuboradi, yangi JWT olinadi,
 * authStore yangilanadi va sahifa avtomatik refresh bo'ladi (yangi scope
 * konteksti bilan).</p>
 */
export function ScopeSwitcher({ className }: ScopeSwitcherProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const activeScope = useScopeStore((s) => s.activeScope);
  const myScopes = useScopeStore((s) => s.myScopes);
  const isLoading = useScopeStore((s) => s.isLoading);
  const setActiveScope = useScopeStore((s) => s.setActiveScope);
  const setMyScopes = useScopeStore((s) => s.setMyScopes);
  const setLoading = useScopeStore((s) => s.setLoading);

  // Scope almashtirish mantig'i — useSwitchScope hook (HouseholdNode bilan baham, DRY)
  const { switchScope, switchingId } = useSwitchScope();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Login bo'lganidan keyin scope'larni yuklash.
  // Background refresh pattern: cache mavjud bo'lsa darhol ko'rsatamiz,
  // lekin har mount'da serverdan yangi ma'lumotni ham olamiz (yangi
  // membership'lar, role o'zgarishlari kabilar avtomatik paydo bo'ladi).
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    const hasCache = myScopes.length > 0;

    // Cache bo'lmasa loading spinner ko'rsatamiz, bo'lsa silent refresh
    if (!hasCache) setLoading(true);

    scopesApi
      .getMyScopes()
      .then((res) => {
        if (cancelled) return;
        const scopes = (res.data as ApiResponse<Scope[]>).data ?? [];
        setMyScopes(scopes);

        // Aktiv scope tanlash mantiqi:
        //   1. Avvalgi aktiv scope hali ham mavjud bo'lsa — server'dan kelgan
        //      YANGI versiyasi bilan yangilaymiz (currentUserRole eskirmasligi uchun)
        //   2. Aks holda OWNER bo'lgan scope (asosiyroq)
        //   3. Aks holda birinchi scope
        const refreshedActive = activeScope
          ? scopes.find((s) => s.id === activeScope.id)
          : undefined;

        if (refreshedActive) {
          // Aktiv scope hali mavjud — eng so'nggi ma'lumot bilan yangilaymiz
          setActiveScope(refreshedActive);
        } else if (scopes.length > 0) {
          const owner = scopes.find((s) => s.currentUserRole === 'OWNER');
          setActiveScope(owner ?? scopes[0]);
        }
      })
      .catch((err) => {
        console.error('Scope\'larni yuklashda xato:', err);
        toast.error(getApiErrorMessage(err, 'Scope\'larni yuklashda xatolik'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // accessToken o'zgargandagina qayta yuklash (login/switch). Membership
    // ro'yxati kerak bo'lsa, qo'lda refetch trigger qilish mumkin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Tashqariga bosilganda dropdown'ni yopish
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Scope'larni Clan bo'yicha guruhlash
  const grouped = useMemo(() => groupScopesByClan(myScopes), [myScopes]);

  const handleSwitch = async (target: Scope) => {
    await switchScope(target);
    setIsOpen(false);
  };

  // Render
  if (!accessToken) return null;
  if (isLoading && myScopes.length === 0) {
    return (
      <div className={clsx('flex items-center gap-2 px-3 py-2 text-sm text-base-content/50', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Yuklanmoqda...
      </div>
    );
  }
  if (myScopes.length === 0) return null;

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-1.5 text-sm transition-all hover:border-primary/50 hover:bg-base-200"
        title="Aktiv scope'ni o'zgartirish"
      >
        <ActiveScopeBadge scope={activeScope} />
        <ChevronDown
          className={clsx(
            'h-4 w-4 text-base-content/50 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-base-200 bg-base-100 shadow-2xl">
          <div className="sticky top-0 border-b border-base-200 bg-base-100 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
            Sizning scope'laringiz
          </div>

          {grouped.map((group) => (
            <ScopeGroup
              key={group.key}
              clanName={group.clanName}
              scopes={group.scopes}
              activeScopeId={activeScope?.id ?? null}
              switchingId={switchingId}
              onSwitch={handleSwitch}
            />
          ))}

          {grouped.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-base-content/50">
              Hech qanday scope'ga a'zo emassiz.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ActiveScopeBadge({ scope }: { scope: Scope | null }) {
  if (!scope) {
    return <span className="text-sm font-medium text-base-content/60">Scope tanlang</span>;
  }
  const meta = SCOPE_TYPE_META[scope.type];
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={clsx('grid h-7 w-7 shrink-0 place-items-center rounded-md', meta.toneClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span className="text-xs uppercase tracking-wide text-base-content/60 leading-none">
          {meta.label}
        </span>
        <span className="text-sm font-semibold truncate max-w-[180px]">{scope.name}</span>
      </div>
    </div>
  );
}

function ScopeGroup({
  clanName,
  scopes,
  activeScopeId,
  switchingId,
  onSwitch,
}: {
  clanName: string | null;
  scopes: Scope[];
  activeScopeId: number | null;
  switchingId: number | null;
  onSwitch: (s: Scope) => void;
}) {
  return (
    <div className="py-1">
      {clanName && (
        <div className="px-3 py-1.5 text-xs font-semibold text-base-content/70">
          🌳 {clanName}
        </div>
      )}
      {scopes.map((s) => (
        <ScopeOption
          key={s.id}
          scope={s}
          isActive={s.id === activeScopeId}
          isSwitching={switchingId === s.id}
          onClick={() => onSwitch(s)}
        />
      ))}
    </div>
  );
}

function ScopeOption({
  scope,
  isActive,
  isSwitching,
  onClick,
}: {
  scope: Scope;
  isActive: boolean;
  isSwitching: boolean;
  onClick: () => void;
}) {
  const meta = SCOPE_TYPE_META[scope.type];
  const Icon = meta.icon;
  const role = scope.currentUserRole;
  const indent = scope.type === 'CLAN' ? '' : 'ml-3';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSwitching || isActive}
      className={clsx(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
        indent,
        isActive
          ? 'bg-primary/10 text-primary cursor-default'
          : 'hover:bg-base-200',
        isSwitching && 'opacity-50',
      )}
      title={meta.description}
    >
      <div className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded', meta.toneClass)}>
        <Icon className="h-3 w-3" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{scope.name}</span>
          {role === 'OWNER' && <Crown className="h-3 w-3 text-amber-400" />}
          {role === 'ADMIN' && <ShieldCheck className="h-3 w-3 text-emerald-400" />}
        </div>
        <span className="text-xs uppercase tracking-wide text-base-content/60">
          {meta.label}
          {role && <span className={clsx('ml-1.5', ROLE_TONE[role])}>· {ROLE_LABEL[role]}</span>}
        </span>
      </div>

      {isActive && <span className="text-xs text-primary">★ Aktiv</span>}
      {isSwitching && <Loader2 className="h-3.5 w-3.5 animate-spin text-base-content/40" />}
    </button>
  );
}


