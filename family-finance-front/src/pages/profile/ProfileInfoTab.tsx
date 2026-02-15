import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Check,
  X,
  Pencil,
  Save,
  MapPin,
  Calendar,
  Users,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { TextInput } from '../../components/ui/TextInput';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Select } from '../../components/ui/Select';
import { DateInput } from '../../components/ui/DateInput';
import { useUpdateSelf, useActivePersonsQuery } from '../../hooks/useFamilyTreeQueries';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth.api';
import { GENDERS, ROLES, formatDate } from '../../config/constants';
import type { User as UserType, Gender, UpdateSelfRequest } from '../../types';
import type { SelectOption } from '../../components/ui/Select';

interface ProfileInfoTabProps {
  userData: UserType;
  onUserDataChange: (user: UserType) => void;
}

export function ProfileInfoTab({ userData, onUserDataChange }: ProfileInfoTabProps) {
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');

  // Data
  const { data: activePersons = [] } = useActivePersonsQuery();
  const familyMember = activePersons.find((p) => p.userId === userData.id);
  const updateSelf = useUpdateSelf();
  const { updateUser } = useAuthStore();

  const genderOptions: SelectOption[] = Object.entries(GENDERS).map(
    ([key, { label }]) => ({ value: key, label })
  );

  // Helper function to get role label
  const getRoleLabel = (roleCode: string): string => {
    const role = ROLES[roleCode as keyof typeof ROLES];
    return role?.label || roleCode;
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-error/10 text-error border-error/20';
      case 'MANAGER':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'SELLER':
        return 'bg-info/10 text-info border-info/20';
      default:
        return 'bg-base-200 text-base-content/70 border-base-300';
    }
  };

  const getGenderLabel = (g?: string) => {
    if (!g) return 'Kiritilmagan';
    const found = GENDERS[g as keyof typeof GENDERS];
    return found?.label || g;
  };

  const userInitial =
    userData?.fullName?.charAt(0)?.toUpperCase() ||
    userData?.username?.charAt(0)?.toUpperCase() ||
    '?';

  // Enter edit mode — initialize form with current data
  const enterEditMode = () => {
    if (familyMember) {
      setFirstName(familyMember.firstName || '');
      setLastName(familyMember.lastName || '');
      setMiddleName(familyMember.middleName || '');
      setGender((familyMember.gender as Gender) || '');
      setPhone(familyMember.phone || '');
      setBirthDate(familyMember.birthDate || '');
      setBirthPlace(familyMember.birthPlace || '');
      setAvatar(familyMember.avatar || '');
    }
    setEmail(userData.email || '');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  const handleSave = () => {
    if (!firstName.trim()) return;

    const data: UpdateSelfRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      middleName: middleName.trim() || undefined,
      gender: gender || undefined,
      phone: phone || undefined,
      birthDate: birthDate || undefined,
      birthPlace: birthPlace.trim() || undefined,
      avatar: avatar.trim() || undefined,
      email: email.trim() || undefined,
    };

    updateSelf.mutate(data, {
      onSuccess: async () => {
        try {
          const updatedUser = await authApi.getCurrentUser();
          onUserDataChange(updatedUser);
          updateUser(updatedUser);
        } catch {
          // User data refresh failed, but save succeeded
        }
        setEditMode(false);
      },
    });
  };

  const isSubmitting = updateSelf.isPending;
  const hasFamilyMember = !!familyMember;

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="surface-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Avatar */}
          <div
            className={clsx(
              'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden',
              'ring-4 ring-primary/10',
              !familyMember?.avatar && 'bg-gradient-to-br from-primary/20 to-secondary/20 text-primary'
            )}
          >
            {familyMember?.avatar ? (
              <img
                src={familyMember.avatar}
                alt={userData.fullName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.classList.add(
                    'bg-gradient-to-br', 'from-primary/20', 'to-secondary/20', 'text-primary'
                  );
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<span class="text-3xl sm:text-4xl font-bold">${userInitial}</span>`;
                }}
              />
            ) : (
              <span className="text-3xl sm:text-4xl font-bold">{userInitial}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold break-words">{userData?.fullName}</h2>
            <p className="text-sm sm:text-base text-base-content/60 truncate">
              @{userData?.username}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
              <div
                className={clsx(
                  'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border',
                  getRoleBadgeColor(userData?.role)
                )}
              >
                <Shield className="h-3.5 w-3.5" />
                {userData?.role && getRoleLabel(userData.role)}
              </div>
              {userData?.active ? (
                <span className="badge badge-success gap-1">
                  <Check className="h-3 w-3" />
                  Faol
                </span>
              ) : (
                <span className="badge badge-error gap-1">
                  <X className="h-3 w-3" />
                  Nofaol
                </span>
              )}
            </div>
          </div>

          {/* Edit / Save / Cancel buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {editMode ? (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={cancelEdit}
                  disabled={isSubmitting}
                >
                  Bekor qilish
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={isSubmitting || !firstName.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Saqlash
                </button>
              </>
            ) : (
              hasFamilyMember && (
                <button className="btn btn-ghost btn-sm" onClick={enterEditMode}>
                  <Pencil className="h-4 w-4" />
                  Tahrirlash
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      {hasFamilyMember ? (
        <div className="surface-card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Shaxsiy ma&apos;lumotlar
          </h3>

          {editMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
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
              <DateInput
                label="Tug'ilgan sana"
                value={birthDate}
                onChange={setBirthDate}
                max={new Date().toISOString().slice(0, 10)}
              />
              <TextInput
                label="Tug'ilgan joy"
                value={birthPlace}
                onChange={setBirthPlace}
                placeholder="Shahar, viloyat"
                leadingIcon={<MapPin className="h-5 w-5" />}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem
                icon={<User className="h-5 w-5 text-primary" />}
                label="Ism"
                value={familyMember.firstName}
              />
              <InfoItem
                icon={<User className="h-5 w-5 text-primary" />}
                label="Familiya"
                value={familyMember.lastName}
              />
              <InfoItem
                icon={<User className="h-5 w-5 text-primary" />}
                label="Otasining ismi"
                value={familyMember.middleName}
              />
              <InfoItem
                icon={<Users className="h-5 w-5 text-primary" />}
                label="Jinsi"
                value={getGenderLabel(familyMember.gender)}
              />
              <InfoItem
                icon={<Calendar className="h-5 w-5 text-primary" />}
                label="Tug'ilgan sana"
                value={familyMember.birthDate ? formatDate(familyMember.birthDate) : undefined}
              />
              <InfoItem
                icon={<MapPin className="h-5 w-5 text-primary" />}
                label="Tug'ilgan joy"
                value={familyMember.birthPlace}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="surface-card p-4 sm:p-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
            <Users className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="font-medium text-warning">Oila a&apos;zosiga bog&apos;lanmagan</p>
              <p className="text-sm text-base-content/60 mt-1">
                Shaxsiy ma&apos;lumotlarni tahrirlash uchun avval oila daraxtida o&apos;zingizni
                ro&apos;yxatdan o&apos;tkazing
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="surface-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Kontakt ma&apos;lumotlari
        </h3>

        {editMode ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="email@example.com"
              type="email"
              leadingIcon={<Mail className="h-5 w-5" />}
            />
            <PhoneInput label="Telefon" value={phone} onChange={setPhone} />
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
            <InfoItem
              icon={<Mail className="h-5 w-5 text-primary" />}
              label="Email"
              value={userData?.email}
              bgColor="bg-primary/10"
            />
            <InfoItem
              icon={<Phone className="h-5 w-5 text-primary" />}
              label="Telefon"
              value={familyMember?.phone || userData?.phone}
              bgColor="bg-primary/10"
            />
          </div>
        )}
      </div>

      {/* Account Information — always read-only */}
      <div className="surface-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Hisob ma&apos;lumotlari
        </h3>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <InfoItem
            icon={<User className="h-5 w-5 text-info" />}
            label="Foydalanuvchi nomi"
            value={userData?.username}
            bgColor="bg-info/10"
          />
          <InfoItem
            icon={<Shield className="h-5 w-5 text-warning" />}
            label="Rol"
            value={userData?.role && getRoleLabel(userData.role)}
            bgColor="bg-warning/10"
          />
        </div>
      </div>
    </div>
  );
}

// Reusable info display item
function InfoItem({
  icon,
  label,
  value,
  bgColor = 'bg-primary/10',
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  bgColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-base-200/50">
      <div className={clsx('p-2 sm:p-3 rounded-xl', bgColor)}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-base-content/50 uppercase tracking-wider">{label}</p>
        <p className="font-semibold truncate">{value || 'Kiritilmagan'}</p>
      </div>
    </div>
  );
}
