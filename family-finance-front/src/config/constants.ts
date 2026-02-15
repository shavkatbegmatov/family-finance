export const API_BASE_URL = '/api';

// ==================== TIMEZONE CONFIGURATION ====================
export const TIMEZONE = 'Asia/Tashkent';

export const getTashkentToday = (): string => {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
};

export const getTashkentNow = (): Date => {
  const now = new Date();
  const tashkentTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return tashkentTime;
};

export const formatDateForApi = (date: Date): string => {
  return date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
};

export const getDateDaysAgo = (days: number): string => {
  const date = getTashkentNow();
  date.setDate(date.getDate() - days);
  return formatDateForApi(date);
};

export const getDateMonthsAgo = (months: number): string => {
  const date = getTashkentNow();
  date.setMonth(date.getMonth() - months);
  return formatDateForApi(date);
};

export const getDateYearsAgo = (years: number): string => {
  const date = getTashkentNow();
  date.setFullYear(date.getFullYear() - years);
  return formatDateForApi(date);
};

// ==================== FAMILY FINANCE CONSTANTS ====================

export const ACCOUNT_TYPES = {
  CASH: { label: 'Naqd pul', value: 'CASH' },
  BANK_CARD: { label: 'Bank kartasi', value: 'BANK_CARD' },
  SAVINGS: { label: "Jamg'arma", value: 'SAVINGS' },
  E_WALLET: { label: 'Elektron hamyon', value: 'E_WALLET' },
  TERM_DEPOSIT: { label: 'Muddatli depozit', value: 'TERM_DEPOSIT' },
  CREDIT: { label: 'Kredit', value: 'CREDIT' },
} as const;

export const TRANSACTION_TYPES = {
  INCOME: { label: 'Daromad', value: 'INCOME', color: 'text-success' },
  EXPENSE: { label: 'Xarajat', value: 'EXPENSE', color: 'text-error' },
  TRANSFER: { label: "O'tkazma", value: 'TRANSFER', color: 'text-info' },
  REVERSAL: { label: 'Storno', value: 'REVERSAL', color: 'text-warning' },
} as const;

export const FAMILY_ROLES = {
  FATHER: { label: 'Ota', value: 'FATHER' },
  MOTHER: { label: 'Ona', value: 'MOTHER' },
  CHILD: { label: 'Farzand', value: 'CHILD' },
  OTHER: { label: 'Boshqa', value: 'OTHER' },
} as const;

export const GENDERS = {
  MALE: { label: 'Erkak', value: 'MALE' },
  FEMALE: { label: 'Ayol', value: 'FEMALE' },
} as const;

export const RELATIONSHIP_TYPES: Record<string, { label: string; category: string }> = {
  OTA: { label: 'Otam', category: 'parents' },
  ONA: { label: 'Onam', category: 'parents' },
  OGIL: { label: "O'g'lim", category: 'children' },
  QIZ: { label: 'Qizim', category: 'children' },
  ER: { label: 'Erim', category: 'spouse' },
  XOTIN: { label: 'Xotinim', category: 'spouse' },
  AKA: { label: 'Akam', category: 'siblings' },
  UKA: { label: 'Ukam', category: 'siblings' },
  OPA: { label: 'Opam', category: 'siblings' },
  SINGIL: { label: 'Singlim', category: 'siblings' },
  BOBO: { label: 'Bobom', category: 'grandparents' },
  BUVI: { label: 'Buvim', category: 'grandparents' },
  NEVARA_OGIL: { label: "Nevaram (o'g'il)", category: 'grandchildren' },
  NEVARA_QIZ: { label: 'Nevaram (qiz)', category: 'grandchildren' },
  AMAKI: { label: 'Ammakim', category: 'extended' },
  TOGHA: { label: "Tog'am", category: 'extended' },
  AMMA: { label: 'Ammam', category: 'extended' },
  XOLA: { label: 'Xolam', category: 'extended' },
  JIYAN_OGIL: { label: "Jiyanim (o'g'il)", category: 'extended' },
  JIYAN_QIZ: { label: 'Jiyanim (qiz)', category: 'extended' },
  KUYOV: { label: 'Kuyovim', category: 'in-laws' },
  KELIN: { label: 'Kelinim', category: 'in-laws' },
  QAYIN_OTA: { label: 'Qayin otam', category: 'in-laws' },
  QAYIN_ONA: { label: 'Qayin onam', category: 'in-laws' },
  BOSHQA: { label: 'Boshqa', category: 'other' },
} as const;

