import { Search, Eye, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useFamilyTreeStore } from '../../store/familyTreeStore';
import { useActivePersonsQuery } from '../../hooks/useFamilyTreeQueries';

export function FamilyTreeToolbar() {
  const {
    searchQuery, setSearchQuery,
    viewerPersonId, setViewerPersonId,
    showDeceased, setShowDeceased,
    genderFilter, setGenderFilter,
    depth, setDepth,
  } = useFamilyTreeStore();

  const { data: activePersons } = useActivePersonsQuery();
  const reactFlow = useReactFlow();

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-base-200/50 rounded-lg">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-base-content/40" />
        <input
          type="text"
          className="input input-sm input-bordered pl-8 w-40"
          placeholder="Qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Viewer selector */}
      <div className="flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5 text-base-content/50" />
        <select
          className="select select-sm select-bordered"
          value={viewerPersonId ?? ''}
          onChange={(e) => setViewerPersonId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Kim sifatida</option>
          {activePersons?.map(p => (
            <option key={p.id} value={p.id}>{p.fullName}</option>
          ))}
        </select>
      </div>

      {/* Depth slider */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-base-content/50">Chuqurlik:</span>
        <input
          type="range"
          min={1}
          max={10}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          className="range range-xs range-primary w-20"
        />
        <span className="text-xs font-medium w-4">{depth}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1">
        <label className="label cursor-pointer gap-1 p-0">
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={showDeceased}
            onChange={(e) => setShowDeceased(e.target.checked)}
          />
          <span className="text-xs">Vafot etganlar</span>
        </label>
      </div>

      <select
        className="select select-sm select-bordered select-xs"
        value={genderFilter}
        onChange={(e) => setGenderFilter(e.target.value as 'ALL' | 'MALE' | 'FEMALE')}
      >
        <option value="ALL">Barchasi</option>
        <option value="MALE">Erkak</option>
        <option value="FEMALE">Ayol</option>
      </select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          className="btn btn-ghost btn-xs btn-square"
          onClick={() => reactFlow.zoomOut({ duration: 200 })}
          title="Kichraytirish"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          className="btn btn-ghost btn-xs btn-square"
          onClick={() => reactFlow.zoomIn({ duration: 200 })}
          title="Kattalashtirish"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          className="btn btn-ghost btn-xs btn-square"
          onClick={() => reactFlow.fitView({ duration: 300, padding: 0.2 })}
          title="Hammasi ko'rinsin"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
