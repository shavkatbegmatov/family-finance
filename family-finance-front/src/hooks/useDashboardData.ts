import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { familyDashboardApi } from '../api/family-dashboard.api';
import { useActiveScopeId } from './useScopeChange';
import { useNotificationsStore } from '../store/notificationsStore';
import type {
  FamilyDashboardStats,
  FamilyChartData,
  Transaction,
} from '../types';

/**
 * DashboardPage uchun butun react-query ma'lumot qatlami (stats/charts/recent),
 * yuklash xatosi toast'i va real-time bildirishnoma kelganda invalidate.
 *
 * <p>Aktiv scope queryKey ichida — scope almashganda avtomatik refetch
 * (D8 migratsiyasi). queryKey'lar va invalidate mantig'i original DashboardPage
 * bilan AYNAN bir xil: <code>['dashboard-stats', activeScopeId]</code>,
 * <code>['dashboard-charts', activeScopeId]</code>,
 * <code>['dashboard-recent', activeScopeId]</code>.</p>
 */
export function useDashboardData() {
  const { notifications } = useNotificationsStore();

  // Aktiv scope queryKey'da — scope almashganda avtomatik refetch (eski
  // useScopeChangeEffect + manual loadData o'rniga; D8 migratsiyasi).
  const queryClient = useQueryClient();
  const activeScopeId = useActiveScopeId();

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', activeScopeId],
    queryFn: async (): Promise<FamilyDashboardStats> => (await familyDashboardApi.getStats()).data.data,
  });
  const chartsQuery = useQuery({
    queryKey: ['dashboard-charts', activeScopeId],
    queryFn: async (): Promise<FamilyChartData> => (await familyDashboardApi.getCharts()).data.data,
  });
  const recentQuery = useQuery({
    queryKey: ['dashboard-recent', activeScopeId],
    queryFn: async (): Promise<Transaction[]> => (await familyDashboardApi.getRecentTransactions()).data.data,
  });

  const stats = statsQuery.data ?? null;
  const charts = chartsQuery.data ?? null;
  const recentTransactions = recentQuery.data ?? [];
  const initialLoading = statsQuery.isLoading || chartsQuery.isLoading || recentQuery.isLoading;
  const refreshing =
    !initialLoading && (statsQuery.isFetching || chartsQuery.isFetching || recentQuery.isFetching);
  const isError = statsQuery.isError || chartsQuery.isError || recentQuery.isError;

  // Xulqni saqlash: yuklash xatosida toast (eski try/catch o'rniga)
  useEffect(() => {
    if (statsQuery.isError || chartsQuery.isError || recentQuery.isError) {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    }
  }, [statsQuery.isError, chartsQuery.isError, recentQuery.isError]);

  // Real-time bildirishnoma kelganda dashboard'ni yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  return {
    stats,
    charts,
    recentTransactions,
    initialLoading,
    refreshing,
    isError,
  };
}
