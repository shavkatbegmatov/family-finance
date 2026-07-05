import { useMemo } from 'react';
import { MarkerType } from '@xyflow/react';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type { HouseholdTreeResponse, HouseholdNodeData, HouseholdEdgeDto } from '../types';

export const HOUSEHOLD_NODE_WIDTH = 280;
const X_GAP = 64;
const Y_LEVEL_GAP = 440;
/** Edge gorizontal segmenti node pastidan qancha pastda boshlanadi (taxminiy node bo'yi). */
const EDGE_START_OFFSET = 180;
/** Bir track'dagi segmentlar orasidagi minimal gorizontal bo'shliq. */
const TRACK_CLEARANCE = 24;

interface LayoutResult {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  isLayouting: boolean;
}

interface Position {
  x: number;
  y: number;
}

const EMPTY: LayoutResult = { nodes: [], edges: [], isLayouting: false };

/**
 * FamilyUnit-markazli generational (avlodli) layout.
 *
 * <p>Har tugun — bitta nikoh (FamilyUnit). relatives-tree shaxs-markazli va DAG'ni
 * qo'llab-quvvatlamaydi (bir oila ikki ota-oiladan keladi). Shuning uchun qo'lda:
 * longest-path leveling + <b>barycenter tartiblash</b> (bola xonadoni ota xonadoni
 * ostiga intiladi — uzun ko'ndalang chiziqlar kamayadi) + edge'lar uchun
 * <b>track-routing</b> (bir qatordagi gorizontal segmentlar kesishsa alohida
 * balandlik oladi — chiziqlar bir-birini to'smaydi).</p>
 */
export function useHouseholdLayout(data: HouseholdTreeResponse | null): LayoutResult {
  return useMemo(() => {
    if (!data || data.households.length === 0) {
      return EMPTY;
    }

    const { households, edges } = data;
    const unitIds = households.map((h) => h.familyUnitId);
    const validIds = new Set(unitIds);
    const validEdges = edges.filter(
      (e) => validIds.has(e.fromUnitId) && validIds.has(e.toUnitId),
    );

    const level = computeLevels(unitIds, validEdges);
    const positions = computePositions(unitIds, level, validEdges);

    const byId = new Map(households.map((h) => [h.familyUnitId, h]));
    const nodes: ReactFlowNode[] = unitIds.map((id) => ({
      id: `unit_${id}`,
      type: 'householdNode',
      position: positions.get(id) ?? { x: 0, y: 0 },
      data: { household: byId.get(id)! } satisfies HouseholdNodeData,
    }));

    const getX = (id: number) => positions.get(id)?.x ?? 0;

    // ================= Edge routing: track assignment =================
    // Har source-qator uchun edge'larning gorizontal segmentlari hisoblanadi;
    // kesishadigan segmentlar alohida "track" (balandlik) oladi — natijada
    // chiziqlar hech qachon bitta gorizontalda ustma-ust yotmaydi.
    const edgeRoutingInfo = new Map<number, { targetHandle: string; routingY: number }>();

    interface RoutedEdge {
      idx: number; // validEdges'dagi indeks
      targetHandle: string;
      segMin: number;
      segMax: number;
      targetY: number;
      track: number;
    }

    const edgesBySourceLevel = new Map<number, RoutedEdge[]>();
    validEdges.forEach((e, idx) => {
      const srcLvl = level.get(e.fromUnitId) ?? 0;
      const toUnit = byId.get(e.toUnitId);
      const viaPartner = toUnit?.parents.find((p) => p.personId === e.viaChildPersonId);
      const isRight = viaPartner?.gender === 'FEMALE';
      // Handle'lar HouseholdNode'da: source pastki markaz, target top 25%/75%
      const sx = getX(e.fromUnitId) + HOUSEHOLD_NODE_WIDTH / 2;
      const tx = getX(e.toUnitId) + HOUSEHOLD_NODE_WIDTH * (isRight ? 0.75 : 0.25);
      const targetLvl = level.get(e.toUnitId) ?? srcLvl + 1;

      const list = edgesBySourceLevel.get(srcLvl) ?? [];
      list.push({
        idx,
        targetHandle: isRight ? 'hh-top-right' : 'hh-top-left',
        segMin: Math.min(sx, tx),
        segMax: Math.max(sx, tx),
        targetY: targetLvl * Y_LEVEL_GAP,
        track: 0,
      });
      edgesBySourceLevel.set(srcLvl, list);
    });

    edgesBySourceLevel.forEach((levelEdges, srcLvl) => {
      // Greedy interval coloring: segment boshi bo'yicha sortlab, birinchi
      // "bo'sh" track'ka joylash — kesishmaganlar bitta balandlikda qoladi.
      const sorted = [...levelEdges].sort(
        (a, b) => a.segMin - b.segMin || a.segMax - b.segMax,
      );
      const trackEnds: number[] = [];
      sorted.forEach((it) => {
        let t = trackEnds.findIndex((end) => it.segMin > end + TRACK_CLEARANCE);
        if (t === -1) {
          t = trackEnds.length;
          trackEnds.push(it.segMax);
        } else {
          trackEnds[t] = it.segMax;
        }
        it.track = t;
      });

      const trackCount = trackEnds.length;
      const startY = srcLvl * Y_LEVEL_GAP + EDGE_START_OFFSET;
      sorted.forEach((it) => {
        const minY = startY + 32;
        const maxY = it.targetY - 40;
        const step =
          trackCount > 1
            ? Math.min(26, Math.max(10, (maxY - minY) / (trackCount - 1)))
            : 0;
        const routingY = Math.min(minY + it.track * step, Math.max(minY, maxY));
        edgeRoutingInfo.set(it.idx, { targetHandle: it.targetHandle, routingY });
      });
    });

    const rfEdges: ReactFlowEdge[] = validEdges.map((e, idx) => {
      const info = edgeRoutingInfo.get(idx);
      return {
        id: `hh_edge_${idx}`,
        type: 'householdEdge',
        source: `unit_${e.fromUnitId}`,
        target: `unit_${e.toUnitId}`,
        targetHandle: info?.targetHandle ?? 'hh-top-left',
        data: { routingY: info?.routingY },
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { strokeWidth: 2, stroke: 'oklch(var(--bc) / 0.35)' },
      };
    });

    return { nodes, edges: rfEdges, isLayouting: false };
  }, [data]);
}

