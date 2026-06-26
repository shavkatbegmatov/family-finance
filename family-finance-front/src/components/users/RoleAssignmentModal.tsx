import { X, Check } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import type { Role } from '../../types';
import type { UserDetail } from '../../api/users.api';

interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: UserDetail | null;
  userDetails: UserDetail | undefined;
  isLoadingDetails: boolean;
  availableRoles: Role[];
  selectedRoleId: number | null;
  onSelectRole: (roleId: number | null) => void;
  onAssignRole: (roleId: number, userId: number) => void;
  onRemoveRole: (roleId: number, userId: number) => void;
  assignPending: boolean;
  removePending: boolean;
}

/** Foydalanuvchi rollarini boshqarish — mavjudlarini olib tashlash + yangi biriktirish. */
export function RoleAssignmentModal({
  isOpen,
  onClose,
  selectedUser,
  userDetails,
  isLoadingDetails,
  availableRoles,
  selectedRoleId,
  onSelectRole,
  onAssignRole,
  onRemoveRole,
  assignPending,
  removePending,
}: RoleAssignmentModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="modal modal-open" onClick={onClose}>
        <div className="modal-box max-w-md p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
          <h3 className="mb-4 text-lg font-bold">
            Rollar boshqarish - {selectedUser?.fullName}
          </h3>

          {isLoadingDetails ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current roles */}
              <div>
                <span className="text-sm font-medium text-base-content/60">Mavjud rollar</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {userDetails?.roleDetails?.length ? (
                    userDetails.roleDetails.map((role) => (
                      <div key={role.id} className="badge badge-primary gap-1 pr-1">
                        {role.name}
                        <button
                          className="btn btn-ghost btn-xs btn-circle"
                          onClick={() =>
                            onRemoveRole(role.id, selectedUser!.id)
                          }
                          disabled={removePending}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-base-content/60">Rollar biriktirilmagan</span>
                  )}
                </div>
              </div>

              {/* Assign new role */}
              {availableRoles.length > 0 && (
                <div className="border-t border-base-200 pt-4">
                  <span className="text-sm font-medium text-base-content/60">Yangi rol biriktirish</span>
                  <div className="mt-2 flex gap-2">
                    <select
                      className="select select-bordered select-sm flex-1"
                      value={selectedRoleId || ''}
                      onChange={(e) => onSelectRole(Number(e.target.value) || null)}
                    >
                      <option value="">Rol tanlang...</option>
                      {availableRoles.map((role: Role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} ({role.code})
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!selectedRoleId || assignPending}
                      onClick={() => {
                        if (selectedRoleId && selectedUser) {
                          onAssignRole(selectedRoleId, selectedUser.id);
                        }
                      }}
                    >
                      {assignPending ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="modal-action">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Yopish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
