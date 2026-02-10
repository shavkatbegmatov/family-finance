import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogOut,
  AlertTriangle,
  Loader2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi, type Session } from '../../api/sessions.api';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import type { SessionUpdateMessage } from '../../services/websocket';

export function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const { logoutWithRedirect } = useAuthStore();

  // Define fetchSessions before useEffect
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionsApi.getActiveSessions();
      setSessions(data);

      const current = data.find((s) => s.isCurrent);
      if (current) {
        setCurrentSessionId(current.id);
      }
    } catch (error: unknown) {
      // If 401 Unauthorized, the session was revoked from another device
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        toast.error('Sessioningiz boshqa qurilmadan yopilgan. Qayta kiring.');
        logoutWithRedirect();
      } else {
        toast.error('Sessiyalarni yuklashda xatolik');
      }
    } finally {
      setLoading(false);
    }
  }, [logoutWithRedirect]);

  useEffect(() => {
    void fetchSessions();

    const handleSessionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<SessionUpdateMessage>;
      const data = customEvent.detail;

      if (data.type === 'SESSION_REVOKED') {
        const isCurrentSession = data.sessionId === currentSessionId;

        if (isCurrentSession) {
          toast.error('Sessioningiz boshqa qurilmadan yopilgan. Qayta kiring.');
          logoutWithRedirect();
        } else {
          void fetchSessions();
        }
      } else if (data.type === 'SESSION_CREATED') {
        void fetchSessions();
      }
    };

    window.addEventListener('session-update', handleSessionUpdate);

    return () => {
      window.removeEventListener('session-update', handleSessionUpdate);
    };
  }, [fetchSessions, currentSessionId, logoutWithRedirect]);

  const handleRevokeSession = async (sessionId: number) => {
    if (!confirm('Ushbu qurilmadan chiqmoqchimisiz?')) return;

    setRevokingId(sessionId);
    try {
      await sessionsApi.revokeSession(sessionId, 'Foydalanuvchi tomonidan tugatildi');
      toast.success('Session tugatildi');
      void fetchSessions();
    } catch (error: unknown) {
      // If 401, session was already revoked or user logged out
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        toast.error('Sessioningiz yaroqsiz. Qayta kiring.');
        logoutWithRedirect();
      } else {
        toast.error('Sessionni tugatishda xatolik');
      }
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('Boshqa barcha qurilmalardan chiqmoqchimisiz?')) return;

    setRevokingAll(true);
    try {
      const result = await sessionsApi.revokeAllOtherSessions();
      toast.success(`${result.revokedCount} ta session tugatildi`);
      void fetchSessions();
    } catch (error: unknown) {
      // If 401, session was already revoked or user logged out
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        toast.error('Sessioningiz yaroqsiz. Qayta kiring.');
        logoutWithRedirect();
      } else {
        toast.error('Sessiyalarni tugatishda xatolik');
      }
    } finally {
      setRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold">Faol sessiyalar</h3>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Barcha kirish sessiyalarini boshqaring va xavfsizligingizni ta'minlang
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            className="btn btn-ghost btn-sm flex-1 sm:flex-initial"
            onClick={fetchSessions}
            disabled={loading}
            title="Yangilash"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
          {otherSessions.length > 0 && (
            <button
              className="btn btn-error btn-sm w-full sm:w-auto whitespace-nowrap"
              onClick={handleRevokeAllOthers}
              disabled={revokingAll}
            >
              {revokingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tugatilmoqda
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Hammadan chiq
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <div className="surface-card p-4 sm:p-6 border-2 border-success">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
              <div className="p-3 rounded-xl bg-success/10 flex-shrink-0">
                {getDeviceIcon(currentSession.deviceType)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                    {currentSession.browser} - {currentSession.os}
                  </h4>
                  <span className="badge badge-success badge-sm gap-1 flex-shrink-0">
                    <CheckCircle className="h-3 w-3" />
                    Hozirgi session
                  </span>
                </div>
                <p className="text-sm text-base-content/60 mt-1">
                  {currentSession.deviceType}
                </p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs text-base-content/50">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="break-all text-xs">{currentSession.ipAddress}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs">Kirish: {formatTimeAgo(currentSession.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs">Faollik: {formatTimeAgo(currentSession.lastActivityAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-base-content/70">
            Boshqa qurilmalar ({otherSessions.length})
          </h4>
          {otherSessions.map((session) => (
            <div key={session.id} className="surface-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                  <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                      {session.browser} - {session.os}
                    </h4>
                    <p className="text-sm text-base-content/60 mt-1">
                      {session.deviceType}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs text-base-content/50">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="break-all text-xs">{session.ipAddress}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="text-xs">Kirish: {formatTimeAgo(session.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="text-xs">Faollik: {formatTimeAgo(session.lastActivityAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm text-error w-full sm:w-auto mt-3 sm:mt-0 whitespace-nowrap"
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Chiqish
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card p-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-base-content/30" />
          <h4 className="text-lg font-semibold mt-4">Boshqa sessiyalar yo'q</h4>
          <p className="text-sm text-base-content/60 mt-2">
            Faqat hozirgi qurilmadan kirilgan
          </p>
        </div>
      )}

      {/* Security Notice */}
      <div className="alert alert-info">
        <AlertTriangle className="h-5 w-5" />
        <div className="text-sm">
          <p className="font-semibold">Xavfsizlik eslatmasi</p>
          <p className="mt-1">
            Agar noma'lum qurilmalarni ko'rsangiz, darhol barchasidan chiqing va
            parolingizni o'zgartiring.
          </p>
        </div>
      </div>
    </div>
  );
}
