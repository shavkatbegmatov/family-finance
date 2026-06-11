import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  KeyRound,
  Loader2,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import clsx from 'clsx';

import { ModalPortal } from '../common/Modal';
import { TextInput } from '../ui/TextInput';
import { PasswordInput } from '../ui/PasswordInput';
import { UsernameInput } from '../ui/UsernameInput';
import { Select, type SelectOption } from '../ui/Select';
import { DateInput } from '../ui/DateInput';
import { usePermission } from '../../hooks/usePermission';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { personsApi } from '../../api/persons.api';
import type {
  PersonCreateRequest,
  PersonCreateResponse,
  PersonType,
} from '../../types/persons.types';
import type { Gender } from '../../types';

import {
  CAPABILITY_META,
  PERSON_TYPE_META,
  PERSON_TYPE_ORDER,
} from './personTypeMeta';

// =============================================================================
// Constants
// =============================================================================

const TOTAL_STEPS = 3;
const MIN_PASSWORD_LENGTH = 6;
const FIRST_NAME_MAX = 100;
const NICKNAME_MAX = 50;

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'MALE', label: 'Erkak' },
  { value: 'FEMALE', label: 'Ayol' },
];

const STEP_LABELS = ['Tur', "Ma'lumotlar", 'Tayyor'] as const;

// =============================================================================
// Types
// =============================================================================

interface FormState {
  firstName: string;
  lastName: string;
  middleName: string;
  gender: Gender | '';
  birthDate: string;
  birthPlace: string;
  phone: string;
  nickname: string;
  username: string;
  password: string;
  autoPassword: boolean;
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  middleName: '',
  gender: '',
  birthDate: '',
  birthPlace: '',
  phone: '',
  nickname: '',
  username: '',
  password: '',
  autoPassword: true,
};

interface AddPersonWizardProps {
  isOpen: boolean;
  onClose: () => void;
  /** Wizard yopilgandan keyin chaqiriladi (ma'lumotlarni yangilash uchun). */
  onCreated?: (result: PersonCreateResponse) => void;
  /** Default tanlangan tur — masalan, /points/participants sahifasida CHILD bo'ladi. */
  defaultType?: PersonType;
}

// =============================================================================
// Helpers
// =============================================================================

const getErrorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
};

const buildRequest = (type: PersonType, form: FormState): PersonCreateRequest => {
  const trim = (v: string): string | undefined => (v.trim().length > 0 ? v.trim() : undefined);

  const base: PersonCreateRequest = {
    personType: type,
    firstName: form.firstName.trim(),
    lastName: trim(form.lastName),
    middleName: trim(form.middleName),
    gender: form.gender || undefined,
    birthDate: trim(form.birthDate),
    birthPlace: trim(form.birthPlace),
    phone: trim(form.phone),
  };

  if (type === 'CHILD' || type === 'ADULT_ACTIVE') {
    base.nickname = trim(form.nickname);
  }

  if (type === 'ADULT_ACTIVE' || type === 'ADMIN_ONLY') {
    base.username = trim(form.username);
    base.password = form.autoPassword ? undefined : trim(form.password);
  }

  return base;
};

// =============================================================================
// Main component
// =============================================================================

