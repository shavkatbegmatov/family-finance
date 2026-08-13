import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';

import { PageHeader } from '../../components/layout/PageHeader';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode, usePermission } from '../../hooks/usePermission';
import { TransactionFormModal } from '../../components/common/TransactionFormModal';
import { TransactionDeleteConfirmModal } from '../../components/transactions/TransactionDeleteConfirmModal';
import { ExpenseMonthNav } from '../../components/expenses/ExpenseMonthNav';
import { ExpenseSummaryCards } from '../../components/expenses/ExpenseSummaryCards';
import { ExpenseDailyChart } from '../../components/expenses/ExpenseDailyChart';
import { ExpenseQuickAdd, type QuickAddPrefill } from '../../components/expenses/ExpenseQuickAdd';
import { ExpenseJournal } from '../../components/expenses/ExpenseJournal';
import { ExpenseCategoryBreakdown } from '../../components/expenses/ExpenseCategoryBreakdown';
import { useDailyExpensesData } from '../../hooks/useDailyExpensesData';
import type { Transaction, TransactionRequest } from '../../types';

/**
 * Kunlik xarajatlar jurnali — har kunlik xarajatlarni tez yozib borish va
 * kuzatish moduli: tezkor kiritish (kategoriya/sana chiplari, takrorlash,
 * fokus sikli), kun bo'yicha guruhlangan jurnal, oy statistikasi (o'tgan oy
 * trendi), kunlik grafik va bosiladigan kategoriya taqsimoti. Sahifa
 * orchestrator (D10 naqshi), butun holat useDailyExpensesData hook'ida.
 */
export function DailyExpensesPage() {
  const navigate = useNavigate();
  const data = useDailyExpensesData();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(PermissionCode.TRANSACTIONS_CREATE);
  const canCreateAccounts = hasPermission(PermissionCode.ACCOUNTS_CREATE);
  // false FAQAT ro'yxat yuklanib bo'sh chiqqanda — yuklanish payti noto'g'ri
  // "hisob oching" maslahati miltillamasligi uchun
  const hasAccounts = !data.accountsLoaded || data.accounts.length > 0;

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Takrorlash: qiymatlar formaga ko'chadi; formKey remount qilib yangi initial
  // state beradi (effect'da setState kerak emas — react-hooks qoidasi).
  // scopeId prefill bilan birga saqlanadi — scope almashganda eski scope
  // qiymatlari yangi formaga qayta quyilmasin.
  const [prefill, setPrefill] = useState<{ scopeId: unknown; values: QuickAddPrefill } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const quickAddRef = useRef<HTMLDivElement>(null);

  const handleRepeat = (t: Transaction) => {
    setPrefill({
      scopeId: data.activeScopeId,
      values: {
        amount: t.amount,
        categoryId: t.categoryId,
        accountId: t.accountId,
        description: t.description ?? undefined,
      },
    });
    setFormKey((k) => k + 1);
    quickAddRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Grafikdan kun bosilganda maqsad DOM'da bo'lmasligi mumkin: (a) kategoriya
  // filtri jurnalni toraytirgan, (b) kun hali yuklanmagan (sahifalash). U holda
  // to'siqni olib (filtrni tozalab / keyingi sahifani yuklab), sana ref'da
  // saqlanadi va dayGroups yangilangach effect scroll qiladi (ref mutatsiyasi —
  // setState emas, lint qoidasiga mos).
  const pendingScrollDate = useRef<string | null>(null);

  const scrollToDay = (date: string): boolean => {
    const el = document.getElementById(`day-${date}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
    return false;
  };

  const handleDayClick = (date: string) => {
    if (scrollToDay(date)) return;
    if (data.filterCategoryId !== undefined) {
      pendingScrollDate.current = date;
      data.clearCategoryFilter();
    } else if (data.hasMore) {
      pendingScrollDate.current = date;
      data.handleLoadMore();
    }
  };

  useEffect(() => {
    if (pendingScrollDate.current && scrollToDay(pendingScrollDate.current)) {
      pendingScrollDate.current = null;
    }
  }, [data.dayGroups]);

  const handleQuickAdd = (payload: TransactionRequest, onDone: () => void) => {
    data.createMutation.mutate(payload, { onSuccess: onDone });
  };

  const handleDelete = () => {
    if (!deletingTransaction) return;
    data.reverseMutation.mutate(deletingTransaction.id, {
      onSuccess: () => setDeletingTransaction(null),
    });
  };

  // Chip filtr FAOLLIGIGA bog'liq (kategoriya lookup'iga emas) — kategoriya
  // keyinchalik nofaol qilingan bo'lsa ham "ko'rinmas yopishqoq filtr" qolmasin.
  // Nom fallback'i xulosadan (u nofaol kategoriyaning nomini ham biladi).
  const activeFilterName = data.filterCategoryId
    ? data.categories.find((c) => c.id === data.filterCategoryId)?.name ??
      data.categoryTotals.find((ct) => ct.categoryId === data.filterCategoryId)?.categoryName ??
      'Kategoriya'
    : undefined;

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
        monthTrend={data.monthTrend}
      />

      <PermissionGate permission={PermissionCode.TRANSACTIONS_CREATE}>
        {/* key: scope almashganda forma remount bo'lib default'lar qayta o'qiladi */}
        <div ref={quickAddRef} className="scroll-mt-24">
          <ExpenseQuickAdd
            key={String(data.activeScopeId)}
            accounts={data.accounts}
            categories={data.categories}
            accountsLoaded={data.accountsLoaded}
            canCreateAccounts={canCreateAccounts}
            topCategories={data.topCategories}
            recentDescriptions={data.recentDescriptions}
            prefill={prefill?.scopeId === data.activeScopeId ? prefill.values : null}
            formKey={formKey}
            submitting={data.createMutation.isPending}
            onSubmit={handleQuickAdd}
          />
        </div>
      </PermissionGate>

      <ExpenseDailyChart
        days={data.chartDays}
        primaryCurrency={data.primaryCurrency}
        today={data.today}
        loading={data.summaryLoading}
        onDayClick={handleDayClick}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-3 lg:col-span-2">
          {/* Faol kategoriya filtri — jurnal toraytirilganini aniq ko'rsatadi */}
          {activeFilterName && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-base-content/50">Jurnal filtri:</span>
              <button
                type="button"
                className="btn btn-primary btn-sm gap-1.5 rounded-full"
                onClick={data.clearCategoryFilter}
                aria-label={`${activeFilterName} filtrini bekor qilish`}
              >
                {activeFilterName}
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

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
            canCreate={canCreate}
            hasAccounts={hasAccounts}
            canCreateAccounts={canCreateAccounts}
            filtered={data.filterCategoryId !== undefined}
            filterCategoryId={data.filterCategoryId}
            onLoadMore={data.handleLoadMore}
            onRowClick={(t) => navigate(`/transactions/${t.id}`)}
            onEdit={setEditingTransaction}
            onDelete={setDeletingTransaction}
            onRepeat={handleRepeat}
          />
        </div>
        <ExpenseCategoryBreakdown
          categoryTotals={data.categoryTotals}
          primaryCurrency={data.primaryCurrency}
          loading={data.summaryLoading}
          activeCategoryId={data.filterCategoryId}
          onCategorySelect={data.toggleCategoryFilter}
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
