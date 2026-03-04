import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Flame, Star, TrendingUp, Clock, Zap,
  Users, Coins, Target, Award,
} from 'lucide-react';
import { pointBalanceApi, pointTaskApi, pointEventApi } from '../../api/points.api';
import { pointParticipantApi } from '../../api/points.api';
import type {
  PointBalance, PointTask, PointMultiplierEvent, PointParticipant,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';

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
      const [partRes, pendingRes, eventsRes] = await Promise.all([
        pointParticipantApi.getAll(),
        pointTaskApi.getPendingVerification(),
        pointEventApi.getActive(),
      ]);
      const parts: PointParticipant[] = partRes.data?.data ?? partRes.data ?? [];
      setParticipants(parts);
      setPendingTasks(pendingRes.data?.data ?? pendingRes.data ?? []);
      setActiveEvents(eventsRes.data?.data ?? eventsRes.data ?? []);

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
  }, []);

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-base-content/60">Sizda bu sahifani ko'rish huquqi yo'q.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active multiplier events banner */}
      {activeEvents.length > 0 && (
        <div className="alert alert-warning shadow-lg">
          <Zap className="h-5 w-5" />
          <div>
            <h3 className="font-bold">Faol ko'paytiruvchi hodisalar!</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {activeEvents.map((event) => (
                <span key={event.id} className="badge badge-warning badge-sm gap-1">
                  {event.name} (x{event.multiplier})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <>
          {/* Quick stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="surface-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Ishtirokchilar</p>
                  <p className="text-xl font-bold">{stats.activeParticipants}</p>
                </div>
              </div>
            </div>
            <div className="surface-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-success/10 text-success">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Jami balans</p>
                  <p className="text-xl font-bold">{stats.totalBalance.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="surface-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-info/10 text-info">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Jami topilgan</p>
                  <p className="text-xl font-bold">{stats.totalEarned.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="surface-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-warning/10 text-warning">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Eng uzun streak</p>
                  <p className="text-xl font-bold">{stats.bestStreak} kun</p>
                </div>
              </div>
            </div>
          </div>

          {/* Participant balance cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Ishtirokchilar balansi</h2>
            {balances.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                Ishtirokchilar topilmadi.{' '}
                <Link to="/points/participants" className="link link-primary">
                  Ishtirokchi qo'shing
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {balances.map((balance) => (
                  <div
                    key={balance.id}
                    className="surface-card rounded-xl overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="avatar placeholder">
                          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary rounded-full w-10 h-10">
                            <span className="text-sm font-bold">
                              {balance.participantName?.charAt(0) ?? '?'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{balance.participantName}</p>
                          {balance.currentStreak > 0 && (
                            <div className="flex items-center gap-1 text-xs text-warning">
                              <Flame className="h-3 w-3" />
                              {balance.currentStreak} kunlik streak
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-base-200/50 rounded-lg p-2 text-center">
                          <p className="text-xs text-base-content/60">Balans</p>
                          <p className="font-bold text-primary">
                            {balance.currentBalance.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-base-200/50 rounded-lg p-2 text-center">
                          <p className="text-xs text-base-content/60">Jami topilgan</p>
                          <p className="font-bold text-success">
                            {balance.totalEarned.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-xs text-base-content/60">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Eng uzun streak: {balance.longestStreak}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Sarflangan: {balance.totalSpent.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending verification tasks */}
          {canVerifyPointTasks && pendingTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Tasdiqlash kutilmoqda
                <span className="badge badge-warning badge-sm">{pendingTasks.length}</span>
              </h2>
              <div className="overflow-x-auto surface-card rounded-xl">
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
                          <span className="font-semibold text-primary">
                            {task.effectivePoints}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-ghost badge-sm">{task.category}</span>
                        </td>
                        <td>
                          <span className="badge badge-accent badge-sm">Topshirilgan</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pendingTasks.length > 10 && (
                  <div className="text-center py-2 border-t border-base-200">
                    <Link to="/points/tasks?status=SUBMITTED" className="btn btn-xs btn-ghost">
                      Barchasini ko'rish ({pendingTasks.length})
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
