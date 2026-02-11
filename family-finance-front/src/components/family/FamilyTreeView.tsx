import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Users, Plus, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { familyTreeApi } from '../../api/family-tree.api';
import { TreeContextMenu } from './TreeContextMenu';
import { DeleteRelationConfirmModal } from './DeleteRelationConfirmModal';
import { ChangeRelationTypeModal } from './ChangeRelationTypeModal';
import { ZoomControls } from './ZoomControls';
import { TreeExportButton } from './TreeExportButton';
import { FamilyFlowTree, ReactFlowProvider } from './flow/FamilyFlowTree';
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

  // React Flow container ref for export
  const flowContainerRef = useRef<HTMLDivElement>(null);

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

  const handleContextMenu = useCallback((
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
  }, []);

  // Mobile long-press context menu
  const handleLongPress = useCallback((
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
  }, []);

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
    } catch {
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

  // Root member
  const membersMap = new Map<number, FamilyTreeMember>();
  treeData.members.forEach(m => membersMap.set(m.id, m));
  const rootMember = membersMap.get(treeData.rootMemberId);
  if (!rootMember) return null;

  return (
    <ReactFlowProvider>
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
            <TreeExportButton flowContainerRef={flowContainerRef} />
            <ZoomControls flowContainerRef={flowContainerRef} />
          </div>
        </div>

        {/* React Flow container */}
        <div
          ref={flowContainerRef}
          className="rounded-xl border border-base-200 bg-base-200/30"
          style={{ minHeight: '500px', height: '70vh', maxHeight: '800px' }}
        >
          <FamilyFlowTree
            treeData={treeData}
            onAddRelation={onAddRelation}
            onEditMember={onEditMember}
            onContextMenu={handleContextMenu}
            onLongPress={handleLongPress}
            onPaneClick={handleCloseContextMenu}
          />
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
    </ReactFlowProvider>
  );
}
