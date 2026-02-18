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
  EdgeBridgePoint,
  EdgeJunctionPoint,
  FamilyEdgeKind,
  MarriageEdgeData,
  ChildEdgeData,
  EdgeSectionData,
} from '../types';

export const PERSON_NODE_WIDTH = 200;
export const PERSON_NODE_HEIGHT = 140;
export const FAMILY_UNIT_PAIR_NODE_WIDTH = 40;
export const FAMILY_UNIT_PAIR_NODE_HEIGHT = 20;
export const FAMILY_UNIT_BUS_NODE_WIDTH = 14;
export const FAMILY_UNIT_BUS_NODE_HEIGHT = 14;

const CROSSING_EPSILON = 0.5;
const BRIDGE_MIN_SPACING = 16;
const JUNCTION_MIN_SPACING = 12;
const MARRIAGE_LANE_GAP = 12;
const CHILD_LANE_GAP = 14;
const TREE_DENSITY_PROFILE = {
  nodeNode: '60',
  edgeNode: '25',
  edgeEdge: '15',
  nodeNodeBetweenLayers: '100',
  edgeNodeBetweenLayers: '25',
  edgeEdgeBetweenLayers: '15',
} as const;
const NODE_PORT_LAYOUT_OPTIONS = {
  'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
  'org.eclipse.elk.portAlignment.default': 'CENTER',
  'org.eclipse.elk.portAlignment.north': 'CENTER',
  'org.eclipse.elk.portAlignment.south': 'CENTER',
  'org.eclipse.elk.portAlignment.west': 'CENTER',
  'org.eclipse.elk.portAlignment.east': 'CENTER',
} as const;

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
  familyUnitId: number;
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

