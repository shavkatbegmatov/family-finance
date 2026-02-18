import { useCallback, useEffect, useState } from 'react';
import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type {
  TreeResponse,
  TreePerson,
  PersonNodeData,
  FamilyUnitNodeData,
  EdgeRoutePoint,
  EdgeBridgePoint,
  FamilyEdgeKind,
  MarriageEdgeData,
  ChildEdgeData,
} from '../types';

// ============ Constants ============
export const PERSON_NODE_WIDTH = 200;
export const PERSON_NODE_HEIGHT = 140;
export const FAMILY_UNIT_PAIR_NODE_WIDTH = 40;
export const FAMILY_UNIT_PAIR_NODE_HEIGHT = 20;
export const FAMILY_UNIT_BUS_NODE_WIDTH = 12;
export const FAMILY_UNIT_BUS_NODE_HEIGHT = 12;

const MARRIAGE_LANE_GAP = 12;
const CHILD_LANE_GAP = 16;
const BRIDGE_MIN_SPACING = 16;
const CROSSING_EPSILON = 0.5;

const elk = new ELK();

interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlannedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type: 'marriageEdge' | 'childEdge';
  kind: FamilyEdgeKind;
  laneIndex: number;
  laneCount: number;
  marriageType?: MarriageEdgeData['marriageType'];
  status?: MarriageEdgeData['status'];
  lineageType?: ChildEdgeData['lineageType'];
}

interface Segment {
  edgeId: string;
  segmentIndex: number;
  a: EdgeRoutePoint;
  b: EdgeRoutePoint;
  orientation: 'H' | 'V';
}

