import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Medal, Flame } from 'lucide-react';
import clsx from 'clsx';
import { pointLeaderboardApi } from '../../api/points.api';
import type { LeaderboardEntry } from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';

type Period = 'overall' | 'weekly' | 'monthly';

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: 'overall', label: 'Umumiy' },
  { value: 'weekly', label: 'Haftalik' },
  { value: 'monthly', label: 'Oylik' },
];

const MEDAL_COLORS: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-700',
};

export function PointsLeaderboardPage() {
  const { canViewPointLeaderboard } = usePermission();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('overall');

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      switch (period) {
        case 'weekly':
          res = await pointLeaderboardApi.getWeekly();
          break;
        case 'monthly':
          res = await pointLeaderboardApi.getMonthly();
          break;
        default:
          res = await pointLeaderboardApi.getOverall();
      }
      setEntries(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error("Reytingni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  if (!canViewPointLeaderboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-base-content/60">Sizda bu sahifani ko'rish huquqi yo'q.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period tabs */}
      <div className="tabs tabs-boxed w-fit">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.value}
            className={clsx('tab tab-sm', period === tab.value && 'tab-active')}
            onClick={() => setPeriod(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-base-content/50">
          Reyting ma'lumotlari topilmadi
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[entries[1], entries[0], entries[2]].map((entry, idx) => {
                const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                return (
                  <div
                    key={entry.participantId}
                    className={clsx(
                      'card bg-base-100 shadow border border-base-200 text-center',
                      actualRank === 1 && 'ring-2 ring-yellow-500 -mt-4',
                    )}
                  >
                    <div className="card-body p-4 items-center">
                      <div className={clsx('text-3xl', MEDAL_COLORS[actualRank])}>
                        <Medal className="h-8 w-8" />
                      </div>
                      <div className="avatar placeholder my-2">
                        <div className="bg-primary text-primary-content rounded-full w-14 h-14">
                          <span className="text-xl font-bold">
                            {entry.participantName?.charAt(0) ?? '?'}
                          </span>
                        </div>
                      </div>
                      <p className="font-semibold">{entry.participantName}</p>
                      <p className="text-2xl font-bold text-primary">
                        {entry.totalPoints.toLocaleString()}
                      </p>
                      <p className="text-xs text-base-content/60">ball</p>
                      {entry.currentStreak > 0 && (
                        <div className="badge badge-warning badge-sm gap-1">
                          <Flame className="h-3 w-3" />
                          {entry.currentStreak} kun
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Ishtirokchi</th>
                  <th>Umumiy ball</th>
                  <th>Balans</th>
                  <th>Vazifalar</th>
                  <th>Streak</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.participantId}
                    className={clsx(entry.rank <= 3 && 'font-semibold')}
                  >
                    <td>
                      {entry.rank <= 3 ? (
                        <span className={clsx('text-lg', MEDAL_COLORS[entry.rank])}>
                          <Medal className="h-5 w-5 inline" />
                        </span>
                      ) : (
                        <span className="text-base-content/60">{entry.rank}</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar placeholder">
                          <div className="bg-base-200 text-base-content rounded-full w-8 h-8">
                            <span className="text-xs">
                              {entry.participantName?.charAt(0) ?? '?'}
                            </span>
                          </div>
                        </div>
                        {entry.participantName}
                      </div>
                    </td>
                    <td className="text-primary font-bold">
                      {entry.totalPoints.toLocaleString()}
                    </td>
                    <td>{entry.currentBalance.toLocaleString()}</td>
                    <td>{entry.tasksCompleted}</td>
                    <td>
                      {entry.currentStreak > 0 ? (
                        <span className="flex items-center gap-1 text-warning">
                          <Flame className="h-3 w-3" />
                          {entry.currentStreak}
                        </span>
                      ) : (
                        <span className="text-base-content/40">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
