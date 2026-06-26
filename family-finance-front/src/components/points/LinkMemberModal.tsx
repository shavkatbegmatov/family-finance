import { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { ComboBox, type ComboBoxOption } from '../ui/ComboBox';
import { LINK_REASON_MIN_LENGTH } from './pointsParticipantsHelpers';
import type { PointParticipant } from '../../types/points.types';

interface LinkMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Link qilinayotgan ishtirokchi (derived selectedParticipant). */
  selectedParticipant: PointParticipant | null;

  // Member selection (hook state — controlled)
  linkMemberId: number | undefined;
  onLinkMemberChange: (id: number | undefined) => void;
  memberOptions: ComboBoxOption[];

  // Derived transfer logic (hook'dan)
  memberLinkedToAnotherParticipant: PointParticipant | null;
  selectedIsCurrentMember: boolean;
  linkReasonRequired: boolean;

  // Actions
  /** Bog'lash — qayta-bog'lash bo'lsa sabab uzatiladi (aks holda undefined). */
  onLink: (reason: string | undefined) => void;
  onUnlink: (reason: string) => void;
  linkPending: boolean;
  unlinkPending: boolean;

  /** Inline "Yangi a'zo" modalini ochish (link modal'dan chiqmasdan). */
  onOpenInlineMember: () => void;
}

/**
 * Ishtirokchini oila a'zosiga bog'lash modali — joriy holat, a'zo tanlash
 * (ComboBox + inline "Yangi a'zo"), transfer ogohlantirishi, qayta-bog'lash sababi
 * (≥10 belgi) va bog'lanishni uzish bloki (sabab ≥10 belgi).
 *
 * <p>Transfer mantig'i (memberLinkedToAnotherParticipant / selectedIsCurrentMember /
 * linkReasonRequired) hook'da hisoblanadi va prop sifatida keladi; sabab matnlari
 * shu modalning lokal holati. Original PointsParticipantsPage bilan AYNAN bir xil.</p>
 */
export function LinkMemberModal({
  isOpen,
  onClose,
  selectedParticipant,
  linkMemberId,
  onLinkMemberChange,
  memberOptions,
  memberLinkedToAnotherParticipant,
  selectedIsCurrentMember,
  linkReasonRequired,
  onLink,
  onUnlink,
  linkPending,
  unlinkPending,
  onOpenInlineMember,
}: LinkMemberModalProps) {
  const [linkReason, setLinkReason] = useState('');
  const [unlinkReason, setUnlinkReason] = useState('');

  // Modal har ochilganda sabab maydonlarini tozalaymiz (original openLinkModal mantig'i)
  useEffect(() => {
    if (isOpen) {
      setLinkReason('');
      setUnlinkReason('');
    }
  }, [isOpen]);

  const canSubmitLink = Boolean(
    selectedParticipant &&
      linkMemberId &&
      !selectedIsCurrentMember &&
      (!linkReasonRequired || linkReason.trim().length >= LINK_REASON_MIN_LENGTH) &&
      !linkPending,
  );

  const handleLink = () => {
    onLink(linkReason.trim() || undefined);
  };

  const handleUnlink = () => {
    onUnlink(unlinkReason.trim());
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Oila a'zosiga bog'lash</h3>
            <p className="text-xs text-base-content/60 mt-1">
              {selectedParticipant?.displayName ?? 'Ishtirokchi tanlanmagan'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-base-200 bg-base-200/30 p-3 text-sm">
            {selectedParticipant?.familyMemberName ? (
              <>
                <p className="text-base-content/60">Hozir bog'langan:</p>
                <p className="font-medium text-info">{selectedParticipant.familyMemberName}</p>
              </>
            ) : (
              <p className="text-base-content/60">Hozircha oila a'zosiga bog'lanmagan</p>
            )}
          </div>

          <div className="form-control">
            <div className="flex items-center justify-between mb-1">
              <span className="label-text">Oila a'zosini tanlang</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs gap-1"
                onClick={onOpenInlineMember}
                title="Ro'yxatda yo'q? Tezda yangi a'zo yarating"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Yangi a'zo
              </button>
            </div>
            <ComboBox
              value={linkMemberId}
              onChange={(val) => onLinkMemberChange(val as number | undefined)}
              options={memberOptions}
              placeholder="Oila a'zosini tanlang..."
              searchPlaceholder="Ism yoki familiya bo'yicha qidiring..."
              allowClear
              size="md"
            />
            {selectedIsCurrentMember && (
              <p className="mt-1 text-xs text-base-content/60">
                Tanlangan oila a'zosi allaqachon shu ishtirokchiga bog'langan.
              </p>
            )}
          </div>

          {memberLinkedToAnotherParticipant && (
            <div className="alert alert-warning text-sm">
              <span>
                Tanlangan a'zo hozir <strong>{memberLinkedToAnotherParticipant.displayName}</strong> ga bog'langan.
                Davom etsangiz bog'lanish transfer qilinadi.
              </span>
            </div>
          )}

          {linkReasonRequired && (
            <div>
              <label className="label">
                <span className="label-text">Qayta bog'lash sababi (kamida 10 belgi) *</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                value={linkReason}
                onChange={(e) => setLinkReason(e.target.value)}
                placeholder="Nega bog'lanish o'zgartirilayotganini yozing..."
              />
              {linkReason.trim().length > 0 && linkReason.trim().length < LINK_REASON_MIN_LENGTH && (
                <p className="mt-1 text-xs text-error">Kamida 10 belgi kiriting</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleLink}
            disabled={!canSubmitLink}
          >
            {linkPending && <span className="loading loading-spinner loading-xs" />}
            Bog'lash
          </button>
        </div>

        {selectedParticipant?.familyMemberId && (
          <div className="mt-5 border-t border-base-200 pt-4">
            <h4 className="text-sm font-semibold text-error">Bog'lanishni uzish</h4>
            <p className="text-xs text-base-content/60 mt-1">
              Ushbu amal audit logga yoziladi.
            </p>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full mt-3"
              rows={2}
              value={unlinkReason}
              onChange={(e) => setUnlinkReason(e.target.value)}
              placeholder="Bog'lanishni uzish sababini yozing (kamida 10 belgi)"
            />
            {unlinkReason.trim().length > 0 && unlinkReason.trim().length < LINK_REASON_MIN_LENGTH && (
              <p className="mt-1 text-xs text-error">Kamida 10 belgi kiriting</p>
            )}
            <div className="mt-3 flex justify-end">
              <button
                className="btn btn-outline btn-error btn-sm"
                onClick={handleUnlink}
                disabled={unlinkPending}
              >
                {unlinkPending && <span className="loading loading-spinner loading-xs" />}
                Bog'lanishni uzish
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
}
