import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Crown, Loader2, ShieldCheck, X } from 'lucide-react';
import clsx from 'clsx';
import { useScopeStore } from '../../store/scopeStore';
import type { Scope } from '../../types/scope.types';
import { SCOPE_TYPE_META } from './scopeTypeMeta';
import { useSwitchScope } from '../../hooks/useSwitchScope';
import { groupScopesByClan, ROLE_LABEL, ROLE_TONE } from './scopeGrouping';

/**
 * Mobil ScopeSwitcher — Header'dagi sahifa sarlavhasi ostida ixcham chip;
 * bosilganda pastdan ochiluvchi varaq (bottom-sheet) orqali scope tanlanadi.
 *
 * <p>Scope'lar ro'yxatini yuklash mantig'i {@link ScopeSwitcher} ichida
 * (u barcha o'lchamlarda mount bo'lib turadi, faqat CSS bilan yashirinadi) —
 * bu komponent faqat scopeStore'ni o'qiydi va almashtirishni bajaradi.</p>
 */
export function MobileScopeSwitcher({ className }: { className?: string }) {
  const activeScope = useScopeStore((s) => s.activeScope);
  const myScopes = useScopeStore((s) => s.myScopes);
  const { switchScope, switchingId } = useSwitchScope();
  const [isOpen, setIsOpen] = useState(false);

  const grouped = useMemo(() => groupScopesByClan(myScopes), [myScopes]);

  // Esc bosilganda varaqni yopish
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!activeScope || myScopes.length === 0) return null;

  const meta = SCOPE_TYPE_META[activeScope.type];
  const Icon = meta.icon;

  const handleSwitch = async (target: Scope) => {
    await switchScope(target);
    setIsOpen(false);
  };

  return (
    <>
      {/* Aktiv scope chip — doim ko'rinadigan kontekst + varaq ochish tugmasi.
          -my-1 py-1: vizual o'lchamni o'zgartirmay tap-zonani kengaytiradi. */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(
          '-my-1 flex min-w-0 items-center gap-1 py-1 text-left tap-sm',
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Aktiv scope: ${activeScope.name}. Almashtirish uchun bosing`}
      >
        <Icon className={clsx('h-3 w-3 shrink-0', meta.toneClass.split(' ')[0])} />
        <span className="truncate text-[11px] font-semibold leading-none text-base-content/60">
          {activeScope.name}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-base-content/40" />
      </button>

      {/* Overlay + pastki varaq (BottomNav "Yana" naqshi bilan bir xil uslub) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-base-300/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <div
          className="animate-slide-up fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-3xl border-t border-base-200 bg-base-100 shadow-2xl lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Scope tanlash"
        >
          <div className="flex flex-col items-center pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-base-300" />
          </div>
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <span className="font-display text-base font-bold">Scope tanlash</span>
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-base-200 text-base-content/70 tap-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            {grouped.map((group) => (
              <div key={group.key} className="py-1">
                {group.clanName && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-base-content/70">
                    🌳 {group.clanName}
                  </div>
                )}
                {group.scopes.map((s) => (
                  <MobileScopeOption
                    key={s.id}
                    scope={s}
                    isActive={s.id === activeScope.id}
                    isSwitching={switchingId === s.id}
                    onClick={() => handleSwitch(s)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Varaqdagi bitta scope qatori — 44px+ touch-target bilan. */
function MobileScopeOption({
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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSwitching || isActive}
      className={clsx(
        'flex min-h-[3rem] w-full items-center gap-3 rounded-xl px-3 py-2 text-left tap-sm',
        scope.type !== 'CLAN' && 'ml-3 w-[calc(100%-0.75rem)]',
        isActive ? 'bg-primary/10 text-primary' : 'active:bg-base-200',
        isSwitching && 'opacity-50',
      )}
    >
      <div className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', meta.toneClass)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{scope.name}</span>
          {role === 'OWNER' && <Crown className="h-3 w-3 shrink-0 text-amber-400" />}
          {role === 'ADMIN' && <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />}
        </div>
        <span className="text-[11px] uppercase tracking-wider text-base-content/40">
          {meta.label}
          {role && <span className={clsx('ml-1.5', ROLE_TONE[role])}>· {ROLE_LABEL[role]}</span>}
        </span>
      </div>

      {isActive && <span className="shrink-0 text-xs font-semibold text-primary">★ Aktiv</span>}
      {isSwitching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-base-content/40" />}
    </button>
  );
}
