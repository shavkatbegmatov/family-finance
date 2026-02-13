import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  ReactFlowProvider,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useElkLayout } from '../../../hooks/useElkLayout';
import { nodeTypes, edgeTypes } from './nodeTypes';
import { useFamilyTreeStore } from '../../../store/familyTreeStore';
import type { TreeResponse, PersonNodeData } from '../../../types';

export interface FamilyFlowTreeProps {
  treeData: TreeResponse;
}

export function FamilyFlowTree({ treeData }: FamilyFlowTreeProps) {
  const { nodes, edges, isLayouting } = useElkLayout(treeData);
  const { closeContextMenu, openModal, openContextMenu } = useFamilyTreeStore();

  const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    if (node.id.startsWith('person_')) {
      const data = node.data as unknown as PersonNodeData;
      openContextMenu({
        x: (event as unknown as React.MouseEvent).clientX,
        y: (event as unknown as React.MouseEvent).clientY,
        personId: data.person.id,
        personName: data.person.fullName,
        isRoot: data.isRoot,
        personUserId: data.person.userId,
      });
    } else if (node.id.startsWith('fu_')) {
      const fuId = Number(node.id.replace('fu_', ''));
      openContextMenu({
        x: (event as unknown as React.MouseEvent).clientX,
        y: (event as unknown as React.MouseEvent).clientY,
        familyUnitId: fuId,
      });
    }
  }, [openContextMenu]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.id.startsWith('person_')) {
      const data = node.data as unknown as PersonNodeData;
      openModal({ type: 'personDetail', personId: data.person.id });
    }
  }, [openModal]);

  if (isLayouting) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeContextMenu={handleNodeContextMenu}
      onNodeClick={handleNodeClick}
      onPaneClick={closeContextMenu}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2.0}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
    >
      <Background gap={20} size={1} color="oklch(var(--bc) / 0.07)" />
      <MiniMap
        nodeColor={(node) => {
          if (node.id.startsWith('fu_')) return '#6366f1';
          const gender = (node.data as { person?: { gender?: string } })?.person?.gender;
          if (gender === 'MALE') return '#60a5fa';
          if (gender === 'FEMALE') return '#f472b6';
          return '#fbbf24';
        }}
        maskColor="oklch(var(--b1) / 0.7)"
        className="!bg-base-200/50 !border-base-300"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

export { ReactFlowProvider };
