import { useEffect, useState } from 'react';
import { X, User, Shield } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ModalPortal } from '../common/Modal';
import { TextInput } from '../ui/TextInput';
import { PasswordInput } from '../ui/PasswordInput';
import { UsernameInput } from '../ui/UsernameInput';
import { PhoneInput } from '../ui/PhoneInput';
import { DateInput } from '../ui/DateInput';
import { Select } from '../ui/Select';
import { AvatarUploader } from '../ui/AvatarUploader';
import { familyMembersApi } from '../../api/family-members.api';
import { FAMILY_ROLES, GENDERS } from '../../config/constants';
import { PASSWORD_MIN_LENGTH } from '../../utils/password';
import type {
  CredentialsInfo,
  FamilyMember,
  FamilyMemberRequest,
  FamilyRole,
  Gender,
} from '../../types';

interface FamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember | null;
  /** Saqlash muvaffaqiyatli bo'lganda — agar akkaunt yaratilgan bo'lsa credentials qaytaradi. */
  onSuccess: (credentials?: CredentialsInfo) => void;
}

/**
 * Oila a'zosini tahrirlash (form) modali. Form holatini, submit holatini va
 * login band-emasligini ichida boshqaradi; saqlangach onSuccess orqali
 * (kerak bo'lsa) credentials'ni page'ga qaytaradi.
 */
