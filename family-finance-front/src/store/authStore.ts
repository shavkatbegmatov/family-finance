import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { saveIntendedPath } from '../utils/sessionNavigation';
import { authSession } from '../auth/authSession';
import { tokenStore } from '../auth/tokenStore';

// Bir nechta logout chaqiruvini oldini olish uchun guard
let isLoggingOut = false;

/**
 * PWA workbox runtime `api-cache`'ni tozalaydi (logout xavfsizligi).
 *
 * `vite.config.ts` da `/api/v1/*` javoblari `NetworkFirst` bilan `api-cache`'ga yoziladi.
 * Logout'da bularni tozalamasak, bitta qurilmada boshqa foydalanuvchi kirganda oldingi
 * user'ning maxfiy ma'lumotlari (hisoblar, tranzaksiyalar) offline'da ko'rinib qolishi mumkin.
 * Best-effort, fire-and-forget (Cache API yo'q bo'lsa jim o'tadi).
 */
function clearApiCache(): void {
  if (typeof caches === 'undefined') return;
  caches
    .keys()
    .then((names) =>
      Promise.all(names.filter((n) => n.includes('api-cache')).map((n) => caches.delete(n)))
    )
    .catch(() => {
      // Cache API mavjud emas yoki xato — kerakli emas
    });
}

interface LogoutRedirectOptions {
  captureCurrentPath?: boolean;
}

interface LogoutOptions {
  /**
   * `false` — chaqiruvchi serverdagi sessiyani allaqachon bekor qilgan (`authApi.logout`).
   * Aks holda best-effort `POST /v1/auth/logout` yuboriladi (cookie tozalanadi).
   */
  revokeServerSession?: boolean;
}

interface AuthState {
  user: User | null;
  /** Faqat xotirada (D12-PR5) — `tokenStore` bilan sinxron, persist QILINMAYDI. */
  accessToken: string | null;
  /** Web'da doim `null` (httpOnly cookie'da); faqat native (Capacitor) uchun. */
  refreshToken: string | null;
  permissions: Set<string>;
  roles: Set<string>;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string | null, permissions?: string[], roles?: string[]) => void;
  updateUser: (user: User) => void;
  logout: (options?: LogoutOptions) => void;
  logoutWithRedirect: (delay?: number, options?: LogoutRedirectOptions) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      permissions: new Set<string>(),
      roles: new Set<string>(),
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken, permissions = [], roles = []) => {
        // D12-PR5: access token faqat xotirada (+ boshqa tablarga tarqatiladi). Refresh token
        // web'da httpOnly cookie'da (JS'ga kelmaydi), native'da tokenStore saqlaydi.
        authSession.adoptAccessToken(accessToken);
        tokenStore.setStoredRefreshToken(refreshToken);

        const newPermissionsSet = new Set(permissions);
        const newRolesSet = new Set(roles);

        set({
          user,
          accessToken,
          refreshToken: tokenStore.getStoredRefreshToken(),
          permissions: newPermissionsSet,
          roles: newRolesSet,
          isAuthenticated: true,
        });
      },

      updateUser: (user) => set({ user }),

      logout: (options) => {
        // D12-PR5: client-side logout yo'llari (idle, cross-tab, sessiya monitori) ham serverdagi
        // sessiyani bekor qilib cookie'ni tozalasin — aks holda keyingi ochilishda jimgina tiklanardi.
        const currentToken = tokenStore.getAccessToken();
        if (options?.revokeServerSession !== false && currentToken) {
          authSession.revokeServerSession(currentToken);
        }
        tokenStore.setAccessToken(null);
        tokenStore.setStoredRefreshToken(null);
        tokenStore.clearLegacyTokenStorage();
        // Phase 3: scope cache'ni ham tozalash (yangi user kirsa, eski scope'lar ko'rinmasin)
        localStorage.removeItem('scope-store');
        // D12-PR3: PWA runtime api-cache'ni tozalash — eski user'ning maxfiy /api/v1/*
        // javoblari keyingi user uchun keshda qolib ketmasin.
        clearApiCache();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          permissions: new Set<string>(),
          roles: new Set<string>(),
          isAuthenticated: false,
        });
      },

      logoutWithRedirect: (delay = 1500, options) => {
        if (isLoggingOut) return;

        if (options?.captureCurrentPath !== false) {
          saveIntendedPath();
        }

        isLoggingOut = true;
        setTimeout(() => {
          get().logout();
          window.location.href = '/login';
          // Qayta login qilish imkoniyati uchun flag'ni tozalash
          setTimeout(() => { isLoggingOut = false; }, 1000);
        }, delay);
      },

      hasPermission: (permission: string) => {
        return get().permissions.has(permission);
      },

      hasAnyPermission: (...permissions: string[]) => {
        const userPermissions = get().permissions;
        return permissions.some(p => userPermissions.has(p));
      },

      hasAllPermissions: (...permissions: string[]) => {
        const userPermissions = get().permissions;
        return permissions.every(p => userPermissions.has(p));
      },

      hasRole: (role: string) => {
        return get().roles.has(role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: Array.from(state.permissions),
        roles: Array.from(state.roles),
      }),
      // Deserialize permissions and roles from array back to Set
      onRehydrateStorage: () => (state) => {
        if (state) {
          // permissions comes as array from storage, convert to Set with validation
          if (Array.isArray(state.permissions)) {
            const validPermissions = (state.permissions as unknown[]).filter(
              (p): p is string => typeof p === 'string'
            );
            state.permissions = new Set(validPermissions);
          } else {
            state.permissions = new Set<string>();
          }
          // roles comes as array from storage, convert to Set with validation
          if (Array.isArray(state.roles)) {
            const validRoles = (state.roles as unknown[]).filter(
              (r): r is string => typeof r === 'string'
            );
            state.roles = new Set(validRoles);
          } else {
            state.roles = new Set<string>();
          }
          // D12-PR5: tokenlar localStorage'da YO'Q. Access token xotirada — sahifa yuklanishida
          // `authSession.bootstrapSession()` cookie orqali tiklaydi, quyidagi obuna store'ga yozadi.
          state.accessToken = tokenStore.getAccessToken();
          state.refreshToken = tokenStore.getStoredRefreshToken();
        }
      },
    }
  )
);

// Xotiradagi token o'zgarsa (boot refresh, 401 refresh, boshqa tabdan kelgan token) store'ga
// aks ettiriladi — `useAuthStore(s => s.accessToken)` ishlatadigan komponentlar (ScopeSwitcher)
// reload'dan keyin ham tokenni ko'rsin. Login sahifasidagi (chiqib ketgan) tabga boshqa tab
// tokeni kerak emas.
tokenStore.onAccessTokenChange((token) => {
  const state = useAuthStore.getState();
  if (state.accessToken === token) return;
  if (token && !state.isAuthenticated) return;
  useAuthStore.setState({ accessToken: token });
});
