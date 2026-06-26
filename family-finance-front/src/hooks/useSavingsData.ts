import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { savingsApi } from '../api/savings.api';
import { useActiveScopeId } from './useScopeChange';
import type {
  SavingsGoal,
  SavingsGoalRequest,
  GoalContributionRequest,
} from '../types';

/**
 * SavingsPage uchun butun react-query (maqsadlar {@code useQuery} + tanlangan
 * maqsad hissalari {@code useQuery} enabled bilan) hamda tanlangan maqsad holati
 * va barcha mutation'lar (saqlash/hissa/o'chirish).
 *
 * <p>Aktiv scope queryKey ichida (D8 migratsiyasi). queryKey'lar va
 * invalidate/onSuccess mantig'i original SavingsPage bilan AYNAN bir xil:</p>
 * <ul>
 *   <li>maqsadlar — {@code ['savings-goals', activeScopeId]}</li>
 *   <li>hissalar — {@code ['savings-contributions', selectedGoal?.id]},
 *       {@code enabled: selectedGoal !== null}</li>
 *   <li>goalSave invalidate — {@code ['savings-goals']}</li>
 *   <li>contrib invalidate — {@code ['savings-goals']} +
 *       {@code ['savings-contributions', goalId]}</li>
 *   <li>delete — {@code ['savings-goals']} + o'chirilgan goal selected bo'lsa
 *       {@code setSelectedGoal(null)}</li>
 * </ul>
 *
 * @param editingGoal Tahrirlanayotgan maqsad — goalSave mutation create/update
 *                    tanlovi uchun (null bo'lsa create).
 */
export function useSavingsData(editingGoal: SavingsGoal | null) {
  const queryClient = useQueryClient();
  const activeScopeId = useActiveScopeId();

  // Tanlangan maqsad detail (hissalar useQuery enabled bilan auto-yuklanadi)
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // ==================== DATA (react-query) ====================
  // Aktiv scope queryKey'da — scope almashganda avtomatik refetch (D8 migratsiyasi).
  const {
    data: goals = [],
    isLoading: loading,
    isError: goalsError,
  } = useQuery({
    queryKey: ['savings-goals', activeScopeId],
    queryFn: async () => (await savingsApi.getAll()).data.data.content,
  });

  // Tanlangan maqsad hissalar — selectedGoal o'zgarsa avtomatik yuklanadi
  const { data: contributions = [], isFetching: loadingContribs } = useQuery({
    queryKey: ['savings-contributions', selectedGoal?.id],
    queryFn: async () => (await savingsApi.getContributions(selectedGoal!.id)).data.data,
    enabled: selectedGoal !== null,
  });

  useEffect(() => {
    if (goalsError) toast.error("Jamg'arma maqsadlarini yuklashda xatolik");
  }, [goalsError]);

  // ---------- Mutations ----------
  const goalSaveMutation = useMutation({
    mutationFn: (payload: SavingsGoalRequest) =>
      editingGoal ? savingsApi.update(editingGoal.id, payload) : savingsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
    },
    onError: () => toast.error('Maqsadni saqlashda xatolik'),
  });

  const contribMutation = useMutation({
    mutationFn: (vars: { goalId: number; payload: GoalContributionRequest }) =>
      savingsApi.addContribution(vars.goalId, vars.payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      void queryClient.invalidateQueries({ queryKey: ['savings-contributions', vars.goalId] });
    },
    onError: () => toast.error("Hissa qo'shishda xatolik"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => savingsApi.delete(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      if (selectedGoal?.id === id) setSelectedGoal(null);
    },
    onError: () => toast.error("Maqsadni o'chirishda xatolik"),
  });

  return {
    // selection
    selectedGoal,
    setSelectedGoal,
    // list data
    goals,
    loading,
    // contributions
    contributions,
    loadingContribs,
    // mutations
    goalSaveMutation,
    contribMutation,
    deleteMutation,
  };
}
