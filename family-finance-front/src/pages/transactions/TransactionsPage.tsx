import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { PermissionCode } from '../../hooks/usePermission';
import { useHighlight } from '../../hooks/useHighlight';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';
import { TransactionFormModal } from '../../components/common/TransactionFormModal';
import { useTransactionsData } from '../../hooks/useTransactionsData';
import { BulkActionsToolbar } from '../../components/transactions/BulkActionsToolbar';
import { TransactionTabs } from '../../components/transactions/TransactionTabs';
import { TransactionsFilter } from '../../components/transactions/TransactionsFilter';
import { TransactionsTable } from '../../components/transactions/TransactionsTable';
import { TransactionDeleteConfirmModal } from '../../components/transactions/TransactionDeleteConfirmModal';
import { BulkReverseConfirmModal } from '../../components/transactions/BulkReverseConfirmModal';
import { BulkCategorizeModal } from '../../components/transactions/BulkCategorizeModal';
import type { Transaction } from '../../types';

export function TransactionsPage() {
  const navigate = useNavigate();
  const { highlightId, clearHighlight } = useHighlight();

  const data = useTransactionsData();

  // Modal state (form / delete / bulk)
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [showBulkReverseModal, setShowBulkReverseModal] = useState(false);
  const [showBulkCategorizeModal, setShowBulkCategorizeModal] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | undefined>(undefined);

  const submitting = data.reverseMutation.isPending;
  const bulkProcessing = data.bulkReverseMutation.isPending || data.bulkCategorizeMutation.isPending;

  // ===== Form modal =====
  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowFormModal(true);
  };

  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingTransaction(null);
  };

  const handleFormSuccess = () => {
    data.invalidateTransactions();
  };

  // ===== Delete (storno) =====
  const handleOpenDelete = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setDeletingTransaction(null);
  };

  const handleDelete = () => {
    if (!deletingTransaction) return;
    data.reverseMutation.mutate(deletingTransaction.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setDeletingTransaction(null);
      },
    });
  };

  // ===== Bulk operations =====
  const handleBulkReverseSubmit = () => {
    if (data.selectedIds.size === 0) return;
    data.bulkReverseMutation.mutate(Array.from(data.selectedIds), {
      onSuccess: () => setShowBulkReverseModal(false),
    });
  };

  const handleBulkCategorizeSubmit = () => {
    if (data.selectedIds.size === 0 || !bulkCategoryId) return;
    data.bulkCategorizeMutation.mutate(
      { ids: Array.from(data.selectedIds), categoryId: bulkCategoryId },
      {
        onSuccess: () => {
          setShowBulkCategorizeModal(false);
          setBulkCategoryId(undefined);
        },
      }
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header — mobilda FAB yaratishni qoplaydi, blok faqat lg+ da ko'rinadi */}
      <PageHeader
        title="Tranzaksiyalar"
        subtitle="Barcha moliyaviy operatsiyalar"
        actions={
          <PermissionGate permission={PermissionCode.TRANSACTIONS_CREATE}>
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Yangi tranzaksiya
            </button>
          </PermissionGate>
        }
      />

      {/* Bulk actions toolbar */}
      {data.selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={data.selectedIds.size}
          isAllSelected={data.isAllSelected}
          onToggleSelectAll={data.toggleSelectAll}
          onClearSelection={data.clearSelection}
          onCategorize={() => setShowBulkCategorizeModal(true)}
          onReverse={() => setShowBulkReverseModal(true)}
        />
      )}

      {/* Tabs + Filters + Table */}
      <div className="surface-card">
        <TransactionTabs
          activeTab={data.activeTab}
          onTabChange={data.handleTabChange}
          showFilters={data.showFilters}
          onToggleFilters={() => data.setShowFilters(!data.showFilters)}
          hasActiveFilters={data.hasActiveFilters}
        />

        <TransactionsFilter
          isOpen={data.showFilters}
          onClose={() => data.setShowFilters(false)}
          onClear={data.clearFilters}
          hasActiveFilters={data.hasActiveFilters}
          onPageReset={() => data.setPage(0)}
          filterSearch={data.filterSearch}
          setFilterSearch={data.setFilterSearch}
          datePreset={data.datePreset}
          customDateRange={data.customDateRange}
          setDatePreset={data.setDatePreset}
          setCustomDateRange={data.setCustomDateRange}
          filterAccountId={data.filterAccountId}
          setFilterAccountId={data.setFilterAccountId}
          filterCategoryId={data.filterCategoryId}
          setFilterCategoryId={data.setFilterCategoryId}
          filterMemberId={data.filterMemberId}
          setFilterMemberId={data.setFilterMemberId}
          accounts={data.accounts}
          categories={data.categories}
          members={data.members}
        />

        <TransactionsTable
          data={data.isMobile ? data.allItems : data.transactions}
          loading={data.loading}
          page={data.page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          pageSize={data.pageSize}
          onPageChange={data.setPage}
          onPageSizeChange={data.handlePageSizeChange}
          onLoadMore={data.handleLoadMore}
          loadingMore={data.loadingMore}
          highlightId={highlightId}
          onHighlightComplete={clearHighlight}
          onRowClick={(t) => navigate(`/transactions/${t.id}`)}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          selectedIds={data.selectedIds}
          onToggleSelect={data.toggleSelect}
        />
      </div>

      {/* Create/Edit Modal */}
      <TransactionFormModal
        isOpen={showFormModal}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        editingTransaction={editingTransaction}
        accounts={data.accounts}
        categories={data.categories}
        members={data.members}
      />

      {/* Delete Confirmation Modal */}
      <TransactionDeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleCloseDelete}
        transaction={deletingTransaction}
        submitting={submitting}
        onConfirm={handleDelete}
      />

      {/* Bulk Reverse Modal */}
      <BulkReverseConfirmModal
        isOpen={showBulkReverseModal}
        onClose={() => setShowBulkReverseModal(false)}
        selectedCount={data.selectedIds.size}
        processing={bulkProcessing}
        onConfirm={handleBulkReverseSubmit}
      />

      {/* Bulk Categorize Modal */}
      <BulkCategorizeModal
        isOpen={showBulkCategorizeModal}
        onClose={() => setShowBulkCategorizeModal(false)}
        selectedCount={data.selectedIds.size}
        categories={data.categories}
        categoryId={bulkCategoryId}
        onCategoryChange={setBulkCategoryId}
        processing={bulkProcessing}
        onConfirm={handleBulkCategorizeSubmit}
      />
    </div>
  );
}
