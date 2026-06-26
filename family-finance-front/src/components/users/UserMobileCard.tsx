import { PersonBadges } from '../persons';
import { UserActionsCell } from './UserActionsCell';
import type { UserDetail } from '../../api/users.api';
import type { UsersModalType } from '../../hooks/useUsersData';

interface UserMobileCardProps {
  user: UserDetail;
  onOpenModal: (type: UsersModalType, user: UserDetail) => void;
  onToggleActive: (user: UserDetail) => void;
  deactivatePending: boolean;
  activatePending: boolean;
}

/** Mobil: bitta foydalanuvchi kartasi (badge'lar + amal tugmalari). */
export function UserMobileCard({
  user,
  onOpenModal,
  onToggleActive,
  deactivatePending,
  activatePending,
}: UserMobileCardProps) {
  return (
    <div className="card-native p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            {user.active ? (
              <span className="badge badge-success badge-sm flex-none">Faol</span>
            ) : (
              <span className="badge badge-error badge-sm flex-none">Nofaol</span>
            )}
          </div>
          <p className="truncate text-xs text-base-content/50">
            @{user.username}
            {user.linkedFamilyMemberName ? ` · ${user.linkedFamilyMemberName}` : ''}
          </p>
          <PersonBadges
            hasUser
            hasFamilyMember={!!user.linkedFamilyMemberId}
            hasParticipant={!!user.pointParticipantId}
            className="mt-1"
          />
        </div>
      </div>
      <div className="scrollbar-hide mt-2 flex items-center gap-0.5 overflow-x-auto border-t border-base-200 pt-2">
        <UserActionsCell
          user={user}
          onOpenModal={onOpenModal}
          onToggleActive={onToggleActive}
          deactivatePending={deactivatePending}
          activatePending={activatePending}
        />
      </div>
    </div>
  );
}
