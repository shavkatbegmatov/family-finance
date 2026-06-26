import clsx from 'clsx';
import { Target, PiggyBank } from 'lucide-react';
import { formatCompactCurrency } from '../../config/constants';
import { BUDGET_TONE_BG, getBudgetTone } from '../../config/chartColors';
import type { FamilyDashboardStats, BudgetProgressItem } from '../../types';
import { ChartCard } from './ChartCard';

/** Byudjet bajarilishi — kategoriya bo'yicha progress chiziqlari. */
export function BudgetProgressCard({ stats }: { stats: FamilyDashboardStats | null }) {
  return (
    <ChartCard title="Byudjet bajarilishi" icon={Target}>
      {stats?.budgetProgress && stats.budgetProgress.length > 0 ? (
        <div className="space-y-4">
          {stats.budgetProgress.map((item: BudgetProgressItem, index: number) => {
            const percentage = Math.min(item.percentage, 100);
            const isOver = item.percentage > 100;
            return (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{item.categoryName}</span>
                  <span className={clsx('text-xs', isOver ? 'text-error font-semibold' : 'text-base-content/60')}>
                    {formatCompactCurrency(item.spentAmount)} / {formatCompactCurrency(item.budgetAmount)}
                    <span className="ml-1">({item.percentage.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-200">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      BUDGET_TONE_BG[getBudgetTone(item.percentage)]
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center text-base-content/50">
          Byudjet belgilanmagan
        </div>
      )}
    </ChartCard>
  );
}

/** Jamg'arma maqsadlari — maqsad bo'yicha progress chiziqlari. */
export function SavingsProgressCard({ stats }: { stats: FamilyDashboardStats | null }) {
  return (
    <ChartCard title="Jamg'arma maqsadlari" icon={PiggyBank}>
      {stats?.savingsProgress && stats.savingsProgress.length > 0 ? (
        <div className="space-y-4">
          {stats.savingsProgress.map((item, index) => {
            const percentage = Math.min(item.percentage, 100);
            const isComplete = item.percentage >= 100;
            return (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{item.goalName}</span>
                  <span className={clsx('text-xs', isComplete ? 'text-success font-semibold' : 'text-base-content/60')}>
                    {formatCompactCurrency(item.currentAmount)} / {formatCompactCurrency(item.targetAmount)}
                    <span className="ml-1">({item.percentage.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-200">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      isComplete ? 'bg-success' : item.percentage > 60 ? 'bg-info' : 'bg-primary'
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center text-base-content/50">
          Jamg'arma maqsadlari yo'q
        </div>
      )}
    </ChartCard>
  );
}
