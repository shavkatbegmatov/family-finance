import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Key,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { PasswordStrengthMeter } from '../ui/PasswordStrengthMeter';
import { isPasswordStrong, PASSWORD_MIN_LENGTH } from '../../utils/password';
import { getApiErrorMessage } from '../../utils/apiError';
import type { ChangePasswordRequest } from '../../types';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordChangeModal({ isOpen, onClose }: PasswordChangeModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { logoutWithRedirect } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword', '');

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Yangi parol va tasdiqlash mos kelmadi');
      return;
    }

    setChangingPassword(true);
    try {
      const request: ChangePasswordRequest = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };

      await authApi.changePassword(request);
      toast.success("Parol muvaffaqiyatli o'zgartirildi!");
      reset();
      onClose();

      // Force re-login after password change
      logoutWithRedirect();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Parolni o'zgartirishda xatolik"));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSkip = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="surface-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-base-200">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Parolingizni o'zgartiring</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Xavfsizlik uchun admin tomonidan berilgan parolni o'zgartiring
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={handleSkip}
            disabled={changingPassword}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="alert alert-warning">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">
              Siz hozircha admin tomonidan berilgan paroldan foydalanayapsiz.
              Xavfsizlik uchun uni o'zgartirishingizni tavsiya etamiz.
            </span>
          </div>

          {/* Current Password */}
          <div className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Joriy parol
            </span>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Joriy parolingizni kiriting"
                autoComplete="current-password"
                className={clsx(
                  'input input-bordered w-full pr-10',
                  errors.currentPassword && 'input-error'
                )}
                {...register('currentPassword', {
                  required: 'Joriy parol kiritilishi shart',
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.currentPassword && (
              <span className="mt-1 text-xs text-error">{errors.currentPassword.message}</span>
            )}
          </div>

          {/* New Password */}
          <div className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Yangi parol
            </span>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Yangi xavfsiz parol"
                autoComplete="new-password"
                className={clsx(
                  'input input-bordered w-full pr-10',
                  errors.newPassword && 'input-error'
                )}
                {...register('newPassword', {
                  required: 'Yangi parol kiritilishi shart',
                  minLength: { value: PASSWORD_MIN_LENGTH, message: `Parol kamida ${PASSWORD_MIN_LENGTH} belgi` },
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <span className="mt-1 text-xs text-error">{errors.newPassword.message}</span>
            )}
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="p-4 rounded-xl bg-base-200/50">
              <PasswordStrengthMeter password={newPassword} showRequirements />
            </div>
          )}

          {/* Confirm Password */}
          <div className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Parolni tasdiqlash
            </span>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Yangi parolni qayta kiriting"
                autoComplete="new-password"
                className={clsx(
                  'input input-bordered w-full pr-10',
                  errors.confirmPassword && 'input-error'
                )}
                {...register('confirmPassword', {
                  required: 'Parolni tasdiqlash kiritilishi shart',
                  validate: (value) => value === newPassword || 'Parollar mos kelmadi',
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="mt-1 text-xs text-error">{errors.confirmPassword.message}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={changingPassword || !isPasswordStrong(newPassword)}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  O'zgartirilmoqda...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Parolni o'zgartirish
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSkip}
              disabled={changingPassword}
            >
              Keyinroq
            </button>
          </div>

          <p className="text-xs text-base-content/50">
            Parol o'zgartirilgandan so'ng tizimga qayta kirishingiz kerak bo'ladi
          </p>
        </form>
      </div>
    </div>
  );
}
