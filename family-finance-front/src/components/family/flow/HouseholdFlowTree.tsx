import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react';
import toast from 'react-hot-toast';
import { useHouseholdLayout } from '../../../hooks/useHouseholdLayout';
import { nodeTypes, edgeTypes } from './nodeTypes';
import { useScopeStore } from '../../../store/scopeStore';
import { useSwitchScope } from '../../../hooks/useSwitchScope';
import type { HouseholdTreeResponse } from '../../../types';

export interface HouseholdFlowTreeProps {
  data: HouseholdTreeResponse;
}

export function HouseholdFlowTree({ data }: HouseholdFlowTreeProps) {
  const { nodes, edges, isLayouting } = useHouseholdLayout(data);
  const reactFlow = useReactFlow();
  const isInitialLoad = useRef(true);
  const myScopes = useScopeStore((s) => s.myScopes);
  const { switchScope } = useSwitchScope();

  // Xonadon qutisini bosish → o'sha xonadonning moliyaviy scope'iga o'tish.
  // (Ichidagi shaxs bosilsa, HouseholdNode stopPropagation qilib personDetail ochadi.)
  const handleNodeClick = useCallback<NodeMouseHandler>((_event, node) => {
    if (!node.id.startsWith('household_')) return;
    const scopeId = Number(node.id.replace('household_', ''));
    const target = myScopes.find((s) => s.id === scopeId);
    if (target) {
      void switchScope(target);
    } else {
      toast("Bu xonadon faol scope ro'yxatingizda yo'q", { icon: 'ℹ️' });
    }
  }, [myScopes, switchScope]);

  useEffect(() => {
    if (isLayouting || nodes.length === 0) return;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      requestAnimationFrame(() => reactFlow.fitView({ padding: 0.2 }));
    }
  }, [nodes, isLayouting, reactFlow]);

  if (isLayouting) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <p className="text-sm text-base-content/50">
          Xonadonlar topilmadi. Oila a'zolarini xonadonga (HOUSEHOLD scope) bog'lang.
        </p>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={handleNodeClick}
      minZoom={0.2}
      maxZoom={2.0}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
    >
      <Background gap={20} size={1} color="oklch(var(--bc) / 0.07)" />
      <MiniMap
        nodeColor="#6366f1"
        maskColor="oklch(var(--b1) / 0.7)"
        className="!border-base-300 !bg-base-200/50"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

export { ReactFlowProvider };
