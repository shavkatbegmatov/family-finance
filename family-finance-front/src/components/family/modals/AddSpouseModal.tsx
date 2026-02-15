import { useEffect, useState } from 'react';
import { X, User, Users } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { TextInput } from '../../ui/TextInput';
import { Select } from '../../ui/Select';
import { DateInput } from '../../ui/DateInput';
import { useCreateFamilyUnit, useActivePersonsQuery } from '../../../hooks/useFamilyTreeQueries';
import { MARRIAGE_TYPES, GENDERS } from '../../../config/constants';
import type { MarriageType, Gender } from '../../../types';
import type { SelectOption } from '../../ui/Select';

interface AddSpouseModalProps {
  isOpen: boolean;
  personId: number;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalMode = 'new' | 'existing';

export function AddSpouseModal({
  isOpen,
  personId,
  onClose,
  onSuccess,
}: AddSpouseModalProps) {
  const [mode, setMode] = useState<ModalMode>('existing');

  // Existing person selection
  const [selectedPersonId, setSelectedPersonId] = useState<number | ''>('');

  // New person form
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');

  // Marriage info
  const [marriageType, setMarriageType] = useState<MarriageType>('MARRIED');
  const [marriageDate, setMarriageDate] = useState('');

  const createFamilyUnit = useCreateFamilyUnit();
  const { data: activePersons = [] } = useActivePersonsQuery();

  const personOptions: SelectOption[] = activePersons
    .filter((p) => p.id !== personId)
    .map((p) => ({
      value: p.id,
      label: p.fullName,
    }));

  const marriageTypeOptions: SelectOption[] = Object.entries(MARRIAGE_TYPES).map(
    ([key, { label }]) => ({ value: key, label })
  );

  const genderOptions: SelectOption[] = Object.entries(GENDERS).map(
    ([key, { label }]) => ({ value: key, label })
  );

  const resetForm = () => {
    setMode('existing');
    setSelectedPersonId('');
    setFirstName('');
    setGender('');
    setBirthDate('');
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

  const canSubmit = () => {
    if (mode === 'existing') return !!selectedPersonId;
    return !!firstName.trim();
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    if (mode === 'existing') {
      createFamilyUnit.mutate(
        {
          partner1Id: personId,
          partner2Id: selectedPersonId as number,
          marriageType,
          marriageDate: marriageDate || undefined,
        },
        {
          onSuccess: () => {
            handleClose();
            onSuccess();
          },
        }
      );
    } else {
      // For new person mode, we need to create the person first, then create family unit
      // Using the familyUnitApi directly for the two-step process
      const { familyUnitApi } = await import('../../../api/family-unit.api');
      try {
        const res = await familyUnitApi.createPerson({
          firstName: firstName.trim(),
          gender: gender || undefined,
          birthDate: birthDate || undefined,
          role: 'OTHER',
        });
        const newPerson = (res.data as { data: { id: number } }).data;

        createFamilyUnit.mutate(
          {
            partner1Id: personId,
            partner2Id: newPerson.id,
            marriageType,
            marriageDate: marriageDate || undefined,
          },
          {
            onSuccess: () => {
              handleClose();
              onSuccess();
            },
          }
        );
      } catch {
        // Error is handled by the mutation's onError
      }
    }
  };

  const isSubmitting = createFamilyUnit.isPending;

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

          {/* Mode tabs */}
          <div className="flex gap-1 bg-base-200 rounded-lg p-1 mt-4">
            <button
              className={`btn btn-sm flex-1 gap-1 ${mode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('existing')}
            >
              <Users className="h-4 w-4" />
              Mavjud shaxs
            </button>
            <button
              className={`btn btn-sm flex-1 gap-1 ${mode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('new')}
            >
              <User className="h-4 w-4" />
              Yangi shaxs
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {mode === 'existing' ? (
              <Select
                label="Shaxsni tanlang"
                required
                value={selectedPersonId || undefined}
                onChange={(val) =>
                  setSelectedPersonId(typeof val === 'number' ? val : Number(val) || '')
                }
                options={personOptions}
                placeholder="Tanlang..."
                icon={<Users className="h-4 w-4" />}
              />
            ) : (
              <>
                <TextInput
                  label="Ism"
                  required
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="Ism"
                  leadingIcon={<User className="h-5 w-5" />}
                />
                <Select
                  label="Jinsi"
                  value={gender || undefined}
                  onChange={(val) => setGender(val as Gender)}
                  options={genderOptions}
                  placeholder="Tanlang..."
                />
                <DateInput
                  label="Tug'ilgan sana"
                  value={birthDate}
                  onChange={setBirthDate}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </>
            )}

            {/* Marriage info */}
            <div className="divider text-xs text-base-content/40">Nikoh ma&apos;lumotlari</div>

            <Select
              label="Nikoh turi"
              required
              value={marriageType}
              onChange={(val) => setMarriageType(val as MarriageType)}
              options={marriageTypeOptions}
            />

            <DateInput
              label="Nikoh sanasi"
              value={marriageDate}
              onChange={setMarriageDate}
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
              disabled={isSubmitting || !canSubmit()}
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
