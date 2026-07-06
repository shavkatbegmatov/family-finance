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
/** Bir yo'lakdagi segmentlar orasidagi minimal gorizontal bo'shliq. */
const TRACK_CLEARANCE = 24;
/** Kanal (kartalar orasidagi vertikal o'tish) — kartadan minimal chekinish. */
const CHANNEL_MARGIN = 16;
/** Bitta kanaldan o'tuvchi chiziqlar orasidagi minimal masofa. */
const CHANNEL_LANE_GAP = 14;

/**
 * Chiziq ranglari: har SOURCE xonadonga bitta muted hue; shu xonadonning
 * farzand chiziqlari lightness bo'yicha yaqin gradient oladi.
 */
const EDGE_HUES: Array<{ h: number; s: number }> = [
  { h: 215, s: 42 },
  { h: 168, s: 38 },
  { h: 276, s: 34 },
  { h: 28, s: 46 },
  { h: 336, s: 36 },
  { h: 192, s: 42 },
  { h: 96, s: 30 },
  { h: 252, s: 34 },
];

function edgeColor(hueIdx: number, childIdx: number): string {
  const { h, s } = EDGE_HUES[hueIdx % EDGE_HUES.length];
  const l = 52 + (childIdx % 3) * 7;
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
 * FamilyUnit-markazli generational layout (qo'lda Sugiyama uslubi).
 *
 * <p>Chiziq va karta BIR-BIRINI TO'SMAYDI — chunki chiziq faqat ikki turdagi
 * bo'shliqdan yuradi: (1) qatorlar orasidagi EDGE_ZONE (gorizontal yo'laklar,
 * track-coloring bilan ustma-ust tushmaydi) va (2) kartalar orasidagi vertikal
 * KANALLAR (bir necha qatorni kesib o'tuvchi chiziq har oraliq qatordan kanal
 * ichida, boshqa chiziqlardan CHANNEL_LANE_GAP masofada o'tadi). Kesishishlar
 * uchun ko'prikcha (hop) koordinatalari ham shu yerda hisoblanadi.</p>
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

    // Qator Y'lari kumulyativ: keyingi qator = joriy qator + eng baland karta + EDGE_ZONE.
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

    // Rang: har source xonadonga barqaror hue.
    const sourceUnitIds = [...new Set(validEdges.map((e) => e.fromUnitId))].sort((a, b) => a - b);
    const hueOf = new Map(sourceUnitIds.map((id, i) => [id, i]));

    // Qator kanallari uchun: har qatordagi kartalarning [x1,x2] intervallari.
    const rowNodes = new Map<number, Array<{ x1: number; x2: number }>>();
    unitIds.forEach((id) => {
      const lvl = level.get(id) ?? 0;
      const list = rowNodes.get(lvl) ?? [];
      list.push({ x1: getX(id), x2: getX(id) + widthOf(id) });
      rowNodes.set(lvl, list);
    });
    rowNodes.forEach((list) => list.sort((a, b) => a.x1 - b.x1));

    // Kanal band X'lari (qator bo'yicha) — bir kanaldan o'tuvchi chiziqlarni ajratish.
    const usedChannelXs = new Map<number, number[]>();

    /**
     * `lvl` qatorini vertikal kesib o'tish uchun X tanlash: idealX'ga eng yaqin,
     * kartalardan CHANNEL_MARGIN chekingan va shu qatordagi boshqa o'tishlardan
     * kamida CHANNEL_LANE_GAP uzoq bo'lgan nuqta.
     */
    function pickChannelX(lvl: number, idealX: number): number {
      const intervals = rowNodes.get(lvl) ?? [];
      // idealX'ni kartalardan tashqariga surish
      let x = idealX;
      for (const iv of intervals) {
        if (x >= iv.x1 - CHANNEL_MARGIN && x <= iv.x2 + CHANNEL_MARGIN) {
          const leftOut = iv.x1 - CHANNEL_MARGIN;
          const rightOut = iv.x2 + CHANNEL_MARGIN;
          x = Math.abs(idealX - leftOut) <= Math.abs(idealX - rightOut) ? leftOut : rightOut;
        }
      }
      // Band lane'lardan ajratish (ikkala yo'nalishda eng yaqin bo'sh joy)
      const used = usedChannelXs.get(lvl) ?? [];
      const collides = (cx: number) =>
        used.some((u) => Math.abs(u - cx) < CHANNEL_LANE_GAP) ||
        intervals.some((iv) => cx > iv.x1 - CHANNEL_MARGIN && cx < iv.x2 + CHANNEL_MARGIN);
      if (collides(x)) {
        for (let d = CHANNEL_LANE_GAP; d < 4000; d += CHANNEL_LANE_GAP) {
          if (!collides(x - d)) { x = x - d; break; }
          if (!collides(x + d)) { x = x + d; break; }
        }
      }
      used.push(x);
      usedChannelXs.set(lvl, used);
      return x;
    }

    // ============ Marshrutlar (X-yo'l) ============
    interface EdgeRoute {
      idx: number;
      sourceHandle: string;
      targetHandle: string;
      color: string;
      /** X to'xtamlar: [sx, kanal1, kanal2, ..., tx] — zonalar soni = uzunlik-1. */
      xs: number[];
      srcLvl: number;
      targetLvl: number;
      sy: number; // source karta pastki cheti (taxminiy)
      ty: number; // target karta yuqori cheti
      /** Har zona uchun tayinlangan yo'lak Y (keyin to'ldiriladi). */
      zoneYs: number[];
      junction: boolean;
    }

    const routes: EdgeRoute[] = validEdges.map((e, idx) => {
      const fromUnit = byId.get(e.fromUnitId);
      const toUnit = byId.get(e.toUnitId);
      const srcLvl = level.get(e.fromUnitId) ?? 0;
      const targetLvl = Math.max((level.get(e.toUnitId) ?? srcLvl + 1), srcLvl + 1);

      const childIdx = fromUnit?.children.findIndex((c) => c.personId === e.viaChildPersonId) ?? -1;
      const sourceHandle = childIdx >= 0 ? childHandleId(e.viaChildPersonId) : 'hh-bottom';
      const sx =
        getX(e.fromUnitId) +
        (childIdx >= 0 ? childHandleLeft(childIdx) : widthOf(e.fromUnitId) / 2);

      const viaPartner = toUnit?.parents.find((p) => p.personId === e.viaChildPersonId);
      const isRight = viaPartner?.gender === 'FEMALE';
      const tx = getX(e.toUnitId) + widthOf(e.toUnitId) * (isRight ? 0.75 : 0.25);

      // Oraliq qatorlar (srcLvl+1 .. targetLvl-1) kanal orqali kesiladi.
      const xs = [sx];
      for (let L = srcLvl + 1; L < targetLvl; L++) {
        xs.push(pickChannelX(L, tx));
      }
      xs.push(tx);

      return {
        idx,
        sourceHandle,
        targetHandle: isRight ? 'hh-top-right' : 'hh-top-left',
        color: edgeColor(hueOf.get(e.fromUnitId) ?? 0, Math.max(childIdx, 0)),
        xs,
        srcLvl,
        targetLvl,
        sy: (levelY.get(srcLvl) ?? 0) + heightOf(e.fromUnitId),
        ty: levelY.get(targetLvl) ?? 0,
        zoneYs: [],
        junction: false,
      };
    });

    // ============ Zona yo'laklari (track assignment har zona uchun) ============
    // Zona L = L-qator ostidagi bo'shliq. Har route har o'tgan zonasida bitta
    // gorizontal segmentga ega: xs[i] -> xs[i+1] (zona = srcLvl + i).
    interface HSeg {
      route: EdgeRoute;
      zoneIdx: number; // route.zoneYs indeksi
      min: number;
      max: number;
    }
    const segsByZone = new Map<number, HSeg[]>();
    routes.forEach((r) => {
      const zoneCount = r.targetLvl - r.srcLvl;
      r.zoneYs = new Array(zoneCount).fill(0);
      for (let i = 0; i < zoneCount; i++) {
        const zone = r.srcLvl + i;
        const a = r.xs[i];
        const b = r.xs[i + 1];
        const list = segsByZone.get(zone) ?? [];
        list.push({ route: r, zoneIdx: i, min: Math.min(a, b), max: Math.max(a, b) });
        segsByZone.set(zone, list);
      }
    });

    segsByZone.forEach((segs, zone) => {
      const sorted = [...segs].sort((a, b) => a.min - b.min || a.max - b.max);
      const trackEnds: number[] = [];
      const trackOf = new Map<HSeg, number>();
      sorted.forEach((s) => {
        let t = trackEnds.findIndex((end) => s.min > end + TRACK_CLEARANCE);
        if (t === -1) {
          t = trackEnds.length;
          trackEnds.push(s.max);
        } else {
          trackEnds[t] = s.max;
        }
        trackOf.set(s, t);
      });

      const trackCount = trackEnds.length;
      const zoneTop = (levelY.get(zone) ?? 0) + (rowMaxHeight.get(zone) ?? 200) + 28;
      const zoneBottom = (levelY.get(zone + 1) ?? zoneTop + EDGE_ZONE) - 36;
      const step =
        trackCount > 1
          ? Math.min(24, Math.max(12, (zoneBottom - zoneTop) / (trackCount - 1)))
          : 0;
      sorted.forEach((s) => {
        s.route.zoneYs[s.zoneIdx] = Math.min(
          zoneTop + (trackOf.get(s) ?? 0) * step,
          Math.max(zoneTop, zoneBottom),
        );
      });
    });

    // ============ Tutashish tugunlari ============
    const bySourceHandle = new Map<string, EdgeRoute[]>();
    routes.forEach((r) => {
      const key = `${validEdges[r.idx].fromUnitId}:${r.sourceHandle}`;
      const list = bySourceHandle.get(key) ?? [];
      list.push(r);
      bySourceHandle.set(key, list);
    });
    bySourceHandle.forEach((list) => {
      if (list.length > 1) list.forEach((r) => { r.junction = true; });
    });

    // ============ To'liq waypoint'lar va ko'prikchalar ============
    // points: [x,y] juftlari — source'dan target'gacha orthogonal yo'l.
    const pointsOf = new Map<number, Array<[number, number]>>();
    routes.forEach((r) => {
      const pts: Array<[number, number]> = [[r.xs[0], r.sy]];
      r.zoneYs.forEach((y, i) => {
        pts.push([r.xs[i], y]);
        pts.push([r.xs[i + 1], y]);
      });
      pts.push([r.xs[r.xs.length - 1], r.ty]);
      pointsOf.set(r.idx, pts);
    });

    // Segmentlar (hop hisoblash uchun): V = ketma-ket nuqtalar x bir xil; H = y bir xil.
    interface VSeg { owner: number; x: number; y1: number; y2: number }
    const verticals: VSeg[] = [];
    routes.forEach((r) => {
      const pts = pointsOf.get(r.idx)!;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        if (Math.abs(x1 - x2) < 0.5 && Math.abs(y1 - y2) > 1) {
          verticals.push({ owner: r.idx, x: x1, y1: Math.min(y1, y2), y2: Math.max(y1, y2) });
        }
      }
    });

    const EPS = 10;
    const hopsOf = new Map<number, Array<[number, number]>>();
    routes.forEach((r) => {
      const pts = pointsOf.get(r.idx)!;
      const hops: Array<[number, number]> = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        if (Math.abs(y1 - y2) > 0.5 || Math.abs(x1 - x2) < EPS * 2) continue; // faqat H segmentlar
        const min = Math.min(x1, x2);
        const max = Math.max(x1, x2);
        verticals.forEach((v) => {
          if (v.owner === r.idx) return;
          if (v.x > min + EPS && v.x < max - EPS && y1 > v.y1 + 2 && y1 < v.y2 - 2) {
            hops.push([Math.round(v.x), y1]);
          }
        });
      }
      if (hops.length > 0) {
        const uniq = [...new Map(hops.map((h) => [`${h[0]}:${h[1]}`, h])).values()];
        hopsOf.set(r.idx, uniq);
      }
    });

    const rfEdges: ReactFlowEdge[] = validEdges.map((e, idx) => {
      const r = routes[idx];
      return {
        id: `hh_edge_${idx}`,
        type: 'householdEdge',
        source: `unit_${e.fromUnitId}`,
        target: `unit_${e.toUnitId}`,
        sourceHandle: r.sourceHandle,
        targetHandle: r.targetHandle,
        data: {
          points: pointsOf.get(idx),
          hops: hopsOf.get(idx) ?? [],
          junction: r.junction,
          color: r.color,
        },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: r.color },
        style: { strokeWidth: 2, stroke: r.color },
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
 * Qator ichidagi tartib — barycenter heuristikasi (markazlar bo'yicha,
 * pastga/yuqoriga sweep'lar) — chiziqlar iloji boricha vertikal bo'ladi.
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
