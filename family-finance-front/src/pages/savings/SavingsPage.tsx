import { useCallback, useEffect, useState } from 'react';
import { Target, Plus, Edit2, Trash2, X, PiggyBank, ArrowUpCircle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { savingsApi } from '../../api/savings.api';
import { formatCurrency, formatDate } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { TextInput } from '../../components/ui/TextInput';
import { DateInput } from '../../components/ui/DateInput';
import { TextArea } from '../../components/ui/TextArea';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import type {
  SavingsGoal,
  SavingsGoalRequest,
  GoalContribution,
  GoalContributionRequest,
  ApiResponse,
  PagedResponse,
} from '../../types';

// ---------- Form types ----------

interface GoalFormState {
  name: string;
  targetAmount: number;
  deadline: string;
  icon: string;
  color: string;
}

interface ContributionFormState {
  amount: number;
  contributionDate: string;
  note: string;
}

const emptyGoalForm: GoalFormState = {
  name: '',
  targetAmount: 0,
  deadline: '',
  icon: '',
  color: '',
};

const GOAL_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '📱', '💻', '🎓', '💍', '🏥', '🎁'];

export function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Goal modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm);

  // Contribution modal
  const [showContribModal, setShowContribModal] = useState(false);
  const [contributionGoalId, setContributionGoalId] = useState<number | null>(null);
  const [contribForm, setContribForm] = useState<ContributionFormState>({
    amount: 0,
    contributionDate: new Date().toISOString().slice(0, 10),
    note: '',
  });

  // Selected goal detail & contributions
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loadingContribs, setLoadingContribs] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ---------- Data loading ----------

  const loadGoals = useCallback(async () => {
    try {
      const res = await savingsApi.getAll();
      const data = res.data as ApiResponse<PagedResponse<SavingsGoal>>;
      setGoals(data.data.content);
    } catch {
      toast.error("Jamg'arma maqsadlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContributions = useCallback(async (goalId: number) => {
    setLoadingContribs(true);
    try {
      const contribRes = await savingsApi.getContributions(goalId);
      const data = contribRes.data as ApiResponse<GoalContribution[]>;
      setContributions(data.data);
    } catch {
      toast.error("Hissalarni yuklashda xatolik");
    } finally {
      setLoadingContribs(false);
    }
  }, []);

  useEffect(() => {
    void loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Goal modal handlers ----------

  const handleOpenCreateGoal = () => {
    setEditingGoal(null);
    setGoalForm(emptyGoalForm);
    setShowGoalModal(true);
  };

  const handleOpenEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      targetAmount: goal.targetAmount,
      deadline: goal.deadline ?? '',
      icon: goal.icon ?? '',
      color: goal.color ?? '',
    });
    setShowGoalModal(true);
  };

  const handleCloseGoalModal = () => {
    setShowGoalModal(false);
    setEditingGoal(null);
    setGoalForm(emptyGoalForm);
  };

  const handleSubmitGoal = async () => {
    if (!goalForm.name.trim() || goalForm.targetAmount <= 0) return;

    setSubmitting(true);
    try {
      const payload: SavingsGoalRequest = {
        name: goalForm.name.trim(),
        targetAmount: goalForm.targetAmount,
        deadline: goalForm.deadline || undefined,
        icon: goalForm.icon || undefined,
        color: goalForm.color || undefined,
      };

      if (editingGoal) {
        await savingsApi.update(editingGoal.id, payload);
      } else {
        await savingsApi.create(payload);
      }

      handleCloseGoalModal();
      void loadGoals();
    } catch {
      toast.error('Maqsadni saqlashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Contribution modal handlers ----------

  const handleOpenContrib = (goalId: number) => {
    setContributionGoalId(goalId);
    setContribForm({
      amount: 0,
      contributionDate: new Date().toISOString().slice(0, 10),
      note: '',
    });
    setShowContribModal(true);
  };

  const handleCloseContrib = () => {
    setShowContribModal(false);
    setContributionGoalId(null);
  };

  const handleSubmitContrib = async () => {
    if (contributionGoalId === null || contribForm.amount <= 0) return;

    setSubmitting(true);
    try {
      const payload: GoalContributionRequest = {
        amount: contribForm.amount,
        contributionDate: contribForm.contributionDate,
        note: contribForm.note || undefined,
      };

      await savingsApi.addContribution(contributionGoalId, payload);
      handleCloseContrib();
      void loadGoals();

      // Refresh contributions if viewing the same goal
      if (selectedGoal && selectedGoal.id === contributionGoalId) {
        void loadContributions(contributionGoalId);
      }
    } catch {
      toast.error("Hissa qo'shishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Goal selection & contributions ----------

  const handleSelectGoal = (goal: SavingsGoal) => {
    if (selectedGoal?.id === goal.id) {
      setSelectedGoal(null);
      setContributions([]);
    } else {
      setSelectedGoal(goal);
      void loadContributions(goal.id);
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
      await savingsApi.delete(deletingId);
      if (selectedGoal?.id === deletingId) {
        setSelectedGoal(null);
        setContributions([]);
      }
      void loadGoals();
    } catch {
      toast.error("Maqsadni o'chirishda xatolik");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  };

  // ---------- Helpers ----------

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 60) return 'bg-primary';
    if (percentage >= 30) return 'bg-info';
    return 'bg-warning';
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
          <h1 className="section-title">Jamg'armalar</h1>
          <p className="section-subtitle">Moliyaviy maqsadlaringizni kuzating</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">{goals.length} ta maqsad</span>
          <span className="pill bg-success/10 text-success">
            {goals.filter((g) => g.isCompleted).length} ta bajarilgan
          </span>
          <PermissionGate permission={PermissionCode.SAVINGS_CREATE}>
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreateGoal}>
              <Plus className="h-4 w-4" />
              Yangi maqsad
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Main content: goals grid + detail panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Goals grid */}
        <div className={clsx('space-y-4', selectedGoal ? 'lg:col-span-2' : 'lg:col-span-3')}>
          {goals.length === 0 ? (
            <div className="surface-card p-12 text-center">
              <Target className="h-16 w-16 mx-auto mb-4 text-base-content/20" />
              <h3 className="text-lg font-semibold mb-2">Maqsadlar topilmadi</h3>
              <p className="text-base-content/60 mb-4">
                Jamg'arish maqsadingizni yarating va pul to'plashni boshlang
              </p>
              <PermissionGate permission={PermissionCode.SAVINGS_CREATE}>
                <button className="btn btn-primary" onClick={handleOpenCreateGoal}>
                  <Plus className="h-4 w-4" />
                  Yangi maqsad
                </button>
              </PermissionGate>
            </div>
          ) : (
            <div className={clsx(
              'grid grid-cols-1 gap-4',
              selectedGoal ? 'sm:grid-cols-1 xl:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'
            )}>
              {goals.map((goal) => {
                const pct = Math.min(goal.percentage, 100);
                const isSelected = selectedGoal?.id === goal.id;

                return (
                  <div
                    key={goal.id}
                    className={clsx(
                      'surface-card p-4 space-y-3 cursor-pointer transition hover:shadow-md',
                      isSelected && 'ring-2 ring-primary',
                      goal.isCompleted && 'ring-1 ring-success/30'
                    )}
                    onClick={() => handleSelectGoal(goal)}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                          style={{
                            backgroundColor: goal.color ? `${goal.color}20` : 'oklch(var(--p) / 0.1)',
                            color: goal.color || 'oklch(var(--p))',
                          }}
                        >
                          {goal.icon || <Target className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{goal.name}</h3>
                          {goal.deadline && (
                            <p className="text-xs text-base-content/60">
                              Muddat: {formatDate(goal.deadline)}
                            </p>
                          )}
                        </div>
                      </div>

                      {goal.isCompleted && (
                        <span className="badge badge-success badge-sm shrink-0">Bajarildi</span>
                      )}
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="surface-soft rounded-lg p-2 text-center">
                        <p className="text-[10px] text-base-content/50 uppercase tracking-wider">Maqsad</p>
                        <p className="text-sm font-semibold">{formatCurrency(goal.targetAmount)}</p>
                      </div>
                      <div className="surface-soft rounded-lg p-2 text-center">
                        <p className="text-[10px] text-base-content/50 uppercase tracking-wider">Joriy</p>
                        <p className="text-sm font-semibold text-primary">{formatCurrency(goal.currentAmount)}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx(
                          'text-xs font-semibold',
                          goal.isCompleted ? 'text-success' : 'text-primary'
                        )}>
                          {goal.percentage.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-base-content/50">
                          {formatCurrency(goal.targetAmount - goal.currentAmount)} qoldi
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-base-200 overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all duration-500', getProgressColor(goal.percentage))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-base-200">
                      <PermissionGate permission={PermissionCode.SAVINGS_CONTRIBUTE}>
                        {!goal.isCompleted && (
                          <button
                            className="btn btn-ghost btn-xs text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenContrib(goal.id);
                            }}
                          >
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                            Pul qo'shish
                          </button>
                        )}
                      </PermissionGate>
                      <div className="flex items-center gap-1 ml-auto">
                        <PermissionGate permission={PermissionCode.SAVINGS_UPDATE}>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditGoal(goal);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={PermissionCode.SAVINGS_DELETE}>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(goal.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contributions detail panel */}
        {selectedGoal && (
          <div className="lg:col-span-1">
            <div className="surface-card p-4 space-y-4 sticky top-4">
              {/* Panel header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{
                      backgroundColor: selectedGoal.color ? `${selectedGoal.color}20` : 'oklch(var(--p) / 0.1)',
                      color: selectedGoal.color || 'oklch(var(--p))',
                    }}
                  >
                    {selectedGoal.icon || <Target className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{selectedGoal.name}</h3>
                    <p className="text-xs text-base-content/60">
                      {selectedGoal.isCompleted ? 'Bajarilgan' : 'Faol maqsad'}
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => {
                    setSelectedGoal(null);
                    setContributions([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Goal summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="surface-soft rounded-lg p-3">
                  <p className="text-xs text-base-content/60">Maqsad</p>
                  <p className="font-semibold">{formatCurrency(selectedGoal.targetAmount)}</p>
                </div>
                <div className="surface-soft rounded-lg p-3">
                  <p className="text-xs text-base-content/60">Joriy</p>
                  <p className="font-semibold text-primary">{formatCurrency(selectedGoal.currentAmount)}</p>
                </div>
                <div className="surface-soft rounded-lg p-3 col-span-2">
                  <p className="text-xs text-base-content/60">Qolgan summa</p>
                  <p className="text-xl font-bold text-info">
                    {formatCurrency(Math.max(0, selectedGoal.targetAmount - selectedGoal.currentAmount))}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{selectedGoal.percentage.toFixed(1)}%</span>
                  {selectedGoal.deadline && (
                    <span className="text-xs text-base-content/60">
                      Muddat: {formatDate(selectedGoal.deadline)}
                    </span>
                  )}
                </div>
                <div className="h-3 w-full rounded-full bg-base-200 overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-500', getProgressColor(selectedGoal.percentage))}
                    style={{ width: `${Math.min(selectedGoal.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Add contribution button */}
              {!selectedGoal.isCompleted && (
                <PermissionGate permission={PermissionCode.SAVINGS_CONTRIBUTE}>
                  <button
                    className="btn btn-primary btn-sm w-full"
                    onClick={() => handleOpenContrib(selectedGoal.id)}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    Pul qo'shish
                  </button>
                </PermissionGate>
              )}

              {/* Contributions list */}
              <div className="border-t border-base-200 pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-primary" />
                  To'lovlar tarixi
                </h4>

                {loadingContribs ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                ) : contributions.length === 0 ? (
                  <p className="text-sm text-base-content/50 text-center py-4">
                    Hali to'lovlar mavjud emas
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {contributions.map((contrib) => (
                      <div key={contrib.id} className="surface-soft rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-success">
                            +{formatCurrency(contrib.amount)}
                          </span>
                          <span className="text-xs text-base-content/60">
                            {formatDate(contrib.contributionDate)}
                          </span>
                        </div>
                        {contrib.note && (
                          <p className="text-xs text-base-content/70 mt-1">{contrib.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Goal Add / Edit Modal */}
      <ModalPortal isOpen={showGoalModal} onClose={handleCloseGoalModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingGoal ? 'Maqsadni tahrirlash' : 'Yangi maqsad'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingGoal ? "Ma'lumotlarni o'zgartiring" : "Jamg'arish maqsadingizni belgilang"}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={handleCloseGoalModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Name */}
              <TextInput
                label="Nomi"
                required
                value={goalForm.name}
                onChange={(val) => setGoalForm((prev) => ({ ...prev, name: val }))}
                placeholder="Masalan: Yangi uy uchun"
                leadingIcon={<Target className="h-5 w-5" />}
              />

              {/* Target amount */}
              <CurrencyInput
                label="Maqsad summasi *"
                value={goalForm.targetAmount}
                onChange={(val) => setGoalForm((prev) => ({ ...prev, targetAmount: val }))}
                showQuickButtons
              />

              {/* Deadline */}
              <DateInput
                label="Muddat (ixtiyoriy)"
                value={goalForm.deadline}
                onChange={(val) => setGoalForm((prev) => ({ ...prev, deadline: val }))}
                min={new Date().toISOString().slice(0, 10)}
              />

              {/* Icon picker */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Belgi (ixtiyoriy)
                </span>
                <div className="flex flex-wrap gap-2">
                  {GOAL_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={clsx(
                        'h-10 w-10 rounded-lg flex items-center justify-center text-lg transition',
                        goalForm.icon === icon
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'bg-base-200 hover:bg-base-300'
                      )}
                      onClick={() => setGoalForm((prev) => ({ ...prev, icon: prev.icon === icon ? '' : icon }))}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </label>

              {/* Color picker */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Rang (ixtiyoriy)
                </span>
                <div className="flex flex-wrap gap-2">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={clsx(
                        'h-8 w-8 rounded-full transition',
                        goalForm.color === color && 'ring-2 ring-offset-2 ring-primary'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setGoalForm((prev) => ({ ...prev, color: prev.color === color ? '' : color }))}
                    />
                  ))}
                </div>
              </label>
            </div>

            {/* Modal footer */}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleCloseGoalModal} disabled={submitting}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitGoal}
                disabled={submitting || !goalForm.name.trim() || goalForm.targetAmount <= 0}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                {editingGoal ? 'Saqlash' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Contribution Modal */}
      <ModalPortal isOpen={showContribModal && contributionGoalId !== null} onClose={handleCloseContrib}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold">Pul qo'shish</h3>
                <p className="text-sm text-base-content/60">
                  {goals.find((g) => g.id === contributionGoalId)?.name ?? 'Maqsad'} ga pul qo'shish
                </p>
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={handleCloseContrib}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Amount */}
              <CurrencyInput
                label="Summa *"
                value={contribForm.amount}
                onChange={(val) => setContribForm((prev) => ({ ...prev, amount: val }))}
                showQuickButtons
              />

              {/* Date */}
              <DateInput
                label="Sana"
                required
                value={contribForm.contributionDate}
                onChange={(val) => setContribForm((prev) => ({ ...prev, contributionDate: val }))}
              />

              {/* Note */}
              <TextArea
                label="Izoh (ixtiyoriy)"
                value={contribForm.note}
                onChange={(val) => setContribForm((prev) => ({ ...prev, note: val }))}
                placeholder="Qo'shimcha ma'lumot..."
                rows={2}
              />
            </div>

            {/* Modal footer */}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleCloseContrib} disabled={submitting}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitContrib}
                disabled={submitting || contribForm.amount <= 0}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                Qo'shish
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
              <Trash2 className="h-7 w-7 text-error" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Maqsadni o'chirish</h3>
            <p className="text-sm text-base-content/60 mb-6">
              Ushbu jamg'arma maqsadini o'chirishni xohlaysizmi? Barcha to'lovlar ham o'chiriladi.
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
