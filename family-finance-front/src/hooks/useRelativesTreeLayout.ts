import { useMemo } from 'react';
import calcTree from 'relatives-tree';
import type { Node, ExtNode, Connector, RelType, Gender } from 'relatives-tree/lib/types';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type {
    TreeResponse,
    PersonNodeData,
} from '../types';

export const PERSON_NODE_WIDTH = 200;
export const PERSON_NODE_HEIGHT = 140;
export const X_SPACING = 250;
export const Y_SPACING = 200;

export function useRelativesTreeLayout(treeData: TreeResponse | null) {
    return useMemo(() => {
        if (!treeData || treeData.persons.length === 0) {
            return { nodes: [], edges: [], isLayouting: false };
        }

        const { persons, familyUnits, rootPersonId } = treeData;

        // 1. Transform TreeResponse to relatives-tree Node format
        const rtNodes: Node[] = persons.map((person) => {
            const id = String(person.id);
            const gender = person.gender === 'FEMALE' ? 'female' as Gender : 'male' as Gender;

            const parents: { id: string; type: RelType }[] = [];
            const children: { id: string; type: RelType }[] = [];
            const siblings: { id: string; type: RelType }[] = [];
            const spouses: { id: string; type: RelType }[] = [];

            // Find relationships based on familyUnits
            familyUnits.forEach((fu) => {
                const isPartner = fu.partners.some((p) => p.personId === person.id);
                const isChild = fu.children.some((c) => c.personId === person.id);

                if (isPartner) {
                    // Identify spouses
                    fu.partners.forEach((p) => {
                        if (p.personId !== person.id) {
                            spouses.push({ id: String(p.personId), type: 'married' as RelType });
                        }
                    });
                    // Identify children
                    fu.children.forEach((c) => {
                        // relatives-tree expects 'blood' or 'adopted' etc
                        const type: RelType = c.lineageType === 'ADOPTED' ? 'adopted' as RelType : 'blood' as RelType;
                        children.push({ id: String(c.personId), type });
                    });
                }

                if (isChild) {
                    // Identify parents
                    fu.partners.forEach((p) => {
                        // We assume blood relation for parents here by default unless specified
                        parents.push({ id: String(p.personId), type: 'blood' as RelType });
                    });
                    // Identify siblings
                    fu.children.forEach((c) => {
                        if (c.personId !== person.id) {
                            siblings.push({ id: String(c.personId), type: 'blood' as RelType });
                        }
                    });
                }
            });

            return {
                id,
                gender,
                parents,
                children,
                siblings,
                spouses,
            };
        });

        // We must ensure the root node exists in our rtNodes
        const rootIdStr = String(rootPersonId);
        if (!rtNodes.find((n) => n.id === rootIdStr)) {
            return { nodes: [], edges: [], isLayouting: false }; // Fallback
        }

        try {
            // 2. Calculate layout
            const layoutParams = {
                rootId: rootIdStr,
                placeholders: true,
            };
            const layoutData = calcTree(rtNodes, layoutParams);

            // 3. Transform layoutData back to ReactFlow format
            const rfNodes: ReactFlowNode[] = [];

            layoutData.nodes.forEach((layoutNode: ExtNode) => {
                // Find original person data
                const person = persons.find((p) => String(p.id) === layoutNode.id);

                // Skip if person not found (e.g., placeholders). We might want to render placeholders later if needed, but for now skip or render barebones.
                if (layoutNode.placeholder) {
                    rfNodes.push({
                        id: `placeholder_${layoutNode.id}`,
                        type: 'placeholderNode', // Use simple invisible node
                        position: {
                            x: layoutNode.left * X_SPACING,
                            y: layoutNode.top * Y_SPACING,
                        },
                        data: {
                            isPlaceholder: true,
                            person: { id: parseInt(layoutNode.id, 10) }
                        } as unknown as Record<string, unknown>,
                    });
                    return;
                }

                if (person) {
                    rfNodes.push({
                        id: `person_${person.id}`,
                        type: 'personNode',
                        position: {
                            x: layoutNode.left * X_SPACING,
                            y: layoutNode.top * Y_SPACING,
                        },
                        data: {
                            person,
                            isRoot: person.id === rootPersonId,
                            label: person.relationshipLabel,
                        } satisfies PersonNodeData,
                    });
                }
            });

            // 4. Transform Connectors to ReactFlow Edges
            // relatives-tree returns connectors as [x1, y1, x2, y2]
            const rfEdges: ReactFlowEdge[] = layoutData.connectors.map((connector: Connector, index: number) => {
                const [x1, y1, x2, y2] = connector;

                // React Flow culls edges if their source and target nodes are out of viewport.
                // To prevent connectors from disappearing, we bind them to the real nodes
                // closest to their start and end coordinates.
                let sourceNodeId = rfNodes.length > 0 ? rfNodes[0].id : 'dummy';
                let targetNodeId = rfNodes.length > 0 ? rfNodes[0].id : 'dummy';
                let minSourceDist = Infinity;
                let minTargetDist = Infinity;

                rfNodes.forEach((rn) => {
                    const topoLeft = rn.position.x / X_SPACING;
                    const topoTop = rn.position.y / Y_SPACING;

                    // 'relatives-tree' coordinates are topological, where a node spans 2x2 grid units.
                    // The center of a node at (left, top) is (left + 1, top + 1)
                    const rnCenterX = topoLeft + 1;
                    const rnCenterY = topoTop + 1;

                    const d1 = Math.abs(rnCenterX - x1) + Math.abs(rnCenterY - y1);
                    if (d1 < minSourceDist) {
                        minSourceDist = d1;
                        sourceNodeId = rn.id;
                    }

                    const d2 = Math.abs(rnCenterX - x2) + Math.abs(rnCenterY - y2);
                    if (d2 < minTargetDist) {
                        minTargetDist = d2;
                        targetNodeId = rn.id;
                    }
                });

                // Custom edge type to render raw SVG lines given absolute coordinates
                // We subtract 1 from the topological coordinate to naturally map back to our
                // Node (left, top) bounds which represent the visual space for ReactFlow positions.
                return {
                    id: `conn_${index}`,
                    type: 'relativesTreeEdge',
                    source: sourceNodeId,
                    target: targetNodeId,
                    data: {
                        startX: (x1 - 1) * X_SPACING + PERSON_NODE_WIDTH / 2,
                        startY: (y1 - 1) * Y_SPACING + PERSON_NODE_HEIGHT / 2,
                        endX: (x2 - 1) * X_SPACING + PERSON_NODE_WIDTH / 2,
                        endY: (y2 - 1) * Y_SPACING + PERSON_NODE_HEIGHT / 2,
                    },
                };
            });

            return {
                nodes: rfNodes,
                edges: rfEdges,
                isLayouting: false,
            };
        } catch (err) {
            console.error('relatives-tree calculation failed:', err);
            return { nodes: [], edges: [], isLayouting: false };
        }
    }, [treeData]);
}
