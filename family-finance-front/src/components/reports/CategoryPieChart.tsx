import {
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '../../config/constants';
import { CHART_PALETTE as COLORS } from '../../config/chartColors';
import type { CategoryReport, CategoryType } from '../../types';

/**
 * Kategoriya bo'yicha doiraviy diagramma (donut). Ranglar {@code CHART_PALETTE}
 * (brend palitra) indeks bo'yicha — original ReportsPage bilan AYNAN.
 */
export function CategoryPieChart({
  categoryType,
  sortedCategories,
}: {
  categoryType: CategoryType;
  sortedCategories: CategoryReport[];
}) {
  return (
    <div className="surface-card p-4 lg:p-5">
      <h2 className="mb-4 text-lg font-semibold">
        {categoryType === 'INCOME' ? 'Daromad' : 'Xarajat'} kategoriyalari
      </h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={sortedCategories}
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={50}
              dataKey="amount"
              nameKey="categoryName"
              label={(props) => {
                const p = props as { categoryName?: string; percentage?: number };
                return `${p.categoryName}: ${(p.percentage ?? 0).toFixed(1)}%`;
              }}
              labelLine={true}
            >
              {sortedCategories.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Summa'] as [string, string]}
              contentStyle={{
                borderRadius: '0.75rem',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend />
          </RechartsPie>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
