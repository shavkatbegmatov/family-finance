import type { ColorBy, LegendItem } from '../types';

const TITLES: Record<ColorBy, string> = {
  gender: 'Jins',
  generation: 'Avlod',
  surname: 'Familiya',
  clan: 'Xonadon',
};

/** Faol rang-guruh rejimining legendasi (videodagi "COMMUNITIES" kabi). */
export function Graph3DLegend({ items, colorBy }: { items: LegendItem[]; colorBy: ColorBy }) {
  if (items.length === 0) return null;
  return (
    <div className="absolute bottom-3 left-3 z-10 max-w-[180px] rounded-lg bg-base-200/80 p-2 text-xs shadow-sm backdrop-blur">
      <div className="mb-1 font-medium text-base-content/70">{TITLES[colorBy]}</div>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-base-content/80">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Graph3DLegend;
