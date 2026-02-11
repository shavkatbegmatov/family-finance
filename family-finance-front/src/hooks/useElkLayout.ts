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
const NODE_WIDTH = 200;
const NODE_HEIGHT = 160;

const elk = new ELK();

// ============ Layer Mapping ============
// Determines what generation layer a relationship type maps to
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

// Edge type based on relationship
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

// Whether this relationship type is a "parent" of root (so edge goes upward)
function isParentRelation(type: RelationshipType): boolean {
  return ['OTA', 'ONA', 'BOBO', 'BUVI', 'QAYIN_OTA', 'QAYIN_ONA', 'AMAKI', 'TOGHA', 'AMMA', 'XOLA'].includes(type);
}

export interface FamilyNodeData {
  member: FamilyTreeMember;
  relationship?: FamilyRelationshipDto;
  isRoot: boolean;
  onAddRelation?: (memberId: number, suggestedCategory?: string) => void;
  onEditMember?: (memberId: number) => void;
  onContextMenu?: (event: React.MouseEvent, member: FamilyTreeMember, isRoot: boolean, relationship?: FamilyRelationshipDto) => void;
  onLongPress?: (x: number, y: number, member: FamilyTreeMember, isRoot: boolean, relationship?: FamilyRelationshipDto) => void;
}

export function useElkLayout(
  treeData: FamilyTreeResponse | null,
  callbacks?: {
    onAddRelation?: (memberId: number, suggestedCategory?: string) => void;
    onEditMember?: (memberId: number) => void;
    onContextMenu?: (event: React.MouseEvent, member: FamilyTreeMember, isRoot: boolean, relationship?: FamilyRelationshipDto) => void;
    onLongPress?: (x: number, y: number, member: FamilyTreeMember, isRoot: boolean, relationship?: FamilyRelationshipDto) => void;
  },
) {
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

    // Build relationship lookup: toMemberId -> relationship (from root perspective)
    const relMap = new Map<number, FamilyRelationshipDto>();
    treeData.relationships.forEach(r => {
      relMap.set(r.toMemberId, r);
    });

    // Group members by layer
    const layerMap = new Map<number, number[]>(); // layer -> memberIds

    // Root is always layer 0
    const memberLayers = new Map<number, number>();
    memberLayers.set(rootId, 0);

    // Assign layers based on relationships
    treeData.relationships.forEach(rel => {
      const layer = getLayer(rel.relationshipType);
      memberLayers.set(rel.toMemberId, layer);
    });

    // Group by layer
    for (const [memberId, layer] of memberLayers) {
      if (!layerMap.has(layer)) layerMap.set(layer, []);
      layerMap.get(layer)!.push(memberId);
    }

    // Find spouse (er/xotin) for coupling
    let spouseId: number | null = null;
    treeData.relationships.forEach(rel => {
      if (rel.relationshipType === 'ER' || rel.relationshipType === 'XOTIN') {
        spouseId = rel.toMemberId;
      }
    });

    // ============ Build ELK Graph ============
    const elkNodes: ElkNode[] = [];
    const elkEdges: ElkExtendedEdge[] = [];

    // Create ELK nodes with layer constraints
    for (const [memberId, layer] of memberLayers) {
      const member = membersMap.get(memberId);
      if (!member) continue;

      // If this is root and there's a spouse, create a compound node
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
            {
              id: String(rootId),
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
            },
            {
              id: String(spouseId),
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
            },
          ],
          edges: [
            {
              id: `e_spouse_${rootId}_${spouseId}`,
              sources: [String(rootId)],
              targets: [String(spouseId)],
            },
          ],
        });
        continue;
      }

      // Skip spouse as it's inside couple compound node
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

    // Create ELK edges
    treeData.relationships.forEach(rel => {
      const edgeType = getEdgeType(rel.relationshipType);

      // Skip spouse edge — handled inside compound node
      if (edgeType === 'spouse') return;

      const fromNodeId = spouseId && rel.fromMemberId === rootId
        ? `couple_${rootId}`
        : String(rel.fromMemberId);

      const toNodeId = String(rel.toMemberId);

      // For parent/grandparent relations, edge direction: child -> parent (reversed for layout)
      if (isParentRelation(rel.relationshipType)) {
        elkEdges.push({
          id: `e_${rel.id}`,
          sources: [toNodeId],
          targets: [fromNodeId],
        });
      } else if (edgeType === 'sibling') {
        // Siblings: connect to root/couple
        elkEdges.push({
          id: `e_${rel.id}`,
          sources: [fromNodeId],
          targets: [toNodeId],
        });
      } else {
        // Parent-child: root -> child
        elkEdges.push({
          id: `e_${rel.id}`,
          sources: [fromNodeId],
          targets: [toNodeId],
        });
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

      // Process layout result — extract node positions
      const extractNodes = (elkNode: ElkNode, offsetX = 0, offsetY = 0) => {
        if (elkNode.children) {
          for (const child of elkNode.children) {
            const x = (child.x ?? 0) + offsetX;
            const y = (child.y ?? 0) + offsetY;

            if (child.children && child.id.startsWith('couple_')) {
              // Compound couple node — extract children
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
                data: {
                  member,
                  relationship: rel,
                  isRoot,
                  onAddRelation: callbacks?.onAddRelation,
                  onEditMember: callbacks?.onEditMember,
                  onContextMenu: callbacks?.onContextMenu,
                  onLongPress: callbacks?.onLongPress,
                } satisfies FamilyNodeData,
              });
            }
          }
        }
      };

      extractNodes(layoutResult);

      // Build React Flow edges from relationships
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

        // For parent relations, swap source/target for visual correctness
        // (parent should appear above child)
        if (isParentRelation(rel.relationshipType)) {
          rfEdges.push({
            id: `edge_${rel.id}`,
            source: String(rel.toMemberId),
            target: String(rel.fromMemberId),
            type: edgeType,
            data: { relationshipType: rel.relationshipType },
          });
        } else {
          rfEdges.push({
            id: `edge_${rel.id}`,
            source: String(rel.fromMemberId),
            target: String(rel.toMemberId),
            type: edgeType,
            data: { relationshipType: rel.relationshipType },
          });
        }
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      console.error('ELK layout error:', err);
      // Fallback: simple grid layout
      fallbackLayout(treeData, membersMap, relMap, rootId, setNodes, setEdges, callbacks);
    } finally {
      setIsLayouting(false);
    }
  }, [treeData, callbacks]);

  useEffect(() => {
    void computeLayout();
  }, [computeLayout]);

  return { nodes, edges, isLayouting };
}

