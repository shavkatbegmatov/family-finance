import { useCallback, useEffect, useState } from 'react';
import { PieChart, Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { budgetsApi } from '../../api/budgets.api';
import { categoriesApi } from '../../api/categories.api';
import { formatCurrency, BUDGET_PERIODS, MONTHS_UZ } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DateInput } from '../../components/ui/DateInput';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { getCategoryIcon } from '../../utils/icons';
import type { Budget, BudgetRequest, BudgetPeriod, FinanceCategory, ApiResponse, PagedResponse } from '../../types';

interface BudgetFormState {
  categoryId: number;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
}

const emptyForm: BudgetFormState = {
  categoryId: 0,
  amount: 0,
  period: 'MONTHLY',
  startDate: '',
  endDate: '',
};

export function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState<BudgetFormState>(emptyForm);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ---------- Data loading ----------

  const loadBudgets = useCallback(async () => {
    try {
      const res = await budgetsApi.getAll();
      const data = res.data as ApiResponse<PagedResponse<Budget>>;
      setBudgets(data.data.content);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const categoriesRes = await categoriesApi.getByType('EXPENSE');
      const data = categoriesRes.data as ApiResponse<FinanceCategory[]>;
      setCategories(data.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    void loadBudgets();
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Helpers ----------

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-error';
    if (percentage >= 60) return 'bg-warning';
    return 'bg-success';
  };

  const getProgressTextColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-error';
    if (percentage >= 60) return 'text-warning';
    return 'text-success';
  };

  const formatPeriodLabel = (budget: Budget): string => {
    const periodLabel = BUDGET_PERIODS[budget.period]?.label ?? budget.period;
    const start = new Date(budget.startDate);
    const monthName = MONTHS_UZ[start.getMonth()];
    return `${periodLabel} (${monthName} ${start.getFullYear()})`;
  };

  // ---------- Modal handlers ----------

  const handleOpenCreate = () => {
    setEditingBudget(null);
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
    setForm({ ...emptyForm, startDate, endDate });
    setShowModal(true);
  };

  const handleOpenEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setForm({
      categoryId: budget.categoryId,
      amount: budget.amount,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBudget(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.categoryId || form.amount <= 0 || !form.startDate || !form.endDate) return;

    setSubmitting(true);
    try {
      const payload: BudgetRequest = {
        categoryId: form.categoryId,
        amount: form.amount,
        period: form.period,
        startDate: form.startDate,
        endDate: form.endDate,
      };

      if (editingBudget) {
        await budgetsApi.update(editingBudget.id, payload);
      } else {
        await budgetsApi.create(payload);
      }

      handleCloseModal();
      void loadBudgets();
    } catch (error) {
      console.error('Failed to save budget:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Delete handlers ----------

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingId === null) return;
    try {
      await budgetsApi.delete(deletingId);
      void loadBudgets();
    } catch (error) {
      console.error('Failed to delete budget:', error);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  };

  // ---------- Period change auto-date ----------

  const handlePeriodChange = (period: BudgetPeriod) => {
    const now = new Date();
    let startDate = form.startDate;
    let endDate = form.endDate;

    if (period === 'WEEKLY') {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startDate = monday.toISOString().slice(0, 10);
      endDate = sunday.toISOString().slice(0, 10);
    } else if (period === 'MONTHLY') {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (period === 'YEARLY') {
      startDate = `${now.getFullYear()}-01-01`;
      endDate = `${now.getFullYear()}-12-31`;
    }

    setForm((prev) => ({ ...prev, period, startDate, endDate }));
  };

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Byudjet</h1>
          <p className="section-subtitle">Oylik xarajat limitlarini boshqaring</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">{budgets.length} ta byudjet</span>
          <PermissionGate permission={PermissionCode.BUDGETS_CREATE}>
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Yangi byudjet
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Budget Cards Grid */}
      {budgets.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <PieChart className="h-16 w-16 mx-auto mb-4 text-base-content/20" />
          <h3 className="text-lg font-semibold mb-2">Byudjetlar topilmadi</h3>
          <p className="text-base-content/60 mb-4">
            Xarajatlaringizni nazorat qilish uchun birinchi byudjetni yarating
          </p>
          <PermissionGate permission={PermissionCode.BUDGETS_CREATE}>
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Yangi byudjet
            </button>
          </PermissionGate>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const pct = Math.min(budget.percentage, 100);
            const isOverBudget = budget.percentage > 100;

            return (
              <div
                key={budget.id}
                className={clsx(
                  'surface-card p-4 space-y-3 transition hover:shadow-md',
                  isOverBudget && 'ring-1 ring-error/30'
                )}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                      style={{
                        backgroundColor: budget.categoryColor ? `${budget.categoryColor}20` : 'oklch(var(--p) / 0.1)',
                        color: budget.categoryColor || 'oklch(var(--p))',
                      }}
                    >
                      {budget.categoryIcon || <PieChart className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{budget.categoryName}</h3>
                      <p className="text-xs text-base-content/60">{formatPeriodLabel(budget)}</p>
                    </div>
                  </div>

                  {isOverBudget && (
                    <div className="tooltip tooltip-left" data-tip="Byudjet oshib ketdi!">
                      <AlertTriangle className="h-5 w-5 text-error shrink-0" />
                    </div>
                  )}
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="surface-soft rounded-lg p-2">
                    <p className="text-[10px] text-base-content/50 uppercase tracking-wider">Byudjet</p>
                    <p className="text-sm font-semibold">{formatCurrency(budget.amount)}</p>
                  </div>
                  <div className="surface-soft rounded-lg p-2">
                    <p className="text-[10px] text-base-content/50 uppercase tracking-wider">Sarflangan</p>
                    <p className="text-sm font-semibold text-error">{formatCurrency(budget.spentAmount)}</p>
                  </div>
                  <div className="surface-soft rounded-lg p-2">
                    <p className="text-[10px] text-base-content/50 uppercase tracking-wider">Qoldiq</p>
                    <p className={clsx('text-sm font-semibold', budget.remainingAmount >= 0 ? 'text-success' : 'text-error')}>
                      {formatCurrency(Math.abs(budget.remainingAmount))}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={clsx('text-xs font-semibold', getProgressTextColor(budget.percentage))}>
                      {budget.percentage.toFixed(1)}%
                    </span>
                    {isOverBudget && (
                      <span className="text-[10px] text-error font-medium">
                        {formatCurrency(budget.spentAmount - budget.amount)} ortiqcha
                      </span>
                    )}
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-base-200 overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500', getProgressColor(budget.percentage))}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-base-200">
                  <PermissionGate permission={PermissionCode.BUDGETS_UPDATE}>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleOpenEdit(budget)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Tahrirlash
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PermissionCode.BUDGETS_DELETE}>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleDeleteClick(budget.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <ModalPortal isOpen={showModal} onClose={handleCloseModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingBudget ? 'Byudjetni tahrirlash' : 'Yangi byudjet'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingBudget ? "Ma'lumotlarni o'zgartiring" : 'Xarajat kategoriyasi uchun limit belgilang'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Category select */}
              <Select
                label="Kategoriya"
                required
                placeholder="Kategoriyani tanlang"
                value={form.categoryId || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, categoryId: Number(val) }))}
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                  icon: getCategoryIcon(cat.icon, cat.color),
                }))}
              />

              {/* Amount */}
              <CurrencyInput
                label="Byudjet summasi *"
                value={form.amount}
                onChange={(val) => setForm((prev) => ({ ...prev, amount: val }))}
                showQuickButtons
              />

              {/* Period select */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Davr *
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(BUDGET_PERIODS).map(([key, { label }]) => (
                    <button
                      key={key}
                      type="button"
                      className={clsx(
                        'btn btn-sm',
                        form.period === key ? 'btn-primary' : 'btn-outline'
                      )}
                      onClick={() => handlePeriodChange(key as BudgetPeriod)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              {/* Start date */}
              <DateInput
                label="Boshlanish sanasi"
                required
                value={form.startDate}
                onChange={(val) => setForm((prev) => ({ ...prev, startDate: val }))}
                showTodayButton={false}
              />

              {/* End date */}
              <DateInput
                label="Tugash sanasi"
                required
                value={form.endDate}
                onChange={(val) => setForm((prev) => ({ ...prev, endDate: val }))}
                showTodayButton={false}
              />
            </div>

            {/* Modal footer */}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleCloseModal} disabled={submitting}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !form.categoryId || form.amount <= 0 || !form.startDate || !form.endDate}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                {editingBudget ? 'Saqlash' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Confirmation Modal */}
      <ModalPortal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl p-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-error/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-7 w-7 text-error" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Byudjetni o'chirish</h3>
            <p className="text-sm text-base-content/60 mb-6">
              Ushbu byudjetni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </p>
            <div className="flex gap-2 w-full">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-error flex-1"
                onClick={handleConfirmDelete}
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
