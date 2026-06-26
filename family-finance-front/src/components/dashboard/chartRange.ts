// Chart range options — daromad/xarajat trend grafigi uchun (3m/6m/12m).
export type ChartRange = '3m' | '6m' | '12m';

export const RANGE_LABELS: Record<ChartRange, { short: string; long: string; months: number }> = {
  '3m': { short: '3 oy', long: 'Oxirgi 3 oy', months: 3 },
  '6m': { short: '6 oy', long: 'Oxirgi 6 oy', months: 6 },
  '12m': { short: '12 oy', long: 'Oxirgi 12 oy', months: 12 },
};
