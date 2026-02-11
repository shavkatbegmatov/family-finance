import { useCallback, useEffect, useState } from 'react';
import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type {
  FamilyTreeResponse,
  FamilyTreeMember,
  FamilyRelationshipDto,
  RelationshipType,
} from '../types';

// ============ Constants ============
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 160;

const elk = new ELK();

// ============ Layer Mapping ============
function getLayer(type: RelationshipType): number {
  switch (type) {
    case 'BOBO':
    case 'BUVI':
      return -2;
    case 'OTA':
    case 'ONA':
    case 'QAYIN_OTA':
    case 'QAYIN_ONA':
    case 'AMAKI':
    case 'TOGHA':
    case 'AMMA':
    case 'XOLA':
      return -1;
    case 'ER':
    case 'XOTIN':
    case 'AKA':
    case 'UKA':
    case 'OPA':
    case 'SINGIL':
      return 0;
    case 'OGIL':
    case 'QIZ':
    case 'KUYOV':
    case 'KELIN':
    case 'JIYAN_OGIL':
    case 'JIYAN_QIZ':
      return 1;
    case 'NEVARA_OGIL':
    case 'NEVARA_QIZ':
      return 2;
    case 'BOSHQA':
    default:
      return 3;
  }
}

function getEdgeType(type: RelationshipType): 'parentChild' | 'spouse' | 'sibling' {
  switch (type) {
    case 'ER':
    case 'XOTIN':
      return 'spouse';
    case 'AKA':
    case 'UKA':
    case 'OPA':
    case 'SINGIL':
      return 'sibling';
    default:
      return 'parentChild';
  }
}

function isParentRelation(type: RelationshipType): boolean {
  return ['OTA', 'ONA', 'BOBO', 'BUVI', 'QAYIN_OTA', 'QAYIN_ONA', 'AMAKI', 'TOGHA', 'AMMA', 'XOLA'].includes(type);
}

// Node data — only contains display data, NO callbacks
export interface FamilyNodeData {
  member: FamilyTreeMember;
  relationship?: FamilyRelationshipDto;
  isRoot: boolean;
}

