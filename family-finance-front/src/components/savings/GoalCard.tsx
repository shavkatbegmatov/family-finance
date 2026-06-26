import { Target, Edit2, Trash2, ArrowUpCircle } from 'lucide-react';
import clsx from 'clsx';
import { PermissionGate } from '../common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { formatCurrency, formatDate } from '../../config/constants';
import { getProgressColor } from './savingsHelpers';
import type { SavingsGoal } from '../../types';

interface GoalCardProps {
  goal: SavingsGoal;
  isSelected: boolean;
  onSelect: (goal: SavingsGoal) => void;
  onContribute: (goalId: number) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (id: number) => void;
}

/**
 * Bitta jamg'arma maqsadi kartasi — sarlavha, summalar, progress bar va amal
 * tugmalari (pul qo'shish / tahrirlash / o'chirish). Kartani bosish maqsadni
 * tanlaydi; tugmalar event'ni to'xtatadi.
 */
export function GoalCard({ goal, isSelected, onSelect, onContribute, onEdit, onDelete }: GoalCardProps) {
  const pct = Math.min(goal.percentage, 100);

  return (
    <div
      className={clsx(
        'card-native tap-sm cursor-pointer space-y-3 p-4 transition hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        goal.isCompleted && 'ring-1 ring-success/30'
      )}
      onClick={() => onSelect(goal)}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
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
            {goal.deadline && (
              <p className="text-xs text-base-content/60">
                Muddat: {formatDate(goal.deadline)}
              </p>
            )}
          </div>
        </div>

        {goal.isCompleted && (
          <span className="badge badge-success badge-sm shrink-0">Bajarildi</span>
        )}
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-2">
        <div className="surface-soft rounded-lg p-2 text-center">
          <p className="text-xs leading-tight text-base-content/50 uppercase tracking-wide">Maqsad</p>
          <p className="text-sm font-semibold">{formatCurrency(goal.targetAmount)}</p>
        </div>
        <div className="surface-soft rounded-lg p-2 text-center">
          <p className="text-xs leading-tight text-base-content/50 uppercase tracking-wide">Joriy</p>
          <p className="text-sm font-semibold text-primary">{formatCurrency(goal.currentAmount)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className={clsx(
            'text-xs font-semibold',
            goal.isCompleted ? 'text-success' : 'text-primary'
          )}>
            {goal.percentage.toFixed(1)}%
          </span>
          <span className="text-xs text-base-content/50">
            {formatCurrency(goal.targetAmount - goal.currentAmount)} qoldi
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-base-200 overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-500', getProgressColor(goal.percentage))}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-base-200">
        <PermissionGate permission={PermissionCode.SAVINGS_CONTRIBUTE}>
          {!goal.isCompleted && (
            <button
              className="btn btn-ghost btn-sm text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onContribute(goal.id);
              }}
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Pul qo'shish
            </button>
          )}
        </PermissionGate>
        <div className="flex items-center gap-1 ml-auto">
          <PermissionGate permission={PermissionCode.SAVINGS_UPDATE}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(goal);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </PermissionGate>
          <PermissionGate permission={PermissionCode.SAVINGS_DELETE}>
            <button
              className="btn btn-ghost btn-sm text-error"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(goal.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
