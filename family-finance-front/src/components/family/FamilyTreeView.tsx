import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Users, Plus, AlertTriangle, RefreshCw, ArrowLeft, Maximize2 } from 'lucide-react';
import { familyTreeApi } from '../../api/family-tree.api';
import { FamilyTreeCard } from './FamilyTreeCard';
import { TreeSVGConnectors } from './TreeSVGConnectors';
import { TreeContextMenu } from './TreeContextMenu';
import { DeleteRelationConfirmModal } from './DeleteRelationConfirmModal';
import { ChangeRelationTypeModal } from './ChangeRelationTypeModal';
import { ZoomControls } from './ZoomControls';
import { TreeExportButton } from './TreeExportButton';
import { useZoomPan } from '../../hooks/useZoomPan';
import { useTreeLayout, CARD_WIDTH } from '../../hooks/useTreeLayout';
import { RELATIONSHIP_CATEGORIES } from '../../config/constants';
import type { FamilyTreeResponse, FamilyTreeMember, FamilyRelationshipDto } from '../../types';

interface FamilyTreeViewProps {
  onAddRelation?: (fromMemberId: number, suggestedCategory?: string) => void;
  onEditMember?: (memberId: number) => void;
  refreshKey?: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  memberId: number;
  memberName: string;
  isRoot: boolean;
  relationshipType?: string;
  fromMemberId?: number;
}

