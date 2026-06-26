import { Eye, Edit2, Key, Shield, Power, AtSign, Link2 } from 'lucide-react';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../common/PermissionGate';
import type { UserDetail } from '../../api/users.api';
import type { UsersModalType } from '../../hooks/useUsersData';

interface UserActionsCellProps {
  user: UserDetail;
  onOpenModal: (type: UsersModalType, user: UserDetail) => void;
  onToggleActive: (user: UserDetail) => void;
  deactivatePending: boolean;
  activatePending: boolean;
}

/**
 * Foydalanuvchi amal tugmalari — jadval va mobil kartada qayta ishlatiladi.
 * Har bir tugma o'zining PermissionGate'i bilan o'ralgan (RBAC original bilan aynan).
 */
export function UserActionsCell({
  user,
  onOpenModal,
  onToggleActive,
  deactivatePending,
  activatePending,
}: UserActionsCellProps) {
  return (
    <>
      <PermissionGate permission={PermissionCode.USERS_VIEW}>
        <button className="btn btn-ghost btn-sm" title="Ko'rish" onClick={() => onOpenModal('view', user)}>
          <Eye className="h-3.5 w-3.5" />
        </button>
      </PermissionGate>
      <PermissionGate permission={PermissionCode.USERS_UPDATE}>
        <button className="btn btn-ghost btn-sm" title="Tahrirlash" onClick={() => onOpenModal('edit', user)}>
          <Edit2 className="h-3.5 w-3.5" />
        </button>
      </PermissionGate>
      <PermissionGate permission={PermissionCode.USERS_UPDATE}>
        <button className="btn btn-ghost btn-sm" title="Oila a'zosini biriktirish" onClick={() => onOpenModal('family-link', user)}>
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </PermissionGate>
      <PermissionGate permission={PermissionCode.USERS_UPDATE}>
        <button className="btn btn-ghost btn-sm" title="Username o'zgartirish" onClick={() => onOpenModal('username', user)}>
          <AtSign className="h-3.5 w-3.5" />
        </button>
      </PermissionGate>
      <PermissionGate permission={PermissionCode.USERS_UPDATE}>
        <button className="btn btn-ghost btn-sm" title="Parolni tiklash" onClick={() => onOpenModal('password', user)}>
          <Key className="h-3.5 w-3.5" />
        </button>
      </PermissionGate>
      <PermissionGate permission={PermissionCode.USERS_CHANGE_ROLE}>
        <button className="btn btn-ghost btn-sm" title="Rollar" onClick={() => onOpenModal('roles', user)}>
          <Shield className="h-3.5 w-3.5" />
        </button>
      </PermissionGate>
      {user.active ? (
        <PermissionGate permission={PermissionCode.USERS_DELETE}>
          <button
            className="btn btn-ghost btn-sm text-error"
            title="O'chirish"
            onClick={() => onToggleActive(user)}
            disabled={deactivatePending}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
        </PermissionGate>
      ) : (
        <PermissionGate permission={PermissionCode.USERS_UPDATE}>
          <button
            className="btn btn-ghost btn-sm text-success"
            title="Faollashtirish"
            onClick={() => onToggleActive(user)}
            disabled={activatePending}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
        </PermissionGate>
      )}
    </>
  );
}
