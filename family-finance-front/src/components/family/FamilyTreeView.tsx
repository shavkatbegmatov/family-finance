import { useEffect, useState, useCallback, useRef } from 'react';
import { Users, Plus, AlertTriangle, RefreshCw, Heart, ArrowLeft } from 'lucide-react';
import { familyTreeApi } from '../../api/family-tree.api';
import { FamilyTreeCard } from './FamilyTreeCard';
import { TreeContextMenu } from './TreeContextMenu';
import { DeleteRelationConfirmModal } from './DeleteRelationConfirmModal';
import { ChangeRelationTypeModal } from './ChangeRelationTypeModal';
import { ZoomControls } from './ZoomControls';
import { TreeExportButton } from './TreeExportButton';
import { useZoomPan } from '../../hooks/useZoomPan';
import { RELATIONSHIP_CATEGORIES } from '../../config/constants';
import type { FamilyTreeResponse, FamilyTreeMember, FamilyRelationshipDto } from '../../types';

interface FamilyTreeViewProps {
  onAddRelation?: (fromMemberId: number) => void;
  onEditMember?: (memberId: number) => void;
  refreshKey?: number;
}

// Category → daraxt qatorlari tartibi
const CATEGORY_ORDER = [
  'grandparents',
  'parents',
  'siblings',
  'spouse',
  'children',
  'grandchildren',
  'in-laws',
  'extended',
  'other',
];

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
  const { scale, position, handlers, zoomIn, zoomOut, resetZoom, setScale } = useZoomPan(containerRef);

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
      console.error('Failed to delete relation:', err);
    }
  };

  const handleRelationTypeChanged = () => {
    setChangeRelationType(null);
    void loadTree();
  };

  const handleBackToMe = () => {
    setViewingMemberId(null);
  };

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

  // Munosabatlarni category bo'yicha guruhlash
  const grouped = new Map<string, FamilyRelationshipDto[]>();
  treeData.relationships.forEach(rel => {
    const cat = rel.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(rel);
  });

  // Tartibli category'lar
  const orderedCategories = CATEGORY_ORDER.filter(cat => grouped.has(cat));

  // "MEN" qatorini aniqlash — siblings va spouse bilan bir qatorda
  const siblingsAndSpouse = [
    ...(grouped.get('siblings') || []),
    ...(grouped.get('spouse') || []),
  ];
  const hasSiblingsOrSpouse = siblingsAndSpouse.length > 0;

  // "MEN" qatorida ko'rsatilmaydigan category'lar
  const aboveMe = orderedCategories.filter(c => ['grandparents', 'parents'].includes(c));
  const belowMe = orderedCategories.filter(c => ['children', 'grandchildren'].includes(c));
  const otherCats = orderedCategories.filter(c =>
    !['grandparents', 'parents', 'siblings', 'spouse', 'children', 'grandchildren'].includes(c)
  );

  const handleCardClick = onEditMember
    ? (member: FamilyTreeMember) => onEditMember(member.id)
    : undefined;

  // Animatsiya indeksi counter
  let animIndex = 0;
  const getAnimDelay = () => {
    const delay = animIndex * 80;
    animIndex++;
    return delay;
  };

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
          <TreeExportButton treeContentRef={treeContentRef} scale={scale} setScale={setScale} />
          <ZoomControls scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
        </div>
      </div>

      {/* Zoom/Pan container */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl border border-base-200 bg-base-200/30 cursor-grab active:cursor-grabbing"
        style={{ minHeight: '400px' }}
        {...handlers}
      >
        <div
          ref={treeContentRef}
          className="flex flex-col items-center gap-0 py-6 min-w-max"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Yuqoridagi qatorlar: bobo-buvi, ota-ona */}
          {aboveMe.map(cat => {
            const rels = grouped.get(cat)!;
            return (
              <div key={cat} className="flex flex-col items-center">
                <div className="text-xs font-medium text-base-content/40 mb-2">
                  {RELATIONSHIP_CATEGORIES[cat]}
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  {rels.map(rel => {
                    const member = membersMap.get(rel.toMemberId);
                    if (!member) return null;
                    const delay = getAnimDelay();
                    return (
                      <div
                        key={rel.id}
                        className="animate-tree-fade-in"
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        <FamilyTreeCard
                          member={member}
                          relationLabel={rel.label}
                          size={cat === 'grandparents' ? 'sm' : 'lg'}
                          onAddRelation={onAddRelation}
                          onClick={handleCardClick}
                          onContextMenu={(e) => handleContextMenu(e, member, false, rel)}
                          relationship={rel}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="h-8 tree-connector-v" />
              </div>
            );
          })}

          {/* ===== MEN qatori (siblings + ME + spouse) ===== */}
          <div className="flex flex-col items-center">
            {hasSiblingsOrSpouse && (
              <div className="text-xs font-medium text-base-content/40 mb-2" />
            )}
            <div className="flex flex-wrap items-end justify-center gap-4">
              {/* Aka-uka, opa-singillar — chapda */}
              {(grouped.get('siblings') || []).map(rel => {
                const member = membersMap.get(rel.toMemberId);
                if (!member) return null;
                const delay = getAnimDelay();
                return (
                  <div
                    key={rel.id}
                    className="animate-tree-fade-in"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <FamilyTreeCard
                      member={member}
                      relationLabel={rel.label}
                      size="md"
                      onAddRelation={onAddRelation}
                      onClick={handleCardClick}
                      onContextMenu={(e) => handleContextMenu(e, member, false, rel)}
                      relationship={rel}
                    />
                  </div>
                );
              })}

              {/* MEN — markazda */}
              <div
                className="animate-tree-fade-in"
                style={{ animationDelay: `${getAnimDelay()}ms` }}
              >
                <FamilyTreeCard
                  member={rootMember}
                  isRoot
                  size="lg"
                  onAddRelation={onAddRelation}
                  onClick={handleCardClick}
                  onContextMenu={(e) => handleContextMenu(e, rootMember, true)}
                />
              </div>

              {/* Heart icon + Turmush o'rtog'i */}
              {(grouped.get('spouse') || []).map(rel => {
                const member = membersMap.get(rel.toMemberId);
                if (!member) return null;
                const delay = getAnimDelay();
                return (
                  <div key={rel.id} className="flex items-end gap-2">
                    <div className="flex items-center mb-8">
                      <Heart className="h-5 w-5 text-red-500 fill-red-500 animate-tree-fade-in" style={{ animationDelay: `${delay - 40}ms` }} />
                    </div>
                    <div
                      className="animate-tree-fade-in"
                      style={{ animationDelay: `${delay}ms` }}
                    >
                      <FamilyTreeCard
                        member={member}
                        relationLabel={rel.label}
                        size="lg"
                        onAddRelation={onAddRelation}
                        onClick={handleCardClick}
                        onContextMenu={(e) => handleContextMenu(e, member, false, rel)}
                        relationship={rel}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pastdagi qatorlar: farzandlar, nevaralar */}
          {belowMe.map(cat => {
            const rels = grouped.get(cat)!;
            return (
              <div key={cat} className="flex flex-col items-center">
                <div className="h-8 tree-connector-v" />
                <div className="text-xs font-medium text-base-content/40 mb-2">
                  {RELATIONSHIP_CATEGORIES[cat]}
                </div>
                {rels.length > 1 && (
                  <div
                    className="tree-connector-h mb-0"
                    style={{
                      width: `${Math.min(rels.length * 176, 700)}px`,
                      maxWidth: '90vw',
                    }}
                  />
                )}
                <div className="flex flex-wrap justify-center gap-4">
                  {rels.map(rel => {
                    const member = membersMap.get(rel.toMemberId);
                    if (!member) return null;
                    const delay = getAnimDelay();
                    return (
                      <div key={rel.id} className="flex flex-col items-center">
                        <div className="tree-connector-branch" />
                        <div
                          className="animate-tree-fade-in"
                          style={{ animationDelay: `${delay}ms` }}
                        >
                          <FamilyTreeCard
                            member={member}
                            relationLabel={rel.label}
                            size="md"
                            onAddRelation={onAddRelation}
                            onClick={handleCardClick}
                            onContextMenu={(e) => handleContextMenu(e, member, false, rel)}
                            relationship={rel}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Boshqa kategoriyalar: in-laws, extended, other */}
          {otherCats.length > 0 && (
            <div className="w-full mt-10">
              <div className="border-t-2 border-solid border-base-content/10 pt-6">
                {otherCats.map(cat => {
                  const rels = grouped.get(cat)!;
                  return (
                    <div key={cat} className="mb-6">
                      <h3 className="text-center text-sm font-medium text-base-content/50 mb-4">
                        {RELATIONSHIP_CATEGORIES[cat]}
                      </h3>
                      <div className="flex flex-wrap justify-center gap-4">
                        {rels.map(rel => {
                          const member = membersMap.get(rel.toMemberId);
                          if (!member) return null;
                          const delay = getAnimDelay();
                          return (
                            <div
                              key={rel.id}
                              className="animate-tree-fade-in"
                              style={{ animationDelay: `${delay}ms` }}
                            >
                              <FamilyTreeCard
                                member={member}
                                relationLabel={rel.label}
                                size="sm"
                                onAddRelation={onAddRelation}
                                onClick={handleCardClick}
                                onContextMenu={(e) => handleContextMenu(e, member, false, rel)}
                                relationship={rel}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
