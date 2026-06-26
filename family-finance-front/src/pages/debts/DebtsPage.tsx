import { useState } from 'react';
import { Plus, ArrowUpCircle, CreditCard } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../../config/constants';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';
import { useDebtsData, type DebtsTab } from '../../hooks/useDebtsData';
import { DebtFormModal } from '../../components/debts/DebtFormModal';
import { PaymentFormModal } from '../../components/debts/PaymentFormModal';
import { DebtDeleteModal } from '../../components/debts/DebtDeleteModal';
import { DebtDetailModal } from '../../components/debts/DebtDetailPanel';
import { DebtsStatsView } from '../../components/debts/DebtsStatsView';
import { DebtsListView } from '../../components/debts/DebtsListView';
import type { FamilyDebt, FamilyDebtRequest, DebtPaymentRequest } from '../../types';

const TABS: { id: DebtsTab; label: string }[] = [
  { id: 'all', label: 'Barchasi' },
  { id: 'given', label: 'Berilgan' },
  { id: 'taken', label: 'Olingan' },
  { id: 'closed', label: 'Yopilgan' },
  { id: 'stats', label: 'Statistika' },
];

export function DebtsPage() {
  const [activeTab, setActiveTab] = useState<DebtsTab>('all');

  const data = useDebtsData(activeTab);

  // Modal state (form holati modal ichida)
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<FamilyDebt | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deletingDebtId, setDeletingDebtId] = useState<number | null>(null);

  const submittingDebt = data.debtSaveMutation.isPending;
  const submittingPayment = data.paymentMutation.isPending;

  // ==================== DEBT MODAL ====================
  const handleOpenAddModal = () => {
    setEditingDebt(null);
    setShowDebtModal(true);
  };

  const handleOpenEditModal = (debt: FamilyDebt) => {
    setEditingDebt(debt);
    setShowDebtModal(true);
  };

  const handleCloseDebtModal = () => {
    setShowDebtModal(false);
    setEditingDebt(null);
  };

  const handleSubmitDebt = (payload: FamilyDebtRequest) => {
    data.debtSaveMutation.mutate(
      { id: editingDebt?.id, payload },
      { onSuccess: () => handleCloseDebtModal() },
    );
  };

  // ==================== DELETE ====================
  const handleDeleteDebt = () => {
    if (!deletingDebtId) return;
    data.deleteMutation.mutate(deletingDebtId, {
      onSuccess: () => setDeletingDebtId(null),
    });
  };

  // ==================== PAYMENT MODAL ====================
  const handleSubmitPayment = (payload: DebtPaymentRequest) => {
    if (!data.selectedDebt) return;
    data.paymentMutation.mutate(
      { debtId: data.selectedDebt.id, payload },
      { onSuccess: () => setShowPaymentModal(false) },
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <PageHeader
        title="Qarzlar"
        subtitle="Oilaviy qarzlar boshqaruvi"
        actions={
          <>
            <span className="pill bg-info/10 text-info">
              Berilgan: {formatCurrency(data.summary.totalGiven)}
            </span>
            <span className="pill bg-warning/10 text-warning">
              Olingan: {formatCurrency(data.summary.totalTaken)}
            </span>
            <PermissionGate permission={PermissionCode.DEBTS_CREATE}>
              <button className="btn btn-primary btn-sm gap-1.5" onClick={handleOpenAddModal}>
                <Plus className="h-4 w-4" />
                Yangi qarz
              </button>
            </PermissionGate>
          </>
        }
      />

      {/* Mobil: berilgan/olingan qisqacha summasi */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <div className="card-native flex items-center gap-2.5 p-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-info/10 text-info">
            <ArrowUpCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs leading-tight text-base-content/55">Berilgan</p>
            <p className="truncate text-sm font-bold text-info">{formatCurrency(data.summary.totalGiven)}</p>
          </div>
        </div>
        <div className="card-native flex items-center gap-2.5 p-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-warning/10 text-warning">
            <CreditCard className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs leading-tight text-base-content/55">Olingan</p>
            <p className="truncate text-sm font-bold text-warning">{formatCurrency(data.summary.totalTaken)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface-card">
        <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-base-200 p-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  data.setSelectedDebt(null);
                  data.setPage(0);
                }}
                className={clsx(
                  'tap-sm whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-base-content/60 hover:bg-base-200'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'stats' ? (
            <DebtsStatsView summary={data.summary} overdueCount={data.overdueCount} />
          ) : (
            <DebtsListView
              isMobile={data.isMobile}
              activeTab={activeTab}
              searchQuery={data.searchQuery}
              onSearchChange={(val) => {
                data.setSearchQuery(val);
                data.setPage(0);
              }}
              typeFilter={data.typeFilter}
              onTypeFilterChange={(val) => {
                data.setTypeFilter(val);
                data.setPage(0);
              }}
              statusFilter={data.statusFilter}
              onStatusFilterChange={(val) => {
                data.setStatusFilter(val);
                data.setPage(0);
              }}
              debts={data.debts}
              allItems={data.allItems}
              selectedDebt={data.selectedDebt}
              totalElements={data.totalElements}
              totalPages={data.totalPages}
              page={data.page}
              pageSize={data.pageSize}
              initialLoading={data.initialLoading}
              refreshing={data.refreshing}
              loadingMore={data.loadingMore}
              onPageChange={data.setPage}
              onPageSizeChange={(size) => {
                data.setPageSize(size);
                data.setPage(0);
              }}
              onLoadMore={data.handleLoadMore}
              onSelectDebt={data.setSelectedDebt}
              onEdit={handleOpenEditModal}
              onDelete={setDeletingDebtId}
              payments={data.payments}
              loadingPayments={data.loadingPayments}
              onCloseDetail={() => data.setSelectedDebt(null)}
              onPay={() => setShowPaymentModal(true)}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Debt Modal */}
      <DebtFormModal
        isOpen={showDebtModal}
        onClose={handleCloseDebtModal}
        debt={editingDebt}
        submitting={submittingDebt}
        onSubmit={handleSubmitDebt}
      />

      {/* Payment Modal */}
      <PaymentFormModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        debt={data.selectedDebt}
        submitting={submittingPayment}
        onSubmit={handleSubmitPayment}
      />

      {/* Mobil: qarz tafsilotlari pastki varaq (modal) */}
      {data.isMobile && (
        <DebtDetailModal
          selectedDebt={data.selectedDebt}
          payments={data.payments}
          loadingPayments={data.loadingPayments}
          onClose={() => data.setSelectedDebt(null)}
          onPay={() => setShowPaymentModal(true)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DebtDeleteModal
        isOpen={!!deletingDebtId}
        onClose={() => setDeletingDebtId(null)}
        onConfirm={handleDeleteDebt}
      />
    </div>
  );
}
