import { useMemo } from 'react';
import {
  HandMetal,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  Filter,
  User,
} from 'lucide-react';
import clsx from 'clsx';
import {
  formatCurrency,
  formatDate,
  FAMILY_DEBT_TYPES,
  FAMILY_DEBT_STATUSES,
} from '../../config/constants';
import { SearchInput } from '../ui/SearchInput';
import { Select } from '../ui/Select';
import { DataTable, Column } from '../ui/DataTable';
import { RefreshingPill } from '../common/RefreshingPill';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../common/PermissionGate';
import { DebtDetailPanel } from './DebtDetailPanel';
import type { DebtsTab } from '../../hooks/useDebtsData';
import type { FamilyDebt, DebtPayment, DebtType, DebtStatus } from '../../types';

interface DebtsListViewProps {
  isMobile: boolean;
  /** 'all' tabida tur filtri ko'rsatiladi; 'closed' tabida holat filtri yashiriladi. */
  activeTab: DebtsTab;
  // filters
  searchQuery: string;
  onSearchChange: (val: string) => void;
  typeFilter: DebtType | '';
  onTypeFilterChange: (val: DebtType | '') => void;
  statusFilter: DebtStatus | '';
  onStatusFilterChange: (val: DebtStatus | '') => void;
  // list data
  debts: FamilyDebt[];
  allItems: FamilyDebt[];
  selectedDebt: FamilyDebt | null;
  totalElements: number;
  totalPages: number;
  page: number;
  pageSize: number;
  initialLoading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  // pagination handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onLoadMore: () => void;
  // row actions
  onSelectDebt: (debt: FamilyDebt) => void;
  onEdit: (debt: FamilyDebt) => void;
  onDelete: (debtId: number) => void;
  // detail panel (desktop)
  payments: DebtPayment[];
  loadingPayments: boolean;
  onCloseDetail: () => void;
  onPay: () => void;
}

/**
 * Qarzlar ro'yxati ko'rinishi: filtrlar + desktop jadval (DataTable) / mobil
 * kartalar, hamda desktop inline detail panel. Xulq original DebtsPage bilan bir xil.
 */
