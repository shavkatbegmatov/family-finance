import { useEffect, useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { useUsernameValidation } from '../../hooks/useUsernameValidation';
import type { UserDetail } from '../../api/users.api';

interface ChangeUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDetail | null;
  onConfirm: (newUsername: string) => void;
  isSaving: boolean;
}

/**
 * Username o'zgartirish — 2 bosqichli (input → tasdiqlash).
 * Live availability tekshiruvi {@link useUsernameValidation} orqali (debounce + format + async).
 */
export function ChangeUsernameModal({ isOpen, onClose, user, onConfirm, isSaving }: ChangeUsernameModalProps) {
  const [newUsername, setNewUsername] = useState('');
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);

  const { error: usernameError, isAvailable: isUsernameAvailable, isChecking: isCheckingUsername } =
    useUsernameValidation({ username: newUsername, currentUsername: user?.username });

  // Modal ochilganda joriy username bilan boshlanadi (confirm yopiq)
  useEffect(() => {
    if (isOpen && user) {
      setNewUsername(user.username);
      setShowUsernameConfirm(false);
    }
  }, [isOpen, user]);

  const handleChangeUsername = () => {
    if (!user || !isUsernameAvailable || newUsername === user.username) return;
    if (!showUsernameConfirm) {
      setShowUsernameConfirm(true);
      return;
    }
    onConfirm(newUsername);
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="modal modal-open" onClick={onClose}>
        <div className="modal-box max-w-md p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
          <h3 className="mb-4 text-lg font-bold">Username o'zgartirish</h3>

          {showUsernameConfirm ? (
            /* Confirmation step */
            <div className="space-y-4">
              <div className="alert alert-warning">
                <AlertTriangle className="h-4 w-4" />
                <div>
                  <p className="font-semibold">Diqqat!</p>
                  <p className="text-sm">
                    Username o'zgartirilgandan so'ng <strong>{user?.fullName}</strong>ning
                    barcha faol sessiyalari tugatiladi va qayta tizimga kirishi kerak bo'ladi.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-base-200 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base-content/50">Joriy:</span>
                  <span className="font-mono font-medium">@{user?.username}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-base-content/50">Yangi:</span>
                  <span className="font-mono font-medium text-primary">@{newUsername}</span>
                </div>
              </div>

              <div className="modal-action">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowUsernameConfirm(false)}>
                  Orqaga
                </button>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={handleChangeUsername}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  Tasdiqlash
                </button>
              </div>
            </div>
          ) : (
            /* Input step */
            <div className="space-y-4">
              <p className="text-sm">
                <strong>{user?.fullName}</strong> (
                <span className="font-mono">@{user?.username}</span>) uchun
                yangi username kiriting.
              </p>

              <div>
                <label className="label">
                  <span className="label-text">Yangi username *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">@</span>
                  <input
                    type="text"
                    className={`input input-bordered input-sm w-full pl-8 ${
                      usernameError
                        ? 'input-error'
                        : isUsernameAvailable === true
                          ? 'input-success'
                          : ''
                    }`}
                    placeholder="yangi.username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().trim())}
                    maxLength={50}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                    {!isCheckingUsername && isUsernameAvailable === true && (
                      <Check className="h-4 w-4 text-success" />
                    )}
                    {!isCheckingUsername && isUsernameAvailable === false && (
                      <X className="h-4 w-4 text-error" />
                    )}
                  </div>
                </div>
                {usernameError && (
                  <p className="mt-1 text-xs text-error">{usernameError}</p>
                )}
                {!usernameError && isUsernameAvailable === true && (
                  <p className="mt-1 text-xs text-success">Username mavjud</p>
                )}
              </div>

              <div className="space-y-1 text-xs text-base-content/50">
                <p>Qoidalar:</p>
                <ul className="list-disc pl-4">
                  <li>Kamida 3 ta belgi</li>
                  <li>Faqat kichik lotin harflari, raqamlar, nuqta va pastki chiziq</li>
                  <li>Harf bilan boshlanishi shart</li>
                </ul>
              </div>

              <div className="modal-action">
                <button className="btn btn-ghost btn-sm" onClick={onClose}>
                  Bekor qilish
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleChangeUsername}
                  disabled={
                    !newUsername.trim() ||
                    newUsername === user?.username ||
                    !!usernameError ||
                    isCheckingUsername ||
                    isUsernameAvailable !== true
                  }
                >
                  Davom etish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
