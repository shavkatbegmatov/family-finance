import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { useAddSpouse, useActivePersonsQuery } from '../../../hooks/useFamilyTreeQueries';
import { PersonPicker, emptyPersonDraft, isPersonDraftValid } from './shared/PersonPicker';
import type { PersonDraft } from './shared/PersonPicker';
import { MarriageFields } from './shared/MarriageFields';
import type { MarriageType } from '../../../types';
import type { SelectOption } from '../../ui/Select';

interface AddSpouseModalProps {
  isOpen: boolean;
  personId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddSpouseModal({
  isOpen,
  personId,
  onClose,
  onSuccess,
}: AddSpouseModalProps) {
  const [person, setPerson] = useState<PersonDraft>(emptyPersonDraft);
  const [marriageType, setMarriageType] = useState<MarriageType>('MARRIED');
  const [marriageDate, setMarriageDate] = useState('');

  const addSpouse = useAddSpouse();
  const { data: activePersons = [] } = useActivePersonsQuery();

  const personOptions: SelectOption[] = activePersons
    .filter((p) => p.id !== personId)
    .map((p) => ({ value: p.id, label: p.fullName }));

  const resetForm = () => {
    setPerson(emptyPersonDraft);
    setMarriageType('MARRIED');
    setMarriageDate('');
  };

  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isPersonDraftValid(person)) return;
    const isNew = person.mode === 'new';
    try {
      // Atomik: agar shaxsda turmush o'rtoqsiz (yagona ota-ona) nikoh bo'lsa,
      // backend turmush o'rtoqni o'sha nikohga qo'shadi (yangi nikoh yaratmaydi).
      await addSpouse.mutateAsync({
        personId,
        spouseId: isNew ? undefined : (person.personId as number),
        spouseFirstName: isNew ? person.firstName.trim() : undefined,
        spouseLastName: isNew ? (person.lastName.trim() || undefined) : undefined,
        spouseMiddleName: isNew ? (person.middleName.trim() || undefined) : undefined,
        spouseGender: isNew ? (person.gender || undefined) : undefined,
        spouseBirthDate: isNew ? (person.birthDate || undefined) : undefined,
        marriageType,
        marriageDate: marriageDate || undefined,
      });
      handleClose();
      onSuccess();
    } catch {
      // Xatoliklar useAddSpouse onError'da ko'rsatiladi
    }
  };

  const isSubmitting = addSpouse.isPending;

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Turmush o&apos;rtoq qo&apos;shish</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Nikoh yoki sheriklik ma&apos;lumotlarini kiriting
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <PersonPicker value={person} onChange={setPerson} personOptions={personOptions} />
            <MarriageFields
              marriageType={marriageType}
              onMarriageTypeChange={setMarriageType}
              marriageDate={marriageDate}
              onMarriageDateChange={setMarriageDate}
              inline
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
