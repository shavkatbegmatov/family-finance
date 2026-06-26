import type { Dispatch, SetStateAction } from 'react';
import { Target, X } from 'lucide-react';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '../../config/constants';
import { getChartColor } from '../../config/chartColors';
import type { CategoryChartItem } from '../../types';
import { ChartCard } from './ChartCard';

/**
 * Xarajat kategoriyalari PieChart'i — bo'lakni bosish kategoriya filtrini
 * almashtiradi (toggle). Faol bo'lmagan bo'laklar xiralashadi (fillOpacity 0.3).
 * Rang mantig'i (entry.color || getChartColor) original bilan AYNAN bir xil.
 */
export function ExpenseByCategoryChart({
  data,
  categoryFilter,
  setCategoryFilter,
}: {
  data: CategoryChartItem[] | undefined;
  categoryFilter: string | null;
  setCategoryFilter: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <ChartCard
      title="Xarajat kategoriyalari"
      icon={Target}
      action={
        categoryFilter && (
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className="inline-flex items-center gap-1 rounded-full bg-base-200 px-2.5 py-1 text-xs text-base-content/70 hover:bg-base-300"
          >
            <X className="h-3 w-3" />
            {categoryFilter}
          </button>
        )
      }
    >
      <div className="h-72">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="amount"
                nameKey="name"
                label={({ name, percentage }: { name?: string; percentage?: number }) =>
                  (percentage ?? 0) > 5 ? `${name} ${(percentage ?? 0).toFixed(0)}%` : ''
                }
                labelLine={false}
                onClick={(entry) => {
                  const name = (entry as { name?: string }).name;
                  setCategoryFilter((cur) => (cur === name ? null : (name ?? null)));
                }}
                cursor="pointer"
              >
                {data.map((entry, index) => {
                  const isActive = !categoryFilter || categoryFilter === entry.name;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || getChartColor(index)}
                      fillOpacity={isActive ? 1 : 0.3}
                    />
                  );
                })}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
            </RechartsPie>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-base-content/50">
            Ma'lumot mavjud emas
          </div>
        )}
      </div>
    </ChartCard>
  );
}
