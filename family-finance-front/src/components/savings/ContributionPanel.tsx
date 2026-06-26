import { Target, X, PiggyBank, ArrowUpCircle } from 'lucide-react';
import clsx from 'clsx';
import { PermissionGate } from '../common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { formatCurrency, formatDate } from '../../config/constants';
import { getProgressColor } from './savingsHelpers';
import type { SavingsGoal, GoalContribution } from '../../types';

interface ContributionPanelProps {
  goal: SavingsGoal;
  contributions: GoalContribution[];
  loadingContribs: boolean;
  onClose: () => void;
  onContribute: (goalId: number) => void;
}

/**
 * Tanlangan maqsad detail paneli (desktop sticky) — maqsad xulosasi, progress,
 * pul qo'shish tugmasi va hissalar (to'lovlar) tarixi ro'yxati.
 */
export function ContributionPanel({
  goal,
  contributions,
  loadingContribs,
  onClose,
  onContribute,
}: ContributionPanelProps) {
  return (
    <div className="lg:col-span-1">
      <div className="surface-card p-4 space-y-4 sticky top-4">
        {/* Panel header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
              style={{
                backgroundColor: goal.color ? `${goal.color}20` : 'oklch(var(--p) / 0.1)',
                color: goal.color || 'oklch(var(--p))',
              }}
            >
              {goal.icon || <Target className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{goal.name}</h3>
              <p className="text-xs text-base-content/60">
                {goal.isCompleted ? 'Bajarilgan' : 'Faol maqsad'}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Goal summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="surface-soft rounded-lg p-3">
            <p className="text-xs text-base-content/60">Maqsad</p>
            <p className="font-semibold">{formatCurrency(goal.targetAmount)}</p>
          </div>
          <div className="surface-soft rounded-lg p-3">
            <p className="text-xs text-base-content/60">Joriy</p>
            <p className="font-semibold text-primary">{formatCurrency(goal.currentAmount)}</p>
          </div>
          <div className="surface-soft rounded-lg p-3 col-span-2">
            <p className="text-xs text-base-content/60">Qolgan summa</p>
            <p className="text-xl font-bold text-info">
              {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">{goal.percentage.toFixed(1)}%</span>
            {goal.deadline && (
              <span className="text-xs text-base-content/60">
                Muddat: {formatDate(goal.deadline)}
              </span>
            )}
          </div>
          <div className="h-3 w-full rounded-full bg-base-200 overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-500', getProgressColor(goal.percentage))}
              style={{ width: `${Math.min(goal.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Add contribution button */}
        {!goal.isCompleted && (
          <PermissionGate permission={PermissionCode.SAVINGS_CONTRIBUTE}>
            <button
              className="btn btn-primary btn-sm w-full"
              onClick={() => onContribute(goal.id)}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Pul qo'shish
            </button>
          </PermissionGate>
        )}

        {/* Contributions list */}
        <div className="border-t border-base-200 pt-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            To'lovlar tarixi
          </h4>

          {loadingContribs ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-base-content/50 text-center py-4">
              Hali to'lovlar mavjud emas
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {contributions.map((contrib) => (
                <div key={contrib.id} className="surface-soft rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-success">
                      +{formatCurrency(contrib.amount)}
                    </span>
                    <span className="text-xs text-base-content/60">
                      {formatDate(contrib.contributionDate)}
                    </span>
                  </div>
                  {contrib.note && (
                    <p className="text-xs text-base-content/70 mt-1">{contrib.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
