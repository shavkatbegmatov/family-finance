import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '../../config/constants';
import { CHART_PALETTE as COLORS } from '../../config/chartColors';
import type { MemberReport } from '../../types';

/**
 * Oila a'zolari xarajatlari ustun diagrammasi. Ranglar {@code CHART_PALETTE}
 * indeks bo'yicha — original ReportsPage bilan AYNAN (daisyUI oklch'ga tegilmaydi).
 */
export function MemberBarChart({ members }: { members: MemberReport[] }) {
  return (
    <div className="surface-card p-4 lg:p-5">
      <h2 className="mb-4 text-lg font-semibold">Oila a'zolari xarajatlari</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={members} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-base-content/10" />
            <XAxis dataKey="memberName" className="text-xs" />
            <YAxis
              className="text-xs"
              tickFormatter={(val: number) =>
                val >= 1_000_000
                  ? `${(val / 1_000_000).toFixed(1)}M`
                  : val >= 1_000
                    ? `${(val / 1_000).toFixed(0)}K`
                    : String(val)
              }
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Xarajat'] as [string, string]}
              contentStyle={{
                borderRadius: '0.75rem',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="totalExpense" name="Xarajat" radius={[8, 8, 0, 0]}>
              {members.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