export function useElkLayout(treeData: TreeResponse | null) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLayouting, setIsLayouting] = useState(false);

  const computeLayout = useCallback(async () => {
    if (!treeData || treeData.persons.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setIsLayouting(true);

    try {
      const personsMap = new Map<number, TreePerson>();
      treeData.persons.forEach((person) => personsMap.set(person.id, person));

      const rootId = treeData.rootPersonId;
      const elkNodes: ElkNode[] = [];
      const elkEdges: ElkExtendedEdge[] = [];
      const addedPersons = new Set<number>();

      treeData.persons.forEach((person) => {
        if (addedPersons.has(person.id)) return;
        addedPersons.add(person.id);

        elkNodes.push({
          id: `person_${person.id}`,
          width: PERSON_NODE_WIDTH,
          height: PERSON_NODE_HEIGHT,
        });
      });

      treeData.familyUnits.forEach((familyUnit) => {
        const pairNodeId = `fu_pair_${familyUnit.id}`;
        const busNodeId = `fu_bus_${familyUnit.id}`;

        elkNodes.push({
          id: pairNodeId,
          width: FAMILY_UNIT_PAIR_NODE_WIDTH,
          height: FAMILY_UNIT_PAIR_NODE_HEIGHT,
        });

        elkNodes.push({
          id: busNodeId,
          width: FAMILY_UNIT_BUS_NODE_WIDTH,
          height: FAMILY_UNIT_BUS_NODE_HEIGHT,
        });

        familyUnit.partners.forEach((partner) => {
          if (!addedPersons.has(partner.personId)) return;
          elkEdges.push({
            id: `e_partner_${familyUnit.id}_${partner.personId}`,
            sources: [`person_${partner.personId}`],
            targets: [pairNodeId],
          });
        });

        elkEdges.push({
          id: `e_trunk_${familyUnit.id}`,
          sources: [pairNodeId],
          targets: [busNodeId],
        });

        familyUnit.children.forEach((child) => {
          if (!addedPersons.has(child.personId)) return;
          elkEdges.push({
            id: `e_child_${familyUnit.id}_${child.personId}`,
            sources: [busNodeId],
            targets: [`person_${child.personId}`],
          });
        });
      });

      const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.spacing.nodeNode': '80',
          'elk.spacing.edgeNode': '36',
          'elk.layered.spacing.nodeNodeBetweenLayers': '150',
          'elk.layered.spacing.edgeNodeBetweenLayers': '60',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.crossingMinimization.forceNodeModelOrder': 'false',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.layered.nodePlacement.favorStraightEdges': 'true',
          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
          'elk.edgeRouting': 'ORTHOGONAL',
        },
        children: elkNodes,
        edges: elkEdges,
      };

      const layoutResult = await elk.layout(elkGraph);

      if (!layoutResult.children || layoutResult.children.length === 0) {
        fallbackLayout(treeData, setNodes, setEdges);
        return;
      }

      const rfNodes: Node[] = [];
      const nodeBounds = new Map<string, NodeBounds>();

      if (layoutResult.children) {
        for (const child of layoutResult.children) {
          const x = child.x ?? 0;
          const y = child.y ?? 0;
          const width = child.width ?? (child.id.startsWith('person_') ? PERSON_NODE_WIDTH : FAMILY_UNIT_PAIR_NODE_WIDTH);
          const height = child.height ?? (child.id.startsWith('person_') ? PERSON_NODE_HEIGHT : FAMILY_UNIT_PAIR_NODE_HEIGHT);

          nodeBounds.set(child.id, { x, y, width, height });

          if (child.id.startsWith('person_')) {
            const personId = Number(child.id.replace('person_', ''));
            const person = personsMap.get(personId);
            if (!person) continue;

            rfNodes.push({
              id: child.id,
              type: 'personNode',
              position: { x, y },
              style: { overflow: 'visible' },
              data: {
                person,
                isRoot: personId === rootId,
                label: person.relationshipLabel,
              } satisfies PersonNodeData,
            });
            continue;
          }

          if (child.id.startsWith('fu_pair_')) {
            const familyUnitId = Number(child.id.replace('fu_pair_', ''));
            const familyUnit = treeData.familyUnits.find((unit) => unit.id === familyUnitId);
            if (!familyUnit) continue;

            rfNodes.push({
              id: child.id,
              type: 'familyUnitNode',
              position: { x, y },
              data: {
                familyUnit,
                variant: 'pair',
              } satisfies FamilyUnitNodeData,
            });
            continue;
          }

          if (child.id.startsWith('fu_bus_')) {
            const familyUnitId = Number(child.id.replace('fu_bus_', ''));
            const familyUnit = treeData.familyUnits.find((unit) => unit.id === familyUnitId);
            if (!familyUnit) continue;

            rfNodes.push({
              id: child.id,
              type: 'familyUnitNode',
              position: { x, y },
              data: {
                familyUnit,
                variant: 'bus',
              } satisfies FamilyUnitNodeData,
            });
          }
        }
      }

      const plannedEdges: PlannedEdge[] = [];

      treeData.familyUnits.forEach((familyUnit) => {
        const pairNodeId = `fu_pair_${familyUnit.id}`;
        const busNodeId = `fu_bus_${familyUnit.id}`;
        const pairCenterX = getNodeCenterX(nodeBounds, pairNodeId);

        const sortedPartners = familyUnit.partners
          .filter((partner) => addedPersons.has(partner.personId))
          .slice()
          .sort((a, b) => getNodeCenterX(nodeBounds, `person_${a.personId}`) - getNodeCenterX(nodeBounds, `person_${b.personId}`));

        sortedPartners.forEach((partner, partnerIndex) => {
          const personNodeId = `person_${partner.personId}`;
          const partnerCenterX = getNodeCenterX(nodeBounds, personNodeId);
          const isOnLeft = partnerCenterX <= pairCenterX;

          plannedEdges.push({
            id: `edge_marriage_${familyUnit.id}_${partner.personId}`,
            source: personNodeId,
            target: pairNodeId,
            sourceHandle: isOnLeft ? 'spouse-right' : 'spouse-left',
            targetHandle: isOnLeft ? 'partner-left' : 'partner-right',
            type: 'marriageEdge',
            kind: 'marriage',
            laneIndex: partnerIndex,
            laneCount: sortedPartners.length,
            marriageType: familyUnit.marriageType,
            status: familyUnit.status,
          });
        });

        plannedEdges.push({
          id: `edge_trunk_${familyUnit.id}`,
          source: pairNodeId,
          target: busNodeId,
          sourceHandle: 'children-out',
          targetHandle: 'trunk-in',
          type: 'childEdge',
          kind: 'trunk',
          laneIndex: 0,
          laneCount: 1,
        });

        const sortedChildren = familyUnit.children
          .filter((child) => addedPersons.has(child.personId))
          .slice()
          .sort((a, b) => {
            const ax = getNodeCenterX(nodeBounds, `person_${a.personId}`);
            const bx = getNodeCenterX(nodeBounds, `person_${b.personId}`);
            if (ax !== bx) return ax - bx;
            return a.personId - b.personId;
          });

        sortedChildren.forEach((child, childIndex) => {
          plannedEdges.push({
            id: `edge_child_${familyUnit.id}_${child.personId}`,
            source: busNodeId,
            target: `person_${child.personId}`,
            sourceHandle: 'child-out-center',
            targetHandle: 'parent-in',
            type: 'childEdge',
            kind: 'child',
            laneIndex: childIndex,
            laneCount: sortedChildren.length,
            lineageType: child.lineageType,
          });
        });
      });

      const routePointsByEdge = new Map<string, EdgeRoutePoint[]>();
      plannedEdges.forEach((edge) => {
        routePointsByEdge.set(edge.id, buildRoutePoints(edge, nodeBounds));
      });

      const bridgesByEdge = detectBridgePoints(plannedEdges, routePointsByEdge);

      const rfEdges: Edge[] = plannedEdges.map((plannedEdge) => {
        const routePoints = routePointsByEdge.get(plannedEdge.id) ?? [];
        const bridges = bridgesByEdge.get(plannedEdge.id) ?? [];

        if (plannedEdge.type === 'marriageEdge') {
          const data: MarriageEdgeData = {
            marriageType: plannedEdge.marriageType,
            status: plannedEdge.status,
            edgeKind: plannedEdge.kind,
            laneIndex: plannedEdge.laneIndex,
            laneCount: plannedEdge.laneCount,
            routePoints,
            bridges,
          };

          return {
            id: plannedEdge.id,
            source: plannedEdge.source,
            target: plannedEdge.target,
            sourceHandle: plannedEdge.sourceHandle,
            targetHandle: plannedEdge.targetHandle,
            type: plannedEdge.type,
            data,
          };
        }

        const data: ChildEdgeData = {
          lineageType: plannedEdge.lineageType,
          edgeKind: plannedEdge.kind,
          laneIndex: plannedEdge.laneIndex,
          laneCount: plannedEdge.laneCount,
          routePoints,
          bridges,
        };

        return {
          id: plannedEdge.id,
          source: plannedEdge.source,
          target: plannedEdge.target,
          sourceHandle: plannedEdge.sourceHandle,
          targetHandle: plannedEdge.targetHandle,
          type: plannedEdge.type,
          data,
        };
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      console.error('ELK layout error:', err);
      fallbackLayout(treeData, setNodes, setEdges);
    } finally {
      setIsLayouting(false);
    }
  }, [treeData]);

  useEffect(() => {
    void computeLayout();
  }, [computeLayout]);

  return { nodes, edges, isLayouting };
}

