import clsx from 'clsx';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatCompactCurrency } from '../../config/constants';
import { CHART_COLORS } from '../../config/chartColors';
import type { MonthlyTrendItem } from '../../types';
import { ChartCard } from './ChartCard';
import { RANGE_LABELS, type ChartRange } from './chartRange';

// Recharts tooltip types
interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-base-200 bg-base-100 p-3 shadow-lg">
        <p className="mb-2 font-medium">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Range toggle (chart ustida)
function RangeToggle({ value, onChange }: { value: ChartRange; onChange: (r: ChartRange) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-base-200 bg-base-200/50 p-1">
      {(Object.keys(RANGE_LABELS) as ChartRange[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={clsx(
            'rounded-md px-2.5 py-1 text-xs font-medium transition',
            value === r
              ? 'bg-base-100 text-base-content shadow-sm'
              : 'text-base-content/60 hover:text-base-content'
          )}
        >
          {RANGE_LABELS[r].short}
        </button>
      ))}
    </div>
  );
}

/** Range bo'yicha formatlangan (oxirgi N oy) trend elementi — monthLabel bilan. */
export interface FormattedMonthlyTrendItem extends MonthlyTrendItem {
  monthLabel: string;
}

/**
 * Daromad vs Xarajat AreaChart'i — 2 ustun egallaydi, ustida 3m/6m/12m range
 * toggle. Gradient id'lari (colorIncome/colorExpense) va CHART_COLORS hex'lari
 * original DashboardPage bilan AYNAN bir xil (daisyUI oklch'ga tegilmaydi).
 */
export function IncomeExpenseTrendChart({
  data,
  range,
  onRangeChange,
}: {
  data: FormattedMonthlyTrendItem[];
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
}) {
  return (
    <ChartCard
      title="Daromad vs Xarajat"
      icon={TrendingUp}
      className="lg:col-span-2"
      action={<RangeToggle value={range} onChange={onRangeChange} />}
    >
      <div className="h-72">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.error} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.error} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.2, strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="income"
                name="Daromad"
                stroke={CHART_COLORS.success}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Xarajat"
                stroke={CHART_COLORS.error}
                strokeWidth={2}
                strokeDasharray="4 3"
                fillOpacity={1}
                fill="url(#colorExpense)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-base-content/50">
            Ma'lumot yetarli emas
          </div>
        )}
      </div>
    </ChartCard>
  );
}
