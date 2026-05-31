import type { Gender } from '../../../../types';

/** Ma'lumot yo'qligini bildiruvchi belgi. */
export const NODE_PLACEHOLDER = '-';

/** Jinsga mos avatar gradienti — PersonNode va HouseholdNode ikkalasida (DRY). */
export const getGenderGradient = (gender?: Gender | null): string => {
  switch (gender) {
    case 'MALE': return 'bg-gradient-to-br from-blue-400 to-blue-600';
    case 'FEMALE': return 'bg-gradient-to-br from-pink-400 to-pink-600';
    default: return 'bg-gradient-to-br from-amber-400 to-amber-600';
  }
};

/** Jinsga (yoki root holatiga) mos chegara rangi. */
export const getGenderBorderColor = (gender?: Gender | null, isRoot?: boolean): string => {
  if (isRoot) return 'border-primary ring-2 ring-primary/20';
  switch (gender) {
    case 'MALE': return 'border-blue-500/30';
    case 'FEMALE': return 'border-pink-500/30';
    default: return 'border-amber-500/30';
  }
};

/** Tug'ilgan/vafot sanasidan yoshni hisoblaydi ("X yosh" / "X yosh (vafot)"). */
export const getAge = (birthDate?: string, deathDate?: string): string => {
  if (!birthDate) return NODE_PLACEHOLDER;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return NODE_PLACEHOLDER;

  const end = deathDate ? new Date(deathDate) : new Date();
  if (Number.isNaN(end.getTime())) return NODE_PLACEHOLDER;

  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  if (deathDate) return `${age} yosh (vafot)`;
  return `${age} yosh`;
};

/** Ism bo'sh bo'lmasa bosh harfini, aks holda '?' qaytaradi. */
export const getInitial = (name?: string): string => {
  const trimmed = name?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
};
