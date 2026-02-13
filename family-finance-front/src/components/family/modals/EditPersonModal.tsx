import { useEffect, useState } from 'react';
import { X, User, Link } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { TextInput } from '../../ui/TextInput';
import { PhoneInput } from '../../ui/PhoneInput';
import { Select } from '../../ui/Select';
import { DateInput } from '../../ui/DateInput';
import { useUpdatePerson, useActivePersonsQuery } from '../../../hooks/useFamilyTreeQueries';
import { GENDERS, FAMILY_ROLES } from '../../../config/constants';
import type { Gender, FamilyRole } from '../../../types';
import type { SelectOption } from '../../ui/Select';

interface EditPersonModalProps {
  isOpen: boolean;
  personId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPersonModal({
  isOpen,
  personId,
  onClose,
  onSuccess,
}: EditPersonModalProps) {
  const [fullName, setFullName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [role, setRole] = useState<FamilyRole>('OTHER');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [avatar, setAvatar] = useState('');

  const updatePerson = useUpdatePerson();
  const { data: activePersons = [] } = useActivePersonsQuery();

  const genderOptions: SelectOption[] = Object.entries(GENDERS).map(
    ([key, { label }]) => ({ value: key, label })
  );
  const roleOptions: SelectOption[] = Object.entries(FAMILY_ROLES).map(
    ([key, { label }]) => ({ value: key, label })
  );

  // Load person data
  useEffect(() => {
    if (isOpen && personId) {
      const person = activePersons.find((p) => p.id === personId);
      if (person) {
        setFullName(person.fullName || '');
        setLastName(person.lastName || '');
        setGender((person.gender as Gender) || '');
        setRole(person.role || 'OTHER');
        setPhone(person.phone || '');
        setBirthDate(person.birthDate || '');
        setBirthPlace(person.birthPlace || '');
        setDeathDate(person.deathDate || '');
        setAvatar(person.avatar || '');
      }
    }
  }, [isOpen, personId, activePersons]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    if (!fullName.trim()) return;

    updatePerson.mutate(
      {
        id: personId,
        data: {
          fullName: fullName.trim(),
          lastName: lastName.trim() || undefined,
          gender: gender || undefined,
          role,
          phone: phone || undefined,
          birthDate: birthDate || undefined,
          birthPlace: birthPlace.trim() || undefined,
          deathDate: deathDate || undefined,
          avatar: avatar.trim() || undefined,
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

  const isSubmitting = updatePerson.isPending;

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Shaxsni tahrirlash</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Ma&apos;lumotlarni yangilang
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <TextInput
              label="To'liq ism"
              required
              value={fullName}
              onChange={setFullName}
              placeholder="Ism familiya"
              leadingIcon={<User className="h-5 w-5" />}
            />

            <TextInput
              label="Familiya"
              value={lastName}
              onChange={setLastName}
              placeholder="Familiya"
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Jinsi"
                value={gender || undefined}
                onChange={(val) => setGender(val as Gender)}
                options={genderOptions}
                placeholder="Tanlang..."
              />
              <Select
                label="Rol"
                value={role}
                onChange={(val) => setRole(val as FamilyRole)}
                options={roleOptions}
              />
            </div>

            <PhoneInput
              label="Telefon"
              value={phone}
              onChange={setPhone}
            />

            <div className="grid grid-cols-2 gap-4">
              <DateInput
                label="Tug'ilgan sana"
                value={birthDate}
                onChange={setBirthDate}
                max={new Date().toISOString().slice(0, 10)}
              />
              <DateInput
                label="Vafot sanasi"
                value={deathDate}
                onChange={setDeathDate}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <TextInput
              label="Tug'ilgan joy"
              value={birthPlace}
              onChange={setBirthPlace}
              placeholder="Shahar, viloyat"
            />

            <TextInput
              label="Avatar URL"
              value={avatar}
              onChange={setAvatar}
              placeholder="https://..."
              type="url"
              leadingIcon={<Link className="h-5 w-5" />}
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
              disabled={isSubmitting || !fullName.trim()}
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