interface Segment {
  edgeId: string;
  segmentIndex: number;
  a: EdgeRoutePoint;
  b: EdgeRoutePoint;
  orientation: 'H' | 'V';
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
          layoutOptions: NODE_PORT_LAYOUT_OPTIONS,
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
          layoutOptions: NODE_PORT_LAYOUT_OPTIONS,
          ports: buildFamilyPairPorts(pairNodeId),
        });

        elkNodes.push({
          id: busNodeId,
          width: FAMILY_UNIT_BUS_NODE_WIDTH,
          height: FAMILY_UNIT_BUS_NODE_HEIGHT,
          layoutOptions: NODE_PORT_LAYOUT_OPTIONS,
          ports: buildFamilyBusPorts(busNodeId),
        });

        const sortedPartners = familyUnit.partners
          .filter((partner) => addedPersons.has(partner.personId))
          .slice()
          .sort((a, b) => {
            const genderDiff = getPartnerGenderRank(a, personsMap) - getPartnerGenderRank(b, personsMap);
            if (genderDiff !== 0) return genderDiff;

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
            familyUnitId: familyUnit.id,
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
          familyUnitId: familyUnit.id,
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
            familyUnitId: familyUnit.id,
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
          // Algoritm
          'org.eclipse.elk.algorithm': 'layered',
          'org.eclipse.elk.direction': 'DOWN',

          // Crossing Minimization — eng muhim qism
          'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'org.eclipse.elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
          'org.eclipse.elk.layered.thoroughness': '10',

          // Model Order — crossing ga ustunlik, model order tie-breaker sifatida
          'org.eclipse.elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
          'org.eclipse.elk.layered.considerModelOrder.crossingCounterNodeInfluence': '0.001',
          'org.eclipse.elk.layered.considerModelOrder.crossingCounterPortInfluence': '0.001',

          // Node Placement — to'g'ri chiziqlarni afzal ko'rish
          'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'org.eclipse.elk.layered.nodePlacement.favorStraightEdges': 'true',
          'org.eclipse.elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS',

          // Edge Routing
          'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
          'org.eclipse.elk.layered.unnecessaryBendpoints': 'true',

          // Spacing
          'org.eclipse.elk.spacing.nodeNode': TREE_DENSITY_PROFILE.nodeNode,
          'org.eclipse.elk.spacing.edgeNode': TREE_DENSITY_PROFILE.edgeNode,
          'org.eclipse.elk.spacing.edgeEdge': TREE_DENSITY_PROFILE.edgeEdge,
          'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': TREE_DENSITY_PROFILE.nodeNodeBetweenLayers,
          'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': TREE_DENSITY_PROFILE.edgeNodeBetweenLayers,
          'org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers': TREE_DENSITY_PROFILE.edgeEdgeBetweenLayers,

          // Compaction — ortiqcha bo'shliqni yo'qotish
          'org.eclipse.elk.layered.compaction.postCompaction.strategy': 'LEFT_RIGHT_CONSTRAINT_LOCKING',

          // Port
          'org.eclipse.elk.portAlignment.default': 'CENTER',

          // JSON
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

      // Partnerlarning pozitsiyalarini tekshirish va agar teskari bo'lsa — swap qilish
      // sortedPartners: erkak(index=0)=left, ayol(index=1)=right bo'lishi kerak
      // Agar ELK ularni teskari joylashtirgan bo'lsa — X pozitsiyalarini almashtiramiz
      for (const familyUnit of treeData.familyUnits) {
        const sortedPartners = familyUnit.partners
          .filter((p) => addedPersons.has(p.personId))
          .slice()
          .sort((a, b) => {
            const genderDiff = getPartnerGenderRank(a, personsMap) - getPartnerGenderRank(b, personsMap);
            if (genderDiff !== 0) return genderDiff;
            const roleDiff = (PARTNER_ROLE_ORDER[a.role] ?? 99) - (PARTNER_ROLE_ORDER[b.role] ?? 99);
            if (roleDiff !== 0) return roleDiff;
            return a.personId - b.personId;
          });

        if (sortedPartners.length < 2) continue;

        const leftPartner = sortedPartners[0]; // erkak — chapda bo'lishi kerak
        const rightPartner = sortedPartners[1]; // ayol — o'ngda bo'lishi kerak

        const leftNodeId = `person_${leftPartner.personId}`;
        const rightNodeId = `person_${rightPartner.personId}`;

        const leftBounds = nodeBounds.get(leftNodeId);
        const rightBounds = nodeBounds.get(rightNodeId);
        if (!leftBounds || !rightBounds) continue;

        const leftCenterX = leftBounds.x + leftBounds.width / 2;
        const rightCenterX = rightBounds.x + rightBounds.width / 2;

        // Agar "chap bo'lishi kerak" bo'lgan node aslida o'ngda bo'lsa — swap
        if (leftCenterX > rightCenterX) {
          const tempX = leftBounds.x;
          leftBounds.x = rightBounds.x;
          rightBounds.x = tempX;

          // rfNodes dagi pozitsiyalarni ham yangilash
          const leftRfNode = rfNodes.find((n) => n.id === leftNodeId);
          const rightRfNode = rfNodes.find((n) => n.id === rightNodeId);
          if (leftRfNode && rightRfNode) {
            const tempPos = leftRfNode.position.x;
            leftRfNode.position.x = rightRfNode.position.x;
            rightRfNode.position.x = tempPos;
          }
        }
      }

      // Marriage edge handle'larini haqiqiy pozitsiyaga qarab tuzatish
      for (const edge of plannedEdges) {
        if (edge.kind !== 'marriage') continue;

        const personBounds = nodeBounds.get(edge.source);
        const pairBounds = nodeBounds.get(edge.target);
        if (!personBounds || !pairBounds) continue;

        const personCenterX = personBounds.x + personBounds.width / 2;
        const pairCenterX = pairBounds.x + pairBounds.width / 2;

        // Person FamilyUnit'dan chapda → o'ng portdan chiqib chap portga kiradi
        // Person FamilyUnit'dan o'ngda → chap portdan chiqib o'ng portga kiradi
        const personIsLeft = personCenterX <= pairCenterX;
        const newSourceHandle: PortHandleId = personIsLeft ? 'spouse-right' : 'spouse-left';
        const newTargetHandle: PortHandleId = personIsLeft ? 'partner-left' : 'partner-right';

        edge.sourceHandle = newSourceHandle;
        edge.targetHandle = newTargetHandle;
        edge.sourcePortId = toPortId(edge.source, newSourceHandle);
        edge.targetPortId = toPortId(edge.target, newTargetHandle);
      }

      const elkEdgesById = new Map<string, ElkExtendedEdge>();
      collectLayoutEdges(layoutResult, elkEdgesById);

      const routePointsByEdge = new Map<string, EdgeRoutePoint[]>();
      const routingSourceByEdge = new Map<string, 'elk' | 'fallback'>();
      const elkSectionsByEdge = new Map<string, EdgeSectionData[]>();

      plannedEdges.forEach((plannedEdge) => {
        const elkEdge = elkEdgesById.get(plannedEdge.id);
        const elkRoutePoints = routePointsFromSections(elkEdge?.sections);
        const fallbackRoutePoints = buildFallbackRoute(plannedEdge, nodeBounds);

        // Marriage edge'larda ELK route mos kelmaydi — fallback ishlatamiz
        const useElkRoute = elkRoutePoints.length >= 2 && plannedEdge.kind !== 'marriage';
        const routePoints = useElkRoute ? elkRoutePoints : fallbackRoutePoints;
        const routingSource = useElkRoute ? 'elk' : 'fallback';
        const elkSections = toSectionData(elkEdge?.sections);

        routePointsByEdge.set(plannedEdge.id, routePoints);
        routingSourceByEdge.set(plannedEdge.id, routingSource);
        elkSectionsByEdge.set(plannedEdge.id, elkSections);
      });

      const { bridgesByEdge, junctionsByEdge } = detectEdgeIntersections(plannedEdges, routePointsByEdge);

      const rfEdges: Edge[] = plannedEdges.map((plannedEdge) => {
        const routePoints = routePointsByEdge.get(plannedEdge.id) ?? [];
        const routingSource = routingSourceByEdge.get(plannedEdge.id) ?? 'fallback';
        const elkSections = elkSectionsByEdge.get(plannedEdge.id) ?? [];
        const bridges = bridgesByEdge.get(plannedEdge.id) ?? [];
        const junctions = junctionsByEdge.get(plannedEdge.id) ?? [];

        if (plannedEdge.type === 'marriageEdge') {
          const data: MarriageEdgeData = {
            marriageType: plannedEdge.marriageType,
            status: plannedEdge.status,
            edgeKind: plannedEdge.kind,
            familyUnitId: plannedEdge.familyUnitId,
            laneIndex: plannedEdge.laneIndex,
            laneCount: plannedEdge.laneCount,
            routePoints,
            elkSections,
            routingSource,
            bridges,
            junctions,
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
          familyUnitId: plannedEdge.familyUnitId,
          laneIndex: plannedEdge.laneIndex,
          laneCount: plannedEdge.laneCount,
          routePoints,
          elkSections,
          routingSource,
          bridges,
          junctions,
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

function getPartnerGenderRank(
  partner: { personId: number; gender?: string | null },
  personsMap: Map<number, TreePerson>,
) {
  const gender = partner.gender ?? personsMap.get(partner.personId)?.gender;
  if (gender === 'MALE') return 0;
  if (gender === 'FEMALE') return 1;
  return 2;
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
  const channelY = source.y + 20;

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

function detectEdgeIntersections(
  plannedEdges: PlannedEdge[],
  routePointsByEdge: Map<string, EdgeRoutePoint[]>,
) {
  const bridgesByEdge = new Map<string, EdgeBridgePoint[]>();
  const junctionsByEdge = new Map<string, EdgeJunctionPoint[]>();
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
      const relatedEdges = isRelatedEdgePair(edgeA, edgeB);

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

          if (relatedEdges) {
            addMarkerPoint(junctionsByEdge, horizontal.edgeId, horizontal.segmentIndex, ix, iy, JUNCTION_MIN_SPACING);
            continue;
          }

          addMarkerPoint(bridgesByEdge, horizontal.edgeId, horizontal.segmentIndex, ix, iy, BRIDGE_MIN_SPACING);
        }
      }
    }
  }

  sortMarkersByRoute(bridgesByEdge, routePointsByEdge);
  sortMarkersByRoute(junctionsByEdge, routePointsByEdge);

  return { bridgesByEdge, junctionsByEdge };
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

function isRelatedEdgePair(edgeA: PlannedEdge, edgeB: PlannedEdge) {
  if (edgeA.familyUnitId === edgeB.familyUnitId) return true;
  if (edgeA.source === edgeB.source) return true;
  if (edgeA.target === edgeB.target) return true;
  if (edgeA.source === edgeB.target) return true;
  if (edgeA.target === edgeB.source) return true;
  return false;
}

function addMarkerPoint<T extends EdgeBridgePoint | EdgeJunctionPoint>(
  markerMap: Map<string, T[]>,
  edgeId: string,
  segmentIndex: number,
  x: number,
  y: number,
  minSpacing: number,
) {
  const existing = markerMap.get(edgeId) ?? [];

  const tooClose = existing.some((marker) =>
    marker.segmentIndex === segmentIndex &&
    Math.abs(marker.x - x) < minSpacing &&
    Math.abs(marker.y - y) < minSpacing,
  );
  if (tooClose) return;

  existing.push({
    x: roundTo2(x),
    y: roundTo2(y),
    segmentIndex,
  } as T);
  markerMap.set(edgeId, existing);
}

function sortMarkersByRoute<T extends EdgeBridgePoint | EdgeJunctionPoint>(
  markerMap: Map<string, T[]>,
  routePointsByEdge: Map<string, EdgeRoutePoint[]>,
) {
  markerMap.forEach((markers, edgeId) => {
    const routePoints = routePointsByEdge.get(edgeId) ?? [];
    const sorted = markers.slice().sort((a, b) => {
      if (a.segmentIndex !== b.segmentIndex) return a.segmentIndex - b.segmentIndex;

      const current = routePoints[a.segmentIndex];
      const next = routePoints[a.segmentIndex + 1];
      if (!current || !next) return a.x - b.x;

      const sameY = Math.abs(current.y - next.y) < CROSSING_EPSILON;
      if (!sameY) return a.y - b.y;

      return next.x >= current.x ? a.x - b.x : b.x - a.x;
    });
    markerMap.set(edgeId, sorted);
  });
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
            familyUnitId: familyUnit.id,
            routingSource: 'fallback',
            bridges: [],
            junctions: [],
          } satisfies ChildEdgeData,
        });
      });
    });
  });

  setNodes(rfNodes);
  setEdges(rfEdges);
}
