import { useCallback, createContext, useContext } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  ReactFlowProvider,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useElkLayout, type FamilyNodeData } from '../../../hooks/useElkLayout';
import { nodeTypes, edgeTypes } from './nodeTypes';
import type {
  FamilyTreeResponse,
  FamilyTreeMember,
  FamilyRelationshipDto,
} from '../../../types';

// ============ Context for callbacks ============
// This lets custom nodes access callbacks without baking them into node data
interface FamilyFlowCallbacks {
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
}

const FamilyFlowCallbacksContext = createContext<FamilyFlowCallbacks>({});

export function useFamilyFlowCallbacks() {
  return useContext(FamilyFlowCallbacksContext);
}

// ============ Component ============
export interface FamilyFlowTreeProps extends FamilyFlowCallbacks {
  treeData: FamilyTreeResponse;
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
  const { nodes, edges, isLayouting } = useElkLayout(treeData);

  const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    const data = node.data as unknown as FamilyNodeData;
    onContextMenu?.(event as unknown as React.MouseEvent, data.member, data.isRoot, data.relationship);
  }, [onContextMenu]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const data = node.data as unknown as FamilyNodeData;
    onEditMember?.(data.member.id);
  }, [onEditMember]);

  if (isLayouting) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <FamilyFlowCallbacksContext.Provider value={{ onAddRelation, onEditMember, onContextMenu, onLongPress }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeClick={handleNodeClick}
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
    </FamilyFlowCallbacksContext.Provider>
  );
}

export { ReactFlowProvider };
