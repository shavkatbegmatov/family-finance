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
import type { MemberMonthlyTrend } from '../../types';
import { MONTH_NAMES } from './memberDetailShared';

/**
 * Statistika tabidagi "6 oylik trend" AreaChart'i (Daromad/Xarajat). Stroke/fill
 * hex'lari original bilan AYNAN: Daromad #22c55e, Xarajat #ef4444 (daisyUI
 * oklch'ga tegilmaydi — Recharts SVG fill hex talab qiladi). Bo'sh holatda
 * "Ma'lumot mavjud emas".
 */
export function MonthlyTrendChart({ monthlyTrend }: { monthlyTrend: MemberMonthlyTrend[] }) {
  const trendData = monthlyTrend.map((m) => ({
    name: MONTH_NAMES[m.month] || m.month,
    Daromad: m.income,
    Xarajat: m.expense,
  }));

  return (
    <div className="surface-card p-4 lg:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-4">
        6 oylik trend
      </h3>
      {trendData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis tickFormatter={(v) => formatCompactCurrency(v)} className="text-xs" />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--b3))' }}
            />
            <Area type="monotone" dataKey="Daromad" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
            <Area type="monotone" dataKey="Xarajat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center py-12 text-base-content/60">
          Ma'lumot mavjud emas
        </div>
      )}
    </div>
  );
}
