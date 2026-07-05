import { useMemo } from 'react';
import { MarkerType } from '@xyflow/react';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type {
  HouseholdTreeResponse,
  HouseholdNodeData,
  HouseholdEdgeDto,
} from '../types';
import {
  childHandleId,
  childHandleLeft,
  nodeHeight,
  nodeWidth,
} from '../components/family/flow/nodes/householdMetrics';

const X_GAP = 64;
/** Qator ostidagi edge-yo'laklar zonasi — qatorlar orasidagi kafolatlangan bo'sh joy. */
const EDGE_ZONE = 150;
/** Bir track'dagi segmentlar orasidagi minimal gorizontal bo'shliq. */
const TRACK_CLEARANCE = 24;

/**
 * Chiziq ranglari: har SOURCE xonadonga bitta muted hue; shu xonadonning
 * farzand chiziqlari lightness bo'yicha yaqin gradient oladi. Dark/light
 * themega mos, past saturatsiya — "bachkana" bo'lmaydi.
 */
const EDGE_HUES: Array<{ h: number; s: number }> = [
  { h: 215, s: 42 }, // moviy
  { h: 168, s: 38 }, // teal
  { h: 276, s: 34 }, // binafsha
  { h: 28, s: 46 },  // amber
  { h: 336, s: 36 }, // pushti
  { h: 192, s: 42 }, // cyan
  { h: 96, s: 30 },  // olive
  { h: 252, s: 34 }, // indigo
];

