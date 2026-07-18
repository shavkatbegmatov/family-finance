import { useMemo, useState, useCallback, useEffect, type RefObject } from 'react';
import { Eye, ZoomIn, ZoomOut, Maximize2, Locate, Fullscreen, Minimize, Users, Home, Boxes, Network } from 'lucide-react';
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
  const viewMode = useFamilyTreeStore((s) => s.viewMode);
  const setViewMode = useFamilyTreeStore((s) => s.setViewMode);
  const visualMode = useFamilyTreeStore((s) => s.visualMode);
  const setVisualMode = useFamilyTreeStore((s) => s.setVisualMode);

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

  const centerOnNode = useCallback((nodeId: string, zoom?: number) => {
    const node = reactFlow.getNode(nodeId);
    if (!node) return false;
    const x = node.position.x + (node.measured?.width ?? 200) / 2;
    const y = node.position.y + (node.measured?.height ?? 140) / 2;
    reactFlow.setCenter(x, y, { zoom: zoom ?? 1, duration: 500 });
    return true;
  }, [reactFlow]);

  const handlePersonSelect = (val: string | number | undefined) => {
    const personId = val ? Number(val) : undefined;

    if (!personId) {
      setViewerPersonId(null);
      setPendingFocus(null);
      return;
    }

    // Agar viewer allaqachon shu shaxs — node hozir daraxtda, to'g'ridan-to'g'ri markazlash
    if (viewerPersonId === personId) {
      centerOnNode(`person_${personId}`, 1.1);
      return;
    }

    focusPerson(personId, 'select');
  };

  const handleFindMe = () => {
    if (!currentUser?.familyMemberId) return;
    const userId = currentUser.familyMemberId;

    // Agar allaqachon o'zim tanlangan — to'g'ridan-to'g'ri markazlash
    if (viewerPersonId === userId) {
      centerOnNode(`person_${userId}`, 1.1);
      return;
    }

    focusPerson(userId, 'find-me');
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
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-base-200/50 rounded-lg">
      {/* Ko'rinish almashtirish: shaxs ⇄ xonadon */}
      <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
        <button
          type="button"
          className={`btn btn-xs gap-1 ${viewMode === 'person' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewMode('person')}
          title="Shaxslar ko'rinishi"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Shaxslar</span>
        </button>
        <button
          type="button"
          className={`btn btn-xs gap-1 ${viewMode === 'household' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewMode('household')}
          title="Xonadonlar ko'rinishi"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Xonadonlar</span>
        </button>
      </div>

      {/* Vizual rejim: 2D daraxt ⇄ 3D graf */}
      <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
        <button
          type="button"
          className={`btn btn-xs gap-1 ${visualMode === '2d' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setVisualMode('2d')}
          title="2D asosiy daraxt rejimi"
          aria-label="2D asosiy daraxt rejimi"
          aria-pressed={visualMode === '2d'}
        >
          <Network className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Daraxt</span>
        </button>
        <button
          type="button"
          className={`btn btn-xs gap-1 ${visualMode === '3d' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setVisualMode('3d')}
          title="3D umumiy ko'rish rejimi"
          aria-label="3D umumiy ko'rish rejimi"
          aria-pressed={visualMode === '3d'}
        >
          <Boxes className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">3D ko'rish</span>
        </button>
      </div>

      {viewMode === 'person' && (
        <>
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
        </>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {viewMode === 'person' && visualMode === '2d' && currentUser?.familyMemberId && (
          <button
            className="btn btn-ghost btn-xs gap-1"
            onClick={handleFindMe}
            title="Meni top"
          >
            <Locate className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Meni top</span>
          </button>
        )}
        {/* RF zoom boshqaruvi faqat 2D'da — 3D o'z overlay-boshqaruviga ega */}
        {visualMode === '2d' && (
          <>
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
          </>
        )}
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
