import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ELK from 'elkjs/lib/elk.bundled.js';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type Edge,
  type NodeMouseHandler,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, ArrowLeft, Plus, RefreshCw, Users } from 'lucide-react';
import { familyTreeApi } from '../../api/family-tree.api';
import { FamilyTreeCard } from './FamilyTreeCard';
import { FamilyTreeMemberDrawer } from './FamilyTreeMemberDrawer';
import { TreeContextMenu } from './TreeContextMenu';
import { DeleteRelationConfirmModal } from './DeleteRelationConfirmModal';
import { ChangeRelationTypeModal } from './ChangeRelationTypeModal';
import { TreeExportButton } from './TreeExportButton';
import { SearchInput } from '../ui/SearchInput';
import { RELATIONSHIP_CATEGORIES, FAMILY_TREE_VIEW_PRESETS } from '../../config/constants';
import type { FamilyRelationshipDto, FamilyTreeMember, FamilyTreeResponse } from '../../types';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';

interface FamilyTreeViewProps {
  onAddRelation?: (fromMemberId: number) => void;
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

interface FamilyFlowNodeData extends Record<string, unknown> {
  member: FamilyTreeMember;
  relationLabel?: string;
  isRoot?: boolean;
  highlighted?: boolean;
  onAddRelation?: (memberId: number) => void;
}

type TreeNode = Node<FamilyFlowNodeData, 'familyMember'>;

type TreeViewPresetKey = keyof typeof FAMILY_TREE_VIEW_PRESETS;

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

const CARD_WIDTH = 208;
const CARD_HEIGHT = 164;

const elk = new ELK();

function getCategoryRank(category: string): number {
  switch (category) {
    case 'grandparents':
      return 0;
    case 'parents':
      return 1;
    case 'siblings':
    case 'spouse':
      return 2;
    case 'children':
      return 3;
    case 'grandchildren':
      return 4;
    case 'in-laws':
    case 'extended':
    case 'other':
      return 5;
    default:
      return 6;
  }
}

function FamilyMemberNode({ data, selected }: NodeProps<TreeNode>) {
  return (
    <div className="nodrag nopan">
      <FamilyTreeCard
        member={data.member}
        relationLabel={data.relationLabel}
        isRoot={data.isRoot}
        highlighted={data.highlighted}
        selected={selected}
        onAddRelation={data.onAddRelation}
      />
    </div>
  );
}

const NODE_TYPES = {
  familyMember: FamilyMemberNode,
};

async function buildTreeLayout(
  rootMember: FamilyTreeMember,
  relationships: FamilyRelationshipDto[],
  membersMap: Map<number, FamilyTreeMember>,
  searchQuery: string,
  onAddRelation?: (memberId: number) => void,
): Promise<{ nodes: TreeNode[]; edges: Edge[] }> {
  const categoryByMemberId = new Map<number, string>();
  relationships.forEach((rel) => {
    if (!categoryByMemberId.has(rel.toMemberId)) {
      categoryByMemberId.set(rel.toMemberId, rel.category);
    }
  });

  const rawNodes: TreeNode[] = [
    {
      id: String(rootMember.id),
      type: 'familyMember',
      data: {
        member: rootMember,
        isRoot: true,
        highlighted: searchQuery.length > 0 && rootMember.fullName.toLowerCase().includes(searchQuery),
        onAddRelation,
      },
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: true,
    },
  ];

  const attachedIds = new Set<number>([rootMember.id]);

  relationships.forEach((rel) => {
    const member = membersMap.get(rel.toMemberId);
    if (!member || attachedIds.has(member.id)) {
      return;
    }

    attachedIds.add(member.id);

    rawNodes.push({
      id: String(member.id),
      type: 'familyMember',
      data: {
        member,
        relationLabel: rel.label,
        highlighted: searchQuery.length > 0 && member.fullName.toLowerCase().includes(searchQuery),
        onAddRelation,
      },
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: true,
    });
  });

  const elkNodes = rawNodes.map((node) => {
    const memberId = Number(node.id);
    const category = memberId === rootMember.id ? 'root' : categoryByMemberId.get(memberId) || 'other';
    const partition = memberId === rootMember.id ? 2 : getCategoryRank(category);

    return {
      id: node.id,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      layoutOptions: {
        'org.eclipse.elk.partitioning.partition': String(partition),
      },
    };
  });

  const elkEdges: ElkExtendedEdge[] = relationships.map((rel) => ({
    id: `elk-${rel.id}`,
    sources: [String(rel.fromMemberId)],
    targets: [String(rel.toMemberId)],
  }));

  const elkGraph: ElkNode = {
    id: 'family-tree',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '56',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.padding': '[top=60,left=60,bottom=60,right=60]',
      'org.eclipse.elk.partitioning.activate': 'true',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  const layouted = await elk.layout(elkGraph);

  const positionByNodeId = new Map<string, { x: number; y: number }>();
  layouted.children?.forEach((child) => {
    if (!child.id) return;
    positionByNodeId.set(child.id, {
      x: child.x ?? 0,
      y: child.y ?? 0,
    });
  });

  const positionedNodes = rawNodes.map((node) => ({
    ...node,
    position: positionByNodeId.get(node.id) || node.position,
  }));

  const edges: Edge[] = relationships.map((rel) => ({
    id: `edge-${rel.id}`,
    source: String(rel.fromMemberId),
    target: String(rel.toMemberId),
    animated: false,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: 'hsl(var(--bc) / 0.42)',
    },
    style: {
      stroke: 'hsl(var(--bc) / 0.28)',
      strokeWidth: 1.7,
    },
  }));

  return { nodes: positionedNodes, edges };
}

export function FamilyTreeView({ onAddRelation, onEditMember, refreshKey }: FamilyTreeViewProps) {
  const [treeData, setTreeData] = useState<FamilyTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [layouting, setLayouting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null);
  const [viewPreset, setViewPreset] = useState<TreeViewPresetKey>('FULL');
  const [memberSearch, setMemberSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const [deleteRelation, setDeleteRelation] = useState<{ fromId: number; toId: number; memberName: string } | null>(null);
  const [changeRelationType, setChangeRelationType] = useState<{
    fromMemberId: number;
    toMemberId: number;
    memberName: string;
    currentType: string;
  } | null>(null);

  const [flowNodes, setFlowNodes] = useState<TreeNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<TreeNode, Edge> | null>(null);

  const flowWrapperRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setMemberSearch('');
    setCategoryFilter('all');
    setSelectedMemberId(null);
    setContextMenu(null);
  }, [viewingMemberId]);

