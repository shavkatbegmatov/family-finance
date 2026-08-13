import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';

import { CHART_COLORS } from '../../config/chartColors';
import { currencyLabel, formatAmountWithCurrency, formatDayLabel } from './expensesHelpers';
import type { ExpenseChartDay } from '../../hooks/useDailyExpensesData';

interface ExpenseDailyChartProps {
  days: ExpenseChartDay[];
  primaryCurrency?: string;
  /** YYYY-MM-DD — bugungi ustunni ajratib ko'rsatish uchun. */
  today: string;
  loading: boolean;
  /** Ustun bosilganda — jurnaldagi shu kunga o'tish. */
  onDayClick: (date: string) => void;
}

/**
 * Oy kunlari kesimidagi xarajat ustunlari (asosiy valyutada, D7: valyutalar
 * aralashtirilmaydi). Ustun bosilsa jurnal shu kunga scroll qilinadi.
 * Ranglar: SVG uchun hex (daisyUI oklch token'lari SVG fill'da ishlamaydi —
 * chartColors.ts qoidasi), bugungi kun secondary bilan ajratiladi.
 */
export function ExpenseDailyChart({
  days,
  primaryCurrency,
  today,
  loading,
  onDayClick,
}: ExpenseDailyChartProps) {
  if (loading) {
    return (
      <div className="surface-card p-4 lg:p-5">
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  if (!days.some((d) => d.total > 0)) {
    return null; // Bo'sh oyda grafik shovqin — jurnal bo'sh holati yetarli
  }

  return (
    <div className="surface-card p-4 lg:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-info/10 text-info">
            <BarChart3 className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold lg:text-base">Kunlar kesimida</h2>
        </div>
        <span className="text-xs text-base-content/40">
          {currencyLabel(primaryCurrency)} · ustunni bosib kunga o'ting
        </span>
      </div>

      <div className="mt-3 h-32 w-full lg:h-36">
        <ResponsiveContainer width="100%" height="100%">
          {/* onClick chart darajasida — Cell'ning bo'yalgan qismi kichik summada 1px
              bo'lib mobilda bosib bo'lmasdi; activeIndex butun vertikal polosa uchun keladi */}
          <BarChart
            data={days}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            onClick={(state: unknown) => {
              const idx = Number((state as { activeIndex?: unknown } | null)?.activeIndex);
              const d = Number.isInteger(idx) ? days[idx] : undefined;
              if (d && d.total > 0) onDayClick(d.date);
            }}
          >
            <XAxis
              dataKey="day"
              interval={4}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
            />
            <Tooltip
              cursor={{ fill: CHART_COLORS.teal, opacity: 0.08 }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as ExpenseChartDay | undefined;
                if (!active || !d) return null;
                return (
                  <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">{formatDayLabel(d.date, today)}</div>
                    <div className="mt-0.5 font-medium text-error">
                      {d.total > 0
                        ? `−${formatAmountWithCurrency(d.total, primaryCurrency)}`
                        : d.hasOther
                          ? `${currencyLabel(primaryCurrency)}da xarajat yo'q (boshqa valyutada bor)`
                          : "xarajat yo'q"}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="total" radius={[3, 3, 0, 0]} minPointSize={1}>
              {days.map((d) => (
                <Cell
                  key={d.date}
                  cursor={d.total > 0 ? 'pointer' : 'default'}
                  fill={d.date === today ? CHART_COLORS.secondary : CHART_COLORS.teal}
                  opacity={d.total > 0 ? 1 : 0.25}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
