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
import { Home, Users } from 'lucide-react';
import { useHouseholdLayout } from '../../../hooks/useHouseholdLayout';
import { nodeTypes, edgeTypes } from './nodeTypes';
import { useScopeStore } from '../../../store/scopeStore';
import { useFamilyTreeStore } from '../../../store/familyTreeStore';
import { useSwitchScope } from '../../../hooks/useSwitchScope';
import type { HouseholdTreeResponse, HouseholdNodeData } from '../../../types';

export interface HouseholdFlowTreeProps {
  data: HouseholdTreeResponse;
}

export function HouseholdFlowTree({ data }: HouseholdFlowTreeProps) {
  const { nodes, edges, isLayouting } = useHouseholdLayout(data);
  const reactFlow = useReactFlow();
  const isInitialLoad = useRef(true);
  const myScopes = useScopeStore((s) => s.myScopes);
  const setViewMode = useFamilyTreeStore((s) => s.setViewMode);
  const { switchScope } = useSwitchScope();

  // Xonadon qutisini bosish → o'sha xonadonning moliyaviy scope'iga o'tish.
  // (Ichidagi shaxs bosilsa, HouseholdNode stopPropagation qilib personDetail ochadi.)
  const handleNodeClick = useCallback<NodeMouseHandler>((_event, node) => {
    if (!node.id.startsWith('unit_')) return;
    const scopeId = (node.data as unknown as HouseholdNodeData)?.household?.scopeId;
    if (!scopeId) {
      toast("Bu oila byudjet-xonadonga bog'lanmagan", { icon: 'ℹ️' });
      return;
    }
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
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <Home className="h-12 w-12 text-base-content/20" />
        <div>
          <p className="text-base font-medium">Hali xonadon yo'q</p>
          <p className="mt-1 max-w-md text-sm text-base-content/50">
            Xonadon — bu nikoh (ota-ona va farzandlar). "Shaxslar" ko'rinishida oila daraxtini
            quring: turmush o'rtoq va farzandlar qo'shilgach, ular shu yerda xonadon bo'lib ko'rinadi.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm gap-1.5"
          onClick={() => setViewMode('person')}
        >
          <Users className="h-4 w-4" />
          Shaxslar ko'rinishiga o'tish
        </button>
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
