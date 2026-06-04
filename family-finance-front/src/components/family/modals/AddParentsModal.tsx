import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import {
  useActivePersonsQuery,
  useAddParents,
  useFamilyUnitsByPersonQuery,
} from '../../../hooks/useFamilyTreeQueries';
import { PersonPicker, emptyPersonDraft, isPersonDraftValid } from './shared/PersonPicker';
import type { PersonDraft } from './shared/PersonPicker';
import { MarriageFields } from './shared/MarriageFields';
import type { MarriageType, PartnerDto } from '../../../types';
import type { SelectOption } from '../../ui/Select';

interface AddParentsModalProps {
  isOpen: boolean;
  personId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddParentsModal({
  isOpen,
  personId,
  onClose,
  onSuccess,
}: AddParentsModalProps) {
  const [father, setFather] = useState<PersonDraft>(emptyPersonDraft);
  const [mother, setMother] = useState<PersonDraft>(emptyPersonDraft);

  // Farzandda allaqachon mavjud (tirik) ota/ona — bo'lsa, o'sha rol qulflanadi va
  // foydalanuvchi faqat yetishmayotgan ota-onani kiritadi.
  const [existingFather, setExistingFather] = useState<PartnerDto | null>(null);
  const [existingMother, setExistingMother] = useState<PartnerDto | null>(null);

  const [marriageType, setMarriageType] = useState<MarriageType>('MARRIED');
  const [marriageDate, setMarriageDate] = useState('');

  const { data: activePersons = [] } = useActivePersonsQuery();
  const { data: childUnits = [] } = useFamilyUnitsByPersonQuery(personId);
  const addParents = useAddParents();
  const prefilled = useRef(false);

  const personOptions: SelectOption[] = activePersons
    .filter((p) => p.id !== personId)
    .map((p) => ({ value: p.id, label: p.fullName }));

  const resetForm = () => {
    setFather(emptyPersonDraft);
    setMother(emptyPersonDraft);
    setExistingFather(null);
    setExistingMother(null);
    setMarriageType('MARRIED');
    setMarriageDate('');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      prefilled.current = false;
    }
  }, [isOpen]);

  // Farzandning biologik nikohida tirik ota yoki ona qolgan bo'lsa (bittasi o'chirilib,
  // ikkinchisi qolgan), o'sha rolni avtomatik to'ldiramiz va qulflaymiz.
  useEffect(() => {
    if (!isOpen || prefilled.current || childUnits.length === 0) return;

    const bioUnit = childUnits.find((u) =>
      u.children.some(
        (c) => c.personId === personId && c.lineageType === 'BIOLOGICAL'
      )
    );
    prefilled.current = true;
    if (!bioUnit) return;

    const foundFather = bioUnit.partners.find((p) => p.gender === 'MALE');
    const foundMother = bioUnit.partners.find((p) => p.gender === 'FEMALE');
    if (foundFather) {
      setExistingFather(foundFather);
      setFather({ ...emptyPersonDraft, mode: 'existing', personId: foundFather.personId });
    }
    if (foundMother) {
      setExistingMother(foundMother);
      setMother({ ...emptyPersonDraft, mode: 'existing', personId: foundMother.personId });
    }
  }, [isOpen, childUnits, personId]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const fatherOk = existingFather !== null || isPersonDraftValid(father);
  const motherOk = existingMother !== null || isPersonDraftValid(mother);
  const canSubmit = fatherOk && motherOk;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      // Farzandda allaqachon bitta tirik ota-ona bo'lsa, backend yangi nikoh yaratmasdan
      // yetishmayotgan ota-onani o'sha nikohga qo'shadi (mavjud ota/ona o'tkazib yuboriladi).
      await addParents.mutateAsync({
        childPersonId: personId,
        fatherId: father.mode === 'existing' ? (father.personId as number) : undefined,
        fatherFirstName: father.mode === 'new' ? father.firstName.trim() : undefined,
        fatherBirthDate: father.mode === 'new' ? (father.birthDate || undefined) : undefined,
        motherId: mother.mode === 'existing' ? (mother.personId as number) : undefined,
        motherFirstName: mother.mode === 'new' ? mother.firstName.trim() : undefined,
        motherBirthDate: mother.mode === 'new' ? (mother.birthDate || undefined) : undefined,
        marriageType,
        marriageDate: marriageDate || undefined,
      });
      handleClose();
      onSuccess();
    } catch {
      // Xatoliklar useAddParents onError'da ko'rsatiladi
    }
  };

  const hasExistingParent = existingFather !== null || existingMother !== null;
  const isSubmitting = addParents.isPending;

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Ota-ona qo&apos;shish</h3>
              <p className="text-sm text-base-content/60 mt-1">
                {hasExistingParent
                  ? 'Yetishmayotgan ota-onani kiriting'
                  : "Ota va ona ma'lumotlarini kiriting"}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {hasExistingParent && (
            <div className="mt-3 text-xs text-base-content/60 bg-base-200/50 rounded-lg px-3 py-2">
              Bu farzandda bir ota-ona allaqachon mavjud. Faqat yetishmayotganini
              kiriting — u o&apos;sha nikohga qo&apos;shiladi.
            </div>
          )}

          <div className="mt-4 space-y-4">
            {/* Father */}
            <div className="p-3 rounded-lg border border-base-300">
              <span className="text-sm font-medium text-blue-500">Ota</span>
              <div className="mt-2">
                <PersonPicker
                  value={father}
                  onChange={setFather}
                  personOptions={personOptions}
                  variant="compact"
                  namePlaceholder="Ota ismi"
                  lockedName={existingFather?.fullName ?? null}
                />
              </div>
            </div>

            {/* Mother */}
            <div className="p-3 rounded-lg border border-base-300">
              <span className="text-sm font-medium text-pink-500">Ona</span>
              <div className="mt-2">
                <PersonPicker
                  value={mother}
                  onChange={setMother}
                  personOptions={personOptions}
                  variant="compact"
                  namePlaceholder="Ona ismi"
                  lockedName={existingMother?.fullName ?? null}
                />
              </div>
            </div>

            {/* Marriage info */}
            <MarriageFields
              marriageType={marriageType}
              onMarriageTypeChange={setMarriageType}
              marriageDate={marriageDate}
              onMarriageDateChange={setMarriageDate}
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={handleClose} disabled={isSubmitting}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
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
