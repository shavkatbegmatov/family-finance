import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  UserCircle,
  Lock,
  AlertTriangle,
  Monitor,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import type { ChangePasswordRequest, User as UserType } from '../../types';
import { SessionsTab } from './SessionsTab';
import { LoginActivityTab } from './LoginActivityTab';
import { ActivityHistoryTab } from './ActivityHistoryTab';
import { ProfileInfoTab } from './ProfileInfoTab';

type Tab = 'profile' | 'security' | 'sessions' | 'login-activity' | 'activity';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword', '');

  // Password strength indicators
  const hasMinLength = newPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

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

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        setUserData(userData);
      } catch {
        toast.error("Ma'lumotlarni yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  const onSubmitPassword = async (data: PasswordFormData) => {
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

      // Force re-login after password change
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Parolni o'zgartirishda xatolik");
    } finally {
      setChangingPassword(false);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-success' : 'text-base-content/50'}`}>
      {met ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      <span>{text}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title">Profil</h1>
        <p className="section-subtitle">Shaxsiy ma'lumotlar va xavfsizlik sozlamalari</p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered overflow-x-auto scrollbar-hide">
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'profile' && 'tab-active')}
          onClick={() => setActiveTab('profile')}
        >
          <UserCircle className="h-4 w-4" />
          Ma'lumotlar
        </button>
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'security' && 'tab-active')}
          onClick={() => setActiveTab('security')}
        >
          <Lock className="h-4 w-4" />
          Xavfsizlik
        </button>
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'sessions' && 'tab-active')}
          onClick={() => setActiveTab('sessions')}
        >
          <Monitor className="h-4 w-4" />
          Sessiyalar
        </button>
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'login-activity' && 'tab-active')}
          onClick={() => setActiveTab('login-activity')}
        >
          <Shield className="h-4 w-4" />
          Kirish tarixi
        </button>
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'activity' && 'tab-active')}
          onClick={() => setActiveTab('activity')}
        >
          <Activity className="h-4 w-4" />
          Faoliyat tarixi
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && userData && (
        <ProfileInfoTab userData={userData} onUserDataChange={setUserData} />
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Warning if user must change password */}
          {userData?.mustChangePassword && (
            <div className="alert alert-warning">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Parolingizni o'zgartiring</h4>
                  <p className="text-sm mt-1">
                    Siz hozircha admin tomonidan berilgan paroldan foydalanayapsiz.
                    Xavfsizlik uchun uni o'zgartiring.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="surface-card p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 rounded-xl bg-warning/10">
                <Key className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Parolni o'zgartirish</h3>
                <p className="text-sm text-base-content/60">
                  Hisobingiz xavfsizligi uchun kuchli parol o'rnating
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmitPassword)} className="w-full max-w-md space-y-3 sm:space-y-4">
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
                      minLength: { value: 6, message: 'Parol kamida 6 belgi' },
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
                <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 rounded-xl bg-base-200/50">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 4) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>
                      {getStrengthLabel()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <PasswordRequirement met={hasMinLength} text="Kamida 6 belgi" />
                    <PasswordRequirement met={hasUppercase} text="Katta harf" />
                    <PasswordRequirement met={hasLowercase} text="Kichik harf" />
                    <PasswordRequirement met={hasNumber} text="Raqam" />
                  </div>
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

              <div className="pt-2 sm:pt-3">
                <button
                  type="submit"
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={changingPassword || passwordStrength < 3}
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
              </div>

              <p className="text-xs text-base-content/50">
                Parol o'zgartirilgandan so'ng tizimga qayta kirishingiz kerak bo'ladi
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && <SessionsTab />}

      {/* Login Activity Tab */}
      {activeTab === 'login-activity' && <LoginActivityTab />}

      {/* Activity History Tab */}
      {activeTab === 'activity' && <ActivityHistoryTab />}
    </div>
  );
}
