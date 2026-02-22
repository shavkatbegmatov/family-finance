import { useEffect, useState } from 'react';
import { X, User } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { TextInput } from '../../ui/TextInput';
import { PhoneInput } from '../../ui/PhoneInput';
import { Select } from '../../ui/Select';
import { DateInput } from '../../ui/DateInput';
import { AvatarUploader } from '../../ui/AvatarUploader';
import { useUpdatePerson, useUpdateSelf, useActivePersonsQuery } from '../../../hooks/useFamilyTreeQueries';
import { GENDERS } from '../../../config/constants';
import { useAuthStore } from '../../../store/authStore';
import type { Gender } from '../../../types';
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [avatar, setAvatar] = useState('');

  const currentUser = useAuthStore((s) => s.user);
  const updatePerson = useUpdatePerson();
  const updateSelf = useUpdateSelf();
  const { data: activePersons = [] } = useActivePersonsQuery();

  const person = activePersons.find((p) => p.id === personId);
  const isSelf = person?.userId != null && person.userId === currentUser?.id;

  const genderOptions: SelectOption[] = Object.entries(GENDERS).map(
    ([key, { label }]) => ({ value: key, label })
  );

  // Load person data
  useEffect(() => {
    if (isOpen && personId) {
      const p = activePersons.find((p) => p.id === personId);
      if (p) {
        setFirstName(p.firstName || '');
        setLastName(p.lastName || '');
        setMiddleName(p.middleName || '');
        setGender((p.gender as Gender) || '');
        setPhone(p.phone || '');
        setBirthDate(p.birthDate || '');
        setBirthPlace(p.birthPlace || '');
        setDeathDate(p.deathDate || '');
        setAvatar(p.avatar || '');
      }
    }
  }, [isOpen, personId, activePersons]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    if (!firstName.trim()) return;

    if (isSelf) {
      updateSelf.mutate(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          middleName: middleName.trim() || undefined,
          gender: gender || undefined,
          phone: phone || undefined,
          birthDate: birthDate || undefined,
          birthPlace: birthPlace.trim() || undefined,
          avatar: avatar.trim() || undefined,
        },
        {
          onSuccess: () => {
            handleClose();
            onSuccess();
          },
        }
      );
    } else {
      updatePerson.mutate(
        {
          id: personId,
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
            middleName: middleName.trim() || undefined,
            gender: gender || undefined,
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
    }
  };

  const isSubmitting = updatePerson.isPending || updateSelf.isPending;

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
              label="Ism"
              required
              value={firstName}
              onChange={setFirstName}
              placeholder="Ism"
              leadingIcon={<User className="h-5 w-5" />}
            />

            <TextInput
              label="Familiya"
              value={lastName}
              onChange={setLastName}
              placeholder="Familiya"
            />

            <TextInput
              label="Otasining ismi"
              value={middleName}
              onChange={setMiddleName}
              placeholder="Otasining ismi"
            />

            <Select
              label="Jinsi"
              value={gender || undefined}
              onChange={(val) => setGender(val as Gender)}
              options={genderOptions}
              placeholder="Tanlang..."
            />

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

            <AvatarUploader
              label="Rasm"
              value={avatar}
              onChange={setAvatar}
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
              disabled={isSubmitting || !firstName.trim()}
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
