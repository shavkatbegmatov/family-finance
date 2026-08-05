import type { CSSProperties, ElementType } from 'react';
import { CalendarCheck2, Flame, ListChecks, Receipt, Sigma } from 'lucide-react';
import clsx from 'clsx';

import { MONTHS_UZ } from '../../config/constants';
import { formatCompactWithCurrency } from './expensesHelpers';
import type { ExpenseCurrencyTotal } from '../../types';

type CardColor = 'primary' | 'error' | 'info' | 'warning' | 'secondary';

const COLOR_MAP: Record<CardColor, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  error: 'bg-error/10 text-error border-error/20',
  info: 'bg-info/10 text-info border-info/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  secondary: 'bg-secondary/10 text-secondary border-secondary/20',
};

interface StatCardDef {
  key: string;
  title: string;
  value: string;
  sub?: string;
  icon: ElementType;
  color: CardColor;
}

/** 'YYYY-MM-DD' -> "12-avgust" (eng xarajatli kun yorlig'i). */
const shortDayLabel = (date: string): string => {
  const [, m, d] = date.split('-').map(Number);
  return `${d}-${(MONTHS_UZ[m - 1] ?? '').toLowerCase()}`;
};

/** Valyuta jamlari ro'yxatini "asosiy + qolganlari" ko'rinishga keltiradi. */
const splitTotals = (totals: ExpenseCurrencyTotal[]): { value: string; sub?: string } => {
  if (totals.length === 0) return { value: formatCompactWithCurrency(0) };
  const [first, ...rest] = totals;
  return {
    value: formatCompactWithCurrency(first.total, first.currency),
    sub: rest.length > 0
      ? rest.map((t) => formatCompactWithCurrency(t.total, t.currency)).join(' · ')
      : undefined,
  };
};

interface ExpenseSummaryCardsProps {
  loading: boolean;
  isCurrentMonth: boolean;
  todayTotals: ExpenseCurrencyTotal[];
  periodTotals: ExpenseCurrencyTotal[];
  avgPerDay: number;
  primaryCurrency?: string;
  maxDay: { date: string; total: number } | null;
  entryCount: number;
}

/** Oy statistikasi kartalari: Bugun / Oy jami / Kunlik o'rtacha / Eng xarajatli kun. */
export function ExpenseSummaryCards({
  loading,
  isCurrentMonth,
  todayTotals,
  periodTotals,
  avgPerDay,
  primaryCurrency,
  maxDay,
  entryCount,
}: ExpenseSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card p-4 lg:p-5">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton mt-3 h-7 w-28" />
          </div>
        ))}
      </div>
    );
  }

  const monthTotal = splitTotals(periodTotals);
  const todayTotal = splitTotals(todayTotals);

  const cards: StatCardDef[] = [];

  if (isCurrentMonth) {
    cards.push({
      key: 'today',
      title: 'Bugun',
      value: todayTotal.value,
      sub: todayTotal.sub ?? (todayTotals.length === 0 ? "hali xarajat yo'q" : undefined),
      icon: CalendarCheck2,
      color: 'primary',
    });
  }

  cards.push(
    {
      key: 'month',
      title: 'Oy jami',
      value: monthTotal.value,
      sub: monthTotal.sub ?? `${entryCount} ta yozuv`,
      icon: Receipt,
      color: 'error',
    },
    {
      key: 'avg',
      title: "Kunlik o'rtacha",
      value: formatCompactWithCurrency(Math.round(avgPerDay), primaryCurrency),
      sub: isCurrentMonth ? "o'tgan kunlar bo'yicha" : 'oy davomida',
      icon: Sigma,
      color: 'info',
    },
    {
      key: 'max',
      title: 'Eng xarajatli kun',
      value: maxDay ? formatCompactWithCurrency(maxDay.total, primaryCurrency) : '—',
      sub: maxDay ? shortDayLabel(maxDay.date) : undefined,
      icon: Flame,
      color: 'warning',
    }
  );

  if (!isCurrentMonth) {
    cards.push({
      key: 'count',
      title: 'Yozuvlar',
      value: String(entryCount),
      sub: 'ta xarajat yozuvi',
      icon: ListChecks,
      color: 'secondary',
    });
  }

  return (
    <div className="stagger-children grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card, i) => (
        <div
          key={card.key}
          className="surface-card p-4 lg:p-5"
          style={{ '--i': i } as CSSProperties}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-base-content/60 lg:text-sm">
                {card.title}
              </p>
              <p className="mt-1.5 truncate text-lg font-bold tracking-tight lg:text-2xl">
                {card.value}
              </p>
              {card.sub && (
                <p className="mt-1 truncate text-xs text-base-content/50">{card.sub}</p>
              )}
            </div>
            <span
              className={clsx(
                'grid h-9 w-9 flex-none place-items-center rounded-xl border lg:h-11 lg:w-11',
                COLOR_MAP[card.color]
              )}
            >
              <card.icon className="h-4 w-4 lg:h-5 lg:w-5" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