export const RELATIONSHIP_CATEGORIES: Record<string, string> = {
  parents: 'Ota-onam',
  spouse: "Turmush o'rtog'im",
  children: 'Farzandlarim',
  siblings: "Aka-uka, opa-singillarim",
  grandparents: 'Bobo-buvim',
  grandchildren: 'Nevaralarim',
  'in-laws': 'Quda-andalar',
  extended: 'Yaqin qarindoshlar',
  other: 'Boshqalar',
} as const;

export const MARRIAGE_TYPES = {
  MARRIED: { label: 'Nikohda', value: 'MARRIED' },
  DIVORCED: { label: 'Ajrashgan', value: 'DIVORCED' },
  PARTNERSHIP: { label: 'Sheriklik', value: 'PARTNERSHIP' },
  OTHER: { label: 'Boshqa', value: 'OTHER' },
} as const;

export const LINEAGE_TYPES = {
  BIOLOGICAL: { label: 'Biologik', value: 'BIOLOGICAL' },
  ADOPTED: { label: 'Asrab olingan', value: 'ADOPTED' },
  STEP: { label: "O'gay", value: 'STEP' },
  FOSTER: { label: 'Tarbiyalanuvchi', value: 'FOSTER' },
  GUARDIAN: { label: 'Vasiylik', value: 'GUARDIAN' },
} as const;

export const FAMILY_UNIT_STATUSES = {
  ACTIVE: { label: 'Faol', value: 'ACTIVE', color: 'badge-success' },
  DISSOLVED: { label: 'Tugatilgan', value: 'DISSOLVED', color: 'badge-warning' },
} as const;

export const FAMILY_DEBT_TYPES = {
  GIVEN: { label: 'Berilgan qarz', value: 'GIVEN' },
  TAKEN: { label: 'Olingan qarz', value: 'TAKEN' },
} as const;

export const FAMILY_DEBT_STATUSES = {
  ACTIVE: { label: 'Faol', value: 'ACTIVE', color: 'badge-info' },
  PARTIALLY_PAID: { label: 'Qisman', value: 'PARTIALLY_PAID', color: 'badge-warning' },
  PAID: { label: "To'langan", value: 'PAID', color: 'badge-success' },
  OVERDUE: { label: "Muddati o'tgan", value: 'OVERDUE', color: 'badge-error' },
} as const;

export const BUDGET_PERIODS = {
  WEEKLY: { label: 'Haftalik', value: 'WEEKLY' },
  MONTHLY: { label: 'Oylik', value: 'MONTHLY' },
  YEARLY: { label: 'Yillik', value: 'YEARLY' },
} as const;

export const CATEGORY_TYPES = {
  INCOME: { label: 'Daromad', value: 'INCOME' },
  EXPENSE: { label: 'Xarajat', value: 'EXPENSE' },
} as const;

export const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e',
] as const;

export const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
] as const;

export const ROLES = {
  ADMIN: { label: 'Administrator', value: 'ADMIN' },
  MEMBER: { label: "A'zo", value: 'MEMBER' },
  VIEWER: { label: "Ko'ruvchi", value: 'VIEWER' },
} as const;

// ==================== FORMAT HELPERS ====================

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " so'm";
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('uz-UZ').format(num);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('ru-RU', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
