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
import type { IncomeExpenseBarDatum } from '../../hooks/useReportsData';

/**
 * Daromad vs Xarajat ustun diagrammasi. Ranglar har bir ustunning {@code fill}
 * maydonidan keladi (hardcoded #22c55e / #ef4444 — original ReportsPage bilan
 * AYNAN, daisyUI oklch'ga tegilmaydi).
 */
export function IncomeExpenseBarChart({ data }: { data: IncomeExpenseBarDatum[] }) {
  return (
    <div className="surface-card p-4 lg:p-5">
      <h2 className="mb-4 text-lg font-semibold">Daromad va Xarajat taqqoslash</h2>
      {data.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={80}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-base-content/10" />
              <XAxis dataKey="name" className="text-xs" />
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
                formatter={(value) => [formatCurrency(Number(value)), 'Summa'] as [string, string]}
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-base-content/60">Ma'lumot mavjud emas</p>
      )}
    </div>
  );
}
