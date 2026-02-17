import { useEffect, useState } from 'react';
import { X, User } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { TextInput } from '../../ui/TextInput';
import { Select } from '../../ui/Select';
import { DateInput } from '../../ui/DateInput';
import {
  useActivePersonsQuery,
  useCreatePerson,
  useCreateFamilyUnit,
  useAddChild,
} from '../../../hooks/useFamilyTreeQueries';
import { MARRIAGE_TYPES } from '../../../config/constants';
import type { MarriageType, ApiResponse } from '../../../types';
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
  // Father
  const [fatherMode, setFatherMode] = useState<'existing' | 'new'>('new');
  const [fatherId, setFatherId] = useState<number | ''>('');
  const [fatherName, setFatherName] = useState('');
  const [fatherBirthDate, setFatherBirthDate] = useState('');

  // Mother
  const [motherMode, setMotherMode] = useState<'existing' | 'new'>('new');
  const [motherId, setMotherId] = useState<number | ''>('');
  const [motherName, setMotherName] = useState('');
  const [motherBirthDate, setMotherBirthDate] = useState('');

  // Marriage
  const [marriageType, setMarriageType] = useState<MarriageType>('MARRIED');
  const [marriageDate, setMarriageDate] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const { data: activePersons = [] } = useActivePersonsQuery();
  const createPerson = useCreatePerson();
  const createFamilyUnit = useCreateFamilyUnit();
  const addChild = useAddChild();

  const personOptions: SelectOption[] = activePersons
    .filter((p) => p.id !== personId)
    .map((p) => ({ value: p.id, label: p.fullName }));

  const marriageTypeOptions: SelectOption[] = Object.entries(MARRIAGE_TYPES).map(
    ([key, { label }]) => ({ value: key, label })
  );

  const resetForm = () => {
    setFatherMode('new');
    setFatherId('');
    setFatherName('');
    setFatherBirthDate('');
    setMotherMode('new');
    setMotherId('');
    setMotherName('');
    setMotherBirthDate('');
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
    const hasFather =
      fatherMode === 'existing' ? !!fatherId : !!fatherName.trim();
    const hasMother =
      motherMode === 'existing' ? !!motherId : !!motherName.trim();
    return hasFather && hasMother;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);

    try {
      // Resolve father
      let resolvedFatherId: number;
      if (fatherMode === 'existing') {
        resolvedFatherId = fatherId as number;
      } else {
        const res = await createPerson.mutateAsync({
          firstName: fatherName.trim(),
          gender: 'MALE',
          birthDate: fatherBirthDate || undefined,
          role: 'FATHER',
        });
        resolvedFatherId = (res.data as ApiResponse<{ id: number }>).data.id;
      }

      // Resolve mother
      let resolvedMotherId: number;
      if (motherMode === 'existing') {
        resolvedMotherId = motherId as number;
      } else {
        const res = await createPerson.mutateAsync({
          firstName: motherName.trim(),
          gender: 'FEMALE',
          birthDate: motherBirthDate || undefined,
          role: 'MOTHER',
        });
        resolvedMotherId = (res.data as ApiResponse<{ id: number }>).data.id;
      }

      // Create family unit
      const fuRes = await createFamilyUnit.mutateAsync({
        partner1Id: resolvedFatherId,
        partner2Id: resolvedMotherId,
        marriageType,
        marriageDate: marriageDate || undefined,
      });
      const familyUnitId = (fuRes.data as ApiResponse<{ id: number }>).data.id;

      // Add this person as child
      await addChild.mutateAsync({
        familyUnitId,
        data: { personId, lineageType: 'BIOLOGICAL' },
      });

      handleClose();
      onSuccess();
    } catch {
      // Xatoliklar mutation onError'da ko'rsatiladi
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Ota-ona qo&apos;shish</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Ota va ona ma&apos;lumotlarini kiriting
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Father */}
            <div className="p-3 rounded-lg border border-base-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-500">Ota</span>
                <div className="flex gap-1">
                  <button
                    className={`btn btn-xs ${fatherMode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFatherMode('new')}
                  >
                    Yangi
                  </button>
                  <button
                    className={`btn btn-xs ${fatherMode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFatherMode('existing')}
                  >
                    Mavjud
                  </button>
                </div>
              </div>
              {fatherMode === 'existing' ? (
                <Select
                  label="Shaxsni tanlang"
                  required
                  value={fatherId || undefined}
                  onChange={(val) =>
                    setFatherId(typeof val === 'number' ? val : Number(val) || '')
                  }
                  options={personOptions}
                  placeholder="Tanlang..."
                />
              ) : (
                <div className="space-y-2">
                  <TextInput
                    label="Ism"
                    required
                    value={fatherName}
                    onChange={setFatherName}
                    placeholder="Ota ismi"
                    leadingIcon={<User className="h-5 w-5" />}
                  />
                  <DateInput
                    label="Tug'ilgan sana"
                    value={fatherBirthDate}
                    onChange={setFatherBirthDate}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              )}
            </div>

            {/* Mother */}
            <div className="p-3 rounded-lg border border-base-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-pink-500">Ona</span>
                <div className="flex gap-1">
                  <button
                    className={`btn btn-xs ${motherMode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setMotherMode('new')}
                  >
                    Yangi
                  </button>
                  <button
                    className={`btn btn-xs ${motherMode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setMotherMode('existing')}
                  >
                    Mavjud
                  </button>
                </div>
              </div>
              {motherMode === 'existing' ? (
                <Select
                  label="Shaxsni tanlang"
                  required
                  value={motherId || undefined}
                  onChange={(val) =>
                    setMotherId(typeof val === 'number' ? val : Number(val) || '')
                  }
                  options={personOptions}
                  placeholder="Tanlang..."
                />
              ) : (
                <div className="space-y-2">
                  <TextInput
                    label="Ism"
                    required
                    value={motherName}
                    onChange={setMotherName}
                    placeholder="Ona ismi"
                    leadingIcon={<User className="h-5 w-5" />}
                  />
                  <DateInput
                    label="Tug'ilgan sana"
                    value={motherBirthDate}
                    onChange={setMotherBirthDate}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              )}
            </div>

            {/* Marriage info */}
            <div className="divider text-xs text-base-content/40">Nikoh</div>
            <Select
              label="Nikoh turi"
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
            <button className="btn btn-ghost" onClick={handleClose} disabled={submitting}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit()}
            >
              {submitting && <span className="loading loading-spinner loading-sm" />}
              Qo&apos;shish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