function getNodeCenterX(nodeBounds: Map<string, NodeBounds>, nodeId: string) {
  const bounds = nodeBounds.get(nodeId);
  if (!bounds) return 0;
  return bounds.x + bounds.width / 2;
}

function getHandlePoint(nodeId: string, handleId: string, nodeBounds: Map<string, NodeBounds>): EdgeRoutePoint {
  const bounds = nodeBounds.get(nodeId);
  if (!bounds) {
    return { x: 0, y: 0 };
  }

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  if (nodeId.startsWith('person_')) {
    switch (handleId) {
      case 'parent-in':
        return { x: centerX, y: bounds.y };
      case 'child-out':
        return { x: centerX, y: bounds.y + bounds.height };
      case 'spouse-left':
        return { x: bounds.x, y: centerY };
      case 'spouse-right':
        return { x: bounds.x + bounds.width, y: centerY };
      default:
        return { x: centerX, y: centerY };
    }
  }

  if (nodeId.startsWith('fu_pair_')) {
    switch (handleId) {
      case 'partner-left':
        return { x: bounds.x, y: centerY };
      case 'partner-right':
        return { x: bounds.x + bounds.width, y: centerY };
      case 'children-out':
        return { x: centerX, y: bounds.y + bounds.height };
      default:
        return { x: centerX, y: centerY };
    }
  }

  if (nodeId.startsWith('fu_bus_')) {
    switch (handleId) {
      case 'trunk-in':
        return { x: centerX, y: bounds.y };
      case 'child-out-center':
        return { x: centerX, y: bounds.y + bounds.height };
      default:
        return { x: centerX, y: centerY };
    }
  }

  return { x: centerX, y: centerY };
}

function getCenteredOffset(index: number, count: number, gap: number) {
  if (count <= 1) return 0;
  return (index - (count - 1) / 2) * gap;
}

