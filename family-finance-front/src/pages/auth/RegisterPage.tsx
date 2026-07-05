import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import {
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  Gauge,
  Sparkles,
  Home,
  Users,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { scopesApi } from '../../api/scopes.api';
import { TelegramAuthModal } from '../../components/auth/TelegramAuthModal';
import { GENDERS } from '../../config/constants';
import { EmailInput } from '../../components/ui/EmailInput';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { isPasswordStrong, PASSWORD_MIN_LENGTH } from '../../utils/password';
import { getApiErrorMessage } from '../../utils/apiError';
import { getScopeTypeMeta } from '../../components/scope/scopeTypeMeta';
import type { RegisterRequest } from '../../types';

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterRequest>({
    defaultValues: {
      email: '',
      phone: '',
    },
  });

  const password = watch('password', '');
  const inviteCode = watch('inviteCode', '');
  const gender = watch('gender');

  // Invite code preview: real-time scope ma'lumotini ko'rsatish
  const [codePreview, setCodePreview] = useState<{
    name: string;
    type: string;
  } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => {
    const trimmed = inviteCode?.trim() ?? '';
    if (trimmed.length < 6) {
      setCodePreview(null);
      setCodeError(null);
      return;
    }
    setCodeLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await scopesApi.lookupByCode(trimmed);
        const scope = res.data.data;
        setCodePreview({ name: scope.name, type: scope.type });
        setCodeError(null);
      } catch {
        setCodePreview(null);
        setCodeError("Kod topilmadi yoki bekor qilingan");
      } finally {
        setCodeLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  const onSubmit = async (data: RegisterRequest) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Parol va tasdiqlash mos kelmadi');
      return;
    }

    // Agar invite code kiritilgan bo'lsa va u noto'g'ri bo'lsa — to'xtatamiz
    if (data.inviteCode?.trim() && codeError) {
      toast.error('Oila kodi noto\'g\'ri — to\'g\'rilang yoki bo\'sh qoldiring');
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterRequest = {
        ...data,
        firstName: data.firstName.trim(),
        lastName: data.lastName?.trim() || undefined,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        inviteCode: data.inviteCode?.trim() || undefined,
      };
      await authApi.register(payload);
      const successMsg = payload.inviteCode
        ? `Muvaffaqiyatli ro'yxatdan o'tildi va "${codePreview?.name ?? 'oila'}"ga qo'shildingiz!`
        : "Muvaffaqiyatli ro'yxatdan o'tildi! Endi tizimga kirishingiz mumkin.";
      toast.success(successMsg);
      navigate('/login');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Ro'yxatdan o'tishda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-base-100 to-secondary/15 p-4">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-base-200 bg-base-100/85 shadow-[var(--shadow-strong)] backdrop-blur lg:grid-cols-[1.1fr_1fr]">
          {/* Left panel — feature info */}
          <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary/15 via-transparent to-secondary/10 p-10 lg:flex">
            <div>
              <div className="pill w-fit">Moliya Platformasi</div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight">
                Family Finance
                <span className="block text-base-content/60">
                  Oilaviy moliya boshqaruvi
                </span>
              </h1>
              <p className="mt-4 text-sm text-base-content/60">
                Oilaviy byudjetni boshqaring, xarajatlarni nazorat qiling va
                moliyaviy maqsadlarga erishing.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                  <Gauge className="h-4 w-4" />
                </span>
                <span>Tezkor moliyaviy hisobotlar</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary/15 text-secondary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span>Oson byudjet va xarajat boshqaruvi</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-success/15 text-success">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span>Xavfsiz kirish va rolga asoslangan boshqaruv</span>
              </div>
            </div>
          </div>

          {/* Right panel — registration form */}
          <div className="p-8 sm:p-10">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Ro'yxatdan o'tish</h2>
              <p className="text-sm text-base-content/60">
                Yangi hisob yaratish uchun ma'lumotlaringizni kiriting
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Ism va Familiya */}
              <div className="grid grid-cols-2 gap-3">
                <label className="form-control">
                  <span className="label-text text-sm">Ism *</span>
                  <input
                    type="text"
                    placeholder="Ismingiz"
                    autoComplete="given-name"
                    className={`input input-bordered w-full ${errors.firstName ? 'input-error' : ''}`}
                    {...register('firstName', {
                      required: 'Ism kiritilishi shart',
                      minLength: { value: 2, message: 'Kamida 2 belgi' },
                    })}
                  />
                  {errors.firstName && (
                    <span className="mt-1 text-xs text-error">{errors.firstName.message}</span>
                  )}
                </label>

                <label className="form-control">
                  <span className="label-text text-sm">Familiya</span>
                  <input
                    type="text"
                    placeholder="Familiyangiz"
                    autoComplete="family-name"
                    className={`input input-bordered w-full ${errors.lastName ? 'input-error' : ''}`}
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <span className="mt-1 text-xs text-error">{errors.lastName.message}</span>
                  )}
                </label>
              </div>

              {/* Jins — majburiy (shajara izchilligi uchun) */}
              <Controller
                name="gender"
                control={control}
                rules={{ required: 'Jins tanlanishi shart' }}
                render={({ field, fieldState }) => (
                  <div className="form-control">
                    <span className="label-text text-sm">Jins *</span>
                    <div className="mt-1 grid grid-cols-2 gap-3">
                      {(['MALE', 'FEMALE'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => field.onChange(g)}
                          className={`btn ${field.value === g ? 'btn-primary' : 'btn-outline'}`}
                        >
                          {GENDERS[g].label}
                        </button>
                      ))}
                    </div>
                    {fieldState.error && (
                      <span className="mt-1 text-xs text-error">{fieldState.error.message}</span>
                    )}
                  </div>
                )}
              />

              {/* Username */}
              <label className="form-control">
                <span className="label-text text-sm">Foydalanuvchi nomi</span>
                <input
                  type="text"
                  placeholder="username"
                  autoComplete="username"
                  className={`input input-bordered w-full ${errors.username ? 'input-error' : ''}`}
                  {...register('username', {
                    required: 'Username kiritilishi shart',
                    minLength: { value: 3, message: 'Kamida 3 belgi' },
                    pattern: {
                      value: /^[a-zA-Z0-9._-]+$/,
                      message: "Faqat harf, raqam, nuqta, chiziq va pastki chiziq",
                    },
                  })}
                />
                {errors.username && (
                  <span className="mt-1 text-xs text-error">{errors.username.message}</span>
                )}
              </label>

              {/* Password */}
              <label className="form-control">
                <span className="label-text text-sm">Parol</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Xavfsiz parol kiriting"
                    autoComplete="new-password"
                    className={`input input-bordered w-full pr-10 ${errors.password ? 'input-error' : ''}`}
                    {...register('password', {
                      required: 'Parol kiritilishi shart',
                      minLength: { value: PASSWORD_MIN_LENGTH, message: `Parol kamida ${PASSWORD_MIN_LENGTH} belgi` },
                    })}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <span className="mt-1 text-xs text-error">{errors.password.message}</span>
                )}
              </label>

              {/* Password Strength Indicator */}
              <PasswordStrengthMeter password={password} showRequirements />

              {/* Confirm Password */}
              <label className="form-control">
                <span className="label-text text-sm">Parolni tasdiqlash</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Parolni qayta kiriting"
                    autoComplete="new-password"
                    className={`input input-bordered w-full pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                    {...register('confirmPassword', {
                      required: 'Parolni tasdiqlash kiritilishi shart',
                      validate: (value) => value === password || 'Parollar mos kelmadi',
                    })}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="mt-1 text-xs text-error">{errors.confirmPassword.message}</span>
                )}
              </label>

              {/* Email (optional) */}
              <Controller
                name="email"
                control={control}
                rules={{
                  validate: (value) =>
                    !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || "Email formati noto'g'ri",
                }}
                render={({ field, fieldState }) => (
                  <EmailInput
                    label="Email (ixtiyoriy)"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />

              {/* Phone (optional) */}
              <Controller
                name="phone"
                control={control}
                rules={{
                  validate: (value) =>
                    !value || /^\+998\d{9}$/.test(value) || "Telefon formati noto'g'ri",
                }}
                render={({ field, fieldState }) => (
                  <PhoneInput
                    label="Telefon (ixtiyoriy)"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />

              {/* Invite Code (optional) — mavjud oilaga qo'shilish uchun */}
              <div className="rounded-xl border border-base-200 bg-base-200/30 p-3">
                <label className="form-control">
                  <span className="label-text text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Oila taklif kodi (ixtiyoriy)
                  </span>
                  <input
                    type="text"
                    placeholder="Masalan: CABC234DEF"
                    autoComplete="off"
                    maxLength={32}
                    className={`input input-bordered w-full uppercase tracking-wider ${
                      codeError ? 'input-error' : codePreview ? 'input-success' : ''
                    }`}
                    {...register('inviteCode')}
                  />
                  <span className="mt-1 text-xs text-base-content/50">
                    Oila a'zosidan kod oldingizmi? Kiriting — yangi oila yaratilmaydi.
                  </span>
                </label>
                {codeLoading && (
                  <div className="mt-2 text-xs text-base-content/60">
                    <span className="loading loading-spinner loading-xs" /> Tekshirilmoqda...
                  </div>
                )}
                {codePreview && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                    <Home className="h-4 w-4" />
                    <span>
                      <strong>{codePreview.name}</strong> ({getScopeTypeMeta(codePreview.type).label}) ga
                      MEMBER bo'lib qo'shilasiz
                    </span>
                  </div>
                )}
                {codeError && (
                  <div className="mt-2 text-xs text-error">{codeError}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || !isPasswordStrong(password) || !gender}
              >
                {loading ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Ro'yxatdan o'tish
                  </>
                )}
              </button>
            </form>

            {/* yoki — Telegram orqali ro'yxatdan o'tish (deep-link) */}
            <div className="my-4 flex items-center gap-3 text-xs text-base-content/40">
              <span className="h-px flex-1 bg-base-200" />
              yoki
              <span className="h-px flex-1 bg-base-200" />
            </div>
            <button
              type="button"
              onClick={() => setTelegramOpen(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#229ED9]/40 bg-[#229ED9]/10 text-[15px] font-semibold text-[#229ED9]"
            >
              <Send className="h-5 w-5" />
              Telegram orqali ro&apos;yxatdan o&apos;tish
            </button>

            <div className="mt-6 text-center text-xs text-base-content/60">
              Hisobingiz bormi?{' '}
              <Link to="/login" className="link link-primary">
                Kirish
              </Link>
            </div>
          </div>
        </div>
      </div>

      <TelegramAuthModal isOpen={telegramOpen} onClose={() => setTelegramOpen(false)} />
    </div>
  );
}
