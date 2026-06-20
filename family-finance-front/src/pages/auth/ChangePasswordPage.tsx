import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Key, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { isPasswordStrong, PASSWORD_MIN_LENGTH } from '../../utils/password';
import { getApiErrorMessage } from '../../utils/apiError';
import type { ChangePasswordRequest } from '../../types';

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const newPassword = watch('newPassword', '');

  const onSubmit = async (data: FormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Yangi parol va tasdiqlash mos kelmadi');
      return;
    }

    setLoading(true);
    try {
      const request: ChangePasswordRequest = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };

      await authApi.changePassword(request);
      toast.success("Parol muvaffaqiyatli o'zgartirildi!");

      // Force re-login after password change
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Parolni o'zgartirishda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-base-100 to-secondary/15 p-4">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="w-full overflow-hidden rounded-3xl border border-base-200 bg-base-100/85 shadow-xl backdrop-blur p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary mb-4">
              <Key className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">Parolni o'zgartirish</h1>
            <p className="text-sm text-base-content/60 mt-2">
              {user?.username && (
                <span className="badge badge-outline badge-sm mr-2">{user.username}</span>
              )}
              Davom etish uchun yangi parol o'rnating
            </p>
          </div>

          {/* Alert */}
          <div className="alert alert-warning mb-6">
            <ShieldCheck className="h-5 w-5" />
            <div>
              <p className="font-medium">Birinchi kirish</p>
              <p className="text-sm">Xavfsizlik uchun vaqtinchalik parolni o'zgartiring</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <label className="form-control">
              <span className="label-text text-sm">Joriy parol (vaqtinchalik)</span>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Sizga berilgan parol"
                  autoComplete="current-password"
                  className={`input input-bordered w-full pr-10 ${errors.currentPassword ? 'input-error' : ''}`}
                  {...register('currentPassword', {
                    required: 'Joriy parol kiritilishi shart',
                  })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.currentPassword && (
                <span className="mt-1 text-xs text-error">{errors.currentPassword.message}</span>
              )}
            </label>

            {/* New Password */}
            <label className="form-control">
              <span className="label-text text-sm">Yangi parol</span>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Yangi xavfsiz parol"
                  autoComplete="new-password"
                  className={`input input-bordered w-full pr-10 ${errors.newPassword ? 'input-error' : ''}`}
                  {...register('newPassword', {
                    required: 'Yangi parol kiritilishi shart',
                    minLength: { value: PASSWORD_MIN_LENGTH, message: `Parol kamida ${PASSWORD_MIN_LENGTH} belgi` },
                  })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.newPassword && (
                <span className="mt-1 text-xs text-error">{errors.newPassword.message}</span>
              )}
            </label>

            {/* Password Strength Indicator */}
            <PasswordStrengthMeter password={newPassword} showRequirements />

            {/* Confirm Password */}
            <label className="form-control">
              <span className="label-text text-sm">Parolni tasdiqlash</span>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Yangi parolni qayta kiriting"
                  autoComplete="new-password"
                  className={`input input-bordered w-full pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                  {...register('confirmPassword', {
                    required: 'Parolni tasdiqlash kiritilishi shart',
                    validate: (value) => value === newPassword || 'Parollar mos kelmadi',
                  })}
                />
                <button
                  type="button"
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

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !isPasswordStrong(newPassword)}
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Parolni o'zgartirish
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-base-content/50">
            Parol o'zgartirilgandan so'ng tizimga qayta kirishingiz kerak bo'ladi
          </div>
        </div>
      </div>
    </div>
  );
}
