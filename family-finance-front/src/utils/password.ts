/**
 * Parol siyosati — butun ilova uchun yagona manba (single source of truth).
 *
 * Avval strength-tekshiruvi kodi bir nechta sahifada (RegisterPage, ChangePasswordPage,
 * PasswordChangeModal, ProfilePage) copy-paste qilingan edi. Endi hammasi shu yerga jamlangan.
 *
 * Siyosat ("Muvozanatli"):
 *  - Hamma joyda minimal {@link PASSWORD_MIN_LENGTH} belgi majburiy.
 *  - Foydalanuvchi O'Z parolini o'zgartirganda/ro'yxatdan o'tganda kuchli parol talab qilinadi
 *    ({@link isPasswordStrong}) — backend ham buni tekshiradi.
 *  - Admin oila a'zosiga parol qo'yganda faqat uzunlik majburiy (qulaylik uchun); strength
 *    ko'rsatkichi orqali kuchliroq parolga undaladi.
 */

/** Minimal parol uzunligi — backend bilan izchil (PasswordPolicy.MIN_LENGTH, DTO @Size). */
export const PASSWORD_MIN_LENGTH = 10;

/** "Kuchli" deb hisoblash uchun zarur minimal ball (4 mezondan). */
export const PASSWORD_STRONG_SCORE = 3;

export interface PasswordRequirement {
  key: 'minLength' | 'uppercase' | 'lowercase' | 'number';
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  /** 0-4 — qondirilgan mezonlar soni. */
  score: number;
  /** Inson o'qiy oladigan baho: "Juda zaif" | "Zaif" | "Yaxshi" | "Kuchli". */
  label: string;
  /** Progress bar uchun Tailwind/DaisyUI bg-class. */
  colorClass: string;
  /** Matn uchun mos text-class. */
  textColorClass: string;
  /** Checklist ko'rsatish uchun mezonlar. */
  requirements: PasswordRequirement[];
  /** Minimal qabul qilinadigan (kamida {@link PASSWORD_MIN_LENGTH} belgi). */
  isAcceptable: boolean;
  /** Self-service uchun yetarlicha kuchli (score ≥ {@link PASSWORD_STRONG_SCORE}). */
  isStrong: boolean;
}

/**
 * Parol kuchini baholaydi. Mezonlar barcha sahifalarda izchil:
 * uzunlik (≥10), katta harf, kichik harf, raqam.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const requirements: PasswordRequirement[] = [
    { key: 'minLength', label: `Kamida ${PASSWORD_MIN_LENGTH} belgi`, met: hasMinLength },
    { key: 'uppercase', label: 'Katta harf', met: hasUppercase },
    { key: 'lowercase', label: 'Kichik harf', met: hasLowercase },
    { key: 'number', label: 'Raqam', met: hasNumber },
  ];

  const score = requirements.filter((r) => r.met).length;

  let label: string;
  let colorClass: string;
  if (score <= 1) {
    label = 'Juda zaif';
    colorClass = 'bg-error';
  } else if (score === 2) {
    label = 'Zaif';
    colorClass = 'bg-warning';
  } else if (score === 3) {
    label = 'Yaxshi';
    colorClass = 'bg-info';
  } else {
    label = 'Kuchli';
    colorClass = 'bg-success';
  }

  return {
    score,
    label,
    colorClass,
    textColorClass: colorClass.replace('bg-', 'text-'),
    requirements,
    isAcceptable: hasMinLength,
    isStrong: score >= PASSWORD_STRONG_SCORE,
  };
}

/** Parol minimal uzunlikni qondiradimi (eng yumshoq, hamma joyda majburiy). */
export function isPasswordAcceptable(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

/** Parol self-service uchun yetarlicha kuchlimi (katta+kichik+raqam+uzunlik). */
export function isPasswordStrong(password: string): boolean {
  return evaluatePasswordStrength(password).isStrong;
}

// Chalkashtiruvchi belgilarsiz alifbolar (0/O, 1/l/I kabilar chiqarib tashlangan).
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '@#$%&*!';

function randomChar(alphabet: string): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return alphabet[array[0] % alphabet.length];
}

/**
 * Kriptografik xavfsiz, kuchli vaqtinchalik parol generatsiya qiladi.
 * Kafolat: kamida bittadan katta harf, kichik harf, raqam va maxsus belgi.
 * Backend {@code UserService.generateTemporaryPassword()} bilan bir xil tarkibda.
 */
export function generateStrongPassword(length = 10): string {
  const targetLength = Math.max(length, PASSWORD_MIN_LENGTH);
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SPECIAL)];
  const allChars = UPPER + LOWER + DIGITS;

  const chars = [...required];
  while (chars.length < targetLength) {
    chars.push(randomChar(allChars));
  }

  // Fisher–Yates aralashtirish (kriptografik tasodif bilan)
  for (let i = chars.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
