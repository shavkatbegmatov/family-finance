import { useMemo } from 'react';
import { MarkerType } from '@xyflow/react';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type {
  HouseholdTreeResponse,
  HouseholdNodeData,
  HouseholdEdgeDto,
  HouseholdNodeDto,
} from '../types';

export const HOUSEHOLD_NODE_WIDTH = 280;
const X_GAP = 64;
/** Qator ostidagi edge-yo'laklar zonasi — qatorlar orasidagi kafolatlangan bo'sh joy. */
const EDGE_ZONE = 150;
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
 * ostiga intiladi) + <b>track-routing</b>: har qator ostida balandligi kartalarning
 * haqiqiy (kontentdan hisoblangan) bo'yiga qarab ochiladigan EDGE_ZONE bor — undagi
 * gorizontal segmentlar kesishsa alohida yo'lak oladi va hech qachon ustma-ust
 * yotmaydi.</p>
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

    const byId = new Map(households.map((h) => [h.familyUnitId, h]));
    const level = computeLevels(unitIds, validEdges);

    // Har qatorning Y koordinatasi kumulyativ: qator boshlanishi = oldingi qator
    // boshlanishi + o'sha qatordagi ENG BALAND karta + EDGE_ZONE. Shunda yo'laklar
    // hech qachon karta ichiga tushmaydi (eski xato: fiks 440px gap baland
    // kartalarda yo'laklarni kartaga siqib, clamp hammasini bitta chiziqqa
    // yig'ib yuborardi).
    const rowMaxHeight = new Map<number, number>();
    unitIds.forEach((id) => {
      const lvl = level.get(id) ?? 0;
      const h = estimateNodeHeight(byId.get(id));
      rowMaxHeight.set(lvl, Math.max(rowMaxHeight.get(lvl) ?? 0, h));
    });
    const levels = [...rowMaxHeight.keys()].sort((a, b) => a - b);
    const levelY = new Map<number, number>();
    let cursorY = 0;
    levels.forEach((lvl) => {
      levelY.set(lvl, cursorY);
      cursorY += (rowMaxHeight.get(lvl) ?? 200) + EDGE_ZONE;
    });

    const positions = computePositions(unitIds, level, validEdges, levelY);

    const nodes: ReactFlowNode[] = unitIds.map((id) => ({
      id: `unit_${id}`,
      type: 'householdNode',
      position: positions.get(id) ?? { x: 0, y: 0 },
      data: { household: byId.get(id)! } satisfies HouseholdNodeData,
    }));

    const getX = (id: number) => positions.get(id)?.x ?? 0;

    // ================= Edge routing: track assignment =================
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
        targetY: levelY.get(targetLvl) ?? 0,
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
      // Yo'laklar zonasi: qator kartalarining pastidan keyingi qatorgacha.
      const zoneTop = (levelY.get(srcLvl) ?? 0) + (rowMaxHeight.get(srcLvl) ?? 200) + 28;
      sorted.forEach((it) => {
        const zoneBottom = it.targetY - 36; // marker + handle uchun joy
        const step =
          trackCount > 1
            ? Math.min(24, Math.max(12, (zoneBottom - zoneTop) / (trackCount - 1)))
            : 0;
        const routingY = Math.min(zoneTop + it.track * step, Math.max(zoneTop, zoneBottom));
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

/**
 * Karta balandligini kontentdan baholash (HouseholdNode tuzilishi bilan sinxron):
 * header (~37) + padding + ota-ona chiplari (44px + 6px oraliq) + farzand
 * avatar qatorlari (54px + 8px oraliq, qatorda 4 ta). ±10px xato zarar qilmaydi —
 * yo'laklar zonasi baribir kartadan pastda ochiladi.
 */
function estimateNodeHeight(h: HouseholdNodeDto | undefined): number {
  if (!h) return 200;
  const parents = h.parents.length;
  const children = h.children.length;
  const parentsBlock = parents > 0 ? parents * 44 + (parents - 1) * 6 : 16;
  const childRows = children > 0 ? Math.ceil(children / 4) : 0;
  const childrenBlock = childRows > 0 ? 12 + 18 + childRows * 54 + (childRows - 1) * 8 : 0;
  return 4 + 37 + 24 + 18 + parentsBlock + childrenBlock;
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
  levelY: Map<number, number>,
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
    positions.set(id, {
      x: xOf.get(id) ?? 0,
      y: levelY.get(level.get(id) ?? 0) ?? 0,
    });
  });
  return positions;
}
