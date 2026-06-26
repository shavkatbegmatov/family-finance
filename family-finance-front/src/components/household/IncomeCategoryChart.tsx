import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { formatCurrency } from '../../config/constants';
import type { MemberCategoryBreakdown } from '../../types';
import { CHART_COLORS } from './memberDetailShared';

/**
 * Statistika tabidagi "Daromad kategoriya bo'yicha" pie chart. Cell ranglari
 * CHART_COLORS (= CHART_PALETTE) bo'yicha aylanma — original AYNAN. Bo'sh holatda
 * "Daromad mavjud emas".
 */
export function IncomeCategoryChart({ data }: { data: MemberCategoryBreakdown[] }) {
  const hasData = data.length > 0;

  return (
    <div className="surface-card p-4 lg:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-4">
        Daromad kategoriya bo'yicha
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <RechartsPie>
            <Pie
              data={data.map((c) => ({ name: c.categoryName, value: c.amount }))}
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </RechartsPie>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center py-12 text-base-content/60">
          Daromad mavjud emas
        </div>
      )}
    </div>
  );
}
