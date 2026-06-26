import { useMemo } from 'react';
import { ArrowLeftRight, ArrowRightLeft, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatDate } from '../../config/constants';
import { DataTable, Column } from '../ui/DataTable';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../common/PermissionGate';
import { TYPE_META, renderTypeBadge, renderAmount } from './transactionsUtils';
import type { Transaction } from '../../types';

interface TransactionsTableProps {
  data: Transaction[];
  loading: boolean;
  // pagination
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onLoadMore: () => void;
  loadingMore: boolean;
  // highlight (search result)
  highlightId: string | number | null;
  onHighlightComplete: () => void;
  // row interactions
  onRowClick: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  // bulk selection
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}

/**
 * Desktop jadval (DataTable) + mobil karta. Ustunlar checkbox tanlovi va
 * tahrirlash/storno amallarini o'z ichiga oladi. Xulq original TransactionsPage
 * bilan AYNAN bir xil.
 */
export function TransactionsTable({
  data,
  loading,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onLoadMore,
  loadingMore,
  highlightId,
  onHighlightComplete,
  onRowClick,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
}: TransactionsTableProps) {
  const columns: Column<Transaction>[] = useMemo(() => [
    {
      key: 'select',
      header: '',
      sortable: false,
      className: 'w-10',
      render: (t) => {
        const disabled = t.status === 'REVERSED';
        return (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={selectedIds.has(t.id)}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(t.id);
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={disabled}
            aria-label={`Tranzaksiyani tanlash: ${t.id}`}
          />
        );
      },
    },
    {
      key: 'transactionDate',
      header: 'Sana',
      render: (t) => (
        <div>
          <div className="font-medium">{formatDate(t.transactionDate)}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tur',
      render: (t) => renderTypeBadge(t.type),
    },
    {
      key: 'amount',
      header: 'Summa',
      getValue: (t) => t.amount,
      render: (t) => renderAmount(t),
    },
    {
      key: 'accountName',
      header: 'Hisob',
      render: (t) => (
        <div>
          <span>{t.accountName}</span>
          {t.type === 'TRANSFER' && t.toAccountName && (
            <span className="text-base-content/50">
              {' '}<ArrowRightLeft className="inline h-3 w-3" />{' '}
              {t.toAccountName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Kategoriya',
      render: (t) => (
        <span className="text-base-content/80">{t.categoryName || '—'}</span>
      ),
    },
    {
      key: 'familyMemberName',
      header: "Oila a'zosi",
      render: (t) => (
        <span className="text-base-content/80">{t.familyMemberName || '—'}</span>
      ),
    },
    {
      key: 'description',
      header: 'Tavsif',
      render: (t) => (
        <span className="text-sm text-base-content/60 max-w-[200px] truncate block">
          {t.description || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      className: 'w-24',
      render: (t) => (
        <div className="flex items-center gap-1">
          <PermissionGate permission={PermissionCode.TRANSACTIONS_UPDATE}>
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(t);
              }}
              title="Tahrirlash"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </PermissionGate>
          <PermissionGate permission={PermissionCode.TRANSACTIONS_DELETE}>
            <button
              className="btn btn-ghost btn-sm btn-square text-error"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(t);
              }}
              title="O'chirish"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ], [selectedIds, onToggleSelect, onEdit, onDelete]);

  return (
    <DataTable
      data={data}
      columns={columns}
      keyExtractor={(t) => t.id}
      loading={loading}
      emptyIcon={<ArrowLeftRight className="h-12 w-12" />}
      emptyTitle="Tranzaksiyalar topilmadi"
      emptyDescription="Filtrlarni o'zgartirib ko'ring yoki yangi tranzaksiya qo'shing"
      currentPage={page}
      totalPages={totalPages}
      totalElements={totalElements}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onLoadMore={onLoadMore}
      hasMore={page < totalPages - 1}
      loadingMore={loadingMore}
      onRowClick={onRowClick}
      highlightId={highlightId}
      onHighlightComplete={onHighlightComplete}
      renderMobileCard={(t) => {
        const meta = TYPE_META[t.type];
        const Icon = meta.icon;
        const isReversed = t.status === 'REVERSED';
        return (
          <div
            className={clsx(
              'flex items-center gap-3 rounded-2xl border border-base-200 bg-base-100 p-3',
              isReversed && 'opacity-60'
            )}
          >
            <span className={clsx('grid h-11 w-11 flex-none place-items-center rounded-2xl', meta.tile)}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{t.categoryName || meta.label}</p>
                <span className={clsx('flex-none text-sm font-bold tabular-nums', meta.color)}>
                  {meta.sign}{formatCurrency(t.amount)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs text-base-content/55">
                  {t.accountName}
                  {t.type === 'TRANSFER' && t.toAccountName ? ` → ${t.toAccountName}` : ''}
                  {' · '}
                  {formatDate(t.transactionDate)}
                </p>
                {isReversed && <span className="badge badge-warning badge-xs flex-none">Storno</span>}
              </div>
              {(t.description || t.familyMemberName) && (
                <p className="mt-0.5 truncate text-xs text-base-content/60">
                  {[t.familyMemberName, t.description].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}
