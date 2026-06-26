import type { MemberFinancialSummary } from '../../types';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { ExpenseCategoryChart } from './ExpenseCategoryChart';
import { IncomeCategoryChart } from './IncomeCategoryChart';

/**
 * "Statistika" tabi — 6 oylik trend (area) + xarajat/daromad kategoriya pie'lari
 * (2 ustunli grid). Original StatisticsTab kompozitsiyasi AYNAN.
 */
export function MemberStatisticsTab({ data }: { data: MemberFinancialSummary }) {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Monthly Trend */}
      <MonthlyTrendChart monthlyTrend={data.monthlyTrend} />

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseCategoryChart data={data.expenseByCategory} />
        <IncomeCategoryChart data={data.incomeByCategory} />
      </div>
    </div>
  );
}
