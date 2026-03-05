import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, Lock, Star, Award } from 'lucide-react';
import clsx from 'clsx';
import { pointAchievementApi, pointParticipantApi } from '../../api/points.api';
import type { PointAchievement, PointParticipant } from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { formatDate } from '../../config/constants';
import { Select } from '../../components/ui/Select';
import {
  PointsActionBar,
  PointsEmptyState,
  PointsLoadingState,
  PointsPageShell,
  PointsPermissionState,
  PointsSectionCard,
} from '../../components/points/ui';

export function PointsAchievementsPage() {
  const { canViewPoints } = usePermission();

  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [achievements, setAchievements] = useState<PointAchievement[]>([]);
  const [earnedIds, setEarnedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadParticipants = useCallback(async () => {
    try {
      const res = await pointParticipantApi.getAll();
      const parts: PointParticipant[] = res.data?.data ?? res.data ?? [];
      setParticipants(parts.filter((p) => p.isActive));
    } catch { /* ignore */ }
  }, []);

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pointAchievementApi.getAll();
      const allAchievements: PointAchievement[] = res.data?.data ?? res.data ?? [];
      setAchievements(allAchievements);

      // Load earned achievements for selected participant
      if (selectedParticipantId) {
        try {
          const earnedRes = await pointAchievementApi.getEarned(selectedParticipantId);
          const earned: PointAchievement[] = earnedRes.data?.data ?? earnedRes.data ?? [];
          setEarnedIds(new Set(earned.map((a) => a.id)));
        } catch {
          setEarnedIds(new Set());
        }
      } else {
        // Use the earned field from global list
        setEarnedIds(new Set(allAchievements.filter((a) => a.earned).map((a) => a.id)));
      }
    } catch {
      toast.error("Yutuqlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [selectedParticipantId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      TASK_COUNT: 'Vazifa soni',
      STREAK: 'Streak',
      TOTAL_POINTS: 'Umumiy ball',
      CATEGORY_MASTER: 'Kategoriya ustasi',
      SAVINGS: "Jamg'arma",
      CUSTOM: 'Boshqa',
    };
    return labels[type] ?? type;
  };

  if (!canViewPoints) {
    return <PointsPermissionState />;
  }

  return (
    <PointsPageShell
      title="Yutuqlar"
      description="Ishtirokchilar erishgan badge va bonuslarni ko'ring."
      icon={Award}
    >
      <PointsActionBar>
        <Select
          className="w-full max-w-xs"
          label="Ishtirokchini tanlang (ixtiyoriy)"
          value={selectedParticipantId ?? 'ALL'}
          onChange={(value) => {
            if (value === undefined || value === 'ALL') {
              setSelectedParticipantId(null);
              return;
            }
            setSelectedParticipantId(Number(value));
          }}
          options={[
            { value: 'ALL', label: 'Barcha ishtirokchilar' },
            ...participants.map((p) => ({ value: p.id, label: p.displayName })),
          ]}
        />
      </PointsActionBar>

      {loading ? (
        <PointsLoadingState layout="cards" />
      ) : achievements.length === 0 ? (
        <PointsEmptyState
          title="Yutuqlar topilmadi"
          description="Hozircha konfiguratsiya qilingan yutuqlar mavjud emas."
        />
      ) : (
        <PointsSectionCard title="Yutuqlar katalogi" subtitle={`${achievements.length} ta yutuq`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {achievements.map((achievement) => {
              const isEarned = earnedIds.has(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={clsx(
                    'points-card-hover rounded-xl border p-4 text-center',
                    isEarned
                      ? 'bg-base-100 border-success/30 ring-1 ring-success/20'
                      : 'bg-base-200/30 border-base-200 opacity-60',
                  )}
                >
                  <div
                    className={clsx(
                      'w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2 mx-auto',
                      isEarned ? 'bg-success/10' : 'bg-base-200'
                    )}
                  >
                    {achievement.icon ? (
                      <span>{achievement.icon}</span>
                    ) : isEarned ? (
                      <CheckCircle className="h-7 w-7 text-success" />
                    ) : (
                      <Lock className="h-7 w-7 text-base-content/30" />
                    )}
                  </div>

                  <h3 className="font-semibold text-sm">{achievement.name}</h3>

                  {achievement.description && (
                    <p className="text-xs text-base-content/60 line-clamp-2">
                      {achievement.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    <span className="badge badge-ghost badge-xs">
                      {getTypeLabel(achievement.type)}
                    </span>
                    <span className="badge badge-outline badge-xs">
                      Talab: {achievement.requiredValue}
                    </span>
                  </div>

                  {achievement.bonusPoints > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs text-warning mt-1">
                      <Star className="h-3 w-3" />
                      +{achievement.bonusPoints} bonus ball
                    </div>
                  )}

                  {isEarned && achievement.earnedAt && (
                    <p className="text-xs text-success mt-1">
                      Erishilgan: {formatDate(achievement.earnedAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </PointsSectionCard>
      )}
    </PointsPageShell>
  );
}
