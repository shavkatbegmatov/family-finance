import { X, Search, Link2, Unlink2, ArrowRightLeft, UserCheck } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import type { FamilyMember } from '../../types';
import type { UserDetail } from '../../api/users.api';

interface LinkFamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: UserDetail | null;

  // Family member list + loading
  filteredFamilyMembers: FamilyMember[];
  isLoadingFamilyMembers: boolean;

  // Search
  familySearch: string;
  onFamilySearchChange: (value: string) => void;

  // Selection
  selectedFamilyMemberId: number | null;
  onSelectFamilyMember: (id: number) => void;

  // Link reason (transfer)
  familyLinkReason: string;
  onFamilyLinkReasonChange: (value: string) => void;

  // Unlink reason
  familyUnlinkReason: string;
  onFamilyUnlinkReasonChange: (value: string) => void;

  // Derived transfer logic (hook'dan)
  willTransfer: boolean;
  linkReasonRequired: boolean;
  canSubmitLink: boolean;

  // Actions
  onLink: () => void;
  onUnlink: () => void;
  linkPending: boolean;
  unlinkPending: boolean;
}

/**
 * Oila a'zosiga bog'lash — qidiruv, ro'yxat, transfer (boshqa userdan ko'chirish) mantig'i,
 * sabab (≥10 belgi) va bog'lanishni uzish bloki.
 *
 * <p>Transfer mantig'i (willTransfer/linkReasonRequired/canSubmitLink) hook'da hisoblanadi
 * va prop sifatida keladi — original UsersPage bilan AYNAN bir xil.</p>
 */
export function LinkFamilyMemberModal({
  isOpen,
  onClose,
  selectedUser,
  filteredFamilyMembers,
  isLoadingFamilyMembers,
  familySearch,
  onFamilySearchChange,
  selectedFamilyMemberId,
  onSelectFamilyMember,
  familyLinkReason,
  onFamilyLinkReasonChange,
  familyUnlinkReason,
  onFamilyUnlinkReasonChange,
  willTransfer,
  linkReasonRequired,
  canSubmitLink,
  onLink,
  onUnlink,
  linkPending,
  unlinkPending,
}: LinkFamilyMemberModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="modal modal-open" onClick={onClose}>
        <div className="modal-box max-w-2xl p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
          <h3 className="mb-2 text-lg font-bold">Oila a'zosiga bog'lash</h3>
          <p className="text-sm text-base-content/60 mb-4">
            {selectedUser?.fullName} (@{selectedUser?.username}) uchun bog'lanishni boshqaring
          </p>

          <div className="space-y-4">
            <div className="rounded-xl border border-base-200 bg-base-200/40 p-3">
              <p className="text-xs uppercase tracking-wide text-base-content/50">Joriy holat</p>
              {selectedUser?.linkedFamilyMemberName ? (
                <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <UserCheck className="h-4 w-4 text-success" />
                  {selectedUser.linkedFamilyMemberName}
                </p>
              ) : (
                <p className="mt-1 text-sm text-base-content/60">Biriktirilmagan</p>
              )}
            </div>

            <div>
              <label className="label">
                <span className="label-text">Oila a'zosini qidirish</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
                <input
                  type="text"
                  className="input input-bordered w-full pl-9"
                  placeholder="Ism bo'yicha qidiring..."
                  value={familySearch}
                  onChange={(e) => onFamilySearchChange(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-base-200">
              {isLoadingFamilyMembers ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner" />
                </div>
              ) : filteredFamilyMembers.length === 0 ? (
                <p className="p-4 text-sm text-base-content/50">Mos oila a'zosi topilmadi</p>
              ) : (
                <div className="max-h-64 overflow-auto">
                  {filteredFamilyMembers.map((member) => {
                    const linkedToAnotherUser = member.userId && member.userId !== selectedUser?.id;
                    const isCurrentMember = selectedUser?.linkedFamilyMemberId === member.id;
                    const isSelected = selectedFamilyMemberId === member.id;

                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`w-full border-b border-base-200 p-3 text-left last:border-b-0 ${
                          isSelected ? 'bg-primary/10' : 'hover:bg-base-200/40'
                        }`}
                        onClick={() => onSelectFamilyMember(member.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{member.fullName}</p>
                            <p className="text-xs text-base-content/50">{member.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCurrentMember && (
                              <span className="badge badge-info badge-sm">Joriy</span>
                            )}
                            {linkedToAnotherUser && (
                              <span className="badge badge-warning badge-sm">Band</span>
                            )}
                            {!linkedToAnotherUser && !isCurrentMember && (
                              <span className="badge badge-success badge-sm">Bo'sh</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {willTransfer && (
              <div className="alert alert-warning">
                <ArrowRightLeft className="h-4 w-4" />
                <span>
                  Transfer bajariladi: avvalgi bog'lanish uzilib, yangi oila a'zosiga biriktiriladi.
                </span>
              </div>
            )}

            {linkReasonRequired && (
              <div>
                <label className="label">
                  <span className="label-text">Transfer sababi (kamida 10 belgi) *</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={familyLinkReason}
                  onChange={(e) => onFamilyLinkReasonChange(e.target.value)}
                  placeholder="Nega qayta bog'lanayotganini yozing..."
                />
                {familyLinkReason.trim().length > 0 && familyLinkReason.trim().length < 10 && (
                  <p className="mt-1 text-xs text-error">Kamida 10 belgi kiriting</p>
                )}
              </div>
            )}
          </div>

          <div className="modal-action mt-6">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={onLink}
              disabled={!canSubmitLink}
            >
              {linkPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              Bog'lash
            </button>
          </div>

          {selectedUser?.linkedFamilyMemberId && (
            <div className="mt-5 border-t border-base-200 pt-4">
              <h4 className="text-sm font-semibold text-error">Bog'lanishni uzish</h4>
              <p className="text-xs text-base-content/60 mt-1">
                Bu amal uchun sabab majburiy va audit logga yoziladi.
              </p>
              <textarea
                className="textarea textarea-bordered textarea-sm w-full mt-3"
                rows={2}
                value={familyUnlinkReason}
                onChange={(e) => onFamilyUnlinkReasonChange(e.target.value)}
                placeholder="Bog'lanishni uzish sababini yozing (kamida 10 belgi)"
              />
              <div className="mt-3 flex justify-end">
                <button
                  className="btn btn-outline btn-error btn-sm"
                  onClick={onUnlink}
                  disabled={unlinkPending}
                >
                  {unlinkPending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Unlink2 className="h-3.5 w-3.5" />
                  )}
                  Bog'lanishni uzish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
