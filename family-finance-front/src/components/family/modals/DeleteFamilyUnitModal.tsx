import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { useDeleteFamilyUnit } from '../../../hooks/useFamilyTreeQueries';
import { familyUnitApi } from '../../../api/family-unit.api';
import type { FamilyUnitDto } from '../../../types';
import type { ApiResponse } from '../../../types';

interface DeleteFamilyUnitModalProps {
  isOpen: boolean;
  familyUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteFamilyUnitModal({
  isOpen,
  familyUnitId,
  onClose,
  onSuccess,
}: DeleteFamilyUnitModalProps) {
  const [partnerNames, setPartnerNames] = useState('');
  const [childCount, setChildCount] = useState(0);
  const deleteFamilyUnit = useDeleteFamilyUnit();

  useEffect(() => {
    if (isOpen && familyUnitId) {
      familyUnitApi.getFamilyUnit(familyUnitId).then((res) => {
        const fu = (res.data as ApiResponse<FamilyUnitDto>).data;
        setPartnerNames(fu.partners.map((p) => p.fullName).join(' & '));
        setChildCount(fu.children.length);
      });
    }
  }, [isOpen, familyUnitId]);

  const handleDelete = () => {
    deleteFamilyUnit.mutate(familyUnitId, {
      onSuccess: () => {
        onClose();
        onSuccess();
      },
    });
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <Trash2 className="h-7 w-7 text-error" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nikohni o&apos;chirish</h3>
          <p className="text-sm text-base-content/60 mb-2">
            {partnerNames && <strong>{partnerNames}</strong>}
            {partnerNames ? ' orasidagi nikohni' : 'Bu nikohni'} o&apos;chirmoqchimisiz?
          </p>
          {childCount > 0 && (
            <p className="text-sm text-warning mb-4">
              Bu nikohga bog&apos;langan {childCount} ta farzand bor. Farzandlar saqlanadi, lekin bog&apos;lanish o&apos;chiriladi.
            </p>
          )}
          <div className="flex justify-center gap-3">
            <button
              className="btn btn-ghost"
              onClick={onClose}
              disabled={deleteFamilyUnit.isPending}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={deleteFamilyUnit.isPending}
            >
              {deleteFamilyUnit.isPending && (
                <span className="loading loading-spinner loading-sm" />
              )}
              O&apos;chirish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
