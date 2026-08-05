import { useState } from 'react';
import { useNavigate } from 'react-router';

import { PageHeader } from '../../components/layout/PageHeader';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { TransactionFormModal } from '../../components/common/TransactionFormModal';
import { TransactionDeleteConfirmModal } from '../../components/transactions/TransactionDeleteConfirmModal';
import { ExpenseMonthNav } from '../../components/expenses/ExpenseMonthNav';
import { ExpenseSummaryCards } from '../../components/expenses/ExpenseSummaryCards';
import { ExpenseQuickAdd } from '../../components/expenses/ExpenseQuickAdd';
import { ExpenseJournal } from '../../components/expenses/ExpenseJournal';
import { ExpenseCategoryBreakdown } from '../../components/expenses/ExpenseCategoryBreakdown';
import { useDailyExpensesData } from '../../hooks/useDailyExpensesData';
import type { Transaction, TransactionRequest } from '../../types';

/**
 * Kunlik xarajatlar jurnali — har kunlik xarajatlarni tez yozib borish va
 * kuzatish moduli: tezkor kiritish, kun bo'yicha guruhlangan jurnal, oy
 * statistikasi va kategoriya taqsimoti. Sahifa orchestrator (D10 naqshi),
 * butun holat useDailyExpensesData hook'ida.
 */
export function DailyExpensesPage() {
  const navigate = useNavigate();
  const data = useDailyExpensesData();

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const handleQuickAdd = (payload: TransactionRequest, onDone: () => void) => {
    data.createMutation.mutate(payload, { onSuccess: onDone });
  };

  const handleDelete = () => {
    if (!deletingTransaction) return;
    data.reverseMutation.mutate(deletingTransaction.id, {
      onSuccess: () => setDeletingTransaction(null),
    });
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Kunlik xarajatlar"
        subtitle="Har kunlik xarajatlar jurnali va tahlili"
      />

      <ExpenseMonthNav
        monthCursor={data.monthCursor}
        isCurrentMonth={data.isCurrentMonth}
        onPrev={data.goPrevMonth}
        onNext={data.goNextMonth}
        onToday={data.goCurrentMonth}
      />

      <ExpenseSummaryCards
        loading={data.summaryLoading}
        isCurrentMonth={data.isCurrentMonth}
        todayTotals={data.todayTotals}
        periodTotals={data.periodTotals}
        avgPerDay={data.avgPerDay}
        primaryCurrency={data.primaryCurrency}
        maxDay={data.maxDay}
        entryCount={data.entryCount}
      />

      <PermissionGate permission={PermissionCode.TRANSACTIONS_CREATE}>
        {/* key: scope almashganda forma remount bo'lib default'lar qayta o'qiladi */}
        <ExpenseQuickAdd
          key={String(data.activeScopeId)}
          accounts={data.accounts}
          categories={data.categories}
          accountsLoaded={data.accountsLoaded}
          submitting={data.createMutation.isPending}
          onSubmit={handleQuickAdd}
        />
      </PermissionGate>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <ExpenseJournal
            dayGroups={data.dayGroups}
            dailyTotalsByDate={data.dailyTotalsByDate}
            categories={data.categories}
            today={data.today}
            loading={data.loading}
            loadingMore={data.loadingMore}
            hasMore={data.hasMore}
            loadedCount={data.loadedCount}
            totalElements={data.totalElements}
            onLoadMore={data.handleLoadMore}
            onRowClick={(t) => navigate(`/transactions/${t.id}`)}
            onEdit={setEditingTransaction}
            onDelete={setDeletingTransaction}
          />
        </div>
        <ExpenseCategoryBreakdown
          categoryTotals={data.categoryTotals}
          primaryCurrency={data.primaryCurrency}
          loading={data.summaryLoading}
        />
      </div>

      {/* Tahrirlash — umumiy tranzaksiya modali (to'liq imkoniyatlar bilan) */}
      <TransactionFormModal
        isOpen={editingTransaction !== null}
        onClose={() => setEditingTransaction(null)}
        onSuccess={data.invalidateAll}
        editingTransaction={editingTransaction}
        accounts={data.accounts}
        categories={data.categories}
        members={data.members}
      />

      {/* Storno tasdig'i */}
      <TransactionDeleteConfirmModal
        isOpen={deletingTransaction !== null}
        onClose={() => setDeletingTransaction(null)}
        transaction={deletingTransaction}
        submitting={data.reverseMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
