import { useState } from 'react';
import { Target, Plus } from 'lucide-react';
import clsx from 'clsx';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';
import { PermissionCode } from '../../hooks/usePermission';
import { useSavingsData } from '../../hooks/useSavingsData';
import { GoalCard } from '../../components/savings/GoalCard';
import { ContributionPanel } from '../../components/savings/ContributionPanel';
import { GoalFormModal } from '../../components/savings/GoalFormModal';
import { ContributionFormModal } from '../../components/savings/ContributionFormModal';
import { SavingsDeleteModal } from '../../components/savings/SavingsDeleteModal';
import type { SavingsGoal, SavingsGoalRequest, GoalContributionRequest } from '../../types';

/**
 * Jamg'arma maqsadlari sahifasi (orchestrator). Ma'lumot/mutation'lar
 * {@link useSavingsData} hook'ida; bu komponent faqat UI holati (modal/tanlash)
 * va kompozitsiyani boshqaradi — grid (GoalCard) + ContributionPanel + modal'lar.
 */
export function SavingsPage() {
  // Goal modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Contribution modal
  const [showContribModal, setShowContribModal] = useState(false);
  const [contributionGoalId, setContributionGoalId] = useState<number | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Data + mutations (react-query)
  const {
    selectedGoal,
    setSelectedGoal,
    goals,
    loading,
    contributions,
    loadingContribs,
    goalSaveMutation,
    contribMutation,
    deleteMutation,
  } = useSavingsData(editingGoal);

  const submitting = goalSaveMutation.isPending || contribMutation.isPending;

  // ---------- Goal modal handlers ----------

  const handleOpenCreateGoal = () => {
    setEditingGoal(null);
    setShowGoalModal(true);
  };

  const handleOpenEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const handleCloseGoalModal = () => {
    setShowGoalModal(false);
    setEditingGoal(null);
  };

  const handleSubmitGoal = (payload: SavingsGoalRequest) => {
    goalSaveMutation.mutate(payload, {
      onSuccess: () => {
        setShowGoalModal(false);
        setEditingGoal(null);
      },
    });
  };

  // ---------- Contribution modal handlers ----------

  const handleOpenContrib = (goalId: number) => {
    setContributionGoalId(goalId);
    setShowContribModal(true);
  };

  const handleCloseContrib = () => {
    setShowContribModal(false);
    setContributionGoalId(null);
  };

  const handleSubmitContrib = (payload: GoalContributionRequest) => {
    if (contributionGoalId === null) return;
    contribMutation.mutate(
      { goalId: contributionGoalId, payload },
      {
        onSuccess: () => {
          setShowContribModal(false);
          setContributionGoalId(null);
        },
      },
    );
  };

  // ---------- Goal selection ----------

  const handleSelectGoal = (goal: SavingsGoal) => {
    // Toggle — hissalar selectedGoal o'zgarishida useQuery (enabled) orqali auto-yuklanadi
    setSelectedGoal((cur) => (cur?.id === goal.id ? null : goal));
  };

  // ---------- Delete handlers ----------

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId === null) return;
    deleteMutation.mutate(deletingId, {
      onSettled: () => {
        setShowDeleteConfirm(false);
        setDeletingId(null);
      },
    });
  };

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const completedCount = goals.filter((g) => g.isCompleted).length;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <PageHeader
        title="Jamg'armalar"
        subtitle={
          goals.length === 0
            ? 'Moliyaviy maqsadlaringizni kuzating'
            : `${goals.length} ta maqsad${completedCount > 0 ? ` · ${completedCount} bajarilgan` : ''}`
        }
        actions={
          <PermissionGate permission={PermissionCode.SAVINGS_CREATE}>
            <button className="btn btn-primary btn-sm gap-1.5" onClick={handleOpenCreateGoal}>
              <Plus className="h-4 w-4" />
              Yangi maqsad
            </button>
          </PermissionGate>
        }
      />

      {/* Main content: goals grid + detail panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
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
              'grid grid-cols-1 gap-3 sm:gap-4',
              selectedGoal ? 'sm:grid-cols-1 xl:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'
            )}>
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isSelected={selectedGoal?.id === goal.id}
                  onSelect={handleSelectGoal}
                  onContribute={handleOpenContrib}
                  onEdit={handleOpenEditGoal}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contributions detail panel */}
        {selectedGoal && (
          <ContributionPanel
            goal={selectedGoal}
            contributions={contributions}
            loadingContribs={loadingContribs}
            onClose={() => setSelectedGoal(null)}
            onContribute={handleOpenContrib}
          />
        )}
      </div>

      {/* Goal Add / Edit Modal */}
      <GoalFormModal
        isOpen={showGoalModal}
        onClose={handleCloseGoalModal}
        goal={editingGoal}
        submitting={submitting}
        onSubmit={handleSubmitGoal}
      />

      {/* Contribution Modal */}
      <ContributionFormModal
        isOpen={showContribModal && contributionGoalId !== null}
        onClose={handleCloseContrib}
        goalName={goals.find((g) => g.id === contributionGoalId)?.name ?? 'Maqsad'}
        submitting={submitting}
        onSubmit={handleSubmitContrib}
      />

      {/* Delete Confirmation Modal */}
      <SavingsDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
