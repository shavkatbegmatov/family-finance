import { useMemo, useState, useCallback, useEffect, type RefObject } from 'react';
import { Eye, ZoomIn, ZoomOut, Maximize2, Locate, Fullscreen, Minimize } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useFamilyTreeStore } from '../../store/familyTreeStore';
import { useAuthStore } from '../../store/authStore';
import { useActivePersonsQuery } from '../../hooks/useFamilyTreeQueries';
import { ComboBox, type ComboBoxOption } from '../ui/ComboBox';

interface FamilyTreeToolbarProps {
  fullscreenRef?: RefObject<HTMLElement | null>;
}

export function FamilyTreeToolbar({ fullscreenRef }: FamilyTreeToolbarProps) {
  const {
    viewerPersonId, setViewerPersonId,
    showDeceased, setShowDeceased,
    genderFilter, setGenderFilter,
    depth, setDepth,
  } = useFamilyTreeStore();

  const { data: activePersons } = useActivePersonsQuery();
  const reactFlow = useReactFlow();
  const currentUser = useAuthStore(s => s.user);
  const setRootPersonId = useFamilyTreeStore(s => s.setRootPersonId);

  const personOptions = useMemo(() => {
    const opts: ComboBoxOption[] = [];

    // "O'zim" — pinned, faqat user familyMemberId bo'lsa
    if (currentUser?.familyMemberId) {
      opts.push({
        value: currentUser.familyMemberId,
        label: `O'zim (${currentUser.fullName})`,
        pinned: true,
        icon: <Locate className="h-3.5 w-3.5" />,
      });
    }

    // Barcha a'zolar
    activePersons?.forEach(p => {
      opts.push({ value: p.id, label: p.fullName });
    });

    return opts;
  }, [activePersons, currentUser?.familyMemberId, currentUser?.fullName]);

  const setPendingCenterNodeId = useFamilyTreeStore(s => s.setPendingCenterNodeId);

  const centerOnNode = useCallback((nodeId: string) => {
    const node = reactFlow.getNode(nodeId);
    if (node) {
      const x = node.position.x + (node.measured?.width ?? 200) / 2;
      const y = node.position.y + (node.measured?.height ?? 140) / 2;
      reactFlow.setCenter(x, y, { zoom: 1, duration: 500 });
      return true;
    }
    return false;
  }, [reactFlow]);

  const handlePersonSelect = (val: string | number | undefined) => {
    const personId = val ? Number(val) : undefined;

    if (!personId) {
      setViewerPersonId(null);
      return;
    }

    const nodeId = `person_${personId}`;
    const viewerChanged = viewerPersonId !== personId;

    if (viewerChanged) {
      setViewerPersonId(personId);
      setRootPersonId(personId);
      // Layout qayta hisoblanadi — FamilyFlowTree markazlaydi
      setPendingCenterNodeId(nodeId);
    } else {
      // Viewer allaqachon shu shaxs — to'g'ridan-to'g'ri markazlash
      if (!centerOnNode(nodeId)) {
        setRootPersonId(personId);
        setPendingCenterNodeId(nodeId);
      }
    }
  };

  const handleFindMe = () => {
    if (!currentUser?.familyMemberId) return;
    handlePersonSelect(currentUser.familyMemberId);
  };

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!fullscreenRef?.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void fullscreenRef.current.requestFullscreen();
    }
  }, [fullscreenRef]);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-base-200/50 rounded-lg">
      {/* Viewer selector — ComboBox */}
      <ComboBox
        size="sm"
        icon={<Eye className="h-3.5 w-3.5" />}
        placeholder="Oila a'zosini tanlang"
        searchPlaceholder="Ism bo'yicha qidirish..."
        value={viewerPersonId ?? undefined}
        onChange={handlePersonSelect}
        options={personOptions}
        allowClear
      />

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

      {/* Find me + Zoom controls */}
      <div className="flex items-center gap-1">
        {currentUser?.familyMemberId && (
          <button
            className="btn btn-ghost btn-xs gap-1"
            onClick={handleFindMe}
            title="Meni top"
          >
            <Locate className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Meni top</span>
          </button>
        )}
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
        <div className="w-px h-4 bg-base-content/15" />
        <button
          className="btn btn-ghost btn-xs font-mono"
          onClick={() => reactFlow.zoomTo(1, { duration: 200 })}
          title="1:1 masshtab (100%)"
        >
          1:1
        </button>
        <button
          className="btn btn-ghost btn-xs btn-square"
          onClick={() => reactFlow.fitView({ duration: 300, padding: 0.2 })}
          title="Hammasi ko'rinsin"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        {fullscreenRef && (
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'To\'liq ekrandan chiqish' : 'To\'liq ekran'}
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Fullscreen className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
