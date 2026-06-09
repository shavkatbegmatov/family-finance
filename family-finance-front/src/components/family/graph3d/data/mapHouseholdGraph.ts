import type { HouseholdTreeResponse } from '../../../../types';
import type { GraphData, GraphLink, GraphNode } from '../types';

/**
 * `HouseholdTreeResponse` (households + edges) → force-graf {nodes, links}.
 * Har xonadon = tugun, har lineage qirrasi = yo'naltirilgan `household-lineage` link.
 * `generation` — kiruvchi qirrasi yo'q xonadon(lar)dan BFS.
 */
export function mapHouseholdGraph(data: HouseholdTreeResponse | undefined | null): GraphData {
  if (!data || data.households.length === 0) return { nodes: [], links: [] };
  const validUnits = new Set(data.households.map((h) => h.familyUnitId));

  const nodes: GraphNode[] = data.households.map((h) => ({
    id: `unit_${h.familyUnitId}`,
    kind: 'household',
    refId: h.familyUnitId,
    label: h.name?.trim() || h.displayCode?.trim() || `Xonadon #${h.familyUnitId}`,
    scopeId: h.scopeId,
    generation: 0,
    deceased: false,
  }));

  const links: GraphLink[] = [];
  const childrenOf = new Map<number, Set<number>>();
  const hasIncoming = new Set<number>();

  data.edges.forEach((e) => {
    if (!validUnits.has(e.fromUnitId) || !validUnits.has(e.toUnitId)) return;
    links.push({ source: `unit_${e.fromUnitId}`, target: `unit_${e.toUnitId}`, rel: 'household-lineage' });
    let set = childrenOf.get(e.fromUnitId);
    if (!set) { set = new Set(); childrenOf.set(e.fromUnitId, set); }
    set.add(e.toUnitId);
    hasIncoming.add(e.toUnitId);
  });

  const gen = new Map<number, number>();
  const roots = data.households.map((h) => h.familyUnitId).filter((id) => !hasIncoming.has(id));
  const queue = roots.length ? [...roots] : data.households.slice(0, 1).map((h) => h.familyUnitId);
  queue.forEach((r) => gen.set(r, 0));
  while (queue.length) {
    const cur = queue.shift()!;
    const g = gen.get(cur)!;
    childrenOf.get(cur)?.forEach((ch) => {
      if (!gen.has(ch)) { gen.set(ch, g + 1); queue.push(ch); }
    });
  }
  nodes.forEach((n) => { n.generation = gen.get(n.refId) ?? 0; });

  return { nodes, links };
}
