import { useCallback, useRef, useEffect, useMemo } from 'react';
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
import { useActivePersonsQuery } from '../../../hooks/useFamilyTreeQueries';
import { nodeTypes, edgeTypes } from './nodeTypes';
import { useFamilyTreeStore } from '../../../store/familyTreeStore';
import type { TreeResponse, PersonNodeData } from '../../../types';

export interface FamilyFlowTreeProps {
  treeData: TreeResponse;
}

export function FamilyFlowTree({ treeData }: FamilyFlowTreeProps) {
  const { data: activePersons = [] } = useActivePersonsQuery();

  const effectiveTreeData = useMemo<TreeResponse>(() => {
    if (!treeData.persons.length || !activePersons.length) {
      return treeData;
    }

    const activeById = new Map(activePersons.map((person) => [person.id, person]));

    return {
      ...treeData,
      persons: treeData.persons.map((treePerson) => {
        const activePerson = activeById.get(treePerson.id);
        if (!activePerson) return treePerson;

        return {
          ...treePerson,
          firstName: activePerson.firstName ?? treePerson.firstName,
          lastName: activePerson.lastName ?? treePerson.lastName,
          middleName: activePerson.middleName ?? treePerson.middleName,
          fullName: activePerson.fullName ?? treePerson.fullName,
          role: activePerson.role ?? treePerson.role,
          gender: activePerson.gender ?? treePerson.gender,
          birthDate: activePerson.birthDate ?? treePerson.birthDate,
          birthPlace: activePerson.birthPlace ?? treePerson.birthPlace,
          deathDate: activePerson.deathDate ?? treePerson.deathDate,
          phone: activePerson.phone ?? treePerson.phone,
          avatar: activePerson.avatar ?? treePerson.avatar,
          isActive: activePerson.isActive ?? treePerson.isActive,
          userId: activePerson.userId ?? treePerson.userId,
          relationshipLabel: treePerson.relationshipLabel,
        };
      }),
    };
  }, [treeData, activePersons]);

  const { nodes, edges, isLayouting } = useElkLayout(effectiveTreeData);
  const closeContextMenu = useFamilyTreeStore((s) => s.closeContextMenu);
  const openModal = useFamilyTreeStore((s) => s.openModal);
  const openContextMenu = useFamilyTreeStore((s) => s.openContextMenu);
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

    const { pendingFocus: currentFocus } = useFamilyTreeStore.getState();

    if (currentFocus && currentFocus.requestId > handledFocusRequestId.current) {
      // Node'ni markazga olish — fitView o'rniga
      requestAnimationFrame(() => {
        const { pendingFocus: latestFocus, setPendingFocus: clearFocus } = useFamilyTreeStore.getState();
        if (!latestFocus || latestFocus.requestId !== currentFocus.requestId) return;

        const node = reactFlow.getNode(latestFocus.nodeId);
        if (!node) return;

        const x = node.position.x + (node.measured?.width ?? 200) / 2;
        const y = node.position.y + (node.measured?.height ?? 140) / 2;
        reactFlow.setCenter(x, y, {
          zoom: latestFocus.zoom ?? reactFlow.getZoom(),
          duration: 500,
        });
        handledFocusRequestId.current = latestFocus.requestId;
        clearFocus(null);
      });
      return;
    }

    if (wasInitialLoad) {
      // Birinchi marta — fitView
      requestAnimationFrame(() => {
        reactFlow.fitView({ padding: 0.2 });
      });
      return;
    }

    if (savedViewport.current) {
      requestAnimationFrame(() => {
        reactFlow.setViewport(savedViewport.current!, { duration: 0 });
      });
    }
  }, [nodes, edges, isLayouting, reactFlow]);

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
    } else if (node.id.startsWith('fu_pair_')) {
      const fuId = Number(node.id.replace('fu_pair_', ''));
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
          if (node.id.startsWith('fu_pair_')) return '#6366f1';
          if (node.id.startsWith('fu_bus_')) return '#94a3b8';
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
