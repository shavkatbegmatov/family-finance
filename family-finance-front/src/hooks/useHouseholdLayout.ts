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
 * Xonadon-markazli generational (avlodli) layout.
 *
 * <p>relatives-tree shaxs-markazli va DAG'ni qo'llab-quvvatlamaydi (bir xonadon ikki
 * ota-xonadondan kelishi mumkin). Shuning uchun qo'lda: longest-path leveling
 * (level(to) = max(level(from)+1)) + har avlodni gorizontal markazlash.</p>
 */
export function useHouseholdLayout(data: HouseholdTreeResponse | null): LayoutResult {
  return useMemo(() => {
    if (!data || data.households.length === 0) {
      return EMPTY;
    }

    const { households, edges } = data;
    const scopeIds = households.map((h) => h.scopeId);
    const validIds = new Set(scopeIds);
    const validEdges = edges.filter(
      (e) => validIds.has(e.fromScopeId) && validIds.has(e.toScopeId),
    );

    const level = computeLevels(scopeIds, validEdges);
    const positions = computePositions(scopeIds, level);

    const householdById = new Map(households.map((h) => [h.scopeId, h]));
    const nodes: ReactFlowNode[] = scopeIds.map((id) => ({
      id: `household_${id}`,
      type: 'householdNode',
      position: positions.get(id) ?? { x: 0, y: 0 },
      data: { household: householdById.get(id)! } satisfies HouseholdNodeData,
    }));

    const rfEdges: ReactFlowEdge[] = validEdges.map((e, idx) => ({
      id: `hh_edge_${idx}`,
      type: 'smoothstep',
      source: `household_${e.fromScopeId}`,
      target: `household_${e.toScopeId}`,
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      style: { strokeWidth: 2, stroke: 'oklch(var(--bc) / 0.35)' },
    }));

    return { nodes, edges: rfEdges, isLayouting: false };
  }, [data]);
}

/** Longest-path leveling — DAG bo'lmasa ham N iteratsiyada to'xtaydi (sikl himoyasi). */
function computeLevels(scopeIds: number[], edges: HouseholdEdgeDto[]): Map<number, number> {
  const level = new Map<number, number>();
  scopeIds.forEach((id) => level.set(id, 0));

  for (let i = 0; i < scopeIds.length; i++) {
    let changed = false;
    for (const e of edges) {
      const candidate = (level.get(e.fromScopeId) ?? 0) + 1;
      if (candidate > (level.get(e.toScopeId) ?? 0)) {
        level.set(e.toScopeId, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return level;
}

/** Har avlodni alohida gorizontal qatorga, markazlashtirib joylaydi. */
function computePositions(scopeIds: number[], level: Map<number, number>): Map<number, Position> {
  const byLevel = new Map<number, number[]>();
  scopeIds.forEach((id) => {
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
