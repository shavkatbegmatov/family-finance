import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Flame, Star, TrendingUp, Clock, Zap,
  Users, Coins, Target, Award, Trophy,
} from 'lucide-react';
import { pointBalanceApi, pointTaskApi, pointEventApi } from '../../api/points.api';
import { pointParticipantApi } from '../../api/points.api';
import type {
  PointBalance, PointTask, PointMultiplierEvent, PointParticipant,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import {
  PointsEmptyState,
  PointsGamifiedBadge,
  PointsLoadingState,
  PointsPageShell,
  PointsPermissionState,
  PointsSectionCard,
  PointsStatCard,
  PointsTableShell,
} from '../../components/points/ui';

export function PointsDashboardPage() {
  const { canViewPoints, canVerifyPointTasks } = usePermission();

  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [balances, setBalances] = useState<PointBalance[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PointTask[]>([]);
  const [activeEvents, setActiveEvents] = useState<PointMultiplierEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const partRes = await pointParticipantApi.getAll();
      const parts: PointParticipant[] = partRes.data?.data ?? partRes.data ?? [];
      setParticipants(parts);

      const [pendingData, eventsData] = await Promise.all([
        canVerifyPointTasks
          ? pointTaskApi
              .getPendingVerification()
              .then((res) => res.data?.data ?? res.data ?? [])
              .catch(() => [])
          : Promise.resolve([]),
        pointEventApi
          .getActive()
          .then((res) => res.data?.data ?? res.data ?? [])
          .catch(() => []),
      ]);

      setPendingTasks(pendingData as PointTask[]);
      setActiveEvents(eventsData as PointMultiplierEvent[]);

      // Load balances for each participant
      const balancePromises = parts
        .filter((p) => p.isActive)
        .map((p) => pointBalanceApi.get(p.id).catch(() => null));
      const balanceResults = await Promise.all(balancePromises);
      const loadedBalances = balanceResults
        .filter(Boolean)
        .map((r) => r!.data?.data ?? r!.data) as PointBalance[];
      setBalances(loadedBalances);
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [canVerifyPointTasks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick stats
  const stats = useMemo(() => {
    const totalBalance = balances.reduce((sum, b) => sum + b.currentBalance, 0);
    const totalEarned = balances.reduce((sum, b) => sum + b.totalEarned, 0);
    const activeParticipants = participants.filter(p => p.isActive).length;
    const bestStreak = balances.reduce((max, b) => Math.max(max, b.longestStreak), 0);
    return { totalBalance, totalEarned, activeParticipants, bestStreak };
  }, [balances, participants]);

  if (!canViewPoints) {
    return <PointsPermissionState />;
  }

  return (
    <PointsPageShell
      title="Ball tizimi paneli"
      description="Ishtirokchilar, streak va tasdiqlash navbatini bir joyda kuzating."
      icon={Trophy}
      actions={(
        <>
          <Link to="/points/tasks?status=SUBMITTED" className="btn btn-primary btn-sm">
            Tasdiqlash navbati
          </Link>
          <Link to="/points/participants" className="btn btn-outline btn-sm">
            Ishtirokchilar
          </Link>
        </>
      )}
    >
      {loading ? (
        <PointsLoadingState layout="cards" />
      ) : (
        <>
          {activeEvents.length > 0 && (
            <PointsSectionCard
              title="Faol ko'paytiruvchi hodisalar"
              subtitle="Hozirda kuchaytirilgan ball berilayotgan davrlar"
              icon={Zap}
            >
              <div className="flex flex-wrap gap-2">
                {activeEvents.map((event) => (
                  <PointsGamifiedBadge
                    key={event.id}
                    variant="warning"
                    label={`${event.name} x${event.multiplier}`}
                  />
                ))}
              </div>
            </PointsSectionCard>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PointsStatCard
              label="Ishtirokchilar"
              value={stats.activeParticipants}
              icon={Users}
              tone="primary"
            />
            <PointsStatCard
              label="Jami balans"
              value={stats.totalBalance.toLocaleString()}
              icon={Coins}
              tone="success"
            />
            <PointsStatCard
              label="Jami topilgan"
              value={stats.totalEarned.toLocaleString()}
              icon={Target}
              tone="info"
            />
            <PointsStatCard
              label="Eng uzun streak"
              value={`${stats.bestStreak} kun`}
              icon={Award}
              tone="warning"
            />
          </div>

          <PointsSectionCard
            title="Ishtirokchilar balansi"
            subtitle="Har bir ishtirokchining joriy natijalari"
          >
            {balances.length === 0 ? (
              <PointsEmptyState
                title="Ishtirokchilar topilmadi"
                description="Balanslarni ko'rish uchun avval ishtirokchi qo'shing."
                actionLabel="Ishtirokchi qo'shish"
                actionTo="/points/participants"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {balances.map((balance) => (
                  <div
                    key={balance.id}
                    className="surface-soft points-card-hover rounded-xl overflow-hidden p-4"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 text-primary w-10 h-10">
                          <span className="text-sm font-bold">
                            {balance.participantName?.charAt(0) ?? '?'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold">{balance.participantName}</p>
                        {balance.currentStreak > 0 && (
                          <div className="flex items-center gap-1 text-xs text-warning">
                            <Flame className="h-3 w-3" />
                            {balance.currentStreak} kunlik streak
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-base-100/80 p-2 text-center">
                        <p className="text-xs text-base-content/60">Balans</p>
                        <p className="font-bold text-primary">{balance.currentBalance.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-base-100/80 p-2 text-center">
                        <p className="text-xs text-base-content/60">Jami topilgan</p>
                        <p className="font-bold text-success">{balance.totalEarned.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-base-content/60">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Eng uzun: {balance.longestStreak}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Sarf: {balance.totalSpent.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PointsSectionCard>

          {canVerifyPointTasks && (
            <PointsSectionCard
              title="Tasdiqlash kutilmoqda"
              subtitle="Topshirilgan vazifalar navbati"
              icon={Clock}
              action={(
                <PointsGamifiedBadge
                  variant={pendingTasks.length > 0 ? 'warning' : 'neutral'}
                  label={`${pendingTasks.length} ta`}
                />
              )}
            >
              {pendingTasks.length === 0 ? (
                <PointsEmptyState
                  title="Tasdiqlash navbati bo'sh"
                  description="Hozircha tekshiruv talab qiladigan topshiriqlar yo'q."
                />
              ) : (
                <PointsTableShell>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Vazifa</th>
                        <th>Ishtirokchi</th>
                        <th>Ball</th>
                        <th>Kategoriya</th>
                        <th>Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTasks.slice(0, 10).map((task) => (
                        <tr key={task.id}>
                          <td className="font-medium">{task.title}</td>
                          <td>{task.assignedToName ?? '-'}</td>
                          <td>
                            <span className="font-semibold text-primary">{task.effectivePoints}</span>
                          </td>
                          <td>
                            <PointsGamifiedBadge variant="outline" label={task.category} />
                          </td>
                          <td>
                            <PointsGamifiedBadge variant="accent" label="Topshirilgan" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pendingTasks.length > 10 && (
                    <div className="border-t border-base-200 py-2 text-center">
                      <Link to="/points/tasks?status=SUBMITTED" className="btn btn-xs btn-ghost">
                        Barchasini ko'rish ({pendingTasks.length})
                      </Link>
                    </div>
                  )}
                </PointsTableShell>
              )}
            </PointsSectionCard>
          )}
        </>
      )}
    </PointsPageShell>
  );
}
