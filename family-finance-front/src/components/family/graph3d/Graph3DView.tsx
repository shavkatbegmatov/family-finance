import { useCallback, useMemo, useRef } from 'react';
import { Home, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import type { HouseholdTreeResponse, TreeResponse } from '../../../types';
import type { GraphLink, GraphNode } from './types';
import { useFamilyTreeStore } from '../../../store/familyTreeStore';
import { useScopeStore } from '../../../store/scopeStore';
import { useSwitchScope } from '../../../hooks/useSwitchScope';
import { useGraph3DData } from './data/useGraph3DData';
import { useGraphTheme } from './color/useGraphTheme';
import { getColorScale } from './color/colorScales';
import { ForceGraph3DCanvas } from './ForceGraph3DCanvas';
import { Graph3DControls } from './overlay/Graph3DControls';
import { Graph3DSearch } from './overlay/Graph3DSearch';
import { Graph3DLegend } from './overlay/Graph3DLegend';
import { WebGLFallback } from './overlay/WebGLFallback';
import { Graph3DLoading } from './overlay/Graph3DLoading';

export interface Graph3DViewProps {
  viewMode: 'person' | 'household';
  treeData?: TreeResponse | null;
  householdData?: HouseholdTreeResponse | null;
  isLoading?: boolean;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export default function Graph3DView({ viewMode, treeData, householdData, isLoading }: Graph3DViewProps) {
  const webglOk = useMemo(() => hasWebGL(), []);

  const showDeceased = useFamilyTreeStore((s) => s.showDeceased);
  const genderFilter = useFamilyTreeStore((s) => s.genderFilter);
  const node3dRenderer = useFamilyTreeStore((s) => s.node3dRenderer);
  const colorBy = useFamilyTreeStore((s) => s.colorBy);
  const glow = useFamilyTreeStore((s) => s.glow);
  const openModal = useFamilyTreeStore((s) => s.openModal);
  const setViewMode = useFamilyTreeStore((s) => s.setViewMode);

  const myScopes = useScopeStore((s) => s.myScopes);
  const { switchScope } = useSwitchScope();

  const theme = useGraphTheme();
  const data = useGraph3DData({ viewMode, treeData, householdData, showDeceased, genderFilter });

  // "clan" rangi faqat xonadon rejimida ma'noli — person'da gender'ga qaytamiz
  const effectiveColorBy = colorBy === 'clan' && viewMode === 'person' ? 'gender' : colorBy;
  const scale = useMemo(
    () => getColorScale(effectiveColorBy, data.nodes, theme),
    [effectiveColorBy, data.nodes, theme],
  );

  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.kind === 'person') {
        openModal({ type: 'personDetail', personId: node.refId });
        return;
      }
      // Xonadon → moliyaviy scope'ga o'tish (HouseholdFlowTree bilan izchil)
      if (node.scopeId == null) {
        toast("Bu oila byudjet-xonadonga bog'lanmagan", { icon: 'ℹ️' });
        return;
      }
      const target = myScopes.find((s) => s.id === node.scopeId);
      if (target) void switchScope(target);
      else toast("Bu xonadon faol scope ro'yxatingizda yo'q", { icon: 'ℹ️' });
    },
    [openModal, myScopes, switchScope],
  );

  if (!webglOk) return <WebGLFallback />;
  if (isLoading) return <Graph3DLoading />;

  if (data.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        {viewMode === 'household' ? (
          <Home className="h-12 w-12 text-base-content/20" />
        ) : (
          <Users className="h-12 w-12 text-base-content/20" />
        )}
        <div>
          <p className="text-base font-medium">
            {viewMode === 'household' ? "Hali xonadon yo'q" : "Daraxt bo'sh"}
          </p>
          <p className="mt-1 max-w-md text-sm text-base-content/50">
            Ma&apos;lumot qo&apos;shilgach, u shu yerda 3D grafda paydo bo&apos;ladi.
          </p>
        </div>
        {viewMode === 'household' && (
          <button
            type="button"
            className="btn btn-primary btn-sm gap-1.5"
            onClick={() => setViewMode('person')}
          >
            <Users className="h-4 w-4" />
            Shaxslar ko&apos;rinishiga o&apos;tish
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ForceGraph3DCanvas
        graphData={data}
        theme={theme}
        colorOf={scale.colorOf}
        rendererKind={node3dRenderer}
        glow={glow}
        fgRef={fgRef}
        onNodeClick={handleNodeClick}
      />
      <Graph3DSearch fgRef={fgRef} nodes={data.nodes} />
      <Graph3DControls fgRef={fgRef} viewMode={viewMode} />
      <Graph3DLegend items={scale.legend} colorBy={effectiveColorBy} />
    </div>
  );
}
