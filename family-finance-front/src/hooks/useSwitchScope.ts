import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useScopeStore } from '../store/scopeStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { scopesApi } from '../api/scopes.api';
import { getApiErrorMessage } from '../utils/apiError';
import type { ApiResponse } from '../types';
import type { Scope } from '../types/scope.types';

/**
 * Scope o'zgartirilganda yuboriladigan global event. React Query ishlatmaydigan
 * (useState+useEffect) sahifalar shunga obuna bo'lib ma'lumotni qayta yuklaydi.
 *
 * @see useScopeChangeEffect
 */
export const SCOPE_CHANGED_EVENT = 'scope-changed';

interface SwitchScopeResult {
  switchScope: (target: Scope) => Promise<void>;
  switchingId: number | null;
}

/**
 * Aktiv scope'ni almashtirish mantig'i — {@code ScopeSwitcher} va {@code HouseholdNode}
 * (xonadon daraxti) ikkalasida ishlatiladi (DRY).
 *
 * <p>Backend'ga switch-scope so'rovi yuboradi, yangi JWT oladi, authStore'ni
 * yangilaydi, WebSocket'ni qayta ulaydi, React Query cache'ini invalidate qiladi
 * va {@link SCOPE_CHANGED_EVENT} dispatch qiladi.</p>
 */
export function useSwitchScope(): SwitchScopeResult {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.roles);
  const setAuth = useAuthStore((s) => s.setAuth);

  const activeScope = useScopeStore((s) => s.activeScope);
  const setActiveScope = useScopeStore((s) => s.setActiveScope);

  const queryClient = useQueryClient();
  const connectWebSocket = useNotificationsStore((s) => s.connectWebSocket);
  const disconnectWebSocket = useNotificationsStore((s) => s.disconnectWebSocket);

  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const switchScope = useCallback(
    async (target: Scope) => {
      if (!target || target.id === activeScope?.id || switchingId !== null) return;
      if (!user || !accessToken || !refreshToken) return;

      setSwitchingId(target.id);
      try {
        const res = await scopesApi.switchScope({ scopeId: target.id, persistAsPrimary: false });
        const data = (res.data as ApiResponse<{ accessToken: string }>).data;
        if (!data?.accessToken) {
          throw new Error('Yangi token kelmadi');
        }
        const newAccessToken = data.accessToken;

        // 1) authStore — yangi JWT (axios darhol yangi tokenni ishlatadi)
        setAuth(user, newAccessToken, refreshToken, Array.from(permissions), Array.from(roles));
        // 2) aktiv scope
        setActiveScope(target);
        // 3) WebSocket'ni yangi token bilan qayta ulash
        disconnectWebSocket();
        connectWebSocket(newAccessToken);
        // 4) React Query cache — barcha sahifalar yangi scope kontekstida qayta yuklaydi
        await queryClient.invalidateQueries();
        // 5) Legacy useState+useEffect sahifalar uchun custom event
        window.dispatchEvent(
          new CustomEvent(SCOPE_CHANGED_EVENT, {
            detail: { scope: target, previousScopeId: activeScope?.id ?? null },
          }),
        );

        toast.success(`"${target.name}" ga o'tildi`);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Scope almashtirishda xatolik'));
      } finally {
        setSwitchingId(null);
      }
    },
    [
      activeScope?.id,
      switchingId,
      user,
      accessToken,
      refreshToken,
      permissions,
      roles,
      setAuth,
      setActiveScope,
      queryClient,
      connectWebSocket,
      disconnectWebSocket,
    ],
  );

  return { switchScope, switchingId };
}