function edgeColor(hueIdx: number, childIdx: number): string {
  const { h, s } = EDGE_HUES[hueIdx % EDGE_HUES.length];
  const l = 52 + (childIdx % 3) * 7; // bitta xonadon ichida yaqin gradient
  return `hsl(${h} ${s}% ${l}% / 0.8)`;
}

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
 * <p>Har tugun — bitta nikoh (FamilyUnit). Qo'lda Sugiyama-uslub: longest-path
 * leveling + barycenter tartiblash (kenglik-aware — kartalar har xil enli) +
 * track-routing (gorizontal segmentlar kesishsa alohida yo'lak). Har farzand
 * chizig'i O'Z avatari tagidagi handle'dan chiqadi; kesishish nuqtalari uchun
 * ko'prikcha (hop) koordinatalari va tutashish tugunlari ham shu yerda
 * hisoblanadi.</p>
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
    const widthOf = (id: number) => nodeWidth(byId.get(id));
    const heightOf = (id: number) => nodeHeight(byId.get(id));

    // Qator Y'lari kumulyativ: qator boshlanishi = oldingi qator boshlanishi +
    // o'sha qatordagi ENG BALAND karta + EDGE_ZONE (yo'laklar kartaga tegmaydi).
    const rowMaxHeight = new Map<number, number>();
    unitIds.forEach((id) => {
      const lvl = level.get(id) ?? 0;
      rowMaxHeight.set(lvl, Math.max(rowMaxHeight.get(lvl) ?? 0, heightOf(id)));
    });
    const levels = [...rowMaxHeight.keys()].sort((a, b) => a - b);
    const levelY = new Map<number, number>();
    let cursorY = 0;
    levels.forEach((lvl) => {
      levelY.set(lvl, cursorY);
      cursorY += (rowMaxHeight.get(lvl) ?? 200) + EDGE_ZONE;
    });

    const positions = computePositions(unitIds, level, validEdges, levelY, widthOf);

    const nodes: ReactFlowNode[] = unitIds.map((id) => ({
      id: `unit_${id}`,
      type: 'householdNode',
      position: positions.get(id) ?? { x: 0, y: 0 },
      data: { household: byId.get(id)! } satisfies HouseholdNodeData,
    }));

    const getX = (id: number) => positions.get(id)?.x ?? 0;

    // Rang: har source xonadonga barqaror hue (sortlangan unikal ro'yxat indeksi).
    const sourceUnitIds = [...new Set(validEdges.map((e) => e.fromUnitId))].sort((a, b) => a - b);
    const hueOf = new Map(sourceUnitIds.map((id, i) => [id, i]));

    // ============ Edge geometriyasi (routing uchun yagona manba) ============
    interface EdgeGeom {
      idx: number;
      sourceHandle: string;
      targetHandle: string;
      color: string;
      sx: number; // source handle X
      sy: number; // source node pastki cheti Y (taxminiy)
      tx: number; // target handle X
      ty: number; // target node yuqori cheti Y
      segMin: number;
      segMax: number;
      routingY: number;
      junction: boolean;
    }

    const geoms: EdgeGeom[] = validEdges.map((e, idx) => {
      const fromUnit = byId.get(e.fromUnitId);
      const toUnit = byId.get(e.toUnitId);
      const srcLvl = level.get(e.fromUnitId) ?? 0;
      const targetLvl = level.get(e.toUnitId) ?? srcLvl + 1;

      // Source: farzandning O'Z handle'i (avatari tagidan chiqadi)
      const childIdx = fromUnit?.children.findIndex((c) => c.personId === e.viaChildPersonId) ?? -1;
      const sourceHandle = childIdx >= 0 ? childHandleId(e.viaChildPersonId) : 'hh-bottom';
      const sx =
        getX(e.fromUnitId) +
        (childIdx >= 0 ? childHandleLeft(childIdx) : widthOf(e.fromUnitId) / 2);

      // Target: yangi xonadonda bu shaxs ota (chap) yoki ona (o'ng)
      const viaPartner = toUnit?.parents.find((p) => p.personId === e.viaChildPersonId);
      const isRight = viaPartner?.gender === 'FEMALE';
      const tx = getX(e.toUnitId) + widthOf(e.toUnitId) * (isRight ? 0.75 : 0.25);

      return {
        idx,
        sourceHandle,
        targetHandle: isRight ? 'hh-top-right' : 'hh-top-left',
        color: edgeColor(hueOf.get(e.fromUnitId) ?? 0, Math.max(childIdx, 0)),
        sx,
        sy: (levelY.get(srcLvl) ?? 0) + heightOf(e.fromUnitId),
        tx,
        ty: levelY.get(targetLvl) ?? 0,
        segMin: Math.min(sx, tx),
        segMax: Math.max(sx, tx),
        routingY: 0,
        junction: false,
      };
    });

    // ============ Track assignment (source-qator bo'yicha) ============
    const bySourceLevel = new Map<number, EdgeGeom[]>();
    geoms.forEach((g) => {
      const srcLvl = level.get(validEdges[g.idx].fromUnitId) ?? 0;
      const list = bySourceLevel.get(srcLvl) ?? [];
      list.push(g);
      bySourceLevel.set(srcLvl, list);
    });

    bySourceLevel.forEach((levelEdges, srcLvl) => {
      const sorted = [...levelEdges].sort(
        (a, b) => a.segMin - b.segMin || a.segMax - b.segMax,
      );
      const trackEnds: number[] = [];
      const trackIdxOf = new Map<EdgeGeom, number>();
      sorted.forEach((g) => {
        let t = trackEnds.findIndex((end) => g.segMin > end + TRACK_CLEARANCE);
        if (t === -1) {
          t = trackEnds.length;
          trackEnds.push(g.segMax);
        } else {
          trackEnds[t] = g.segMax;
        }
        trackIdxOf.set(g, t);
      });

      const trackCount = trackEnds.length;
      const zoneTop = (levelY.get(srcLvl) ?? 0) + (rowMaxHeight.get(srcLvl) ?? 200) + 28;
      sorted.forEach((g) => {
        const zoneBottom = g.ty - 36; // marker + handle uchun joy
        const step =
          trackCount > 1
            ? Math.min(24, Math.max(12, (zoneBottom - zoneTop) / (trackCount - 1)))
            : 0;
        g.routingY = Math.min(
          zoneTop + (trackIdxOf.get(g) ?? 0) * step,
          Math.max(zoneTop, zoneBottom),
        );
      });
    });

    // ============ Tutashish tugunlari ============
    // Bir handle'dan (bitta farzanddan) 2+ chiziq chiqsa — ayrilish nuqtasida tugun.
    const bySourceHandle = new Map<string, EdgeGeom[]>();
    geoms.forEach((g) => {
      const key = `${validEdges[g.idx].fromUnitId}:${g.sourceHandle}`;
      const list = bySourceHandle.get(key) ?? [];
      list.push(g);
      bySourceHandle.set(key, list);
    });
    bySourceHandle.forEach((list) => {
      if (list.length > 1) list.forEach((g) => { g.junction = true; });
    });

    // ============ Ko'prikchalar (hop) ============
    // Barcha kesishishlar orthogonal: MENING gorizontal segmentim × BOSHQA
    // edge'ning vertikal segmenti. Konventsiya: gorizontal chiziq vertikal
    // USTIDAN sakraydi. Vertikal segmentlar: source tushishi (sx, sy..routingY)
    // va target tushishi (tx, routingY..ty).
    const verticals = geoms.flatMap((g) => [
      { owner: g.idx, x: g.sx, y1: g.sy, y2: g.routingY },
      { owner: g.idx, x: g.tx, y1: g.routingY, y2: g.ty },
    ]);
    const hopsOf = new Map<number, number[]>();
    const EPS = 10; // burchak radiusi/handle atrofini hopdan chetlash
    geoms.forEach((g) => {
      if (g.segMax - g.segMin < EPS * 2) return;
      const hops = verticals
        .filter(
          (v) =>
            v.owner !== g.idx &&
            v.x > g.segMin + EPS &&
            v.x < g.segMax - EPS &&
            g.routingY > Math.min(v.y1, v.y2) + 2 &&
            g.routingY < Math.max(v.y1, v.y2) - 2,
        )
        .map((v) => v.x);
      if (hops.length > 0) {
        // Yaqin (dublikat) kesishishlarni birlashtirib, chizish tartibida sortlash
        const uniq = [...new Set(hops.map((x) => Math.round(x)))].sort((a, b) => a - b);
        hopsOf.set(g.idx, uniq);
      }
    });

    const rfEdges: ReactFlowEdge[] = validEdges.map((e, idx) => {
      const g = geoms[idx];
      return {
        id: `hh_edge_${idx}`,
        type: 'householdEdge',
        source: `unit_${e.fromUnitId}`,
        target: `unit_${e.toUnitId}`,
        sourceHandle: g.sourceHandle,
        targetHandle: g.targetHandle,
        data: {
          routingY: g.routingY,
          hops: hopsOf.get(idx) ?? [],
          junction: g.junction,
          color: g.color,
        },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: g.color },
        style: { strokeWidth: 2, stroke: g.color },
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
 * Har avlodni alohida qatorga joylaydi (kartalar har xil ENLI — kumulyativ X).
 * Qator ichidagi tartib — barycenter heuristikasi: har xonadon ota
 * xonadon(lar)i MARKAZLARINING o'rtachasiga intiladi (pastga o'tish), keyin
 * farzand xonadonlari o'rtasiga (yuqoriga o'tish) — bir necha sweep.
 */
function computePositions(
  unitIds: number[],
  level: Map<number, number>,
  edges: HouseholdEdgeDto[],
  levelY: Map<number, number>,
  widthOf: (id: number) => number,
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

  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const rowWidth = (ids: number[]) =>
    ids.reduce((s, id) => s + widthOf(id), 0) + Math.max(0, ids.length - 1) * X_GAP;
  const globalWidth = Math.max(...levels.map((l) => rowWidth(byLevel.get(l) ?? [])));

  const xOf = new Map<number, number>();
  const applyX = (lvl: number) => {
    const ids = byLevel.get(lvl) ?? [];
    let cursor = (globalWidth - rowWidth(ids)) / 2;
    ids.forEach((id) => {
      xOf.set(id, cursor);
      cursor += widthOf(id) + X_GAP;
    });
  };
  levels.forEach(applyX);

  const centerOf = (id: number) => (xOf.get(id) ?? 0) + widthOf(id) / 2;

  const reorder = (lvl: number, neighborsOf: Map<number, number[]>) => {
    const ids = byLevel.get(lvl) ?? [];
    if (ids.length < 2) return;
    const key = new Map<number, number>();
    ids.forEach((id) => {
      const ns = neighborsOf.get(id) ?? [];
      const cs = ns.map(centerOf);
      key.set(id, cs.length > 0 ? cs.reduce((a, b) => a + b, 0) / cs.length : centerOf(id));
    });
    ids.sort((a, b) => (key.get(a) ?? 0) - (key.get(b) ?? 0) || a - b);
    applyX(lvl);
  };

  // 2 to'liq sweep (pastga: otalar; yuqoriga: farzandlar) + yakuniy pastga o'tish.
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
