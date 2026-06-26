import { X } from 'lucide-react';
import { formatPhoneDisplay } from '../../utils/phone';
import type { SimpleUser } from '../../types';

interface RoleUsersPopoverProps {
  /** Rolga biriktirilgan foydalanuvchilar. */
  users: SimpleUser[];
  /** Popoverni yopish. */
  onClose: () => void;
}

/** Rolga biriktirilgan foydalanuvchilar popover ro'yxati (View modal statistikasi ostida). */
export function RoleUsersPopover({ users, onClose }: RoleUsersPopoverProps) {
  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-base-100 rounded-lg shadow-xl border border-base-300 max-h-80 overflow-y-auto">
      <div className="p-3">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-base-300">
          <h5 className="font-semibold text-sm">Biriktirilgan foydalanuvchilar</h5>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                user.active
                  ? 'bg-base-200 hover:bg-base-300'
                  : 'bg-base-200/50 opacity-60'
              }`}
            >
              <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ${
                user.active
                  ? 'bg-primary/15 text-primary'
                  : 'bg-base-300 text-base-content/40'
              }`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {user.fullName}
                  </p>
                  {!user.active && (
                    <span className="badge badge-xs badge-ghost">
                      Faol emas
                    </span>
                  )}
                </div>
                <p className="text-xs text-base-content/60 truncate">
                  @{user.username}
                </p>
                {(user.email || user.phone) && (
                  <p className="text-xs text-base-content/50 truncate">
                    {user.email || formatPhoneDisplay(user.phone)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
