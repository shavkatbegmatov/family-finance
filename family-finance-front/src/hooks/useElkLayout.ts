import { useCallback, useEffect, useState } from 'react';
import ELK, {
  type ElkNode,
  type ElkExtendedEdge,
  type ElkPort,
  type ElkEdgeSection,
} from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type {
  TreeResponse,
  TreePerson,
  PersonNodeData,
  FamilyUnitNodeData,
  EdgeRoutePoint,
  FamilyEdgeKind,
  MarriageEdgeData,
  ChildEdgeData,
  EdgeSectionData,
} from '../types';

export const PERSON_NODE_WIDTH = 200;
export const PERSON_NODE_HEIGHT = 140;
export const FAMILY_UNIT_PAIR_NODE_WIDTH = 40;
export const FAMILY_UNIT_PAIR_NODE_HEIGHT = 20;
export const FAMILY_UNIT_BUS_NODE_WIDTH = 12;
export const FAMILY_UNIT_BUS_NODE_HEIGHT = 12;

const CROSSING_EPSILON = 0.5;
const MARRIAGE_LANE_GAP = 12;
const CHILD_LANE_GAP = 14;

const elk = new ELK();

type EdgeType = 'marriageEdge' | 'childEdge';
type PortSide = 'left' | 'right';

type PortHandleId =
  | 'parent-in'
  | 'child-out'
  | 'spouse-left'
  | 'spouse-right'
  | 'partner-left'
  | 'partner-right'
  | 'children-out'
  | 'trunk-in'
  | 'child-out-center';

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
  sourceHandle: PortHandleId;
  targetHandle: PortHandleId;
  sourcePortId: string;
  targetPortId: string;
  type: EdgeType;
  kind: FamilyEdgeKind;
  laneIndex: number;
  laneCount: number;
  marriageType?: MarriageEdgeData['marriageType'];
  status?: MarriageEdgeData['status'];
  lineageType?: ChildEdgeData['lineageType'];
}

interface ElkExtendedEdgeWithPorts extends ElkExtendedEdge {
  sourcePort?: string;
  targetPort?: string;
}

const PARTNER_ROLE_ORDER: Record<string, number> = {
  PARTNER1: 0,
  PARTNER2: 1,
};