function buildRoutePoints(edge: PlannedEdge, nodeBounds: Map<string, NodeBounds>): EdgeRoutePoint[] {
  const source = getHandlePoint(edge.source, edge.sourceHandle, nodeBounds);
  const target = getHandlePoint(edge.target, edge.targetHandle, nodeBounds);

  if (edge.kind === 'marriage') {
    const laneOffset = getCenteredOffset(edge.laneIndex, edge.laneCount, MARRIAGE_LANE_GAP);
    return normalizeRoutePoints(buildMarriageRoute(source, target, laneOffset));
  }

  if (edge.kind === 'trunk') {
    return normalizeRoutePoints(buildTrunkRoute(source, target));
  }

  const laneOffset = getCenteredOffset(edge.laneIndex, edge.laneCount, CHILD_LANE_GAP);
  return normalizeRoutePoints(buildChildRoute(source, target, laneOffset));
}

function buildMarriageRoute(source: EdgeRoutePoint, target: EdgeRoutePoint, laneOffset: number): EdgeRoutePoint[] {
  const corridorX = (source.x + target.x) / 2 + laneOffset;
  return [
    source,
    { x: corridorX, y: source.y },
    { x: corridorX, y: target.y },
    target,
  ];
}

function buildTrunkRoute(source: EdgeRoutePoint, target: EdgeRoutePoint): EdgeRoutePoint[] {
  if (Math.abs(source.x - target.x) < 1) {
    return [source, target];
  }

  const midY = (source.y + target.y) / 2;
  return [
    source,
    { x: source.x, y: midY },
    { x: target.x, y: midY },
    target,
  ];
}

function buildChildRoute(source: EdgeRoutePoint, target: EdgeRoutePoint, laneOffset: number): EdgeRoutePoint[] {
  const launchX = source.x + laneOffset;
  const rawChannelY = source.y + 28 + Math.abs(laneOffset) * 0.2;
  const channelY = target.y > source.y ? Math.min(rawChannelY, target.y - 18) : rawChannelY;

  return [
    source,
    { x: launchX, y: source.y },
    { x: launchX, y: channelY },
    { x: target.x, y: channelY },
    target,
  ];
}

