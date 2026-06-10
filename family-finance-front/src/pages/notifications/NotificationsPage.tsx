import { useEffect, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowLeftRight,
  PieChart,
  HandMetal,
  Target,
  CheckCheck,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { useNotificationsStore, type Notification } from '../../store/notificationsStore';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';

type NotificationType = Notification['type'];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case 'success':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'transaction':
      return <ArrowLeftRight className="h-5 w-5 text-primary" />;
    case 'budget':
      return <PieChart className="h-5 w-5 text-info" />;
    case 'debt':
      return <HandMetal className="h-5 w-5 text-error" />;
    case 'savings':
      return <Target className="h-5 w-5 text-success" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-info" />;
  }
};

const getNotificationBorderColor = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return 'border-l-warning';
    case 'success':
    case 'savings':
      return 'border-l-success';
    case 'transaction':
      return 'border-l-primary';
    case 'debt':
      return 'border-l-error';
    case 'budget':
    case 'info':
    default:
      return 'border-l-info';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} daqiqa oldin`;
  } else if (diffHours < 24) {
    return `${diffHours} soat oldin`;
  } else if (diffDays < 7) {
    return `${diffDays} kun oldin`;
  } else {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
};

type FilterType = 'all' | 'unread' | 'warning' | 'transaction' | 'budget' | 'debt' | 'savings';

export function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsStore();
  const [filter, setFilter] = useState<FilterType>('all');
  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const handleRefresh = () => {
    void fetchNotifications();
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header — yangilash va "o'qilgan qilish" amallari mobilda ham kerak */}
      <PageHeader
        title="Bildirishnomalar"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} ta o'qilmagan xabar`
            : "Barcha xabarlar o'qilgan"
        }
        mobileVisible
        actions={
          <>
            <button
              className="tap-sm grid h-10 w-10 place-items-center rounded-xl border border-base-200 text-base-content/60"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Yangilash"
            >
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </button>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => markAllAsRead()}>
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Barchasini o'qilgan qilish</span>
              </button>
            )}
          </>
        }
      />

      {/* Filters — gorizontal pill qatori */}
      <div className="scrollbar-hide -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {[
          { key: 'all', label: 'Barchasi' },
          { key: 'unread', label: "O'qilmagan" },
          { key: 'warning', label: 'Ogohlantirishlar' },
          { key: 'transaction', label: 'Tranzaksiyalar' },
          { key: 'budget', label: 'Byudjet' },
          { key: 'debt', label: 'Qarzlar' },
          { key: 'savings', label: "Jamg'armalar" },
        ].map((item) => (
          <button
            key={item.key}
            className={clsx(
              'tap-sm flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              filter === item.key ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/60'
            )}
            onClick={() => setFilter(item.key as FilterType)}
          >
            {item.label}
            {item.key === 'unread' && unreadCount > 0 && (
              <span className="badge badge-error badge-xs">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="surface-card overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
            <Bell className="h-12 w-12" />
            <div>
              <p className="text-base font-medium">Bildirishnomalar yo'q</p>
              <p className="text-sm">
                {filter !== 'all'
                  ? "Bu toifada hech narsa yo'q"
                  : "Yangi bildirishnomalar bu yerda ko'rinadi"}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={clsx(
                  'flex items-start gap-4 p-4 transition-colors hover:bg-base-200/50',
                  'border-l-4',
                  getNotificationBorderColor(notification.type),
                  !notification.isRead && 'bg-primary/5'
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-base-200">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={clsx(
                            'text-sm',
                            !notification.isRead ? 'font-semibold' : 'font-medium'
                          )}
                        >
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="badge badge-primary badge-xs">Yangi</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-base-content/70 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-base-content/50">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <PermissionGate permission={PermissionCode.NOTIFICATIONS_MANAGE}>
                        {!notification.isRead && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => markAsRead(notification.id)}
                            title="O'qilgan qilish"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </PermissionGate>
                      <PermissionGate permission={PermissionCode.NOTIFICATIONS_MANAGE}>
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => deleteNotification(notification.id)}
                          title="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
