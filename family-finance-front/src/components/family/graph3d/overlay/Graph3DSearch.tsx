import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import type { GraphLink, GraphNode } from '../types';

interface Props {
  fgRef: React.MutableRefObject<ForceGraphMethods<GraphNode, GraphLink> | undefined>;
  nodes: GraphNode[];
  onFocusNode?: (node: GraphNode) => void;
}

/** Ism bo'yicha qidirib, tanlangan tugunga kamerani uchiradi. */
export function Graph3DSearch({ fgRef, nodes, onFocusNode }: Props) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return nodes.filter((n) => n.label.toLowerCase().includes(term)).slice(0, 6);
  }, [query, nodes]);

  const flyTo = (node: GraphNode) => {
    const fg = fgRef.current;
    if (!fg) return;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const z = node.z ?? 0;
    const distance = 60;
    const radius = Math.hypot(x, y, z) || 1;
    const ratio = 1 + distance / radius;
    fg.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, 1500);
    onFocusNode?.(node);
    setQuery('');
  };

  return (
    <div className="absolute left-3 top-3 z-10 w-52">
      <label className="input input-xs input-bordered flex items-center gap-2 bg-base-200/80 backdrop-blur">
        <Search className="h-3.5 w-3.5 opacity-60" />
        <input
          type="text"
          className="grow"
          placeholder="Qidirish..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) {
              e.preventDefault();
              flyTo(matches[0]);
            }
          }}
        />
      </label>
      {matches.length > 0 && (
        <ul className="menu menu-xs mt-1 w-full rounded-box bg-base-200/95 p-1 shadow-lg backdrop-blur">
          {matches.map((node) => (
            <li key={node.id}>
              <button type="button" onClick={() => flyTo(node)} className="truncate">
                {node.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Graph3DSearch;
