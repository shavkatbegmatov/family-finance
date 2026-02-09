import { useEffect, useState } from 'react';
import { User, X, Users } from 'lucide-react';
import { familyTreeApi } from '../../api/family-tree.api';
import { familyMembersApi } from '../../api/family-members.api';
import { RELATIONSHIP_TYPES, RELATIONSHIP_CATEGORIES, FAMILY_ROLES, GENDERS } from '../../config/constants';
import { ModalPortal } from '../common/Modal';
import { TextInput } from '../ui/TextInput';
import { PhoneInput } from '../ui/PhoneInput';
import { DateInput } from '../ui/DateInput';
import { Select } from '../ui/Select';
import type {
  FamilyMember,
  FamilyRole,
  Gender,
  RelationshipType,
} from '../../types';

interface AddRelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromMemberId: number | null;
  fromMemberName?: string;
  onSuccess: () => void;
}

type ModalMode = 'new' | 'existing';

// Category bo'yicha guruhlangan relationship type'lar
const groupedRelationTypes = () => {
  const groups: Record<string, { value: string; label: string }[]> = {};
  Object.entries(RELATIONSHIP_TYPES).forEach(([key, { label, category }]) => {
    if (!groups[category]) groups[category] = [];
    groups[category].push({ value: key, label });
  });
  return groups;
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

  // Relation type
  const [relationshipType, setRelationshipType] = useState<RelationshipType | ''>('');

  // New member form
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<FamilyRole>('OTHER');
  const [gender, setGender] = useState<Gender | ''>('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatar, setAvatar] = useState('');
  const [createAccount, setCreateAccount] = useState(false);

  // Existing member
  const [existingMembers, setExistingMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen && mode === 'existing') {
      familyMembersApi.getList().then(res => {
        const data = res.data.data as FamilyMember[];
        // fromMemberId dan boshqa a'zolarni ko'rsatish
        setExistingMembers(data.filter(m => m.id !== fromMemberId));
      }).catch(console.error);
    }
  }, [isOpen, mode, fromMemberId]);

  const resetForm = () => {
    setRelationshipType('');
    setFullName('');
    setRole('OTHER');
    setGender('');
    setPhone('');
    setBirthDate('');
    setAvatar('');
    setCreateAccount(false);
    setSelectedMemberId('');
    setError(null);
    setMode('new');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!fromMemberId || !relationshipType) return;

    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'new') {
        await familyTreeApi.addMemberWithRelation({
          fromMemberId,
          relationshipType: relationshipType as RelationshipType,
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
          toMemberId: selectedMemberId as number,
          relationshipType: relationshipType as RelationshipType,
        });
      }

      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (!relationshipType) return false;
    if (mode === 'new') return !!fullName.trim();
    return !!selectedMemberId;
  };

  const groups = groupedRelationTypes();

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Qarindosh qo&apos;shish</h3>
              {fromMemberName && (
                <p className="text-sm text-base-content/60">
                  {fromMemberName} uchun
                </p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 bg-base-200 rounded-lg p-1 mt-4">
            <button
              className={`btn btn-sm flex-1 gap-1 ${mode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('new')}
            >
              <User className="h-4 w-4" />
              Yangi a&apos;zo
            </button>
            <button
              className={`btn btn-sm flex-1 gap-1 ${mode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('existing')}
            >
              <Users className="h-4 w-4" />
              Mavjud a&apos;zo
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Error */}
            {error && (
              <div className="alert alert-error text-sm">
                {error}
              </div>
            )}

            {/* Relationship Type — grouped select */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Munosabat turi <span className="text-error">*</span></span>
              </label>
              <select
                className="select select-bordered w-full"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              >
                <option value="">Tanlang...</option>
                {Object.entries(groups).map(([cat, items]) => (
                  <optgroup key={cat} label={RELATIONSHIP_CATEGORIES[cat] || cat}>
                    {items.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {mode === 'new' ? (
              <>
                {/* Full Name */}
                <TextInput
                  label="To'liq ism"
                  required
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Ism familiya"
                  leadingIcon={<User className="h-5 w-5" />}
                />

                {/* Role */}
                <Select
                  label="Rol"
                  required
                  value={role}
                  onChange={(val) => setRole((val as FamilyRole) || 'OTHER')}
                  options={Object.entries(FAMILY_ROLES).map(([key, { label }]) => ({
                    value: key,
                    label,
                  }))}
                  placeholder="Rolni tanlang"
                />

                {/* Gender */}
                <Select
                  label="Jinsi"
                  value={gender}
                  onChange={(val) => setGender(val as Gender)}
                  options={Object.entries(GENDERS).map(([key, { label }]) => ({
                    value: key,
                    label,
                  }))}
                  placeholder="Avtomatik"
                />

                {/* Phone */}
                <PhoneInput
                  label="Telefon raqami"
                  value={phone}
                  onChange={setPhone}
                />

                {/* Birth Date */}
                <DateInput
                  label="Tug'ilgan sana"
                  value={birthDate}
                  onChange={setBirthDate}
                  max={new Date().toISOString().slice(0, 10)}
                />

                {/* Avatar */}
                <TextInput
                  label="Avatar URL"
                  value={avatar}
                  onChange={setAvatar}
                  placeholder="https://..."
                  type="url"
                />

                {/* Create Account */}
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
              </>
            ) : (
              <>
                {/* Select existing member */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Oila a&apos;zosi <span className="text-error">*</span></span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(Number(e.target.value) || '')}
                  >
                    <option value="">Tanlang...</option>
                    {existingMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
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
