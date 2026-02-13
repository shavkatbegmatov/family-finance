import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { Select } from '../../ui/Select';
import { DateInput } from '../../ui/DateInput';
import { useUpdateFamilyUnit } from '../../../hooks/useFamilyTreeQueries';
import { MARRIAGE_TYPES, FAMILY_UNIT_STATUSES } from '../../../config/constants';
import { familyUnitApi } from '../../../api/family-unit.api';
import type { MarriageType, FamilyUnitStatus, FamilyUnitDto } from '../../../types';
import type { SelectOption } from '../../ui/Select';
import type { ApiResponse } from '../../../types';

interface EditFamilyUnitModalProps {
  isOpen: boolean;
  familyUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditFamilyUnitModal({
  isOpen,
  familyUnitId,
  onClose,
  onSuccess,
}: EditFamilyUnitModalProps) {
  const [marriageType, setMarriageType] = useState<MarriageType>('MARRIED');
  const [status, setStatus] = useState<FamilyUnitStatus>('ACTIVE');
  const [marriageDate, setMarriageDate] = useState('');
  const [divorceDate, setDivorceDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [partnerNames, setPartnerNames] = useState('');

  const updateFamilyUnit = useUpdateFamilyUnit();

  const marriageTypeOptions: SelectOption[] = Object.entries(MARRIAGE_TYPES).map(
    ([key, { label }]) => ({ value: key, label })
  );

  const statusOptions: SelectOption[] = Object.entries(FAMILY_UNIT_STATUSES).map(
    ([key, { label }]) => ({ value: key, label })
  );

  useEffect(() => {
    if (isOpen && familyUnitId) {
      setLoading(true);
      familyUnitApi
        .getFamilyUnit(familyUnitId)
        .then((res) => {
          const fu = (res.data as ApiResponse<FamilyUnitDto>).data;
          setMarriageType(fu.marriageType);
          setStatus(fu.status);
          setMarriageDate(fu.marriageDate || '');
          setDivorceDate(fu.divorceDate || '');
          setPartnerNames(fu.partners.map((p) => p.fullName).join(' & '));
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, familyUnitId]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    updateFamilyUnit.mutate(
      {
        id: familyUnitId,
        data: {
          marriageType,
          status,
          marriageDate: marriageDate || undefined,
          divorceDate: divorceDate || undefined,
        },
      },
      {
        onSuccess: () => {
          handleClose();
          onSuccess();
        },
      }
    );
  };

  const isSubmitting = updateFamilyUnit.isPending;

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Nikoh ma&apos;lumotlari</h3>
              {partnerNames && (
                <p className="text-sm text-base-content/60 mt-1">{partnerNames}</p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Select
                label="Nikoh turi"
                required
                value={marriageType}
                onChange={(val) => setMarriageType(val as MarriageType)}
                options={marriageTypeOptions}
              />

              <Select
                label="Holati"
                required
                value={status}
                onChange={(val) => setStatus(val as FamilyUnitStatus)}
                options={statusOptions}
              />

              <DateInput
                label="Nikoh sanasi"
                value={marriageDate}
                onChange={setMarriageDate}
              />

              <DateInput
                label="Ajrashgan sana"
                value={divorceDate}
                onChange={setDivorceDate}
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={handleClose} disabled={isSubmitting}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting && <span className="loading loading-spinner loading-sm" />}
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
