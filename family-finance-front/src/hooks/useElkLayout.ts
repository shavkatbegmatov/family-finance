import { useCallback, useEffect, useState } from 'react';
import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { TreeResponse, TreePerson, PersonNodeData, FamilyUnitNodeData } from '../types';

// ============ Constants ============
export const PERSON_NODE_WIDTH = 200;
export const PERSON_NODE_HEIGHT = 140;
export const FAMILY_UNIT_NODE_WIDTH = 40;
export const FAMILY_UNIT_NODE_HEIGHT = 20;

const elk = new ELK();

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
      treeData.persons.forEach(p => personsMap.set(p.id, p));

      const rootId = treeData.rootPersonId;

      // ============ Build ELK Graph ============
      const elkNodes: ElkNode[] = [];
      const elkEdges: ElkExtendedEdge[] = [];

      // Track which persons have been added as ELK nodes
      const addedPersons = new Set<number>();

      // 1. Add all person nodes
      treeData.persons.forEach(person => {
        if (addedPersons.has(person.id)) return;
        addedPersons.add(person.id);

        elkNodes.push({
          id: `person_${person.id}`,
          width: PERSON_NODE_WIDTH,
          height: PERSON_NODE_HEIGHT,
        });
      });

      // 2. Add FamilyUnit junction nodes and edges
      treeData.familyUnits.forEach(fu => {
        const fuNodeId = `fu_${fu.id}`;

        elkNodes.push({
          id: fuNodeId,
          width: FAMILY_UNIT_NODE_WIDTH,
          height: FAMILY_UNIT_NODE_HEIGHT,
        });

        // Partner → FamilyUnit edges (horizontal conceptually)
        fu.partners.forEach(partner => {
          const personNodeId = `person_${partner.personId}`;
          if (addedPersons.has(partner.personId)) {
            elkEdges.push({
              id: `e_partner_${fu.id}_${partner.personId}`,
              sources: [personNodeId],
              targets: [fuNodeId],
            });
          }
        });

        // FamilyUnit → Child edges (vertical downward)
        fu.children.forEach(child => {
          const personNodeId = `person_${child.personId}`;
          if (addedPersons.has(child.personId)) {
            elkEdges.push({
              id: `e_child_${fu.id}_${child.personId}`,
              sources: [fuNodeId],
              targets: [personNodeId],
            });
          }
        });
      });

      const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.spacing.nodeNode': '50',
          'elk.layered.spacing.nodeNodeBetweenLayers': '100',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        },
        children: elkNodes,
        edges: elkEdges,
      };

      const layoutResult = await elk.layout(elkGraph);

      // ============ Convert ELK result to ReactFlow nodes/edges ============
      const rfNodes: Node[] = [];
      const rfEdges: Edge[] = [];

      if (layoutResult.children) {
        for (const child of layoutResult.children) {
          const x = child.x ?? 0;
          const y = child.y ?? 0;

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
          } else if (child.id.startsWith('fu_')) {
            const fuId = Number(child.id.replace('fu_', ''));
            const fu = treeData.familyUnits.find(u => u.id === fuId);
            if (!fu) continue;

            rfNodes.push({
              id: child.id,
              type: 'familyUnitNode',
              position: { x, y },
              data: {
                familyUnit: fu,
              } satisfies FamilyUnitNodeData,
            });
          }
        }
      }

      // Create ReactFlow edges
      treeData.familyUnits.forEach(fu => {
        const fuNodeId = `fu_${fu.id}`;

        // Partner → FamilyUnit (marriage edges)
        fu.partners.forEach(partner => {
          if (addedPersons.has(partner.personId)) {
            rfEdges.push({
              id: `edge_marriage_${fu.id}_${partner.personId}`,
              source: `person_${partner.personId}`,
              target: fuNodeId,
              type: 'marriageEdge',
              data: { marriageType: fu.marriageType, status: fu.status },
            });
          }
        });

        // FamilyUnit → Child (child edges)
        fu.children.forEach(child => {
          if (addedPersons.has(child.personId)) {
            rfEdges.push({
              id: `edge_child_${fu.id}_${child.personId}`,
              source: fuNodeId,
              target: `person_${child.personId}`,
              type: 'childEdge',
              data: { lineageType: child.lineageType },
            });
          }
        });
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      console.error('ELK layout error:', err);
      // Fallback: simple vertical layout
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

function fallbackLayout(
  treeData: TreeResponse,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  // Simple grid layout
  treeData.persons.forEach((person, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);

    rfNodes.push({
      id: `person_${person.id}`,
      type: 'personNode',
      position: {
        x: col * (PERSON_NODE_WIDTH + 60),
        y: row * (PERSON_NODE_HEIGHT + 100),
      },
      style: { overflow: 'visible' },
      data: {
        person,
        isRoot: person.id === treeData.rootPersonId,
        label: person.relationshipLabel,
      } satisfies PersonNodeData,
    });
  });

  treeData.familyUnits.forEach(fu => {
    fu.partners.forEach(partner => {
      fu.children.forEach(child => {
        rfEdges.push({
          id: `edge_fallback_${fu.id}_${partner.personId}_${child.personId}`,
          source: `person_${partner.personId}`,
          target: `person_${child.personId}`,
          type: 'childEdge',
          data: { lineageType: child.lineageType },
        });
      });
    });
  });

  setNodes(rfNodes);
  setEdges(rfEdges);
}
