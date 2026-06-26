import { PersonBadges } from '../persons';
import { UserActionsCell } from './UserActionsCell';
import { formatPhoneDisplay } from '../../utils/phone';
import type { UserDetail } from '../../api/users.api';
import type { UsersModalType } from '../../hooks/useUsersData';

interface UserTableProps {
  users: UserDetail[];
  page: number;
  pageSize: number;
  canManagePoints: boolean;
  onOpenModal: (type: UsersModalType, user: UserDetail) => void;
  onToggleActive: (user: UserDetail) => void;
  onQuickAddParticipant: (user: UserDetail) => void;
  deactivatePending: boolean;
  activatePending: boolean;
}

/** Desktop: foydalanuvchilar jadvali. */
export function UserTable({
  users,
  page,
  pageSize,
  canManagePoints,
  onOpenModal,
  onToggleActive,
  onQuickAddParticipant,
  deactivatePending,
  activatePending,
}: UserTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-base-200 lg:block">
      <table className="table table-zebra">
        <thead>
          <tr className="bg-base-200/50">
            <th className="w-12">#</th>
            <th>Foydalanuvchi</th>
            <th className="hidden md:table-cell">Email</th>
            <th className="hidden lg:table-cell">Telefon</th>
            <th className="hidden lg:table-cell">Bog'langan a'zo</th>
            <th className="hidden sm:table-cell">Rollar</th>
            <th>Holati</th>
            <th className="text-center">Amallar</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id} className="hover">
              <td className="text-base-content/50">
                {page * pageSize + index + 1}
              </td>
              <td>
                <div>
                  <div className="font-medium">{user.fullName}</div>
                  <div className="text-xs text-base-content/50">@{user.username}</div>
                  <PersonBadges
                    hasUser
                    hasFamilyMember={!!user.linkedFamilyMemberId}
                    hasParticipant={!!user.pointParticipantId}
                    userTooltip={`Tizimga kira oladi: @${user.username}`}
                    participantTooltip={user.pointParticipantNickname ? `Ball tizimida: @${user.pointParticipantNickname}` : undefined}
                    onAddParticipant={
                      canManagePoints && user.active && user.linkedFamilyMemberId && !user.pointParticipantId
                        ? () => onQuickAddParticipant(user)
                        : undefined
                    }
                    onAddFamilyMember={
                      !user.linkedFamilyMemberId ? () => onOpenModal('family-link', user) : undefined
                    }
                    className="mt-1"
                  />
                </div>
              </td>
              <td className="hidden text-sm md:table-cell">
                {user.email || <span className="text-base-content/30">-</span>}
              </td>
              <td className="hidden text-sm lg:table-cell">
                {user.phone ? formatPhoneDisplay(user.phone) : <span className="text-base-content/30">-</span>}
              </td>
              <td className="hidden text-sm lg:table-cell">
                {user.linkedFamilyMemberName ? (
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success badge-sm">Biriktirilgan</span>
                    <span className="truncate max-w-[170px]" title={user.linkedFamilyMemberName}>
                      {user.linkedFamilyMemberName}
                    </span>
                  </div>
                ) : (
                  <span className="badge badge-ghost badge-sm">Biriktirilmagan</span>
                )}
              </td>
              <td className="hidden sm:table-cell">
                {user.rolesText ? (
                  <div className="flex flex-wrap gap-1">
                    {user.rolesText.split(', ').map((role) => (
                      <span key={role} className="badge badge-ghost badge-sm">
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-base-content/30">-</span>
                )}
              </td>
              <td>
                {user.active ? (
                  <span className="badge badge-success badge-sm gap-1">Faol</span>
                ) : (
                  <span className="badge badge-error badge-sm gap-1">Nofaol</span>
                )}
              </td>
              <td>
                <div className="flex items-center justify-center gap-1">
                  <UserActionsCell
                    user={user}
                    onOpenModal={onOpenModal}
                    onToggleActive={onToggleActive}
                    deactivatePending={deactivatePending}
                    activatePending={activatePending}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