function normalizeRoutePoints(points: EdgeRoutePoint[]): EdgeRoutePoint[] {
  const compact: EdgeRoutePoint[] = [];

  for (const point of points) {
    const rounded = {
      x: Math.round(point.x * 100) / 100,
      y: Math.round(point.y * 100) / 100,
    };

    const previous = compact[compact.length - 1];
    if (
      previous &&
      Math.abs(previous.x - rounded.x) < CROSSING_EPSILON &&
      Math.abs(previous.y - rounded.y) < CROSSING_EPSILON
    ) {
      continue;
    }
    compact.push(rounded);
  }

  let changed = true;
  while (changed && compact.length >= 3) {
    changed = false;
    for (let i = 1; i < compact.length - 1; i++) {
      const a = compact[i - 1];
      const b = compact[i];
      const c = compact[i + 1];
      const vertical = Math.abs(a.x - b.x) < CROSSING_EPSILON && Math.abs(b.x - c.x) < CROSSING_EPSILON;
      const horizontal = Math.abs(a.y - b.y) < CROSSING_EPSILON && Math.abs(b.y - c.y) < CROSSING_EPSILON;
      if (vertical || horizontal) {
        compact.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  return compact;
}

function collectSegments(edgeId: string, routePoints: EdgeRoutePoint[]): Segment[] {
  const segments: Segment[] = [];

  for (let i = 0; i < routePoints.length - 1; i++) {
    const a = routePoints[i];
    const b = routePoints[i + 1];

    if (Math.abs(a.x - b.x) < CROSSING_EPSILON && Math.abs(a.y - b.y) < CROSSING_EPSILON) {
      continue;
    }

    if (Math.abs(a.y - b.y) < CROSSING_EPSILON) {
      segments.push({ edgeId, segmentIndex: i, a, b, orientation: 'H' });
      continue;
    }

    if (Math.abs(a.x - b.x) < CROSSING_EPSILON) {
      segments.push({ edgeId, segmentIndex: i, a, b, orientation: 'V' });
    }
  }

  return segments;
}

function detectBridgePoints(
  plannedEdges: PlannedEdge[],
  routePointsByEdge: Map<string, EdgeRoutePoint[]>,
): Map<string, EdgeBridgePoint[]> {
  const bridges = new Map<string, EdgeBridgePoint[]>();
  const segmentsByEdge = new Map<string, Segment[]>();

  for (const edge of plannedEdges) {
    const routePoints = routePointsByEdge.get(edge.id) ?? [];
    segmentsByEdge.set(edge.id, collectSegments(edge.id, routePoints));
  }

  for (let i = 0; i < plannedEdges.length; i++) {
    const edgeA = plannedEdges[i];
    const segmentsA = segmentsByEdge.get(edgeA.id) ?? [];

    for (let j = i + 1; j < plannedEdges.length; j++) {
      const edgeB = plannedEdges[j];
      const segmentsB = segmentsByEdge.get(edgeB.id) ?? [];

      if (
        edgeA.source === edgeB.source ||
        edgeA.target === edgeB.target ||
        edgeA.source === edgeB.target ||
        edgeA.target === edgeB.source
      ) {
        continue;
      }

      for (const segmentA of segmentsA) {
        for (const segmentB of segmentsB) {
          const horizontal = segmentA.orientation === 'H' ? segmentA : (segmentB.orientation === 'H' ? segmentB : null);
          const vertical = segmentA.orientation === 'V' ? segmentA : (segmentB.orientation === 'V' ? segmentB : null);
          if (!horizontal || !vertical) continue;

          const ix = vertical.a.x;
          const iy = horizontal.a.y;

          const minHX = Math.min(horizontal.a.x, horizontal.b.x);
          const maxHX = Math.max(horizontal.a.x, horizontal.b.x);
          const minVY = Math.min(vertical.a.y, vertical.b.y);
          const maxVY = Math.max(vertical.a.y, vertical.b.y);

          if (ix <= minHX + CROSSING_EPSILON || ix >= maxHX - CROSSING_EPSILON) continue;
          if (iy <= minVY + CROSSING_EPSILON || iy >= maxVY - CROSSING_EPSILON) continue;

          const existing = bridges.get(horizontal.edgeId) ?? [];
          const tooClose = existing.some((bridge) =>
            bridge.segmentIndex === horizontal.segmentIndex &&
            Math.abs(bridge.x - ix) < BRIDGE_MIN_SPACING &&
            Math.abs(bridge.y - iy) < BRIDGE_MIN_SPACING,
          );
          if (tooClose) continue;

          existing.push({
            x: ix,
            y: iy,
            segmentIndex: horizontal.segmentIndex,
          });
          bridges.set(horizontal.edgeId, existing);
        }
      }
    }
  }

  bridges.forEach((items, edgeId) => {
    const routePoints = routePointsByEdge.get(edgeId) ?? [];
    const sorted = items.slice().sort((a, b) => {
      if (a.segmentIndex !== b.segmentIndex) return a.segmentIndex - b.segmentIndex;
      const current = routePoints[a.segmentIndex];
      const next = routePoints[a.segmentIndex + 1];
      if (!current || !next) return a.x - b.x;
      return next.x >= current.x ? a.x - b.x : b.x - a.x;
    });
    bridges.set(edgeId, sorted);
  });

  return bridges;
}

function fallbackLayout(
  treeData: TreeResponse,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  treeData.persons.forEach((person, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);

    rfNodes.push({
      id: `person_${person.id}`,
      type: 'personNode',
      position: {
        x: col * (PERSON_NODE_WIDTH + 80),
        y: row * (PERSON_NODE_HEIGHT + 120),
      },
      style: { overflow: 'visible' },
      data: {
        person,
        isRoot: person.id === treeData.rootPersonId,
        label: person.relationshipLabel,
      } satisfies PersonNodeData,
    });
  });

  treeData.familyUnits.forEach((familyUnit) => {
    familyUnit.partners.forEach((partner) => {
      familyUnit.children.forEach((child) => {
        rfEdges.push({
          id: `edge_fallback_${familyUnit.id}_${partner.personId}_${child.personId}`,
          source: `person_${partner.personId}`,
          target: `person_${child.personId}`,
          type: 'childEdge',
          data: {
            lineageType: child.lineageType,
            edgeKind: 'child',
          } satisfies ChildEdgeData,
        });
      });
    });
  });

  setNodes(rfNodes);
  setEdges(rfEdges);
}
