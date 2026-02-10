import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  Gauge,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import type { RegisterRequest } from '../../types';

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterRequest>();

  const password = watch('password', '');

  // Password strength indicators
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const passwordStrength = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-error';
    if (passwordStrength === 2) return 'bg-warning';
    if (passwordStrength === 3) return 'bg-info';
    return 'bg-success';
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Juda zaif';
    if (passwordStrength === 2) return 'Zaif';
    if (passwordStrength === 3) return 'Yaxshi';
    return 'Kuchli';
  };

  const onSubmit = async (data: RegisterRequest) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Parol va tasdiqlash mos kelmadi');
      return;
    }

    setLoading(true);
    try {
      await authApi.register(data);
      toast.success("Muvaffaqiyatli ro'yxatdan o'tildi! Endi tizimga kirishingiz mumkin.");
      navigate('/login');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-success' : 'text-base-content/50'}`}>
      {met ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      <span>{text}</span>
    </div>
  );

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
              {/* Full Name */}
              <label className="form-control">
                <span className="label-text text-sm">Ism-familiya</span>
                <input
                  type="text"
                  placeholder="Ism va familiyangiz"
                  autoComplete="name"
                  className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
                  {...register('fullName', {
                    required: 'Ism-familiya kiritilishi shart',
                    minLength: { value: 2, message: 'Kamida 2 belgi' },
                  })}
                />
                {errors.fullName && (
                  <span className="mt-1 text-xs text-error">{errors.fullName.message}</span>
                )}
              </label>

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
                      minLength: { value: 6, message: 'Parol kamida 6 belgi' },
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
              {password && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-base-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 4) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>
                      {getStrengthLabel()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <PasswordRequirement met={hasMinLength} text="Kamida 6 belgi" />
                    <PasswordRequirement met={hasUppercase} text="Katta harf" />
                    <PasswordRequirement met={hasLowercase} text="Kichik harf" />
                    <PasswordRequirement met={hasNumber} text="Raqam" />
                  </div>
                </div>
              )}

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
              <label className="form-control">
                <span className="label-text text-sm">Email (ixtiyoriy)</span>
                <input
                  type="email"
                  placeholder="email@example.com"
                  autoComplete="email"
                  className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                  {...register('email', {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Email formati noto\'g\'ri',
                    },
                  })}
                />
                {errors.email && (
                  <span className="mt-1 text-xs text-error">{errors.email.message}</span>
                )}
              </label>

              {/* Phone (optional) */}
              <label className="form-control">
                <span className="label-text text-sm">Telefon (ixtiyoriy)</span>
                <input
                  type="tel"
                  placeholder="+998 XX XXX XX XX"
                  autoComplete="tel"
                  className={`input input-bordered w-full ${errors.phone ? 'input-error' : ''}`}
                  {...register('phone')}
                />
              </label>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || passwordStrength < 3}
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

            <div className="mt-6 text-center text-xs text-base-content/60">
              Hisobingiz bormi?{' '}
              <Link to="/login" className="link link-primary">
                Kirish
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
