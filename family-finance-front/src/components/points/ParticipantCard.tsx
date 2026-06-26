import { Edit2, UserX, Link as LinkIcon } from 'lucide-react';
import clsx from 'clsx';
import { PersonBadges } from '../persons';
import type { PointParticipant, PointBalance } from '../../types/points.types';

interface ParticipantCardProps {
  participant: PointParticipant;
  /** Bu ishtirokchining balansi (isActive bo'lsa yuklanadi; bo'lmasa undefined). */
  balance?: PointBalance;
  /** Boshqaruv tugmalari (bog'lash/tahrirlash/o'chirish) ko'rsatilsinmi. */
  canManage: boolean;
  onLink: (p: PointParticipant) => void;
  onEdit: (p: PointParticipant) => void;
  onDeactivate: (id: number) => void;
}

/**
 * Ishtirokchi kartasi — avatar, ism/laqab/oila a'zosi, capability badge'lari,
 * 3 ta balans (balans/topilgan/streak) va boshqaruv amallari. Original
 * PointsParticipantsPage karta markup'i bilan AYNAN bir xil.
 */
export function ParticipantCard({
  participant: p,
  balance: bal,
  canManage,
  onLink,
  onEdit,
  onDeactivate,
}: ParticipantCardProps) {
  return (
    <div
      className={clsx(
        'points-card-hover surface-soft rounded-xl p-4',
        !p.isActive && 'opacity-55',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="avatar placeholder">
          <div className="bg-primary text-primary-content rounded-full w-12 h-12">
            <span className="text-lg font-bold">{p.firstName.charAt(0)}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{p.displayName}</p>
          {p.nickname && (
            <p className="text-xs text-base-content/50">@{p.nickname}</p>
          )}
          {p.familyMemberName && (
            <p className="text-xs text-info">{p.familyMemberName}</p>
          )}
          <PersonBadges
            hasUser={!!p.familyMemberUserId}
            hasFamilyMember={!!p.familyMemberId}
            hasParticipant
            userTooltip={p.familyMemberUsername ? `Tizimga kira oladi: @${p.familyMemberUsername}` : undefined}
            participantTooltip={p.nickname ? `Ball tizimida: @${p.nickname}` : 'Ball tizimida qatnashadi'}
            className="mt-1.5"
          />
        </div>
        {!p.isActive && (
          <span className="badge badge-error badge-xs">Nofaol</span>
        )}
      </div>

      {bal && (
        <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
          <div className="bg-base-100/85 rounded-lg p-2">
            <p className="text-xs text-base-content/60">Balans</p>
            <p className="font-bold text-primary">
              {bal.currentBalance.toLocaleString()}
            </p>
          </div>
          <div className="bg-base-100/85 rounded-lg p-2">
            <p className="text-xs text-base-content/60">Topilgan</p>
            <p className="font-bold text-success">
              {bal.totalEarned.toLocaleString()}
            </p>
          </div>
          <div className="bg-base-100/85 rounded-lg p-2">
            <p className="text-xs text-base-content/60">Streak</p>
            <p className="font-bold text-warning">{bal.currentStreak}</p>
          </div>
        </div>
      )}

      {canManage && p.isActive && (
        <div className="card-actions justify-end mt-3">
          <button
            className="btn btn-ghost btn-xs gap-1"
            onClick={() => onLink(p)}
          >
            <LinkIcon className="h-3 w-3" />
            {p.familyMemberId ? "Bog'lanish" : "Bog'lash"}
          </button>
          <button
            className="btn btn-ghost btn-xs gap-1"
            onClick={() => onEdit(p)}
          >
            <Edit2 className="h-3 w-3" />
            Tahrirlash
          </button>
          <button
            className="btn btn-ghost btn-xs text-error gap-1"
            onClick={() => onDeactivate(p.id)}
          >
            <UserX className="h-3 w-3" />
            O'chirish
          </button>
        </div>
      )}
    </div>
  );
}
