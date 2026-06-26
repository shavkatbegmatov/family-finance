import { X } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { formatPhoneDisplay } from '../../utils/phone';
import { formatDateTime } from '../../config/constants';
import type { UserDetail } from '../../api/users.api';

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDetails: UserDetail | undefined;
  isLoading: boolean;
}

/** Foydalanuvchi tafsilotlari — faqat ko'rish (read-only). */
export function ViewUserModal({ isOpen, onClose, userDetails, isLoading }: ViewUserModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="modal modal-open" onClick={onClose}>
        <div className="modal-box max-w-lg p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
          <h3 className="mb-4 text-lg font-bold">Foydalanuvchi tafsilotlari</h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner" />
            </div>
          ) : userDetails ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-base-content/50">Username</span>
                  <p className="font-medium">@{userDetails.username}</p>
                </div>
                <div>
                  <span className="text-base-content/50">To'liq ism</span>
                  <p className="font-medium">{userDetails.fullName}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Email</span>
                  <p className="font-medium">{userDetails.email || '-'}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Telefon</span>
                  <p className="font-medium">{formatPhoneDisplay(userDetails.phone) || '-'}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Holat</span>
                  <p>
                    {userDetails.active ? (
                      <span className="badge badge-success badge-sm">Faol</span>
                    ) : (
                      <span className="badge badge-error badge-sm">Nofaol</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-base-content/50">Parol o'zgartirilishi kerak</span>
                  <p>{userDetails.mustChangePassword ? 'Ha' : 'Yo\'q'}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Yaratuvchi</span>
                  <p className="font-medium">{userDetails.createdByUsername || '-'}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Oila guruhi</span>
                  <p className="font-medium">{userDetails.familyGroupName || '-'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-base-content/50">Bog'langan oila a'zosi</span>
                  <p className="font-medium">
                    {userDetails.linkedFamilyMemberName ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="badge badge-success badge-sm">Biriktirilgan</span>
                        {userDetails.linkedFamilyMemberName}
                      </span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">Biriktirilmagan</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Roles */}
              <div>
                <span className="text-sm text-base-content/50">Rollar</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {userDetails.roleDetails?.length ? (
                    userDetails.roleDetails.map((role) => (
                      <span key={role.id} className="badge badge-primary badge-sm">{role.name}</span>
                    ))
                  ) : (
                    <span className="text-sm text-base-content/60">Rollar biriktirilmagan</span>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 border-t border-base-200 pt-3 text-xs text-base-content/50">
                <div>
                  <span>Yaratilgan:</span>{' '}
                  {userDetails.createdAt ? formatDateTime(userDetails.createdAt) : '-'}
                </div>
                <div>
                  <span>Parol o'zgartirilgan:</span>{' '}
                  {userDetails.passwordChangedAt
                    ? formatDateTime(userDetails.passwordChangedAt)
                    : '-'}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ModalPortal>
  );
}