export function DebtsListView({
  isMobile,
  activeTab,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  debts,
  allItems,
  selectedDebt,
  totalElements,
  totalPages,
  page,
  pageSize,
  initialLoading,
  refreshing,
  loadingMore,
  onPageChange,
  onPageSizeChange,
  onLoadMore,
  onSelectDebt,
  onEdit,
  onDelete,
  payments,
  loadingPayments,
  onCloseDetail,
  onPay,
}: DebtsListViewProps) {
  const columns: Column<FamilyDebt>[] = useMemo(() => [
    {
      key: 'personName',
      header: 'Shaxs',
      render: (debt) => (
        <div>
          <div className="font-medium">{debt.personName}</div>
          {debt.personPhone && (
            <div className="flex items-center gap-1 text-xs text-base-content/60">
              <Phone className="h-3 w-3" />
              {debt.personPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tur',
      render: (debt) => (
        <span
          className={clsx(
            'badge badge-sm',
            debt.type === 'GIVEN' ? 'badge-info' : 'badge-warning'
          )}
        >
          {FAMILY_DEBT_TYPES[debt.type]?.label}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Summa',
      getValue: (debt) => debt.amount,
      render: (debt) => formatCurrency(debt.amount),
    },
    {
      key: 'remainingAmount',
      header: 'Qoldiq',
      getValue: (debt) => debt.remainingAmount,
      render: (debt) => (
        <span className="font-semibold text-error">
          {formatCurrency(debt.remainingAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      render: (debt) => {
        const statusInfo = FAMILY_DEBT_STATUSES[debt.status];
        return (
          <span className={clsx('badge badge-sm', statusInfo?.color)}>
            {statusInfo?.label}
          </span>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Muddat',
      render: (debt) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-3.5 w-3.5 text-base-content/50" />
          <span>{debt.dueDate ? formatDate(debt.dueDate) : '—'}</span>
          {debt.isOverdue && (
            <span className="badge badge-error badge-xs ml-1">O'tgan</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (debt) => (
        <div className="flex items-center gap-1">
          <PermissionGate permission={PermissionCode.DEBTS_UPDATE}>
            <button
              className="btn btn-ghost btn-xs"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(debt);
              }}
              title="Tahrirlash"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </PermissionGate>
          <PermissionGate permission={PermissionCode.DEBTS_DELETE}>
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(debt.id);
              }}
              title="O'chirish"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ], [onEdit, onDelete]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={searchQuery}
            onValueChange={onSearchChange}
            placeholder="Shaxs bo'yicha qidirish..."
            hideLabel
            ariaLabel="Qidirish"
            className="w-56"
          />
          {activeTab === 'all' && (
            <Select
              value={typeFilter || undefined}
              onChange={(val) => onTypeFilterChange((val as DebtType | '') || '')}
              options={[
                { value: '', label: 'Barcha turlar' },
                ...Object.entries(FAMILY_DEBT_TYPES).map(([key, { label }]) => ({
                  value: key,
                  label,
                })),
              ]}
              placeholder="Barcha turlar"
              icon={<Filter className="h-4 w-4" />}
            />
          )}
          {activeTab !== 'closed' && (
            <Select
              value={statusFilter || undefined}
              onChange={(val) => onStatusFilterChange((val as DebtStatus | '') || '')}
              options={[
                { value: '', label: 'Barcha holatlar' },
                ...Object.entries(FAMILY_DEBT_STATUSES).map(([key, { label }]) => ({
                  value: key,
                  label,
                })),
              ]}
              placeholder="Barcha holatlar"
            />
          )}
        </div>
        <p className="text-sm text-base-content/60">
          {totalElements} ta qarz
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Debts Table */}
        <div className="relative lg:col-span-2">
          {/* Refresh — bloklamaydigan indikator (eski blur-overlay) */}
          {refreshing && <RefreshingPill />}
          <DataTable
            data={isMobile ? allItems : debts}
            columns={columns}
            keyExtractor={(debt) => debt.id}
            loading={initialLoading && !refreshing}
            emptyIcon={<HandMetal className="h-12 w-12" />}
            emptyTitle="Qarzlar topilmadi"
            emptyDescription="Filtrlarni o'zgartiring yoki yangi qarz qo'shing"
            onRowClick={onSelectDebt}
            rowClassName={(debt) =>
              clsx(
                debt.isOverdue && 'bg-error/5',
                selectedDebt?.id === debt.id && 'bg-primary/10'
              )
            }
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onLoadMore={onLoadMore}
            hasMore={page < totalPages - 1}
            loadingMore={loadingMore}
            renderMobileCard={(debt) => {
              const overdue = debt.isOverdue;
              return (
                <div
                  className={clsx(
                    'flex items-center gap-3 rounded-2xl border bg-base-100 p-3',
                    overdue ? 'border-error/30' : 'border-base-200',
                    selectedDebt?.id === debt.id && 'ring-2 ring-primary'
                  )}
                >
                  <span
                    className={clsx(
                      'grid h-11 w-11 flex-none place-items-center rounded-2xl',
                      debt.type === 'GIVEN' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'
                    )}
                  >
                    <User className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{debt.personName}</p>
                      <span className="flex-none text-sm font-bold tabular-nums text-error">
                        {formatCurrency(debt.remainingAmount)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-xs text-base-content/55">
                        {FAMILY_DEBT_TYPES[debt.type]?.label} · {formatCurrency(debt.amount)}
                      </p>
                      <div className="flex flex-none items-center gap-1">
                        {overdue && <span className="badge badge-error badge-xs">O'tgan</span>}
                        <span className={clsx('badge badge-xs', FAMILY_DEBT_STATUSES[debt.status]?.color)}>
                          {FAMILY_DEBT_STATUSES[debt.status]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* Detail Panel — faqat desktop inline; mobilda pastki varaq (modal) */}
        {!isMobile && (
          <DebtDetailPanel
            selectedDebt={selectedDebt}
            payments={payments}
            loadingPayments={loadingPayments}
            onClose={onCloseDetail}
            onPay={onPay}
          />
        )}
      </div>
    </div>
  );
}
