import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { TextInput } from '../../ui/TextInput';
import { Select } from '../../ui/Select';
import { useAddChild, useActivePersonsQuery } from '../../../hooks/useFamilyTreeQueries';
import { PersonPicker, emptyPersonDraft, isPersonDraftValid } from './shared/PersonPicker';
import type { PersonDraft } from './shared/PersonPicker';
import { LINEAGE_TYPES } from '../../../config/constants';
import type { LineageType } from '../../../types';
import type { SelectOption } from '../../ui/Select';

interface AddChildModalProps {
  isOpen: boolean;
  /** Mavjud nikoh birligi. Yagona ota-ona oqimida bo'lmaydi (singleParentPersonId beriladi). */
  familyUnitId?: number;
  /** Yagona ota-ona: nikoh birligi shu yerda (farzand bilan birga) yaratiladi. */
  singleParentPersonId?: number;
  isSibling?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddChildModal({
  isOpen,
  familyUnitId,
  singleParentPersonId,
  isSibling,
  onClose,
  onSuccess,
}: AddChildModalProps) {
  const [person, setPerson] = useState<PersonDraft>(emptyPersonDraft);
  const [lineageType, setLineageType] = useState<LineageType>('BIOLOGICAL');
  const [birthOrder, setBirthOrder] = useState<number | ''>('');

  const addChild = useAddChild();
  const { data: activePersons = [] } = useActivePersonsQuery();

  const personOptions: SelectOption[] = activePersons.map((p) => ({
    value: p.id,
    label: p.fullName,
  }));

  const lineageOptions: SelectOption[] = Object.entries(LINEAGE_TYPES).map(
    ([key, { label }]) => ({ value: key, label })
  );

  const resetForm = () => {
    setPerson(emptyPersonDraft);
    setLineageType('BIOLOGICAL');
    setBirthOrder('');
  };

  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  /** Mavjud nikoh ID yoki yagona ota-ona uchun ayni shu yerda yangisini yaratadi. */
  const resolveUnitId = async (): Promise<number | null> => {
    if (familyUnitId) return familyUnitId;
    if (!singleParentPersonId) return null;
    const { familyUnitApi } = await import('../../../api/family-unit.api');
    const res = await familyUnitApi.createFamilyUnit({ partner1Id: singleParentPersonId });
    return (res.data as { data: { id: number } }).data.id;
  };

  const handleSubmit = async () => {
    if (!isPersonDraftValid(person)) return;

    try {
      // 1) Farzand shaxsini aniqlash (mavjud yoki yangi yaratish)
      let childPersonId: number;
      if (person.mode === 'existing') {
        childPersonId = person.personId as number;
      } else {
        const { familyUnitApi } = await import('../../../api/family-unit.api');
        const res = await familyUnitApi.createPerson({
          firstName: person.firstName.trim(),
          lastName: person.lastName.trim() || undefined,
          middleName: person.middleName.trim() || undefined,
          gender: person.gender || undefined,
          birthDate: person.birthDate || undefined,
          role: 'CHILD',
        });
        childPersonId = (res.data as { data: { id: number } }).data.id;
      }

      // 2) Nikoh birligini aniqlash (mavjud yoki yagona ota-ona uchun ayni vaqtda yaratiladi)
      const unitId = await resolveUnitId();
      if (!unitId) return;

      // 3) Farzandni biriktirish
      addChild.mutate(
        {
          familyUnitId: unitId,
          data: {
            personId: childPersonId,
            lineageType,
            birthOrder: birthOrder || undefined,
          },
        },
        {
          onSuccess: () => {
            handleClose();
            onSuccess();
          },
        }
      );
    } catch {
      // Error handled by mutation / toast
    }
  };

  const isSubmitting = addChild.isPending;

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">
                {isSibling ? "Aka-uka qo'shish" : "Farzand qo'shish"}
              </h3>
              <p className="text-sm text-base-content/60 mt-1">
                {isSibling ? "Aka-uka ma'lumotlarini kiriting" : "Farzand ma'lumotlarini kiriting"}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <PersonPicker value={person} onChange={setPerson} personOptions={personOptions} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Farzandlik turi"
                required
                value={lineageType}
                onChange={(val) => setLineageType(val as LineageType)}
                options={lineageOptions}
              />
              <TextInput
                label="Tug'ilish tartibi"
                value={birthOrder ? String(birthOrder) : ''}
                onChange={(val) => {
                  const normalized = val.replace(/[^\d]/g, '');
                  setBirthOrder(normalized ? Number(normalized) : '');
                }}
                placeholder="1, 2, 3..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={handleClose} disabled={isSubmitting}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !isPersonDraftValid(person)}
            >
              {isSubmitting && <span className="loading loading-spinner loading-sm" />}
              Qo&apos;shish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