const EDGE_KIND_ORDER: Record<FamilyEdgeKind, number> = {
  trunk: 0,
  marriage: 1,
  child: 2,
};

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

      const familyUnitsMap = new Map<number, TreeResponse['familyUnits'][number]>();
      treeData.familyUnits.forEach((unit) => familyUnitsMap.set(unit.id, unit));

      const rootId = treeData.rootPersonId;
      const addedPersons = new Set(treeData.persons.map((person) => person.id));

      const elkNodes: ElkNode[] = [];
      const plannedEdges: PlannedEdge[] = [];

      treeData.persons.forEach((person) => {
        const nodeId = `person_${person.id}`;
        elkNodes.push({
          id: nodeId,
          width: PERSON_NODE_WIDTH,
          height: PERSON_NODE_HEIGHT,
          layoutOptions: {
            'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
          },
          ports: buildPersonPorts(nodeId),
        });
      });

      treeData.familyUnits.forEach((familyUnit) => {
        const pairNodeId = `fu_pair_${familyUnit.id}`;
        const busNodeId = `fu_bus_${familyUnit.id}`;

        elkNodes.push({
          id: pairNodeId,
          width: FAMILY_UNIT_PAIR_NODE_WIDTH,
          height: FAMILY_UNIT_PAIR_NODE_HEIGHT,
          layoutOptions: {
            'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
          },
          ports: buildFamilyPairPorts(pairNodeId),
        });

        elkNodes.push({
          id: busNodeId,
          width: FAMILY_UNIT_BUS_NODE_WIDTH,
          height: FAMILY_UNIT_BUS_NODE_HEIGHT,
          layoutOptions: {
            'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
          },
          ports: buildFamilyBusPorts(busNodeId),
        });

        const sortedPartners = familyUnit.partners
          .filter((partner) => addedPersons.has(partner.personId))
          .slice()
          .sort((a, b) => {
            const roleDiff = (PARTNER_ROLE_ORDER[a.role] ?? 99) - (PARTNER_ROLE_ORDER[b.role] ?? 99);
            if (roleDiff !== 0) return roleDiff;
            return a.personId - b.personId;
          });

        sortedPartners.forEach((partner, partnerIndex) => {
          const personNodeId = `person_${partner.personId}`;
          const side = getPartnerSide(partnerIndex, sortedPartners.length);

          const sourceHandle: PortHandleId = side === 'left' ? 'spouse-right' : 'spouse-left';
          const targetHandle: PortHandleId = side === 'left' ? 'partner-left' : 'partner-right';

          plannedEdges.push({
            id: `edge_marriage_${familyUnit.id}_${partner.personId}`,
            source: personNodeId,
            target: pairNodeId,
            sourceHandle,
            targetHandle,
            sourcePortId: toPortId(personNodeId, sourceHandle),
            targetPortId: toPortId(pairNodeId, targetHandle),
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
          sourcePortId: toPortId(pairNodeId, 'children-out'),
          targetPortId: toPortId(busNodeId, 'trunk-in'),
          type: 'childEdge',
          kind: 'trunk',
          laneIndex: 0,
          laneCount: 1,
        });

        const sortedChildren = familyUnit.children
          .filter((child) => addedPersons.has(child.personId))
          .slice()
          .sort((a, b) => {
            if ((a.birthOrder ?? 0) !== (b.birthOrder ?? 0)) {
              return (a.birthOrder ?? 0) - (b.birthOrder ?? 0);
            }
            return a.personId - b.personId;
          });

        sortedChildren.forEach((child, childIndex) => {
          const childNodeId = `person_${child.personId}`;

          plannedEdges.push({
            id: `edge_child_${familyUnit.id}_${child.personId}`,
            source: busNodeId,
            target: childNodeId,
            sourceHandle: 'child-out-center',
            targetHandle: 'parent-in',
            sourcePortId: toPortId(busNodeId, 'child-out-center'),
            targetPortId: toPortId(childNodeId, 'parent-in'),
            type: 'childEdge',
            kind: 'child',
            laneIndex: childIndex,
            laneCount: sortedChildren.length,
            lineageType: child.lineageType,
          });
        });
      });

      const elkEdges: ElkExtendedEdgeWithPorts[] = plannedEdges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
        sourcePort: edge.sourcePortId,
        targetPort: edge.targetPortId,
      }));

      const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions: {
          'org.eclipse.elk.algorithm': 'layered',
          'org.eclipse.elk.direction': 'DOWN',
          'org.eclipse.elk.spacing.nodeNode': '80',
          'org.eclipse.elk.spacing.edgeNode': '36',
          'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '150',
          'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': '60',
          'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
          'org.eclipse.elk.layered.considerModelOrder.portModelOrder': 'true',
          'org.eclipse.elk.layered.unnecessaryBendpoints': 'true',
          'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
          'org.eclipse.elk.json.edgeCoords': 'true',
          'org.eclipse.elk.json.shapeCoords': 'true',
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

      for (const child of layoutResult.children ?? []) {
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
          const familyUnit = familyUnitsMap.get(familyUnitId);
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
          const familyUnit = familyUnitsMap.get(familyUnitId);
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

      const elkEdgesById = new Map<string, ElkExtendedEdge>();
      collectLayoutEdges(layoutResult, elkEdgesById);

      const rfEdges: Edge[] = plannedEdges.map((plannedEdge) => {
        const elkEdge = elkEdgesById.get(plannedEdge.id);
        const elkRoutePoints = routePointsFromSections(elkEdge?.sections);
        const fallbackRoutePoints = buildFallbackRoute(plannedEdge, nodeBounds);

        const routePoints = elkRoutePoints.length >= 2 ? elkRoutePoints : fallbackRoutePoints;
        const routingSource = elkRoutePoints.length >= 2 ? 'elk' : 'fallback';
        const elkSections = toSectionData(elkEdge?.sections);

        if (plannedEdge.type === 'marriageEdge') {
          const data: MarriageEdgeData = {
            marriageType: plannedEdge.marriageType,
            status: plannedEdge.status,
            edgeKind: plannedEdge.kind,
            laneIndex: plannedEdge.laneIndex,
            laneCount: plannedEdge.laneCount,
            routePoints,
            elkSections,
            routingSource,
            bridges: [],
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
          elkSections,
          routingSource,
          bridges: [],
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

      rfEdges.sort((a, b) => compareEdges(a, b, nodeBounds));

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

function buildPersonPorts(nodeId: string): ElkPort[] {
  return [
    createPort(nodeId, 'parent-in', 'NORTH', 0),
    createPort(nodeId, 'child-out', 'SOUTH', 0),
    createPort(nodeId, 'spouse-left', 'WEST', 0),
    createPort(nodeId, 'spouse-right', 'EAST', 0),
  ];
}

function buildFamilyPairPorts(nodeId: string): ElkPort[] {
  return [
    createPort(nodeId, 'partner-left', 'WEST', 0),
    createPort(nodeId, 'partner-right', 'EAST', 0),
    createPort(nodeId, 'children-out', 'SOUTH', 0),
  ];
}

function buildFamilyBusPorts(nodeId: string): ElkPort[] {
  return [
    createPort(nodeId, 'trunk-in', 'NORTH', 0),
    createPort(nodeId, 'child-out-center', 'SOUTH', 0),
  ];
}

function createPort(nodeId: string, handleId: PortHandleId, side: 'NORTH' | 'SOUTH' | 'WEST' | 'EAST', index: number): ElkPort {
  return {
    id: toPortId(nodeId, handleId),
    width: 1,
    height: 1,
    layoutOptions: {
      'org.eclipse.elk.port.side': side,
      'org.eclipse.elk.port.index': String(index),
    },
  };
}

function toPortId(nodeId: string, handleId: PortHandleId) {
  return `${nodeId}__${handleId}`;
}

function getPartnerSide(index: number, total: number): PortSide {
  if (total <= 1) return 'left';
  return index <= (total - 1) / 2 ? 'left' : 'right';
}

function collectLayoutEdges(node: ElkNode, edgeMap: Map<string, ElkExtendedEdge>) {
  for (const edge of node.edges ?? []) {
    edgeMap.set(edge.id, edge);
  }

  for (const child of node.children ?? []) {
    collectLayoutEdges(child, edgeMap);
  }
}

function compareEdges(a: Edge, b: Edge, nodeBounds: Map<string, NodeBounds>) {
  const kindA = ((a.data as { edgeKind?: FamilyEdgeKind } | undefined)?.edgeKind ?? 'child') as FamilyEdgeKind;
  const kindB = ((b.data as { edgeKind?: FamilyEdgeKind } | undefined)?.edgeKind ?? 'child') as FamilyEdgeKind;

  const kindDiff = (EDGE_KIND_ORDER[kindA] ?? 99) - (EDGE_KIND_ORDER[kindB] ?? 99);
  if (kindDiff !== 0) return kindDiff;

  const sourceYDiff = getNodeY(nodeBounds, a.source) - getNodeY(nodeBounds, b.source);
  if (Math.abs(sourceYDiff) > CROSSING_EPSILON) return sourceYDiff;

  const sourceXDiff = getNodeCenterX(nodeBounds, a.source) - getNodeCenterX(nodeBounds, b.source);
  if (Math.abs(sourceXDiff) > CROSSING_EPSILON) return sourceXDiff;

  return a.id.localeCompare(b.id);
}

function routePointsFromSections(sections: ElkEdgeSection[] | undefined): EdgeRoutePoint[] {
  if (!sections || sections.length === 0) return [];

  const ordered = orderSections(sections);
  const points: EdgeRoutePoint[] = [];

  for (const section of ordered) {
    const sectionPoints = [
      section.startPoint,
      ...(section.bendPoints ?? []),
      section.endPoint,
    ];

    for (const point of sectionPoints) {
      points.push({
        x: roundTo2(point.x),
        y: roundTo2(point.y),
      });
    }
  }

  return normalizeRoutePoints(points);
}

function toSectionData(sections: ElkEdgeSection[] | undefined): EdgeSectionData[] {
  if (!sections || sections.length === 0) return [];

  return sections.map((section) => ({
    id: section.id,
    startPoint: {
      x: roundTo2(section.startPoint.x),
      y: roundTo2(section.startPoint.y),
    },
    endPoint: {
      x: roundTo2(section.endPoint.x),
      y: roundTo2(section.endPoint.y),
    },
    bendPoints: (section.bendPoints ?? []).map((point) => ({
      x: roundTo2(point.x),
      y: roundTo2(point.y),
    })),
  }));
}

function orderSections(sections: ElkEdgeSection[]): ElkEdgeSection[] {
  if (sections.length <= 1) return sections;

  const byId = new Map<string, ElkEdgeSection>();
  const hasIncoming = new Set<string>();

  for (const section of sections) {
    byId.set(section.id, section);
  }

  for (const section of sections) {
    for (const outgoingId of section.outgoingSections ?? []) {
      hasIncoming.add(outgoingId);
    }
  }

  let current: ElkEdgeSection | undefined = sections.find((section) => !hasIncoming.has(section.id)) ?? sections[0];

  const ordered: ElkEdgeSection[] = [];
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    ordered.push(current);
    visited.add(current.id);

    const outgoingIds: string[] = current.outgoingSections ?? [];
    const nextId: string | undefined = outgoingIds.find((outgoingId: string) => !visited.has(outgoingId));
    current = nextId ? byId.get(nextId) : undefined;
  }

  for (const section of sections) {
    if (!visited.has(section.id)) {
      ordered.push(section);
    }
  }

  return ordered;
}

function buildFallbackRoute(edge: PlannedEdge, nodeBounds: Map<string, NodeBounds>): EdgeRoutePoint[] {
  const source = getHandlePoint(edge.source, edge.sourceHandle, nodeBounds);
  const target = getHandlePoint(edge.target, edge.targetHandle, nodeBounds);

  if (edge.kind === 'marriage') {
    const laneOffset = getCenteredOffset(edge.laneIndex, edge.laneCount, MARRIAGE_LANE_GAP);
    const corridorX = (source.x + target.x) / 2 + laneOffset;
    return normalizeRoutePoints([
      source,
      { x: corridorX, y: source.y },
      { x: corridorX, y: target.y },
      target,
    ]);
  }

  if (edge.kind === 'trunk') {
    if (Math.abs(source.x - target.x) < 1) {
      return [source, target];
    }

    const midY = (source.y + target.y) / 2;
    return normalizeRoutePoints([
      source,
      { x: source.x, y: midY },
      { x: target.x, y: midY },
      target,
    ]);
  }

  const laneOffset = getCenteredOffset(edge.laneIndex, edge.laneCount, CHILD_LANE_GAP);
  const launchX = source.x + laneOffset;
  const channelY = source.y + 28;

  return normalizeRoutePoints([
    source,
    { x: launchX, y: source.y },
    { x: launchX, y: channelY },
    { x: target.x, y: channelY },
    target,
  ]);
}

function getHandlePoint(nodeId: string, handleId: PortHandleId, nodeBounds: Map<string, NodeBounds>): EdgeRoutePoint {
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

function normalizeRoutePoints(points: EdgeRoutePoint[]): EdgeRoutePoint[] {
  const compact: EdgeRoutePoint[] = [];

  for (const point of points) {
    const rounded = {
      x: roundTo2(point.x),
      y: roundTo2(point.y),
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

function getCenteredOffset(index: number, count: number, gap: number) {
  if (count <= 1) return 0;
  return (index - (count - 1) / 2) * gap;
}

function getNodeCenterX(nodeBounds: Map<string, NodeBounds>, nodeId: string) {
  const bounds = nodeBounds.get(nodeId);
  if (!bounds) return 0;
  return bounds.x + bounds.width / 2;
}

function getNodeY(nodeBounds: Map<string, NodeBounds>, nodeId: string) {
  const bounds = nodeBounds.get(nodeId);
  if (!bounds) return 0;
  return bounds.y;
}

function roundTo2(value: number) {
  return Math.round(value * 100) / 100;
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
            routingSource: 'fallback',
          } satisfies ChildEdgeData,
        });
      });
    });
  });

  setNodes(rfNodes);
  setEdges(rfEdges);
}