export function AddPersonWizard({
  isOpen,
  onClose,
  onCreated,
  defaultType,
}: AddPersonWizardProps) {
  const isMobile = useIsMobile();
  const { hasPermission } = usePermission();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<PersonType | null>(defaultType ?? null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [usernameValid, setUsernameValid] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PersonCreateResponse | null>(null);

  // Foydalanuvchining ruxsatlariga qarab faqat ko'rsata oladigan turlar.
  const availableTypes = useMemo(
    () =>
      PERSON_TYPE_ORDER.filter((type) =>
        PERSON_TYPE_META[type].requiredPermissions.every((p) => hasPermission(p)),
      ),
    [hasPermission],
  );

  // Modal har ochilganda holatini reset qilamiz.
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setForm(EMPTY_FORM);
    setUsernameValid(true);
    setSubmitting(false);
    setResult(null);
    setSelectedType(defaultType && availableTypes.includes(defaultType) ? defaultType : null);
  }, [isOpen, defaultType, availableTypes]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canAdvanceFromStep1 = selectedType !== null;
  const canSubmit = useMemo(() => {
    if (!selectedType) return false;
    if (form.firstName.trim().length === 0) return false;

    const needsAccount = selectedType === 'ADULT_ACTIVE' || selectedType === 'ADMIN_ONLY';
    if (needsAccount && !usernameValid) return false;
    if (needsAccount && !form.autoPassword && form.password.length < MIN_PASSWORD_LENGTH) return false;

    return true;
  }, [selectedType, form, usernameValid]);

  const handleNext = useCallback(() => {
    if (step === 1 && canAdvanceFromStep1) {
      setStep(2);
    }
  }, [step, canAdvanceFromStep1]);

  const handleBack = useCallback(() => {
    if (step === 2) setStep(1);
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const response = await personsApi.create(buildRequest(selectedType, form));
      const data = response.data.data;
      setResult(data);
      setStep(3);
      toast.success(data.message ?? 'Shaxs qo\'shildi');
      onCreated?.(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Shaxs qo\'shishda xatolik yuz berdi'));
    } finally {
      setSubmitting(false);
    }
  }, [selectedType, canSubmit, submitting, form, onCreated]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [submitting, onClose]);

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div
        className={clsx(
          'flex w-full flex-col bg-base-100 shadow-2xl',
          isMobile
            ? 'max-h-[92vh] rounded-t-2xl'
            : 'mx-auto max-h-[88vh] max-w-2xl rounded-2xl',
        )}
      >
        <WizardHeader
          step={step}
          totalSteps={TOTAL_STEPS}
          onClose={handleClose}
          disabled={submitting}
        />

        <div className="flex-1 overflow-y-auto px-4 pb-2 pt-4 sm:px-6">
          {step === 1 && (
            <TypeStep
              availableTypes={availableTypes}
              selected={selectedType}
              onSelect={setSelectedType}
            />
          )}
          {step === 2 && selectedType && (
            <DetailsStep
              type={selectedType}
              form={form}
              updateForm={updateForm}
              onUsernameValidChange={setUsernameValid}
            />
          )}
          {step === 3 && result && <SuccessStep result={result} />}
        </div>

        <WizardFooter
          step={step}
          canAdvance={step === 1 ? canAdvanceFromStep1 : canSubmit}
          submitting={submitting}
          showResult={step === 3}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      </div>
    </ModalPortal>
  );
}

// =============================================================================
// Header
// =============================================================================

function WizardHeader({
  step,
  totalSteps,
  onClose,
  disabled,
}: {
  step: number;
  totalSteps: number;
  onClose: () => void;
  disabled: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-base-200 bg-base-100/95 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">Yangi shaxs qo'shish</h2>
            <p className="mt-0.5 text-xs text-base-content/60 sm:text-sm">
              Qadam {step}/{totalSteps}: {STEP_LABELS[step - 1]}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square shrink-0"
          onClick={onClose}
          disabled={disabled}
          aria-label="Yopish"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <StepIndicator current={step} total={totalSteps} />
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex h-1.5 overflow-hidden bg-base-200">
      {Array.from({ length: total }).map((_, idx) => {
        const isActive = idx + 1 <= current;
        return (
          <div
            key={`step-${idx + 1}`}
            className={clsx(
              'flex-1 transition-colors duration-300',
              isActive ? 'bg-primary' : 'bg-transparent',
              idx > 0 && 'ml-0.5',
            )}
          />
        );
      })}
    </div>
  );
}

// =============================================================================
// Step 1: type selection
// =============================================================================

function TypeStep({
  availableTypes,
  selected,
  onSelect,
}: {
  availableTypes: PersonType[];
  selected: PersonType | null;
  onSelect: (type: PersonType) => void;
}) {
  if (availableTypes.length === 0) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-warning/10 text-warning">
          <KeyRound className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-medium">Sizda hech qanday turdagi shaxs qo'shish ruxsati yo'q.</p>
        <p className="mt-1 text-xs text-base-content/60">Administrator bilan bog'laning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-3">
      <p className="text-xs text-base-content/60">
        Tanlang: yangi shaxs qaysi turda? Buni keyinroq o'zgartirib bo'lmaydi.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {availableTypes.map((type) => (
          <TypeCard
            key={type}
            type={type}
            selected={selected === type}
            onSelect={() => onSelect(type)}
          />
        ))}
      </div>
    </div>
  );
}

