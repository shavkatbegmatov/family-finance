import type { ColorBy, ColorScale, GraphNode, GraphTheme, LegendItem } from '../types';

// Kategorik palitra (familiya / xonadon uchun) — barqaror, hash bo'yicha tayinlanadi.
const CATEGORICAL = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];
const GREY = '#9ca3af';

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function categorical(key: string): string {
  return CATEGORICAL[hashString(key) % CATEGORICAL.length];
}

// Avlod chuqurligi → teal→binafsha ramp (CSS hsl — three va DOM ikkalasi tushunadi).
function generationColor(gen: number, maxGen: number): string {
  const t = maxGen <= 0 ? 0 : Math.min(1, gen / maxGen);
  return `hsl(${Math.round(200 + t * 120)}, 70%, 55%)`;
}

/** Faol `colorBy` rejimi uchun rang funksiyasi + legend elementlarini qaytaradi. */
export function getColorScale(colorBy: ColorBy, nodes: GraphNode[], theme: GraphTheme): ColorScale {
  switch (colorBy) {
    case 'generation': {
      const maxGen = nodes.reduce((m, n) => Math.max(m, n.generation), 0);
      const cap = Math.min(maxGen, 7);
      const legend: LegendItem[] = [];
      for (let g = 0; g <= cap; g++) {
        legend.push({ color: generationColor(g, maxGen), label: g === 0 ? 'Ildiz avlodi' : `${g}-qatlam` });
      }
      if (maxGen > cap) legend.push({ color: generationColor(maxGen, maxGen), label: `…${maxGen}-qatlam` });
      return { colorOf: (n) => generationColor(n.generation, maxGen), legend };
    }

    case 'surname': {
      const counts = new Map<string, number>();
      let hasEmpty = false;
      nodes.forEach((n) => {
        const key = n.lastName?.trim();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
        else hasEmpty = true;
      });
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      const legend: LegendItem[] = top.map(([name]) => ({ color: categorical(name), label: name }));
      if (counts.size > top.length || hasEmpty) legend.push({ color: GREY, label: 'Boshqalar' });
      return {
        colorOf: (n) => (n.lastName?.trim() ? categorical(n.lastName.trim()) : GREY),
        legend,
      };
    }

    case 'household': {
      const ids = new Set<number>();
      let hasUnscoped = false;
      nodes.forEach((n) => (n.scopeId != null ? ids.add(n.scopeId) : (hasUnscoped = true)));
      const legend: LegendItem[] = [...ids]
        .slice(0, 10)
        .map((id) => ({ color: categorical(`scope_${id}`), label: `Xonadon #${id}` }));
      if (hasUnscoped) legend.push({ color: GREY, label: "Bog'lanmagan" });
      return {
        colorOf: (n) => (n.scopeId != null ? categorical(`scope_${n.scopeId}`) : GREY),
        legend,
      };
    }

    case 'gender':
    default:
      return {
        colorOf: (n) =>
          n.gender === 'MALE' ? theme.male : n.gender === 'FEMALE' ? theme.female : theme.unknown,
        legend: [
          { color: theme.male, label: 'Erkak' },
          { color: theme.female, label: 'Ayol' },
          { color: theme.unknown, label: 'Boshqa' },
        ],
      };
  }
}
