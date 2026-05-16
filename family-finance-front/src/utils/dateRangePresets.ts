import {
  getTashkentToday,
  getDateDaysAgo,
  formatDateForApi,
  getTashkentNow,
} from '../config/constants';

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'last30'
  | 'quarter'
  | 'year'
  | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

export interface PresetOption {
  value: DateRangePreset;
  label: string;
}

export const PRESET_OPTIONS: readonly PresetOption[] = [
  { value: 'all', label: 'Barchasi' },
  { value: 'today', label: 'Bugun' },
  { value: 'yesterday', label: 'Kecha' },
  { value: 'week', label: 'Bu hafta' },
  { value: 'month', label: 'Bu oy' },
  { value: 'last30', label: 'Oxirgi 30 kun' },
  { value: 'quarter', label: 'Chorak' },
  { value: 'year', label: 'Bu yil' },
  { value: 'custom', label: 'Maxsus' },
] as const;

export const QUICK_PRESET_VALUES: readonly DateRangePreset[] = [
  'today',
  'yesterday',
  'week',
  'month',
  'last30',
];

const getStartOfWeekMonday = (now: Date): Date => {
  const result = new Date(now);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getStartOfMonth = (now: Date): Date => {
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const getStartOfQuarter = (now: Date): Date => {
  const quarter = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), quarter * 3, 1);
};

const getStartOfYear = (now: Date): Date => {
  return new Date(now.getFullYear(), 0, 1);
};

export const resolvePreset = (
  preset: DateRangePreset,
  customRange?: DateRange
): DateRange | null => {
  if (preset === 'all') return null;
  if (preset === 'custom') return customRange ?? null;

  const today = getTashkentToday();
  const now = getTashkentNow();

  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const y = getDateDaysAgo(1);
      return { start: y, end: y };
    }
    case 'week':
      return { start: formatDateForApi(getStartOfWeekMonday(now)), end: today };
    case 'month':
      return { start: formatDateForApi(getStartOfMonth(now)), end: today };
    case 'last30':
      return { start: getDateDaysAgo(30), end: today };
    case 'quarter':
      return { start: formatDateForApi(getStartOfQuarter(now)), end: today };
    case 'year':
      return { start: formatDateForApi(getStartOfYear(now)), end: today };
    default:
      return null;
  }
};

export const getPresetLabel = (preset: DateRangePreset): string => {
  return PRESET_OPTIONS.find((opt) => opt.value === preset)?.label ?? 'Tanlang';
};
