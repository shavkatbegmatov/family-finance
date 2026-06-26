import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../../config/constants';
import type { Transaction, TransactionType } from '../../types';

/**
 * Mobil tranzaksiya qatori uchun tur metama'lumotlari (ikonka + ranglar).
 * Original TransactionsPage'dagi TYPE_META bilan AYNAN bir xil.
 */
export const TYPE_META: Record<
  TransactionType,
  { label: string; icon: React.ElementType; tile: string; color: string; sign: string }
> = {
  INCOME: { label: 'Daromad', icon: ArrowDownLeft, tile: 'bg-success/10 text-success', color: 'text-success', sign: '+' },
  EXPENSE: { label: 'Xarajat', icon: ArrowUpRight, tile: 'bg-error/10 text-error', color: 'text-error', sign: '−' },
  TRANSFER: { label: "O'tkazma", icon: ArrowRightLeft, tile: 'bg-info/10 text-info', color: 'text-info', sign: '' },
  REVERSAL: { label: 'Storno', icon: RotateCcw, tile: 'bg-warning/10 text-warning', color: 'text-warning', sign: '' },
};

// Type badge renderer
export const renderTypeBadge = (type: TransactionType) => {
  const config: Record<TransactionType, { label: string; class: string }> = {
    INCOME: { label: 'Daromad', class: 'badge-success' },
    EXPENSE: { label: 'Xarajat', class: 'badge-error' },
    TRANSFER: { label: "O'tkazma", class: 'badge-info' },
    REVERSAL: { label: 'Storno', class: 'badge-warning' },
  };
  const c = config[type];
  return <span className={clsx('badge badge-sm', c.class)}>{c.label}</span>;
};

// Amount renderer
export const renderAmount = (transaction: Transaction) => {
  const colorClass =
    transaction.type === 'INCOME'
      ? 'text-success'
      : transaction.type === 'EXPENSE'
        ? 'text-error'
        : 'text-info';
  const prefix =
    transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : '';
  return (
    <span className={clsx('font-semibold', colorClass)}>
      {prefix}{formatCurrency(transaction.amount)}
    </span>
  );
};
