import { useEffect, useState } from 'react';
import { X, User, Users } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { TextInput } from '../../ui/TextInput';
import { Select } from '../../ui/Select';
import { DateInput } from '../../ui/DateInput';
import { useAddChild, useActivePersonsQuery } from '../../../hooks/useFamilyTreeQueries';
import { LINEAGE_TYPES, GENDERS } from '../../../config/constants';
import type { LineageType, Gender } from '../../../types';
import type { SelectOption } from '../../ui/Select';

interface AddChildModalProps {
  isOpen: boolean;
  familyUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalMode = 'new' | 'existing';

export function AddChildModal({
  isOpen,
  familyUnitId,
  onClose,
  onSuccess,
}: AddChildModalProps) {
  const [mode, setMode] = useState<ModalMode>('existing');

  // Existing person selection
  const [selectedPersonId, setSelectedPersonId] = useState<number | ''>('');

  // New person form
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');

  // Child info
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

  const genderOptions: SelectOption[] = Object.entries(GENDERS).map(
    ([key, { label }]) => ({ value: key, label })
  );

  const resetForm = () => {
    setMode('existing');
    setSelectedPersonId('');
    setFullName('');
    setGender('');
    setBirthDate('');
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

  const canSubmit = () => {
    if (mode === 'existing') return !!selectedPersonId;
    return !!fullName.trim();
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    if (mode === 'existing') {
      addChild.mutate(
        {
          familyUnitId,
          data: {
            personId: selectedPersonId as number,
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
    } else {
      const { familyUnitApi } = await import('../../../api/family-unit.api');
      try {
        const res = await familyUnitApi.createPerson({
          fullName: fullName.trim(),
          gender: gender || undefined,
          birthDate: birthDate || undefined,
          role: 'CHILD',
        });
        const newPerson = (res.data as { data: { id: number } }).data;

        addChild.mutate(
          {
            familyUnitId,
            data: {
              personId: newPerson.id,
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
        // Error handled by mutation
      }
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
              <h3 className="text-xl font-semibold">Farzand qo&apos;shish</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Farzand ma&apos;lumotlarini kiriting
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
                  label="To'liq ism"
                  required
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Ism familiya"
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

            {/* Lineage info */}
            <div className="divider text-xs text-base-content/40">Farzandlik turi</div>

            <Select
              label="Tur"
              required
              value={lineageType}
              onChange={(val) => setLineageType(val as LineageType)}
              options={lineageOptions}
            />

            <TextInput
              label="Tug'ilish tartibi"
              value={birthOrder ? String(birthOrder) : ''}
              onChange={(val) => setBirthOrder(val ? Number(val) : '')}
              placeholder="1, 2, 3..."
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