export function FamilyTreeView({ onAddRelation, onEditMember, refreshKey }: FamilyTreeViewProps) {
  const [treeData, setTreeData] = useState<FamilyTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Perspektiva
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null);

  // Kontekst menyu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Munosabat o'chirish
  const [deleteRelation, setDeleteRelation] = useState<{ fromId: number; toId: number; memberName: string } | null>(null);

  // Tur o'zgartirish
  const [changeRelationType, setChangeRelationType] = useState<{
    fromMemberId: number;
    toMemberId: number;
    memberName: string;
    currentType: string;
  } | null>(null);

  // Zoom/Pan
  const containerRef = useRef<HTMLDivElement>(null);
  const treeContentRef = useRef<HTMLDivElement>(null);
  const { scale, position, setPosition, handlers, zoomIn, zoomOut, resetZoom, setScale } = useZoomPan(containerRef);

  // Tree layout
  const layout = useTreeLayout(treeData);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await familyTreeApi.getTree(viewingMemberId ?? undefined);
      setTreeData(res.data.data as FamilyTreeResponse);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 404) {
        setError('NOT_LINKED');
      } else {
        setError(axiosErr.response?.data?.message || "Daraxtni yuklashda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  }, [viewingMemberId]);

  useEffect(() => {
    void loadTree();
  }, [loadTree, refreshKey]);

  // Auto-center: root a'zoni viewport markaziga qo'yish
  useEffect(() => {
    if (layout.rootNode && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      setPosition({
        x: containerWidth / 2 - layout.rootNode.x - CARD_WIDTH / 2,
        y: 60,
      });
    }
  }, [layout.rootNode, setPosition]);

  // ==================== CONTEXT MENU HANDLERS ====================

  const handleContextMenu = (
    e: React.MouseEvent,
    member: FamilyTreeMember,
    isRoot: boolean,
    relationship?: FamilyRelationshipDto
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      memberId: member.id,
      memberName: member.fullName,
      isRoot,
      relationshipType: relationship?.relationshipType,
      fromMemberId: relationship?.fromMemberId,
    });
  };

  // Mobile long-press context menu
  const handleLongPress = (
    x: number,
    y: number,
    member: FamilyTreeMember,
    isRoot: boolean,
    relationship?: FamilyRelationshipDto
  ) => {
    setContextMenu({
      x,
      y,
      memberId: member.id,
      memberName: member.fullName,
      isRoot,
      relationshipType: relationship?.relationshipType,
      fromMemberId: relationship?.fromMemberId,
    });
  };

  const handleCloseContextMenu = () => setContextMenu(null);

  const handleContextEdit = () => {
    if (contextMenu && onEditMember) {
      onEditMember(contextMenu.memberId);
    }
    handleCloseContextMenu();
  };

  const handleContextAddRelation = () => {
    if (contextMenu && onAddRelation) {
      onAddRelation(contextMenu.memberId);
    }
    handleCloseContextMenu();
  };

  const handleContextViewTree = () => {
    if (contextMenu) {
      setViewingMemberId(contextMenu.memberId);
    }
    handleCloseContextMenu();
  };

  const handleContextChangeType = () => {
    if (contextMenu && contextMenu.fromMemberId && contextMenu.relationshipType) {
      setChangeRelationType({
        fromMemberId: contextMenu.fromMemberId,
        toMemberId: contextMenu.memberId,
        memberName: contextMenu.memberName,
        currentType: contextMenu.relationshipType,
      });
    }
    handleCloseContextMenu();
  };

  const handleContextDeleteRelation = () => {
    if (contextMenu && contextMenu.fromMemberId) {
      setDeleteRelation({
        fromId: contextMenu.fromMemberId,
        toId: contextMenu.memberId,
        memberName: contextMenu.memberName,
      });
    }
    handleCloseContextMenu();
  };

  const handleConfirmDelete = async () => {
    if (!deleteRelation) return;
    try {
      await familyTreeApi.removeRelationship(deleteRelation.fromId, deleteRelation.toId);
      setDeleteRelation(null);
      void loadTree();
    } catch (err) {
      toast.error("Munosabatni o'chirishda xatolik");
    }
  };

  const handleRelationTypeChanged = () => {
    setChangeRelationType(null);
    void loadTree();
  };

  const handleBackToMe = () => {
    setViewingMemberId(null);
  };

  // "Ekranga sig'dirish" funksiyasi
  const handleFitToScreen = () => {
    if (!containerRef.current || layout.width === 0 || layout.height === 0) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const scaleX = containerWidth / layout.width;
    const scaleY = containerHeight / layout.height;
    const fitScale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% for padding

    setScale(fitScale);
    setPosition({
      x: (containerWidth - layout.width * fitScale) / 2,
      y: (containerHeight - layout.height * fitScale) / 2,
    });
  };

  const handleCardClick = onEditMember
    ? (member: FamilyTreeMember) => onEditMember(member.id)
    : undefined;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // User oila a'zosiga bog'lanmagan holat
  if (error === 'NOT_LINKED') {
    return (
      <div className="surface-card p-12 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-warning" />
        <h3 className="text-lg font-semibold mb-2">Profilingiz oila a&apos;zosiga bog&apos;lanmagan</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Oila daraxtini ko&apos;rish uchun avval oila a&apos;zosi yaratib, foydalanuvchi akkauntingizga bog&apos;lang.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card p-12 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-error" />
        <h3 className="text-lg font-semibold mb-2">Xatolik</h3>
        <p className="text-sm text-base-content/60 mb-4">{error}</p>
        <button className="btn btn-primary btn-sm" onClick={() => void loadTree()}>
          <RefreshCw className="h-4 w-4" />
          Qayta yuklash
        </button>
      </div>
    );
  }

  if (!treeData || treeData.relationships.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <Users className="h-16 w-16 mx-auto mb-4 text-base-content/20" />
        <h3 className="text-lg font-semibold mb-2">Oila daraxti bo&apos;sh</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Qarindoshlaringizni qo&apos;shib oila daraxtini yarating
        </p>
        {onAddRelation && treeData && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onAddRelation(treeData.rootMemberId)}
          >
            <Plus className="h-4 w-4" />
            Qarindosh qo&apos;shish
          </button>
        )}
      </div>
    );
  }

  // Memberlar map
  const membersMap = new Map<number, FamilyTreeMember>();
  treeData.members.forEach(m => membersMap.set(m.id, m));

  // Root member
  const rootMember = membersMap.get(treeData.rootMemberId);
  if (!rootMember) return null;

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {viewingMemberId && (
            <button
              className="btn btn-ghost btn-sm gap-1"
              onClick={handleBackToMe}
            >
              <ArrowLeft className="h-4 w-4" />
              O&apos;zimga qaytish
            </button>
          )}
          {viewingMemberId && (
            <span className="text-sm text-base-content/50">
              {rootMember.fullName} ning daraxti
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Ekranga sig'dirish */}
          {layout.nodes.length > 10 && (
            <button
              className="btn btn-ghost btn-sm gap-1"
              onClick={handleFitToScreen}
              title="Ekranga sig'dirish"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          <TreeExportButton treeContentRef={treeContentRef} scale={scale} setScale={setScale} />
          <ZoomControls scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
        </div>
      </div>

      {/* Zoom/Pan container */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl border border-base-200 bg-base-200/30 cursor-grab active:cursor-grabbing"
        style={{ minHeight: '500px', height: '70vh', maxHeight: '800px' }}
        {...handlers}
      >
        <div
          ref={treeContentRef}
          className="relative"
          style={{
            width: layout.width,
            height: layout.height + (layout.overflowRelationships.length > 0 ? 300 : 0),
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Connectors */}
          <TreeSVGConnectors
            nodes={layout.nodes}
            edges={layout.edges}
            width={layout.width}
            height={layout.height}
          />

          {/* Tree nodes */}
          {layout.nodes.map(node => (
            <div
              key={node.memberId}
              className="absolute"
              style={{
                left: node.x,
                top: node.y,
                width: node.size === 'compact' ? 144 : 176,
              }}
            >
              <FamilyTreeCard
                member={node.member}
                relationLabel={node.relationship?.label}
                isRoot={node.isRoot}
                size={node.size}
                onAddRelation={onAddRelation}
                onClick={handleCardClick}
                onContextMenu={(e) => handleContextMenu(e, node.member, node.isRoot, node.relationship)}
                onLongPress={(x, y) => handleLongPress(x, y, node.member, node.isRoot, node.relationship)}
                relationship={node.relationship}
              />
            </div>
          ))}

          {/* Overflow section: in-laws, extended, other */}
          {layout.overflowRelationships.length > 0 && (
            <div
              className="absolute left-0 right-0"
              style={{ top: layout.height + 20 }}
            >
              <div className="border-t-2 border-solid border-base-content/10 pt-6 px-8">
                {layout.overflowRelationships.map(({ category, relationships }) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-center text-sm font-medium text-base-content/50 mb-4">
                      {RELATIONSHIP_CATEGORIES[category] || category}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {relationships.map(rel => {
                        const member = membersMap.get(rel.toMemberId);
                        if (!member) return null;
                        return (
                          <FamilyTreeCard
                            key={rel.id}
                            member={member}
                            relationLabel={rel.label}
                            size="compact"
                            onAddRelation={onAddRelation}
                            onClick={handleCardClick}
                            onContextMenu={(e) => handleContextMenu(e, member, false, rel)}
                            onLongPress={(x, y) => handleLongPress(x, y, member, false, rel)}
                            relationship={rel}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kontekst menyu */}
      {contextMenu && (
        <TreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isRoot={contextMenu.isRoot}
          onEdit={handleContextEdit}
          onAddRelation={handleContextAddRelation}
          onViewTree={handleContextViewTree}
          onChangeType={handleContextChangeType}
          onDeleteRelation={handleContextDeleteRelation}
          onClose={handleCloseContextMenu}
        />
      )}

      {/* Munosabat o'chirish modal */}
      <DeleteRelationConfirmModal
        isOpen={!!deleteRelation}
        memberName={deleteRelation?.memberName || ''}
        onClose={() => setDeleteRelation(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Tur o'zgartirish modal */}
      <ChangeRelationTypeModal
        isOpen={!!changeRelationType}
        fromMemberId={changeRelationType?.fromMemberId ?? 0}
        toMemberId={changeRelationType?.toMemberId ?? 0}
        memberName={changeRelationType?.memberName || ''}
        currentType={changeRelationType?.currentType || ''}
        onClose={() => setChangeRelationType(null)}
        onSuccess={handleRelationTypeChanged}
      />
    </div>
  );
}