/** Longest-path leveling — DAG bo'lmasa ham N iteratsiyada to'xtaydi (sikl himoyasi). */
function computeLevels(unitIds: number[], edges: HouseholdEdgeDto[]): Map<number, number> {
  const level = new Map<number, number>();
  unitIds.forEach((id) => level.set(id, 0));

  for (let i = 0; i < unitIds.length; i++) {
    let changed = false;
    for (const e of edges) {
      const candidate = (level.get(e.fromUnitId) ?? 0) + 1;
      if (candidate > (level.get(e.toUnitId) ?? 0)) {
        level.set(e.toUnitId, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return level;
}

/**
 * Har avlodni alohida gorizontal qatorga joylaydi. Qator ichidagi tartib —
 * <b>barycenter heuristikasi</b>: har xonadon ota xonadon(lar)ining o'rtacha X'i
 * ostiga intiladi (pastga o'tish), keyin farzand xonadonlari o'rtasiga (yuqoriga
 * o'tish) — bir necha sweep. Bu chiziqlarni iloji boricha vertikal qiladi va
 * kesishishlarni keskin kamaytiradi (klassik Sugiyama qatlamli yondashuvi).
 */
function computePositions(
  unitIds: number[],
  level: Map<number, number>,
  edges: HouseholdEdgeDto[],
): Map<number, Position> {
  const byLevel = new Map<number, number[]>();
  unitIds.forEach((id) => {
    const lvl = level.get(id) ?? 0;
    const row = byLevel.get(lvl) ?? [];
    row.push(id);
    byLevel.set(lvl, row);
  });

  const parentsOf = new Map<number, number[]>();
  const childrenOf = new Map<number, number[]>();
  edges.forEach((e) => {
    parentsOf.set(e.toUnitId, [...(parentsOf.get(e.toUnitId) ?? []), e.fromUnitId]);
    childrenOf.set(e.fromUnitId, [...(childrenOf.get(e.fromUnitId) ?? []), e.toUnitId]);
  });

  const widthStep = HOUSEHOLD_NODE_WIDTH + X_GAP;
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const maxPerLevel = Math.max(...[...byLevel.values()].map((arr) => arr.length));
  const totalWidth = maxPerLevel * widthStep;

  const xOf = new Map<number, number>();
  const applyX = (lvl: number) => {
    const ids = byLevel.get(lvl) ?? [];
    const offsetX = (totalWidth - ids.length * widthStep) / 2;
    ids.forEach((id, i) => xOf.set(id, offsetX + i * widthStep));
  };
  levels.forEach(applyX);

  const reorder = (lvl: number, neighborsOf: Map<number, number[]>) => {
    const ids = byLevel.get(lvl) ?? [];
    if (ids.length < 2) return;
    const key = new Map<number, number>();
    ids.forEach((id) => {
      const ns = neighborsOf.get(id) ?? [];
      const xs = ns
        .map((n) => xOf.get(n))
        .filter((v): v is number => v != null);
      key.set(
        id,
        xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : xOf.get(id) ?? 0,
      );
    });
    ids.sort((a, b) => (key.get(a) ?? 0) - (key.get(b) ?? 0) || a - b);
    applyX(lvl);
  };

  // 2 to'liq sweep (pastga: otalar bo'yicha; yuqoriga: farzandlar bo'yicha) +
  // yakuniy pastga o'tish — kichik graflar uchun barqaror yaqinlashadi.
  for (let pass = 0; pass < 2; pass++) {
    for (let li = 1; li < levels.length; li++) reorder(levels[li], parentsOf);
    for (let li = levels.length - 2; li >= 0; li--) reorder(levels[li], childrenOf);
  }
  for (let li = 1; li < levels.length; li++) reorder(levels[li], parentsOf);

  const positions = new Map<number, Position>();
  unitIds.forEach((id) => {
    positions.set(id, { x: xOf.get(id) ?? 0, y: (level.get(id) ?? 0) * Y_LEVEL_GAP });
  });
  return positions;
}
