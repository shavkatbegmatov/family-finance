import { useEffect, useState } from 'react';
import { usersApi } from '../api/users.api';

/** Username format qoidasi: harf bilan boshlanadi, 3-50 belgi, kichik harf/raqam/nuqta/pastki chiziq. */
export const USERNAME_REGEX = /^[a-z][a-z0-9._]{2,49}$/;

interface UseUsernameValidationArgs {
  /** Tekshirilayotgan username qiymati. */
  username: string;
  /** Joriy (o'zgarmagan) username — bunga teng bo'lsa tekshiruv o'tkazilmaydi. */
  currentUsername?: string;
}

interface UseUsernameValidationResult {
  /** Xato matni (format yoki bandlik). Bo'sh bo'lsa xato yo'q. */
  error: string;
  /** Server bo'yicha bandlik holati: true=bo'sh, false=band, null=hali aniqlanmagan. */
  isAvailable: boolean | null;
  /** Hozir server tekshiruvi ketяptimi (spinner uchun). */
  isChecking: boolean;
}

/**
 * Debounce qilingan username mavjudligi tekshiruvi.
 *
 * <p>Avval client-side format validatsiyasi (USERNAME_REGEX), so'ng 500ms debounce bilan
 * async {@code usersApi.checkUsername} chaqiriladi. UX UsersPage'dagi original mantiq bilan
 * aynan bir xil.</p>
 */
export function useUsernameValidation({
  username,
  currentUsername,
}: UseUsernameValidationArgs): UseUsernameValidationResult {
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!username || username === currentUsername) {
      setIsAvailable(null);
      setError('');
      return;
    }

    // Client-side validation first
    if (username.length < 3) {
      setError('Kamida 3 belgi');
      setIsAvailable(null);
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setError('Faqat kichik harflar, raqamlar, nuqta va pastki chiziq');
      setIsAvailable(null);
      return;
    }

    setError('');
    setIsChecking(true);

    const timer = setTimeout(async () => {
      try {
        const available = await usersApi.checkUsername(username);
        setIsAvailable(available);
        if (!available) {
          setError('Bu username allaqachon band');
        }
      } catch {
        setError('Tekshirishda xatolik');
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, currentUsername]);

  return { error, isAvailable, isChecking };
}
