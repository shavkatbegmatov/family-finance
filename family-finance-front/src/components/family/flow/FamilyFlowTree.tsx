import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
  type Viewport,
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
  const closeContextMenu = useFamilyTreeStore((s) => s.closeContextMenu);
  const openModal = useFamilyTreeStore((s) => s.openModal);
  const openContextMenu = useFamilyTreeStore((s) => s.openContextMenu);
  const pendingFocus = useFamilyTreeStore((s) => s.pendingFocus);
  const reactFlow = useReactFlow();
  const isInitialLoad = useRef(true);
  const savedViewport = useRef<Viewport | null>(null);
  const handledFocusRequestId = useRef(0);

  useEffect(() => {
    if (isLayouting || nodes.length === 0) return;

    const wasInitialLoad = isInitialLoad.current;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }

    if (pendingFocus && pendingFocus.requestId > handledFocusRequestId.current) {
      const pendingPersonId = Number(pendingFocus.nodeId.replace('person_', ''));
      if (!Number.isNaN(pendingPersonId) && treeData.rootPersonId !== pendingPersonId) {
        return;
      }

      requestAnimationFrame(() => {
        const { pendingFocus: latestPendingFocus, setPendingFocus } = useFamilyTreeStore.getState();
        if (!latestPendingFocus || latestPendingFocus.requestId !== pendingFocus.requestId) return;

        const node = reactFlow.getNode(latestPendingFocus.nodeId);
        if (!node) {
          return;
        }

        const x = node.position.x + (node.measured?.width ?? 200) / 2;
        const y = node.position.y + (node.measured?.height ?? 140) / 2;
        reactFlow.setCenter(x, y, {
          zoom: latestPendingFocus.zoom ?? reactFlow.getZoom(),
          duration: 500,
        });
        handledFocusRequestId.current = latestPendingFocus.requestId;
        setPendingFocus(null);
      });
      return;
    }

    if (wasInitialLoad) return;

    if (savedViewport.current) {
      requestAnimationFrame(() => {
        reactFlow.setViewport(savedViewport.current!, { duration: 0 });
      });
    }
  }, [nodes, edges, isLayouting, pendingFocus, reactFlow, treeData.rootPersonId]);

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

  const handleMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
    savedViewport.current = viewport;
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
      onNodeClick={handleNodeClick}
      onPaneClick={closeContextMenu}
      onMoveEnd={handleMoveEnd}
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
