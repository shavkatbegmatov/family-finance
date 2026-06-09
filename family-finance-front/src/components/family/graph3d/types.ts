// 3D force-graf modulining umumiy tiplari.
// MUHIM: bu fayl runtime'da `three` yoki `react-force-graph-3d` ni import QILMAYDI
// (faqat `import type` — u kompilyatsiyada o'chiriladi), shunda lazy-chunk chegarasi buzilmaydi.
import type { Gender } from '../../../types';
import type { RendererKind, ColorBy } from '../../../store/familyTreeStore';

export type { RendererKind, ColorBy };

export type NodeKind = 'person' | 'household';
export type LinkRel = 'spouse' | 'parent-child' | 'household-lineage';

/** Force-grafdagi tugun (person yoki xonadon). Koordinatalarni force-engine to'ldiradi. */
export interface GraphNode {
  id: string; // "person_<personId>" | "unit_<familyUnitId>"
  kind: NodeKind;
  refId: number; // personId yoki familyUnitId
  label: string;
  gender?: Gender;
  lastName?: string;
  scopeId?: number;
  generation: number; // ildizdan BFS chuqurlik (rang uchun)
  avatar?: string;
  deceased?: boolean;
  // force-engine tomonidan in-place qo'shiladi:
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  rel: LinkRel;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** daisyUI mavzusidan yechilgan aniq ranglar (hex) — WebGL oklch/hsl o'zgaruvchini o'qiy olmaydi. */
export interface GraphTheme {
  background: string;
  nodeDefault: string;
  root: string;
  link: string;
  label: string;
  male: string;
  female: string;
  unknown: string;
  isDark: boolean;
}

export interface LegendItem {
  color: string;
  label: string;
}

export interface ColorScale {
  colorOf: (node: GraphNode) => string;
  legend: LegendItem[];
}
