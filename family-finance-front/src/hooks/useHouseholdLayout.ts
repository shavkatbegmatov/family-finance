import { useMemo } from 'react';
import { MarkerType } from '@xyflow/react';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type { HouseholdTreeResponse, HouseholdNodeData, HouseholdEdgeDto } from '../types';

export const HOUSEHOLD_NODE_WIDTH = 280;
const X_GAP = 64;
const Y_LEVEL_GAP = 440;

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
 * longest-path leveling (level(to) = max(level(from)+1)) + har avlodni gorizontal
 * markazlash.</p>
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
    const positions = computePositions(unitIds, level);

    const byId = new Map(households.map((h) => [h.familyUnitId, h]));
    const nodes: ReactFlowNode[] = unitIds.map((id) => ({
      id: `unit_${id}`,
      type: 'householdNode',
      position: positions.get(id) ?? { x: 0, y: 0 },
      data: { household: byId.get(id)! } satisfies HouseholdNodeData,
    }));

    // Pre-calculate targetHandle and routingY for each edge
    const edgeRoutingInfo = new Map<
      number,
      { targetHandle: string; routingY: number }
    >();

    // Group validEdges by source level
    const edgesBySourceLevel = new Map<number, typeof validEdges>();
    validEdges.forEach((e) => {
      const srcLvl = level.get(e.fromUnitId) ?? 0;
      const list = edgesBySourceLevel.get(srcLvl) ?? [];
      list.push(e);
      edgesBySourceLevel.set(srcLvl, list);
    });

    const getX = (id: number) => positions.get(id)?.x ?? 0;

    // Process each level's edges
    edgesBySourceLevel.forEach((levelEdges, srcLvl) => {
      // Sort edges to minimize crossings (by source X, then target X)
      const sortedEdges = [...levelEdges].sort((a, b) => {
        const ax1 = getX(a.fromUnitId);
        const bx1 = getX(b.fromUnitId);
        if (ax1 !== bx1) return ax1 - bx1;
        return getX(a.toUnitId) - getX(b.toUnitId);
      });

      const count = sortedEdges.length;
      sortedEdges.forEach((e, idx) => {
        // Find target handle based on child gender in the target household
        const toUnit = byId.get(e.toUnitId);
        const viaPartner = toUnit?.parents.find((p) => p.personId === e.viaChildPersonId);
        const targetHandle = viaPartner?.gender === 'FEMALE' ? 'hh-top-right' : 'hh-top-left';

        // Calculate routingY
        const targetLvl = level.get(e.toUnitId) ?? (srcLvl + 1);
        const startY = srcLvl * Y_LEVEL_GAP + 180;
        const targetY = targetLvl * Y_LEVEL_GAP;

        const minY = startY + 40;
        const maxY = targetY - 40;
        const range = maxY - minY;

        let routingY: number;
        if (count > 1 && range > 0) {
          routingY = minY + (idx * range) / (count - 1);
        } else {
          routingY = (startY + targetY) / 2;
        }

        const originalIndex = validEdges.indexOf(e);
        edgeRoutingInfo.set(originalIndex, { targetHandle, routingY });
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

/** Har avlodni alohida gorizontal qatorga, markazlashtirib joylaydi. */
function computePositions(unitIds: number[], level: Map<number, number>): Map<number, Position> {
  const byLevel = new Map<number, number[]>();
  unitIds.forEach((id) => {
    const lvl = level.get(id) ?? 0;
    const row = byLevel.get(lvl) ?? [];
    row.push(id);
    byLevel.set(lvl, row);
  });

  const widthStep = HOUSEHOLD_NODE_WIDTH + X_GAP;
  const maxPerLevel = Math.max(...[...byLevel.values()].map((arr) => arr.length));
  const totalWidth = maxPerLevel * widthStep;

  const positions = new Map<number, Position>();
  [...byLevel.keys()]
    .sort((a, b) => a - b)
    .forEach((lvl) => {
      const ids = byLevel.get(lvl) ?? [];
      const offsetX = (totalWidth - ids.length * widthStep) / 2;
      ids.forEach((id, idx) => {
        positions.set(id, { x: offsetX + idx * widthStep, y: lvl * Y_LEVEL_GAP });
      });
    });
  return positions;
}
