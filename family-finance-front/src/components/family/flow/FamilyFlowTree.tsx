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
import type {
  FamilyTreeResponse,
  FamilyTreeMember,
  FamilyRelationshipDto,
} from '../../../types';

export interface FamilyFlowTreeProps {
  treeData: FamilyTreeResponse;
  onAddRelation?: (memberId: number, suggestedCategory?: string) => void;
  onEditMember?: (memberId: number) => void;
  onContextMenu?: (
    event: React.MouseEvent,
    member: FamilyTreeMember,
    isRoot: boolean,
    relationship?: FamilyRelationshipDto,
  ) => void;
  onLongPress?: (
    x: number,
    y: number,
    member: FamilyTreeMember,
    isRoot: boolean,
    relationship?: FamilyRelationshipDto,
  ) => void;
  onPaneClick?: () => void;
}

export function FamilyFlowTree({
  treeData,
  onAddRelation,
  onEditMember,
  onContextMenu,
  onLongPress,
  onPaneClick,
}: FamilyFlowTreeProps) {
  const { nodes, edges, isLayouting } = useElkLayout(treeData, {
    onAddRelation,
    onEditMember,
    onContextMenu,
    onLongPress,
  });

  const handleNodeContextMenu: NodeMouseHandler = useCallback((event) => {
    event.preventDefault();
  }, []);

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
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={2.0}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
    >
      <Background gap={20} size={1} color="oklch(var(--bc) / 0.07)" />
      <MiniMap
        nodeColor={(node) => {
          const gender = (node.data as { member?: { gender?: string } })?.member?.gender;
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

// Re-export the provider for FamilyTreeView to wrap everything
export { ReactFlowProvider };