  useEffect(() => {
    setCategoryFilter('all');
  }, [viewPreset]);

  const membersMap = useMemo(() => {
    const map = new Map<number, FamilyTreeMember>();
    treeData?.members.forEach((member) => map.set(member.id, member));
    return map;
  }, [treeData]);

  const rootMember = useMemo(() => {
    if (!treeData) return undefined;
    return membersMap.get(treeData.rootMemberId);
  }, [treeData, membersMap]);

  const normalizedSearch = memberSearch.trim().toLowerCase();

  const allowedCategories = useMemo(
    () => FAMILY_TREE_VIEW_PRESETS[viewPreset].categories,
    [viewPreset],
  );

  const allowedCategorySet = useMemo(
    () => new Set<string>(allowedCategories as readonly string[]),
    [allowedCategories],
  );

  const availableCategories = useMemo(() => {
    if (!treeData) return [];
    return CATEGORY_ORDER.filter((category) => treeData.relationships.some((rel) => rel.category === category));
  }, [treeData]);

  const filterCategories = useMemo(
    () => availableCategories.filter((category) => allowedCategorySet.has(category)),
    [availableCategories, allowedCategorySet],
  );

  const effectiveCategoryFilter =
    categoryFilter !== 'all' && filterCategories.includes(categoryFilter) ? categoryFilter : 'all';

  const visibleRelationships = useMemo(() => {
    if (!treeData) return [];

    return treeData.relationships.filter((rel) => {
      if (!allowedCategorySet.has(rel.category)) return false;
      if (effectiveCategoryFilter !== 'all' && rel.category !== effectiveCategoryFilter) return false;
      if (!normalizedSearch) return true;
      const member = membersMap.get(rel.toMemberId);
      return member ? member.fullName.toLowerCase().includes(normalizedSearch) : false;
    });
  }, [treeData, allowedCategorySet, effectiveCategoryFilter, normalizedSearch, membersMap]);

  const visibleMemberIds = useMemo(() => {
    const ids = new Set<number>();
    if (rootMember) ids.add(rootMember.id);
    visibleRelationships.forEach((rel) => ids.add(rel.toMemberId));
    return ids;
  }, [rootMember, visibleRelationships]);

  const relationshipByMemberId = useMemo(() => {
    const map = new Map<number, FamilyRelationshipDto>();
    visibleRelationships.forEach((rel) => {
      if (!map.has(rel.toMemberId)) {
        map.set(rel.toMemberId, rel);
      }
    });
    return map;
  }, [visibleRelationships]);

  useEffect(() => {
    if (selectedMemberId === null) return;
    if (!visibleMemberIds.has(selectedMemberId)) {
      setSelectedMemberId(null);
      setContextMenu(null);
    }
  }, [selectedMemberId, visibleMemberIds]);

