import clsx from 'clsx';

import { DataTable, type Column } from '../ui/DataTable';
import { formatCurrency, formatDateTime, TRANSACTION_TYPES } from '../../config/constants';
import type { Transaction } from '../../types';
import { TransactionTypeFilter } from './TransactionTypeFilter';

/**
 * "Tranzaksiyalar" tabi — tur filtri + DataTable (desktop sahifalangan, mobil
 * "load more" infinite). Ustunlar, mobil karta va pagination original
 * TransactionsTab bilan AYNAN bir xil. pageSize=15.
 */
export function MemberTransactionsTab({
  data, loading, page, totalElements, totalPages, typeFilter,
  onPageChange, onTypeFilterChange,
  onLoadMore, hasMore, loadingMore,
}: {
  data: Transaction[];
  loading: boolean;
  page: number;
  totalElements: number;
  totalPages: number;
  typeFilter: string;
  onPageChange: (p: number) => void;
  onTypeFilterChange: (v: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}) {
  const txColumns: Column<Transaction>[] = [
    {
      key: 'id', header: '#', className: 'w-16',
      render: (t) => <span className="text-xs text-base-content/60">#{t.id}</span>,
    },
    {
      key: 'type', header: 'Tur', className: 'w-24',
      render: (t) => {
        const info = (TRANSACTION_TYPES as Record<string, { label: string; color: string }>)[t.type];
        return <span className={`text-xs font-medium ${info?.color || ''}`}>{info?.label || t.type}</span>;
      },
    },
    {
      key: 'amount', header: 'Summa', className: 'text-right',
      render: (t) => (
        <span className={clsx('font-semibold tabular-nums',
          t.type === 'INCOME' ? 'text-success' : t.type === 'EXPENSE' ? 'text-error' : ''
        )}>
          {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}{formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: 'categoryName', header: 'Kategoriya',
      render: (t) => <span className="text-sm">{t.categoryName || '—'}</span>,
    },
    {
      key: 'description', header: 'Tavsif',
      render: (t) => <span className="text-sm truncate max-w-[200px] block">{t.description || '—'}</span>,
    },
    {
      key: 'status', header: 'Holat', className: 'w-28',
      render: (t) => {
        const s = t.status || 'CONFIRMED';
        const badge = s === 'CONFIRMED' ? 'badge-success' : s === 'PENDING' ? 'badge-warning' : 'badge-error';
        const label = s === 'CONFIRMED' ? 'Tasdiqlangan' : s === 'PENDING' ? 'Kutilmoqda' : 'Bekor';
        return <span className={`badge ${badge} badge-sm`}>{label}</span>;
      },
    },
    {
      key: 'transactionDate', header: 'Sana', className: 'w-36',
      render: (t) => <span className="text-xs text-base-content/60">{formatDateTime(t.transactionDate)}</span>,
    },
  ];

  const renderMobileCard = (t: Transaction) => {
    const info = (TRANSACTION_TYPES as Record<string, { label: string; color: string }>)[t.type];
    return (
      <div className="surface-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${info?.color || ''}`}>{info?.label || t.type}</span>
          <span className={clsx('font-semibold text-sm',
            t.type === 'INCOME' ? 'text-success' : t.type === 'EXPENSE' ? 'text-error' : ''
          )}>
            {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}{formatCurrency(t.amount)}
          </span>
        </div>
        <p className="text-xs text-base-content/60 truncate">{t.categoryName || t.description || '—'}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-content/60">{formatDateTime(t.transactionDate)}</span>
          <span className={`badge badge-sm ${(t.status || 'CONFIRMED') === 'CONFIRMED' ? 'badge-success' : 'badge-warning'}`}>
            {(t.status || 'CONFIRMED') === 'CONFIRMED' ? 'Tasdiqlangan' : 'Kutilmoqda'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <TransactionTypeFilter value={typeFilter} onChange={onTypeFilterChange} totalElements={totalElements} />

      <div className="surface-card p-4 lg:p-5">
        <DataTable<Transaction>
          data={data}
          columns={txColumns}
          keyExtractor={(t) => t.id}
          loading={loading}
          totalElements={totalElements}
          totalPages={totalPages}
          currentPage={page}
          pageSize={15}
          onPageChange={onPageChange}
          renderMobileCard={renderMobileCard}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
          emptyTitle="Tranzaksiya topilmadi"
          emptyDescription="Bu a'zoda hali tranzaksiyalar mavjud emas"
        />
      </div>
    </div>
  );
}
