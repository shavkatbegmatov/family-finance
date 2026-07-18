import { Boxes, Image as ImageIcon, Layers, Maximize2 } from 'lucide-react';
import type { ComponentType } from 'react';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import type { ColorBy, GraphLink, GraphNode, RendererKind } from '../types';
import { useFamilyTreeStore } from '../../../../store/familyTreeStore';

interface Props {
  fgRef: React.MutableRefObject<ForceGraphMethods<GraphNode, GraphLink> | undefined>;
  viewMode: 'person' | 'household';
}

const RENDERER_OPTIONS: { kind: RendererKind; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { kind: 'galaxy', label: 'Galaktika', Icon: Boxes },
  { kind: 'avatars', label: 'Avatarlar', Icon: ImageIcon },
  { kind: 'hybrid', label: 'Hibrid', Icon: Layers },
];

/** 3D umumiy ko'rish paneli: render uslubi, rang guruhi, grafni ekranga sig'dirish. */
export function Graph3DControls({ fgRef, viewMode }: Props) {
  const node3dRenderer = useFamilyTreeStore((s) => s.node3dRenderer);
  const setNode3dRenderer = useFamilyTreeStore((s) => s.setNode3dRenderer);
  const colorBy = useFamilyTreeStore((s) => s.colorBy);
  const setColorBy = useFamilyTreeStore((s) => s.setColorBy);

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
      <div className="flex gap-0.5 rounded-lg bg-base-200/80 p-0.5 shadow-sm backdrop-blur">
        {RENDERER_OPTIONS.map(({ kind, label, Icon }) => (
          <button
            key={kind}
            type="button"
            title={label}
            className={`btn btn-xs gap-1 ${node3dRenderer === kind ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setNode3dRenderer(kind)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-base-200/80 p-1 shadow-sm backdrop-blur">
        <span className="pl-1 text-[11px] text-base-content/60">Rang:</span>
        <select
          className="select select-bordered select-xs"
          value={colorBy}
          onChange={(e) => setColorBy(e.target.value as ColorBy)}
        >
          <option value="gender">Jins</option>
          <option value="generation">Avlod</option>
          <option value="surname">Familiya</option>
          <option value="clan" disabled={viewMode === 'person'}>
            Xonadon
          </option>
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          title="3D grafni ekranga sig'dirish"
          onClick={() => fgRef.current?.zoomToFit(600, 40)}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default Graph3DControls;