function TypeCard({
  type,
  selected,
  onSelect,
}: {
  type: PersonType;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = PERSON_TYPE_META[type];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'group relative flex w-full flex-col items-start gap-3 rounded-xl border bg-gradient-to-br p-4 text-left transition-all duration-200',
        meta.accent,
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-base-100/80 text-primary shadow-sm">
          <Icon className="h-6 w-6" />
        </div>
        {selected && (
          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-content">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold sm:text-base">{meta.label}</h3>
        <p className="mt-1 text-xs leading-relaxed text-base-content/70">{meta.description}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {meta.creates.map((cap) => {
          const capMeta = CAPABILITY_META[cap];
          return (
            <span
              key={cap}
              className={clsx('badge badge-sm badge-outline gap-1', capMeta.tone)}
            >
              {capMeta.label}
            </span>
          );
        })}
      </div>
    </button>
  );
}

// =============================================================================
// Step 2: form details
// =============================================================================

function DetailsStep({
  type,
  form,
  updateForm,
  onUsernameValidChange,
}: {
  type: PersonType;
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onUsernameValidChange: (valid: boolean) => void;
}) {
  const showNickname = type === 'CHILD' || type === 'ADULT_ACTIVE';
  const showAccount = type === 'ADULT_ACTIVE' || type === 'ADMIN_ONLY';
  const meta = PERSON_TYPE_META[type];

  return (
    <div className="space-y-5 pb-3">
      <SelectedTypeBanner type={type} />

      <FormSection title="Asosiy ma'lumotlar">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="Ism"
            required
            placeholder="Anvar"
            value={form.firstName}
            onChange={(v) => updateForm('firstName', v)}
            maxLength={FIRST_NAME_MAX}
            autoFocus
          />
          <TextInput
            label="Familiya"
            placeholder="Karimov"
            value={form.lastName}
            onChange={(v) => updateForm('lastName', v)}
            maxLength={FIRST_NAME_MAX}
          />
        </div>
        <TextInput
          label="Otasining ismi"
          placeholder="Akmal o'g'li"
          value={form.middleName}
          onChange={(v) => updateForm('middleName', v)}
          maxLength={FIRST_NAME_MAX}
        />
      </FormSection>

      <FormSection title="Qo'shimcha (ixtiyoriy)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Jinsi"
            placeholder="Tanlang..."
            options={GENDER_OPTIONS}
            value={form.gender || undefined}
            onChange={(v) => updateForm('gender', (v ?? '') as Gender | '')}
          />
          <DateInput
            label="Tug'ilgan sana"
            value={form.birthDate}
            onChange={(v) => updateForm('birthDate', v)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <TextInput
          label="Telefon raqami"
          placeholder="+998 90 123 45 67"
          value={form.phone}
          onChange={(v) => updateForm('phone', v)}
          maxLength={20}
        />
      </FormSection>

      {showNickname && (
        <FormSection
          title="Ball tizimi"
          hint="Reyting va sahifalarda ko'rinadigan nom. Bo'sh qoldirsangiz, ism ishlatiladi."
        >
          <TextInput
            label="Laqab"
            placeholder="anvarcha"
            value={form.nickname}
            onChange={(v) => updateForm('nickname', v)}
            maxLength={NICKNAME_MAX}
          />
        </FormSection>
      )}

      {showAccount && (
        <FormSection
          title="Login akkaunti"
          hint="Login bo'sh qolsa ism asosida avtomatik yaratiladi (masalan, a.karimov)."
        >
          <AccountSection
            username={form.username}
            autoPassword={form.autoPassword}
            password={form.password}
            onUsernameChange={(v) => updateForm('username', v)}
            onUsernameValidChange={onUsernameValidChange}
            onToggleAuto={(v) => updateForm('autoPassword', v)}
            onPasswordChange={(v) => updateForm('password', v)}
          />
        </FormSection>
      )}

      <CapabilitiesPreview type={type} />
      {/* Hidden — keep meta reference to avoid unused warning if logic changes */}
      <span className="sr-only">{meta.label}</span>
    </div>
  );
}

function SelectedTypeBanner({ type }: { type: PersonType }) {
  const meta = PERSON_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl border bg-gradient-to-br p-3',
        meta.accent,
      )}
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-base-100/80 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{meta.label}</p>
        <p className="text-xs text-base-content/60">{meta.description}</p>
      </div>
    </div>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
          {title}
        </h3>
        {hint && <p className="mt-0.5 text-xs text-base-content/50">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function AccountSection({
  username,
  autoPassword,
  password,
  onUsernameChange,
  onUsernameValidChange,
  onToggleAuto,
  onPasswordChange,
}: {
  username: string;
  autoPassword: boolean;
  password: string;
  onUsernameChange: (v: string) => void;
  onUsernameValidChange: (valid: boolean) => void;
  onToggleAuto: (v: boolean) => void;
  onPasswordChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <UsernameInput
        label="Login"
        value={username}
        onChange={onUsernameChange}
        onValidityChange={onUsernameValidChange}
      />

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-200/50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Parolni avtomatik yaratish</p>
          <p className="text-xs text-base-content/60">
            Tasodifiy xavfsiz parol generatsiya qilinadi
          </p>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={autoPassword}
          onChange={(e) => onToggleAuto(e.target.checked)}
        />
      </label>

      {!autoPassword && (
        <PasswordInput
          label="Parol"
          placeholder={`Kamida ${MIN_PASSWORD_LENGTH} belgi`}
          value={password}
          onChange={onPasswordChange}
          showStrength
          showGenerate
          error={
            password.length > 0 && password.length < MIN_PASSWORD_LENGTH
              ? `Parol kamida ${MIN_PASSWORD_LENGTH} belgi bo'lishi kerak`
              : undefined
          }
        />
      )}
    </div>
  );
}

function CapabilitiesPreview({ type }: { type: PersonType }) {
  const meta = PERSON_TYPE_META[type];
  return (
    <div className="rounded-xl border border-base-200 bg-base-200/40 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/60">
        Yaratilishi:
      </p>
      <ul className="space-y-1.5">
        {meta.creates.map((cap) => {
          const capMeta = CAPABILITY_META[cap];
          return (
            <li key={cap} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success" />
              <span>{capMeta.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// =============================================================================
// Step 3: success
// =============================================================================

function SuccessStep({ result }: { result: PersonCreateResponse }) {
  const meta = PERSON_TYPE_META[result.personType];
  const hasCredentials = Boolean(result.credentials);

  return (
    <div className="space-y-4 pb-3">
      <div className="grid place-items-center gap-2 py-2">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
          <Sparkles className="h-7 w-7" />
        </div>
        <p className="text-center text-base font-semibold">
          {result.displayName ? `${result.displayName} qo'shildi` : "Shaxs qo'shildi"}
        </p>
        <p className="text-center text-xs text-base-content/60">{result.message}</p>
      </div>

      <div className="rounded-xl border border-base-200 bg-base-200/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
          Yaratildi
        </p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {meta.creates.map((cap) => (
            <li key={cap} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>{CAPABILITY_META[cap].label}</span>
            </li>
          ))}
        </ul>
      </div>

      {hasCredentials && result.credentials && (
        <CredentialsBox
          username={result.credentials.username}
          password={result.credentials.temporaryPassword}
          mustChangePassword={result.credentials.mustChangePassword}
          message={result.credentials.message}
        />
      )}
    </div>
  );
}

function CredentialsBox({
  username,
  password,
  mustChangePassword,
  message,
}: {
  username: string;
  password: string;
  mustChangePassword: boolean;
  message: string;
}) {
  return (
    <div className="rounded-xl border-2 border-warning/40 bg-warning/5 p-4">
      <div className="flex items-start gap-2">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-warning">Login ma'lumotlari</p>
          <p className="mt-0.5 text-xs text-base-content/70">{message}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <CopyableField label="Username" value={username} />
        <CopyableField
          label={mustChangePassword ? 'Vaqtinchalik parol' : 'Parol'}
          value={password}
          monospace
        />
      </div>

      {mustChangePassword && (
        <p className="mt-3 text-xs italic text-base-content/60">
          Foydalanuvchi birinchi marta kirganda parolni o'zgartirishi so'raladi.
        </p>
      )}
    </div>
  );
}

function CopyableField({
  label,
  value,
  monospace,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} nusxalandi`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nusxalashda xatolik');
    }
  }, [value, label]);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
          {label}
        </p>
        <p
          className={clsx(
            'truncate text-sm font-semibold',
            monospace && 'font-mono',
          )}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="btn btn-ghost btn-sm btn-square shrink-0"
        aria-label={`${label}ni nusxalash`}
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

// =============================================================================
// Footer
// =============================================================================

function WizardFooter({
  step,
  canAdvance,
  submitting,
  showResult,
  onBack,
  onNext,
  onSubmit,
  onClose,
}: {
  step: number;
  canAdvance: boolean;
  submitting: boolean;
  showResult: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  if (showResult) {
    return (
      <div className="sticky bottom-0 z-10 flex gap-2 border-t border-base-200 bg-base-100 px-4 py-3 sm:px-6">
        <button type="button" className="btn btn-primary flex-1" onClick={onClose}>
          Yopish
        </button>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-10 flex gap-2 border-t border-base-200 bg-base-100 px-4 py-3 sm:px-6">
      {step > 1 ? (
        <button
          type="button"
          className="btn btn-ghost gap-2"
          onClick={onBack}
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Orqaga</span>
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          disabled={submitting}
        >
          Bekor qilish
        </button>
      )}

      <div className="flex-1" />

      {step === 1 && (
        <button
          type="button"
          className="btn btn-primary gap-2"
          onClick={onNext}
          disabled={!canAdvance}
        >
          Davom etish
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {step === 2 && (
        <button
          type="button"
          className="btn btn-primary gap-2"
          onClick={onSubmit}
          disabled={!canAdvance || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Yaratilmoqda...
            </>
          ) : (
            <>
              Yaratish
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
