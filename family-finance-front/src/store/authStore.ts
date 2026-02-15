import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

// Bir nechta logout chaqiruvini oldini olish uchun guard
let isLoggingOut = false;

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: Set<string>;
  roles: Set<string>;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, permissions?: string[], roles?: string[]) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  logoutWithRedirect: (delay?: number) => void;
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
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        const newPermissionsSet = new Set(permissions);
        const newRolesSet = new Set(roles);

        set({
          user,
          accessToken,
          refreshToken,
          permissions: newPermissionsSet,
          roles: newRolesSet,
          isAuthenticated: true,
        });
      },

      updateUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          permissions: new Set<string>(),
          roles: new Set<string>(),
          isAuthenticated: false,
        });
      },

      logoutWithRedirect: (delay = 1500) => {
        if (isLoggingOut) return;
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
        }
      },
    }
  )
);