// Layer number to ELK constraint string
function layerToConstraint(layer: number): string {
  // ELK doesn't have negative layer constraints.
  // We use layerConstraint only for extreme layers.
  if (layer <= -2) return 'FIRST';
  if (layer >= 2) return 'LAST';
  return 'NONE';
}

// Simple fallback layout if ELK fails
function fallbackLayout(
  treeData: FamilyTreeResponse,
  membersMap: Map<number, FamilyTreeMember>,
  relMap: Map<number, FamilyRelationshipDto>,
  rootId: number,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  callbacks?: {
    onAddRelation?: (memberId: number, suggestedCategory?: string) => void;
    onEditMember?: (memberId: number) => void;
    onContextMenu?: (event: React.MouseEvent, member: FamilyTreeMember, isRoot: boolean, relationship?: FamilyRelationshipDto) => void;
    onLongPress?: (x: number, y: number, member: FamilyTreeMember, isRoot: boolean, relationship?: FamilyRelationshipDto) => void;
  },
) {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  // Group by layer
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

      const isRoot = memberId === rootId;
      const rel = relMap.get(memberId);

      rfNodes.push({
        id: String(memberId),
        type: 'familyMember',
        position: {
          x: startX + idx * (NODE_WIDTH + 50),
          y: layerIdx * (NODE_HEIGHT + 140),
        },
        data: {
          member,
          relationship: rel,
          isRoot,
          onAddRelation: callbacks?.onAddRelation,
          onEditMember: callbacks?.onEditMember,
          onContextMenu: callbacks?.onContextMenu,
          onLongPress: callbacks?.onLongPress,
        } satisfies FamilyNodeData,
      });
    });
  });

  // Edges
  treeData.relationships.forEach(rel => {
    const edgeType = getEdgeType(rel.relationshipType);
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
}
