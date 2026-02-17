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
  const viewerPersonId = useFamilyTreeStore((s) => s.viewerPersonId);
  const setViewerPersonId = useFamilyTreeStore((s) => s.setViewerPersonId);
  const setPendingFocus = useFamilyTreeStore((s) => s.setPendingFocus);
  const focusPerson = useFamilyTreeStore((s) => s.focusPerson);
  const showDeceased = useFamilyTreeStore((s) => s.showDeceased);
  const setShowDeceased = useFamilyTreeStore((s) => s.setShowDeceased);
  const genderFilter = useFamilyTreeStore((s) => s.genderFilter);
  const setGenderFilter = useFamilyTreeStore((s) => s.setGenderFilter);
  const depth = useFamilyTreeStore((s) => s.depth);
  const setDepth = useFamilyTreeStore((s) => s.setDepth);

  const { data: activePersons } = useActivePersonsQuery();
  const reactFlow = useReactFlow();
  const currentUser = useAuthStore((s) => s.user);

  const personOptions = useMemo(() => {
    const opts: ComboBoxOption[] = [];

    if (currentUser?.familyMemberId) {
      opts.push({
        value: currentUser.familyMemberId,
        label: `O'zim (${currentUser.fullName})`,
        pinned: true,
        icon: <Locate className="h-3.5 w-3.5" />,
      });
    }

    activePersons?.forEach((p) => {
      opts.push({ value: p.id, label: p.fullName });
    });

    return opts;
  }, [activePersons, currentUser?.familyMemberId, currentUser?.fullName]);

  const handlePersonSelect = (val: string | number | undefined) => {
    const personId = val ? Number(val) : undefined;

    if (!personId) {
      setViewerPersonId(null);
      setPendingFocus(null);
      return;
    }

    focusPerson(personId, 'select');
  };

  const handleFindMe = () => {
    if (!currentUser?.familyMemberId) return;
    focusPerson(currentUser.familyMemberId, 'find-me');
  };

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

      <div className="flex-1" />

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
            title={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Fullscreen className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
