import { Receipt } from 'lucide-react';
import clsx from 'clsx';

import { formatCurrency, TRANSACTION_TYPES } from '../../config/constants';
import type { MemberRecentTransaction } from '../../types';

/**
 * Overview tabidagi "Oxirgi tranzaksiyalar" jadvali — original RecentTxRow +
 * jadval bloki AYNAN. Bo'sh ro'yxatda ko'rsatilmaydi (chaqiruvchi tomon hal
 * qiladi, original kabi).
 */
export function RecentTransactionsList({ transactions }: { transactions: MemberRecentTransaction[] }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-base-200 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Receipt className="h-5 w-5 text-primary" />
          Oxirgi tranzaksiyalar
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead className="bg-base-200/50">
            <tr>
              <th>Tur</th>
              <th className="text-right">Summa</th>
              <th>Kategoriya</th>
              <th>Tavsif</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <RecentTxRow key={tx.id} tx={tx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentTxRow({ tx }: { tx: MemberRecentTransaction }) {
  const typeInfo = (TRANSACTION_TYPES as Record<string, { label: string; color: string }>)[tx.type];
  return (
    <tr className="hover">
      <td>
        <span className={`text-xs font-medium ${typeInfo?.color || ''}`}>
          {typeInfo?.label || tx.type}
        </span>
      </td>
      <td className="text-right">
        <span className={clsx('font-semibold tabular-nums',
          tx.type === 'INCOME' ? 'text-success' : tx.type === 'EXPENSE' ? 'text-error' : ''
        )}>
          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}{formatCurrency(tx.amount)}
        </span>
      </td>
      <td className="text-sm text-base-content/60">{tx.categoryName || '—'}</td>
      <td className="text-sm truncate max-w-[200px]">{tx.description || '—'}</td>
      <td className="text-xs text-base-content/50">{tx.transactionDate || '—'}</td>
    </tr>
  );
}