export function useElkLayout(treeData: FamilyTreeResponse | null) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLayouting, setIsLayouting] = useState(false);

  const computeLayout = useCallback(async () => {
    if (!treeData || treeData.members.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setIsLayouting(true);

    const membersMap = new Map<number, FamilyTreeMember>();
    treeData.members.forEach(m => membersMap.set(m.id, m));

    const rootId = treeData.rootMemberId;

    const relMap = new Map<number, FamilyRelationshipDto>();
    treeData.relationships.forEach(r => {
      relMap.set(r.toMemberId, r);
    });

    const memberLayers = new Map<number, number>();
    memberLayers.set(rootId, 0);

    treeData.relationships.forEach(rel => {
      const layer = getLayer(rel.relationshipType);
      memberLayers.set(rel.toMemberId, layer);
    });

    // Find spouse
    let spouseId: number | null = null;
    treeData.relationships.forEach(rel => {
      if (rel.relationshipType === 'ER' || rel.relationshipType === 'XOTIN') {
        spouseId = rel.toMemberId;
      }
    });

    // ============ Build ELK Graph ============
    const elkNodes: ElkNode[] = [];
    const elkEdges: ElkExtendedEdge[] = [];

    for (const [memberId, layer] of memberLayers) {
      const member = membersMap.get(memberId);
      if (!member) continue;

      if (memberId === rootId && spouseId) {
        elkNodes.push({
          id: `couple_${rootId}`,
          layoutOptions: {
            'elk.layered.layerConstraint': layerToConstraint(layer),
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.spacing.nodeNode': '20',
            'elk.padding': '[top=0,left=0,bottom=0,right=0]',
          },
          children: [
            { id: String(rootId), width: NODE_WIDTH, height: NODE_HEIGHT },
            { id: String(spouseId), width: NODE_WIDTH, height: NODE_HEIGHT },
          ],
          edges: [{
            id: `e_spouse_${rootId}_${spouseId}`,
            sources: [String(rootId)],
            targets: [String(spouseId)],
          }],
        });
        continue;
      }

      if (memberId === spouseId) continue;

      elkNodes.push({
        id: String(memberId),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        layoutOptions: {
          'elk.layered.layerConstraint': layerToConstraint(layer),
        },
      });
    }

    treeData.relationships.forEach(rel => {
      const edgeType = getEdgeType(rel.relationshipType);
      if (edgeType === 'spouse') return;

      const fromNodeId = spouseId && rel.fromMemberId === rootId
        ? `couple_${rootId}`
        : String(rel.fromMemberId);
      const toNodeId = String(rel.toMemberId);

      if (isParentRelation(rel.relationshipType)) {
        elkEdges.push({ id: `e_${rel.id}`, sources: [toNodeId], targets: [fromNodeId] });
      } else {
        elkEdges.push({ id: `e_${rel.id}`, sources: [fromNodeId], targets: [toNodeId] });
      }
    });

    const elkGraph: ElkNode = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '50',
        'elk.layered.spacing.nodeNodeBetweenLayers': '140',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      },
      children: elkNodes,
      edges: elkEdges,
    };

    try {
      const layoutResult = await elk.layout(elkGraph);
      const rfNodes: Node[] = [];
      const rfEdges: Edge[] = [];

      const extractNodes = (elkNode: ElkNode, offsetX = 0, offsetY = 0) => {
        if (elkNode.children) {
          for (const child of elkNode.children) {
            const x = (child.x ?? 0) + offsetX;
            const y = (child.y ?? 0) + offsetY;

            if (child.children && child.id.startsWith('couple_')) {
              extractNodes(child, x, y);
            } else {
              const memberId = Number(child.id);
              const member = membersMap.get(memberId);
              if (!member) continue;

              const isRoot = memberId === rootId;
              const rel = relMap.get(memberId);

              rfNodes.push({
                id: child.id,
                type: 'familyMember',
                position: { x, y },
                style: { overflow: 'visible' },
                data: {
                  member,
                  relationship: rel,
                  isRoot,
                } satisfies FamilyNodeData,
              });
            }
          }
        }
      };

      extractNodes(layoutResult);

      treeData.relationships.forEach(rel => {
        const edgeType = getEdgeType(rel.relationshipType);

        if (edgeType === 'spouse') {
          rfEdges.push({
            id: `edge_spouse_${rel.id}`,
            source: String(rel.fromMemberId),
            target: String(rel.toMemberId),
            type: 'spouse',
          });
          return;
        }

        if (isParentRelation(rel.relationshipType)) {
          rfEdges.push({
            id: `edge_${rel.id}`,
            source: String(rel.toMemberId),
            target: String(rel.fromMemberId),
            type: edgeType,
          });
        } else {
          rfEdges.push({
            id: `edge_${rel.id}`,
            source: String(rel.fromMemberId),
            target: String(rel.toMemberId),
            type: edgeType,
          });
        }
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      console.error('ELK layout error:', err);
      fallbackLayout(treeData, membersMap, relMap, rootId, setNodes, setEdges);
    } finally {
      setIsLayouting(false);
    }
  }, [treeData]);

  useEffect(() => {
    void computeLayout();
  }, [computeLayout]);

  return { nodes, edges, isLayouting };
}

function layerToConstraint(layer: number): string {
  if (layer <= -2) return 'FIRST';
  if (layer >= 2) return 'LAST';
  return 'NONE';
}

function fallbackLayout(
  treeData: FamilyTreeResponse,
  membersMap: Map<number, FamilyTreeMember>,
  relMap: Map<number, FamilyRelationshipDto>,
  rootId: number,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  const layers = new Map<number, number[]>();
  layers.set(0, [rootId]);

  treeData.relationships.forEach(rel => {
    const layer = getLayer(rel.relationshipType);
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(rel.toMemberId);
  });

  const sortedLayers = [...layers.keys()].sort((a, b) => a - b);

  sortedLayers.forEach((layer, layerIdx) => {
    const memberIds = layers.get(layer)!;
    const totalWidth = memberIds.length * (NODE_WIDTH + 50);
    const startX = -totalWidth / 2;

    memberIds.forEach((memberId, idx) => {
      const member = membersMap.get(memberId);
      if (!member) return;

      rfNodes.push({
        id: String(memberId),
        type: 'familyMember',
        position: {
          x: startX + idx * (NODE_WIDTH + 50),
          y: layerIdx * (NODE_HEIGHT + 140),
        },
        style: { overflow: 'visible' },
        data: {
          member,
          relationship: relMap.get(memberId),
          isRoot: memberId === rootId,
        } satisfies FamilyNodeData,
      });
    });
  });

  treeData.relationships.forEach(rel => {
    const edgeType = getEdgeType(rel.relationshipType);
    if (isParentRelation(rel.relationshipType)) {
      rfEdges.push({ id: `edge_${rel.id}`, source: String(rel.toMemberId), target: String(rel.fromMemberId), type: edgeType });
    } else {
      rfEdges.push({ id: `edge_${rel.id}`, source: String(rel.fromMemberId), target: String(rel.toMemberId), type: edgeType });
    }
  });

  setNodes(rfNodes);
  setEdges(rfEdges);
}
