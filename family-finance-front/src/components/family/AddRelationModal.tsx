import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { User, X, Users } from 'lucide-react';
import { familyTreeApi } from '../../api/family-tree.api';
import { familyMembersApi } from '../../api/family-members.api';
import {
  RELATIONSHIP_TYPES,
  RELATIONSHIP_CATEGORIES,
  FAMILY_ROLES,
  GENDERS,
  QUICK_RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_DEFAULTS,
} from '../../config/constants';
import { ModalPortal } from '../common/Modal';
import { TextInput } from '../ui/TextInput';
import { PhoneInput } from '../ui/PhoneInput';
import { DateInput } from '../ui/DateInput';
import { SearchInput } from '../ui/SearchInput';
import { Select } from '../ui/Select';
import type {
  FamilyMember,
  FamilyRole,
  Gender,
  RelationshipType,
} from '../../types';
import type { SelectOption } from '../ui/Select';

interface AddRelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromMemberId: number | null;
  fromMemberName?: string;
  onSuccess: () => void;
}

type ModalMode = 'new' | 'existing';

const buildRelationshipOptions = (): SelectOption[] => {
  const groups: Record<string, { value: string; label: string }[]> = {};
  Object.entries(RELATIONSHIP_TYPES).forEach(([key, { label, category }]) => {
    if (!groups[category]) groups[category] = [];
    groups[category].push({ value: key, label });
  });

  const options: SelectOption[] = [];
  Object.entries(groups).forEach(([cat, items]) => {
    options.push({
      value: `__group_${cat}`,
      label: `--- ${RELATIONSHIP_CATEGORIES[cat] || cat} ---`,
      disabled: true,
    });
    items.forEach(item => {
      options.push({ value: item.value, label: item.label });
    });
  });

  return options;
};

const resolveDefaults = (type: RelationshipType | '') => {
  if (!type) return undefined;
  return RELATIONSHIP_TYPE_DEFAULTS[type];
};

