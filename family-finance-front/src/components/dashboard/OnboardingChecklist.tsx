import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Check,
  PieChart,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useQuickEntryStore } from '../../store/quickEntryStore';
import { PermissionCode, usePermission } from '../../hooks/usePermission';
import { accountsApi } from '../../api/accounts.api';
import { familyMembersApi } from '../../api/family-members.api';
import type { FamilyDashboardStats, PagedResponse, ApiResponse, Account, FamilyMember } from '../../types';

/** Yopilganlik kaliti — user'ga bog'lanadi (boshqa akkauntga xalaqit bermasin). */
const dismissKey = (userId: number | string | undefined) =>
  `family-finance-onboarding-dismissed-${userId ?? 'anon'}`;

interface OnboardingChecklistProps {
  stats: FamilyDashboardStats | null;
  /** Oxirgi tranzaksiyalar soni (dashboard allaqachon yuklaydi). */
  transactionCount: number;
  /** Dashboard ma'lumotlari yuklanib bo'lganmi (flash oldini olish uchun). */
  loaded: boolean;
}

interface StepDef {
  key: string;
  title: string;
  description: string;
  icon: typeof Wallet;
  done: boolean;
  /** Link manzili (action bo'lmasa). */
  to?: string;
  /** Bosilganda bajariladigan amal (masalan QuickEntry ochish). */
  onClick?: () => void;
}

/**
 * Birinchi kirish onboarding'i — bo'sh dashboard o'rniga yangi
 * foydalanuvchini 4 qadamga yo'naltiradi (E9). Tranzaksiya va byudjet
 * allaqachon bo'lsa (etablangan foydalanuvchi) umuman ko'rinmaydi va
 * qo'shimcha so'rov ham yubormaydi.
 */
export function OnboardingChecklist({ stats, transactionCount, loaded }: OnboardingChecklistProps) {
  const user = useAuthStore((s) => s.user);
  const { hasPermission } = usePermission();
  const openQuickEntry = useQuickEntryStore((s) => s.open);

  const [dismissed, setDismissed] = useState(true); // flash bo'lmasligi uchun default yashirin
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [membersCount, setMembersCount] = useState<number | null>(null);

  const txDone = transactionCount > 0;
  const budgetDone = (stats?.activeBudgets ?? 0) > 0;
  // Etablangan foydalanuvchi: tranzaksiya ham, byudjet ham bor — checklist kerak emas
  const established = txDone && budgetDone;

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(dismissKey(user.id)) === 'true');
  }, [user]);

  const shouldShow = loaded && !dismissed && !established;

  // Hisob/a'zo sonlarini FAQAT checklist ko'rinadigan bo'lsa so'raymiz
  useEffect(() => {
    if (!shouldShow) return;
    let cancelled = false;

    if (hasPermission(PermissionCode.ACCOUNTS_VIEW)) {
      accountsApi
        .getAll({ page: 0, size: 1 })
        .then((res) => {
          if (cancelled) return;
          const data = (res.data as ApiResponse<PagedResponse<Account>>).data;
          setAccountsCount(data?.totalElements ?? 0);
        })
        .catch(() => setAccountsCount(null));
    }

    if (hasPermission(PermissionCode.FAMILY_VIEW)) {
      familyMembersApi
        .getAll(0, 1)
        .then((res) => {
          if (cancelled) return;
          const data = (res.data as ApiResponse<PagedResponse<FamilyMember>>).data;
          setMembersCount(data?.totalElements ?? 0);
        })
        .catch(() => setMembersCount(null));
    }

    return () => {
      cancelled = true;
    };
    // hasPermission barqaror (authStore Set) — faqat ko'rinish o'zgarganda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  const steps = useMemo<StepDef[]>(() => {
    const list: StepDef[] = [];
    if (hasPermission(PermissionCode.ACCOUNTS_VIEW)) {
      list.push({
        key: 'account',
        title: "Hisob qo'shing",
        description: 'Naqd pul, karta yoki bank hisobingizni kiriting',
        icon: Wallet,
        done: (accountsCount ?? 0) > 0,
        to: '/accounts',
      });
    }
    if (hasPermission(PermissionCode.TRANSACTIONS_CREATE)) {
      list.push({
        key: 'transaction',
        title: 'Birinchi tranzaksiyani kiriting',
        description: 'Daromad yoki xarajatni yozib boring',
        icon: ArrowLeftRight,
        done: txDone,
        onClick: () => openQuickEntry('EXPENSE'),
      });
    }
    if (hasPermission(PermissionCode.BUDGETS_VIEW)) {
      list.push({
        key: 'budget',
        title: 'Byudjet belgilang',
        description: "Oylik xarajat limitini o'rnating",
        icon: PieChart,
        done: budgetDone,
        to: '/budget',
      });
    }
    if (hasPermission(PermissionCode.FAMILY_VIEW)) {
      list.push({
        key: 'family',
        title: "Oila a'zosini qo'shing",
        description: 'Oilangizni birga boshqaring',
        icon: Users,
        done: (membersCount ?? 0) > 1,
        to: '/family',
      });
    }
    return list;
  }, [hasPermission, accountsCount, membersCount, txDone, budgetDone, openQuickEntry]);

  const doneCount = steps.filter((s) => s.done).length;

  // Barcha qadamlar bajarilgan — jimgina yopamiz (qayta ko'rinmaydi)
  useEffect(() => {
    if (shouldShow && steps.length > 0 && doneCount === steps.length && user) {
      localStorage.setItem(dismissKey(user.id), 'true');
      setDismissed(true);
    }
  }, [shouldShow, doneCount, steps.length, user]);

  if (!shouldShow || steps.length === 0) return null;

  const dismiss = () => {
    if (user) localStorage.setItem(dismissKey(user.id), 'true');
    setDismissed(true);
  };

  return (
    <section className="surface-card relative overflow-hidden rounded-2xl border-primary/25 p-4 lg:p-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold leading-tight">Boshlash uchun qadamlar</h2>
            <p className="text-xs text-base-content/60">
              {doneCount}/{steps.length} bajarildi — moliyangizni tartibga keltiring
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square shrink-0"
          onClick={dismiss}
          aria-label="Onboarding'ni yopish"
          title="Yopish"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress chiziq */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-200">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${steps.length > 0 ? (doneCount / steps.length) * 100 : 0}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const inner = (
            <>
              <div
                className={clsx(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                  step.done ? 'bg-success/15 text-success' : 'bg-base-200 text-base-content/60',
                )}
              >
                {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 text-left">
                <p
                  className={clsx(
                    'text-sm font-medium leading-tight',
                    step.done && 'text-base-content/50 line-through',
                  )}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-base-content/60">{step.description}</p>
              </div>
            </>
          );

          const rowClass = clsx(
            'flex min-h-[3rem] items-center gap-3 rounded-xl border border-base-200 px-3 py-2 tap-sm',
            step.done
              ? 'cursor-default bg-base-200/40'
              : 'bg-base-100 transition-colors hover:border-primary/40 hover:bg-primary/5',
          );

          if (step.done) {
            return (
              <div key={step.key} className={rowClass}>
                {inner}
              </div>
            );
          }
          if (step.onClick) {
            return (
              <button key={step.key} type="button" className={rowClass} onClick={step.onClick}>
                {inner}
              </button>
            );
          }
          return (
            <Link key={step.key} to={step.to!} className={rowClass}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