export function FamilyMemberModal({ isOpen, onClose, member, onSuccess }: FamilyMemberModalProps) {
  const [form, setForm] = useState<FamilyMemberRequest>({
    firstName: '',
    lastName: '',
    middleName: '',
    role: 'OTHER',
    gender: undefined,
    phone: '',
    birthDate: '',
    birthPlace: '',
    deathDate: '',
    avatar: '',
  });
  const [submitting, setSubmitting] = useState(false);
  // Login (username) qo'lda kiritilganda band-emasligi holati — submit'ni boshqaradi
  const [accountUsernameValid, setAccountUsernameValid] = useState(true);

  const editingMember = member;

  // Modal ochilganda tahrirlanayotgan a'zo ma'lumotlari bilan to'ldiramiz
  useEffect(() => {
    if (isOpen && member) {
      setForm({
        firstName: member.firstName,
        lastName: member.lastName,
        middleName: member.middleName,
        role: member.role,
        gender: member.gender,
        phone: member.phone || '',
        birthDate: member.birthDate || '',
        birthPlace: member.birthPlace || '',
        deathDate: member.deathDate || '',
        avatar: member.avatar || '',
        userId: member.userId,
        createAccount: false,
        accountUsername: '',
        accountPassword: '',
        accountRole: 'MEMBER',
      });
      setAccountUsernameValid(true);
    }
  }, [isOpen, member]);

  const handleSubmit = async () => {
    if (!form.firstName.trim()) return;
    setSubmitting(true);
    try {
      if (editingMember) {
        // Bo'sh string maydonlar backend validatsiyasini buzadi: LocalDate ("" ni parse qila olmaydi)
        // va accountPassword @Size(min=10). Shuning uchun bo'shlarni undefined ga aylantiramiz.
        const payload: FamilyMemberRequest = {
          ...form,
          middleName: form.middleName?.trim() || undefined,
          lastName: form.lastName?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          birthPlace: form.birthPlace?.trim() || undefined,
          birthDate: form.birthDate || undefined,
          deathDate: form.deathDate || undefined,
          avatar: form.avatar || undefined,
          accountUsername: form.createAccount ? (form.accountUsername?.trim() || undefined) : undefined,
          accountPassword: form.createAccount && form.accountPassword ? form.accountPassword : undefined,
          accountRole: form.createAccount ? form.accountRole : undefined,
        };
        const res = await familyMembersApi.update(editingMember.id, payload);
        const updated = res.data.data as FamilyMember;
        onSuccess(updated.credentials);
      } else {
        onSuccess();
      }
      onClose();
    } catch {
      toast.error("Oila a'zosini saqlashda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-3xl bg-base-100 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-base-200 bg-base-100 rounded-t-2xl px-4 py-4 sm:px-6">
          <div>
            <h3 className="text-xl font-semibold">
              A'zoni tahrirlash
            </h3>
            <p className="text-sm text-base-content/60 mt-1">
              Ma'lumotlarni yangilang
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            {/* First Name */}
            <TextInput
              label="Ism"
              required
              value={form.firstName}
              onChange={(val) => setForm((prev) => ({ ...prev, firstName: val }))}
              placeholder="Ism"
              leadingIcon={<User className="h-5 w-5" />}
            />

            {/* Last Name */}
            <TextInput
              label="Familiya"
              value={form.lastName || ''}
              onChange={(val) => setForm((prev) => ({ ...prev, lastName: val }))}
              placeholder="Familiya"
            />

            {/* Middle Name — to'liq kenglikda */}
            <div className="sm:col-span-2">
              <TextInput
                label="Otasining ismi"
                value={form.middleName || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, middleName: val }))}
                placeholder="Otasining ismi"
              />
            </div>

            {/* Role */}
            <Select
              label="Rol"
              required
              value={form.role}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, role: (val as FamilyRole) || 'OTHER' }))
              }
              options={Object.entries(FAMILY_ROLES).map(([key, { label }]) => ({
                value: key,
                label,
              }))}
              placeholder="Rolni tanlang"
              icon={<User className="h-4 w-4" />}
            />

            {/* Gender */}
            <Select
              label="Jinsi"
              value={form.gender || ''}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, gender: (val as Gender) || undefined }))
              }
              options={[
                { value: '', label: 'Tanlanmagan' },
                ...Object.entries(GENDERS).map(([key, { label }]) => ({
                  value: key,
                  label,
                })),
              ]}
              placeholder="Tanlanmagan"
            />

            {/* Phone — to'liq kenglikda */}
            <div className="sm:col-span-2">
              <PhoneInput
                label="Telefon raqami"
                value={form.phone || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, phone: val }))}
              />
            </div>

            {/* Birth Date */}
            <DateInput
              label="Tug'ilgan sana"
              value={form.birthDate || ''}
              onChange={(val) => setForm((prev) => ({ ...prev, birthDate: val }))}
              max={new Date().toISOString().slice(0, 10)}
            />

            {/* Death Date */}
            <DateInput
              label="Vafot sanasi"
              value={form.deathDate || ''}
              onChange={(val) => setForm((prev) => ({ ...prev, deathDate: val }))}
              max={new Date().toISOString().slice(0, 10)}
            />

            {/* Birth Place — to'liq kenglikda */}
            <div className="sm:col-span-2">
              <TextInput
                label="Tug'ilgan joy"
                value={form.birthPlace || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, birthPlace: val }))}
                placeholder="Shahar, viloyat"
              />
            </div>

            {/* Avatar Upload — to'liq kenglikda */}
            <div className="sm:col-span-2">
              <AvatarUploader
                label="Rasm"
                value={form.avatar || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, avatar: val }))}
              />
            </div>

            {/* Create Account Section — faqat yangi a'zo uchun, to'liq kenglikda */}
            {(!editingMember?.userId || editingMember?.userId === null) && (
              <div className="sm:col-span-2 space-y-3">
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={form.createAccount || false}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          createAccount: e.target.checked,
                          accountUsername: '',
                          accountPassword: '',
                          accountRole: 'MEMBER',
                        }));
                        setAccountUsernameValid(true);
                      }}
                    />
                    <div>
                      <span className="label-text font-medium">Tizimga kirish imkoniyati</span>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        Login avtomatik yaratiladi (ism asosida)
                      </p>
                    </div>
                  </label>
                </div>

                {form.createAccount && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                    {/* Account Role */}
                    <div className="form-control">
                      <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                        Tizim roli
                      </span>
                      <div className="flex gap-2">
                        {[
                          { value: 'MEMBER', label: "A'zo" },
                          { value: 'ADMIN', label: 'Administrator' },
                        ].map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            className={clsx(
                              'btn btn-sm flex-1',
                              form.accountRole === r.value
                                ? r.value === 'ADMIN'
                                  ? 'btn-warning'
                                  : 'btn-primary'
                                : 'btn-ghost border-base-300'
                            )}
                            onClick={() => setForm((prev) => ({ ...prev, accountRole: r.value }))}
                          >
                            {r.value === 'ADMIN' && <Shield className="h-3.5 w-3.5" />}
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Login (qo'lda yoki avtomatik) + Parol */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <UsernameInput
                        label="Login"
                        value={form.accountUsername || ''}
                        onChange={(val) => setForm((prev) => ({ ...prev, accountUsername: val }))}
                        onValidityChange={setAccountUsernameValid}
                      />
                      <PasswordInput
                        label="Parol"
                        value={form.accountPassword || ''}
                        onChange={(val) => setForm((prev) => ({ ...prev, accountPassword: val }))}
                        placeholder="Bo'sh qolsa avtomatik"
                        showStrength
                        showGenerate
                        error={
                          form.accountPassword && form.accountPassword.length > 0 && form.accountPassword.length < PASSWORD_MIN_LENGTH
                            ? `Kamida ${PASSWORD_MIN_LENGTH} belgi`
                            : undefined
                        }
                      />
                    </div>
                    <p className="text-xs text-base-content/60">
                      {form.accountPassword
                        ? 'Kiritilgan parol ishlatiladi.'
                        : "Login va parol bo'sh qolsa, ism asosida avtomatik yaratiladi."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-base-200 bg-base-100 rounded-b-2xl px-4 py-3 sm:px-6">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Bekor qilish
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !form.firstName.trim() || (form.createAccount && !!form.accountPassword && form.accountPassword.length < 6) || (form.createAccount && !accountUsernameValid)}
          >
            {submitting && <span className="loading loading-spinner loading-sm" />}
            Saqlash
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
