import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Shield,
  Key,
  Eye,
  EyeOff,
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
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { isPasswordStrong, PASSWORD_MIN_LENGTH } from '../../utils/password';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <PageHeader title="Profil" subtitle="Shaxsiy ma'lumotlar va xavfsizlik sozlamalari" />

      {/* Tabs — pill */}
      <div className="scrollbar-hide -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {([
          { id: 'profile', label: "Ma'lumotlar", icon: UserCircle },
          { id: 'security', label: 'Xavfsizlik', icon: Lock },
          { id: 'sessions', label: 'Sessiyalar', icon: Monitor },
          { id: 'login-activity', label: 'Kirish tarixi', icon: Shield },
          { id: 'activity', label: 'Faoliyat tarixi', icon: Activity },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={clsx(
                'tap-sm flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'bg-base-200 text-base-content/60'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
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
              {/* Yashirin username maydoni — parol menejerlari va accessibility uchun (Chrome tavsiyasi).
                  Submit'ga kirmaydi, faqat brauzerga qaysi hisob ekanini bildiradi. */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={userData?.username ?? ''}
                readOnly
                tabIndex={-1}
                className="hidden"
              />
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
                <div className="p-3 sm:p-4 rounded-xl bg-base-200/50">
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

              <div className="pt-2 sm:pt-3">
                <button
                  type="submit"
                  className="btn btn-primary w-full sm:w-auto"
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
