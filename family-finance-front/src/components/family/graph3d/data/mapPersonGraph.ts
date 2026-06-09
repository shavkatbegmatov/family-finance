import type { TreeResponse } from '../../../../types';
import type { GraphData, GraphLink, GraphNode } from '../types';

function addToMap(map: Map<number, Set<number>>, a: number, b: number): void {
  let set = map.get(a);
  if (!set) {
    set = new Set();
    map.set(a, set);
  }
  set.add(b);
}

/**
 * `TreeResponse` (persons + familyUnits) → force-graf {nodes, links}.
 * Bog'lanish mantig'i `useRelativesTreeLayout` bilan bir xil: partnerlar orasida
 * `spouse`, har (partner→farzand) uchun `parent-child`. Layout'ni force-engine qiladi.
 * `generation` — ildizdan belgili BFS (ota-ona −1, farzand +1, turmush o'rtoq 0), keyin 0 ga normallashtiriladi.
 */
export function mapPersonGraph(tree: TreeResponse | undefined | null): GraphData {
  if (!tree || tree.persons.length === 0) return { nodes: [], links: [] };
  const { persons, familyUnits, rootPersonId } = tree;
  const validIds = new Set(persons.map((p) => p.id));

  const nodes: GraphNode[] = persons.map((p) => ({
    id: `person_${p.id}`,
    kind: 'person',
    refId: p.id,
    label: p.fullName?.trim() || [p.lastName, p.firstName].filter(Boolean).join(' ').trim() || '—',
    gender: p.gender,
    lastName: p.lastName,
    generation: 0,
    avatar: p.avatar,
    deceased: !!p.deathDate,
  }));

  const links: GraphLink[] = [];
  const seenSpouse = new Set<string>();
  const childrenOf = new Map<number, Set<number>>();
  const parentsOf = new Map<number, Set<number>>();
  const spousesOf = new Map<number, Set<number>>();

  familyUnits.forEach((fu) => {
    const partners = fu.partners.filter((p) => validIds.has(p.personId));
    const children = fu.children.filter((c) => validIds.has(c.personId));

    for (let i = 1; i < partners.length; i++) {
      const a = partners[0].personId;
      const b = partners[i].personId;
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!seenSpouse.has(key)) {
        seenSpouse.add(key);
        links.push({ source: `person_${a}`, target: `person_${b}`, rel: 'spouse' });
      }
      addToMap(spousesOf, a, b);
      addToMap(spousesOf, b, a);
    }

    children.forEach((c) => {
      partners.forEach((par) => {
        links.push({ source: `person_${par.personId}`, target: `person_${c.personId}`, rel: 'parent-child' });
        addToMap(childrenOf, par.personId, c.personId);
        addToMap(parentsOf, c.personId, par.personId);
      });
    });
  });

  // Belgili BFS bilan avlod qatlamini hisoblash.
  const gen = new Map<number, number>();
  if (validIds.has(rootPersonId)) {
    gen.set(rootPersonId, 0);
    const queue = [rootPersonId];
    while (queue.length) {
      const cur = queue.shift()!;
      const g = gen.get(cur)!;
      childrenOf.get(cur)?.forEach((ch) => {
        if (!gen.has(ch)) { gen.set(ch, g + 1); queue.push(ch); }
      });
      parentsOf.get(cur)?.forEach((pa) => {
        if (!gen.has(pa)) { gen.set(pa, g - 1); queue.push(pa); }
      });
      spousesOf.get(cur)?.forEach((sp) => {
        if (!gen.has(sp)) { gen.set(sp, g); queue.push(sp); }
      });
    }
  }
  let min = 0;
  gen.forEach((v) => { if (v < min) min = v; });
  nodes.forEach((n) => { n.generation = (gen.get(n.refId) ?? 0) - min; });

  return { nodes, links };
}