  useEffect(() => {
    if (!rootMember) {
      setFlowNodes([]);
      setFlowEdges([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLayouting(true);
      try {
        const layout = await buildTreeLayout(
          rootMember,
          visibleRelationships,
          membersMap,
          normalizedSearch,
          onAddRelation,
        );

        if (cancelled) return;

        setFlowNodes(layout.nodes);
        setFlowEdges(layout.edges);
      } catch {
        if (!cancelled) {
          toast.error('Daraxt layoutini hisoblashda xatolik');
        }
      } finally {
        if (!cancelled) {
          setLayouting(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [rootMember, visibleRelationships, membersMap, normalizedSearch, onAddRelation]);

  useEffect(() => {
    if (!flowInstance || flowNodes.length === 0) return;
    const timer = window.setTimeout(() => {
      flowInstance.fitView({ padding: 0.24, duration: 250 });
    }, 30);
    return () => window.clearTimeout(timer);
  }, [flowInstance, flowNodes]);

  const selectedMember = selectedMemberId !== null ? membersMap.get(selectedMemberId) || null : null;
  const selectedRelationship =
    selectedMemberId !== null ? relationshipByMemberId.get(selectedMemberId) : undefined;
  const selectedIsRoot = !!selectedMember && !!rootMember && selectedMember.id === rootMember.id;

  const handleOpenChangeRelationType = useCallback((relationship: FamilyRelationshipDto, memberName: string) => {
    setChangeRelationType({
      fromMemberId: relationship.fromMemberId,
      toMemberId: relationship.toMemberId,
      memberName,
      currentType: relationship.relationshipType,
    });
  }, []);

  const handleOpenDeleteRelation = useCallback((relationship: FamilyRelationshipDto, memberName: string) => {
    setDeleteRelation({
      fromId: relationship.fromMemberId,
      toId: relationship.toMemberId,
      memberName,
    });
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteRelation) return;
    try {
      await familyTreeApi.removeRelationship(deleteRelation.fromId, deleteRelation.toId);
      setDeleteRelation(null);
      setSelectedMemberId(null);
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

  const handleContextEdit = () => {
    if (contextMenu && onEditMember) {
      onEditMember(contextMenu.memberId);
    }
    setContextMenu(null);
  };

  const handleContextAddRelation = () => {
    if (contextMenu && onAddRelation) {
      onAddRelation(contextMenu.memberId);
    }
    setContextMenu(null);
  };

  const handleContextViewTree = () => {
    if (contextMenu) {
      setViewingMemberId(contextMenu.memberId);
      setSelectedMemberId(contextMenu.memberId);
    }
    setContextMenu(null);
  };

  const handleContextChangeType = () => {
    if (contextMenu) {
      const relation = relationshipByMemberId.get(contextMenu.memberId);
      if (relation) {
        handleOpenChangeRelationType(relation, contextMenu.memberName);
      }
    }
    setContextMenu(null);
  };

  const handleContextDeleteRelation = () => {
    if (contextMenu) {
      const relation = relationshipByMemberId.get(contextMenu.memberId);
      if (relation) {
        handleOpenDeleteRelation(relation, contextMenu.memberName);
      }
    }
    setContextMenu(null);
  };

  const handleNodeClick: NodeMouseHandler<TreeNode> = (_event, node) => {
    const memberId = Number(node.id);
    setSelectedMemberId(memberId);
    setContextMenu(null);
  };

  const handleNodeContextMenu: NodeMouseHandler<TreeNode> = (event, node) => {
    event.preventDefault();

    const memberId = Number(node.id);
    const member = membersMap.get(memberId);
    if (!member || !rootMember) return;

    const relation = relationshipByMemberId.get(memberId);

    setSelectedMemberId(memberId);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      memberId,
      memberName: member.fullName,
      isRoot: memberId === rootMember.id,
      relationshipType: relation?.relationshipType,
      fromMemberId: relation?.fromMemberId,
    });
  };

  const handlePaneClick = () => {
    setContextMenu(null);
    setSelectedMemberId(null);
  };

  const handleDrawerEdit = () => {
    if (!selectedMember || !onEditMember) return;
    onEditMember(selectedMember.id);
  };

  const handleDrawerAddRelation = () => {
    if (!selectedMember || !onAddRelation) return;
    onAddRelation(selectedMember.id);
  };

  const handleDrawerViewTree = () => {
    if (!selectedMember || selectedIsRoot) return;
    setViewingMemberId(selectedMember.id);
  };

  const handleDrawerChangeType = () => {
    if (!selectedMember || !selectedRelationship || selectedIsRoot) return;
    handleOpenChangeRelationType(selectedRelationship, selectedMember.fullName);
  };

  const handleDrawerDeleteRelation = () => {
    if (!selectedMember || !selectedRelationship || selectedIsRoot) return;
    handleOpenDeleteRelation(selectedRelationship, selectedMember.fullName);
  };

  const handleBeforeExport = useCallback(async () => {
    if (!flowInstance) return;
    flowInstance.fitView({ padding: 0.24, duration: 220 });
  }, [flowInstance]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

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

  if (!treeData) {
    return null;
  }

  if (!rootMember) {
    return (
      <div className="surface-card p-12 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-error" />
        <h3 className="text-lg font-semibold mb-2">Root a&apos;zo topilmadi</h3>
      </div>
    );
  }

  if (treeData.relationships.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <Users className="h-16 w-16 mx-auto mb-4 text-base-content/20" />
        <h3 className="text-lg font-semibold mb-2">Oila daraxti bo&apos;sh</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Qarindoshlaringizni qo&apos;shib oila daraxtini yarating
        </p>
        {onAddRelation && (
          <button className="btn btn-primary btn-sm" onClick={() => onAddRelation(treeData.rootMemberId)}>
            <Plus className="h-4 w-4" />
            Qarindosh qo&apos;shish
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {viewingMemberId && (
            <button className="btn btn-ghost btn-sm gap-1" onClick={handleBackToMe}>
              <ArrowLeft className="h-4 w-4" />
              O&apos;zimga qaytish
            </button>
          )}
          {viewingMemberId && (
            <span className="text-sm text-base-content/50">{rootMember.fullName} ning daraxti</span>
          )}
          <span className="pill">{visibleMemberIds.size} ta a&apos;zo ko&apos;rinmoqda</span>
        </div>

        <div className="flex items-center gap-2">
          <TreeExportButton targetRef={flowWrapperRef} beforeExport={handleBeforeExport} />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(FAMILY_TREE_VIEW_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`btn btn-xs ${viewPreset === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewPreset(key as TreeViewPresetKey)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
          <label className="form-control w-full lg:max-w-xs">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Kategoriya
            </span>
            <select
              className="select select-bordered h-12 rounded-xl"
              value={effectiveCategoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">Barchasi</option>
              {filterCategories.map((category) => (
                <option key={category} value={category}>
                  {RELATIONSHIP_CATEGORIES[category] || category}
                </option>
              ))}
            </select>
          </label>

          <SearchInput
            value={memberSearch}
            onValueChange={setMemberSearch}
            label="A'zo qidirish"
            placeholder="Daraxtdan ism toping..."
            className="w-full lg:max-w-sm"
          />
        </div>
      </div>

      <div
        ref={flowWrapperRef}
        className="relative h-[660px] overflow-hidden rounded-xl border border-base-200 bg-base-200/25"
      >
        <ReactFlow<TreeNode, Edge>
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneClick={handlePaneClick}
          onInit={setFlowInstance}
          fitView
          fitViewOptions={{ padding: 0.24 }}
          minZoom={0.25}
          maxZoom={1.8}
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="hsl(var(--bc) / 0.12)"
            gap={20}
            size={1.1}
          />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            nodeColor={(node) => (node.id === String(rootMember.id) ? 'hsl(var(--p))' : 'hsl(var(--b3))')}
            maskColor="hsl(var(--b1) / 0.72)"
            className="!border !border-base-300 !bg-base-100"
          />
          <Controls position="bottom-right" showInteractive={false} />

          {layouting && (
            <Panel position="top-center">
              <div className="rounded-full border border-base-200 bg-base-100 px-3 py-1.5 text-xs font-medium shadow">
                Layout hisoblanmoqda...
              </div>
            </Panel>
          )}

          {visibleRelationships.length === 0 && (
            <Panel position="top-center">
              <div className="max-w-md rounded-xl border border-warning/30 bg-warning/10 p-4 text-center">
                <p className="text-sm font-medium">Bu filtrda a&apos;zo topilmadi</p>
                <p className="mt-1 text-xs text-base-content/60">
                  Ko&apos;rishni tiklash uchun filtr va qidiruvni tozalang.
                </p>
                <button
                  className="btn btn-ghost btn-xs mt-3"
                  onClick={() => {
                    setMemberSearch('');
                    setCategoryFilter('all');
                    setViewPreset('FULL');
                  }}
                >
                  Filtrni tozalash
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      <FamilyTreeMemberDrawer
        isOpen={!!selectedMember}
        member={selectedMember}
        relationship={selectedRelationship}
        isRoot={selectedIsRoot}
        onClose={() => setSelectedMemberId(null)}
        onEdit={handleDrawerEdit}
        onAddRelation={handleDrawerAddRelation}
        onViewTree={handleDrawerViewTree}
        onChangeType={handleDrawerChangeType}
        onDeleteRelation={handleDrawerDeleteRelation}
      />

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
          onClose={() => setContextMenu(null)}
        />
      )}

      <DeleteRelationConfirmModal
        isOpen={!!deleteRelation}
        memberName={deleteRelation?.memberName || ''}
        onClose={() => setDeleteRelation(null)}
        onConfirm={handleConfirmDelete}
      />

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