export function AddRelationModal({
  isOpen,
  onClose,
  fromMemberId,
  fromMemberName,
  onSuccess,
}: AddRelationModalProps) {
  const [mode, setMode] = useState<ModalMode>('new');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [relationshipType, setRelationshipType] = useState<RelationshipType | ''>('');

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<FamilyRole>('OTHER');
  const [gender, setGender] = useState<Gender | ''>('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatar, setAvatar] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [keepOpenAfterSave, setKeepOpenAfterSave] = useState(false);
  const [roleTouched, setRoleTouched] = useState(false);
  const [genderTouched, setGenderTouched] = useState(false);

  const [existingMembers, setExistingMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
  const [existingSearch, setExistingSearch] = useState('');

  const relationshipOptions = useMemo(() => buildRelationshipOptions(), []);

  useEffect(() => {
    if (isOpen && mode === 'existing') {
      familyMembersApi
        .getList()
        .then(res => {
          const data = res.data.data as FamilyMember[];
          setExistingMembers(data.filter(m => m.id !== fromMemberId));
        })
        .catch(() => toast.error("Oila a'zolari ro'yxatini yuklashda xatolik"));
    }
  }, [isOpen, mode, fromMemberId]);

  useEffect(() => {
    setSelectedMemberId('');
    setExistingSearch('');
    setError(null);
  }, [mode]);

  const resetNewMemberForm = (preserveRelation = false) => {
    const nextDefaults = preserveRelation ? resolveDefaults(relationshipType) : undefined;

    setFullName('');
    setRole(nextDefaults?.role || 'OTHER');
    setGender((nextDefaults?.gender as Gender | undefined) || '');
    setPhone('');
    setBirthDate('');
    setAvatar('');
    setCreateAccount(false);
    setRoleTouched(false);
    setGenderTouched(false);
  };

  const resetForm = () => {
    setRelationshipType('');
    resetNewMemberForm(false);
    setKeepOpenAfterSave(false);
    setSelectedMemberId('');
    setExistingMembers([]);
    setExistingSearch('');
    setError(null);
    setMode('new');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const applyDefaultsByType = (nextType: RelationshipType | '') => {
    if (!nextType || mode !== 'new') return;
    const defaults = resolveDefaults(nextType);
    if (!defaults) return;

    if (!roleTouched) {
      setRole(defaults.role);
    }
    if (!genderTouched) {
      setGender((defaults.gender as Gender | undefined) || '');
    }
  };

  const handleRelationshipTypeChange = (value: string | number | undefined) => {
    const nextType = (value as RelationshipType) || '';
    setRelationshipType(nextType);
    applyDefaultsByType(nextType);
  };

  const handleSubmit = async () => {
    if (!fromMemberId || !relationshipType) return;

    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'new') {
        await familyTreeApi.addMemberWithRelation({
          fromMemberId,
          relationshipType,
          fullName: fullName.trim(),
          role,
          gender: gender || undefined,
          birthDate: birthDate || undefined,
          phone: phone || undefined,
          avatar: avatar || undefined,
          createAccount: createAccount || undefined,
        });
      } else {
        if (!selectedMemberId) return;
        await familyTreeApi.addRelationship({
          fromMemberId,
          toMemberId: selectedMemberId,
          relationshipType,
        });
      }

      onSuccess();

      if (mode === 'new' && keepOpenAfterSave) {
        resetNewMemberForm(true);
      } else {
        handleClose();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (!relationshipType) return false;
    if (mode === 'new') return !!fullName.trim();
    return !!selectedMemberId;
  };

  const filteredExistingMembers = useMemo(() => {
    const query = existingSearch.trim().toLowerCase();
    if (!query) return existingMembers;

    return existingMembers.filter(member =>
      member.fullName.toLowerCase().includes(query) ||
      (member.phone || '').toLowerCase().includes(query)
    );
  }, [existingMembers, existingSearch]);

  const memberOptions: SelectOption[] = filteredExistingMembers.map(member => ({
    value: member.id,
    label: member.fullName,
  }));

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Qarindosh qo'shish</h3>
              {fromMemberName && (
                <p className="text-sm text-base-content/60">{fromMemberName} uchun</p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-1 bg-base-200 rounded-lg p-1 mt-4">
            <button
              className={`btn btn-sm flex-1 gap-1 ${mode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('new')}
            >
              <User className="h-4 w-4" />
              Yangi a'zo
            </button>
            <button
              className={`btn btn-sm flex-1 gap-1 ${mode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('existing')}
            >
              <Users className="h-4 w-4" />
              Mavjud a'zo
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {error && <div className="alert alert-error text-sm">{error}</div>}

            <Select
              label="Munosabat turi"
              required
              value={relationshipType || undefined}
              onChange={handleRelationshipTypeChange}
              options={relationshipOptions}
              placeholder="Tanlang..."
            />

            <div>
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50 block">
                Tez tanlash
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_RELATIONSHIP_TYPES.map(type => (
                  <button
                    key={type}
                    className={`btn btn-xs ${relationshipType === type ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleRelationshipTypeChange(type)}
                    type="button"
                  >
                    {RELATIONSHIP_TYPES[type].label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'new' ? (
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
                  label="Rol"
                  required
                  value={role}
                  onChange={(val) => {
                    setRole((val as FamilyRole) || 'OTHER');
                    setRoleTouched(true);
                  }}
                  options={Object.entries(FAMILY_ROLES).map(([key, { label }]) => ({
                    value: key,
                    label,
                  }))}
                  placeholder="Rolni tanlang"
                />

                <Select
                  label="Jinsi"
                  value={gender}
                  onChange={(val) => {
                    setGender((val as Gender) || '');
                    setGenderTouched(true);
                  }}
                  options={Object.entries(GENDERS).map(([key, { label }]) => ({
                    value: key,
                    label,
                  }))}
                  placeholder="Avtomatik"
                />

                <PhoneInput
                  label="Telefon raqami"
                  value={phone}
                  onChange={setPhone}
                />

                <DateInput
                  label="Tug'ilgan sana"
                  value={birthDate}
                  onChange={setBirthDate}
                  max={new Date().toISOString().slice(0, 10)}
                />

                <TextInput
                  label="Avatar URL"
                  value={avatar}
                  onChange={setAvatar}
                  placeholder="https://..."
                  type="url"
                />

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                    />
                    <div>
                      <span className="label-text font-medium">Tizimga kirish imkoniyati</span>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        Avtomatik login va vaqtinchalik parol yaratiladi
                      </p>
                    </div>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={keepOpenAfterSave}
                      onChange={(e) => setKeepOpenAfterSave(e.target.checked)}
                    />
                    <span className="label-text text-sm">Saqlagandan keyin yana a'zo qo'shaman</span>
                  </label>
                </div>
              </>
            ) : (
              <>
                <SearchInput
                  value={existingSearch}
                  onValueChange={setExistingSearch}
                  label="A'zo qidirish"
                  placeholder="Ism yoki telefon bo'yicha qidiring"
                />
                <Select
                  label="Oila a'zosi"
                  required
                  value={selectedMemberId || undefined}
                  onChange={(val) => setSelectedMemberId(typeof val === 'number' ? val : Number(val) || '')}
                  options={memberOptions}
                  placeholder="Tanlang..."
                  icon={<Users className="h-4 w-4" />}
                />
                {memberOptions.length === 0 && (
                  <p className="text-xs text-base-content/60">
                    Qidiruv bo'yicha mos oila a'zosi topilmadi.
                  </p>
                )}
              </>
            )}
          </div>

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
              Qo'shish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
