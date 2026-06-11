import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { LogIn, Eye, EyeOff, User as UserIcon, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { consumeIntendedPath, sanitizeInternalPath } from '../../utils/sessionNavigation';
import { BrandMark } from '../../components/common/BrandLogo';
import type { LoginRequest } from '../../types';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated } = useAuthStore();
  const storedRedirectRef = useRef<string | null>(consumeIntendedPath());

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
    const statePath = from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : null;

    return sanitizeInternalPath(statePath) || sanitizeInternalPath(storedRedirectRef.current) || '/';
  }, [location.state]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setLoading(true);
    try {
      const response = await authApi.login(data);

      const userWithPasswordFlag = {
        ...response.user,
        mustChangePassword: response.requiresPasswordChange || false,
      };

      setAuth(
        userWithPasswordFlag,
        response.accessToken,
        response.refreshToken,
        response.permissions,
        response.roles
      );

      toast.success('Muvaffaqiyatli kirish!');
      navigate(redirectTo, { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kirish xatosi');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (username: string, password: string) => {
    setValue('username', username);
    setValue('password', password);
  };

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-base-200">
      {/* Brend gradient fon + dekorativ shakllar */}
      <div className="brand-gradient absolute inset-x-0 top-0 h-[44%]">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -left-10 top-24 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
      </div>

      <div className="safe-top relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        {/* Brend */}
        <div className="flex flex-col items-center pt-14 text-center text-white">
          <BrandMark size={66} glow />
          <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight">Family Finance</h1>
          <p className="mt-1 text-sm text-white/85">Oilaviy moliya boshqaruvi</p>
        </div>

        {/* Kirish kartasi */}
        <div className="card-native mt-8 rounded-3xl p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold">Xush kelibsiz 👋</h2>
            <p className="mt-0.5 text-sm text-base-content/60">Davom etish uchun hisobingizga kiring</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            {/* Foydalanuvchi nomi */}
            <div>
              <label className="form-label">Foydalanuvchi nomi</label>
              <div className="form-control-wrapper px-3">
                <UserIcon className="h-5 w-5 flex-none text-base-content/40" />
                <input
                  type="text"
                  placeholder="admin"
                  autoComplete="username"
                  className="ml-2.5 h-full w-full bg-transparent text-base outline-none placeholder:text-base-content/35"
                  {...register('username', { required: 'Foydalanuvchi nomi kiritilishi shart' })}
                />
              </div>
              {errors.username && <p className="mt-1 px-1 text-xs text-error">{errors.username.message}</p>}
            </div>

            {/* Parol */}
            <div>
              <label className="form-label">Parol</label>
              <div className="form-control-wrapper px-3">
                <Lock className="h-5 w-5 flex-none text-base-content/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="ml-2.5 h-full w-full bg-transparent text-base outline-none placeholder:text-base-content/35"
                  {...register('password', { required: 'Parol kiritilishi shart' })}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  className="tap-sm flex-none text-base-content/45"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 px-1 text-xs text-error">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="flex items-center gap-2 text-base-content/65">
                <input type="checkbox" className="checkbox checkbox-primary checkbox-xs" />
                Eslab qolish
              </label>
              <button
                type="button"
                className="font-medium text-primary"
                onClick={() => toast('Parolni tiklash uchun administratorga murojaat qiling.')}
              >
                Parolni unutdingizmi?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="brand-gradient tap mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white shadow-[var(--shadow-brand)] disabled:opacity-70"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Kirish
                </>
              )}
            </button>
          </form>

          {/* Demo kirish — bosib to'ldirish */}
          <div className="mt-5 rounded-2xl border border-base-200 bg-base-200/40 p-3.5">
            <p className="mb-2 text-xs font-semibold text-base-content/70">Demo hisob (bosing)</p>
            <button
              type="button"
              onClick={() => fillDemo('admin', 'admin123')}
              className="tap-sm block w-full rounded-xl border border-base-200 bg-base-100 px-3 py-2 text-left"
            >
              <span className="block text-xs font-semibold">Administrator</span>
              <span className="block text-xs text-base-content/50">admin / admin123</span>
            </button>
          </div>
        </div>

        {/* Pastki qism */}
        <div className="mt-auto flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-base-content/60">
            Hisob kerakmi?{' '}
            <Link to="/register" className="font-semibold text-primary">
              Ro'yxatdan o'tish
            </Link>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-base-content/60">
            <ShieldCheck className="h-3.5 w-3.5" />
            Xavfsiz va rolga asoslangan kirish
          </p>
        </div>
      </div>
    </div>
  );
}
