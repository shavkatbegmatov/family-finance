import { useEffect } from 'react';
import { Users, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyFlowTree } from './flow/FamilyFlowTree';
import { FamilyTreeToolbar } from './FamilyTreeToolbar';
import { TreeContextMenu } from './TreeContextMenu';
import { FamilyTreeModals } from './modals/FamilyTreeModals';
import { useFamilyTreeStore } from '../../store/familyTreeStore';
import { useTreeQuery, useLabeledTreeQuery } from '../../hooks/useFamilyTreeQueries';
import type { TreeResponse } from '../../types';

export function FamilyTreeView() {
  const {
    rootPersonId,
    viewerPersonId,
    depth,
    openModal,
  } = useFamilyTreeStore();

  // Use labeled tree if viewer is selected, otherwise use normal tree
  const treeQuery = useTreeQuery(rootPersonId ?? undefined, depth);
  const labeledQuery = useLabeledTreeQuery(
    rootPersonId ?? treeQuery.data?.rootPersonId ?? 0,
    viewerPersonId ?? 0,
    depth
  );

  // Pick the right data
  const isLabeled = !!viewerPersonId;
  const treeData: TreeResponse | undefined = isLabeled
    ? labeledQuery.data
    : treeQuery.data;
  const isLoading = isLabeled ? labeledQuery.isLoading : treeQuery.isLoading;
  const isError = isLabeled ? labeledQuery.isError : treeQuery.isError;
  const error = isLabeled ? labeledQuery.error : treeQuery.error;
  const refetch = isLabeled ? labeledQuery.refetch : treeQuery.refetch;

  // Set rootPersonId from initial tree data
  useEffect(() => {
    if (treeQuery.data?.rootPersonId && !rootPersonId) {
      useFamilyTreeStore.getState().setRootPersonId(treeQuery.data.rootPersonId);
    }
  }, [treeQuery.data?.rootPersonId, rootPersonId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // Error: not linked
  if (isError) {
    const axiosErr = error as { response?: { status?: number } };
    if (axiosErr?.response?.status === 404) {
      return (
        <div className="surface-card p-12 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-warning" />
          <h3 className="text-lg font-semibold mb-2">
            Profilingiz oila a&apos;zosiga bog&apos;lanmagan
          </h3>
          <p className="text-sm text-base-content/60 mb-4">
            Oila daraxtini ko&apos;rish uchun avval oila a&apos;zosi yaratib,
            foydalanuvchi akkauntingizga bog&apos;lang.
          </p>
        </div>
      );
    }

    return (
      <div className="surface-card p-12 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-error" />
        <h3 className="text-lg font-semibold mb-2">Xatolik</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Daraxtni yuklashda xatolik yuz berdi
        </p>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => void refetch()}
        >
          <RefreshCw className="h-4 w-4" />
          Qayta yuklash
        </button>
      </div>
    );
  }

  // Empty tree
  if (!treeData || treeData.persons.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <Users className="h-16 w-16 mx-auto mb-4 text-base-content/20" />
        <h3 className="text-lg font-semibold mb-2">
          Oila daraxti bo&apos;sh
        </h3>
        <p className="text-sm text-base-content/60 mb-4">
          Turmush o&apos;rtoq qo&apos;shib oila daraxtini yarating
        </p>
        {treeData && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() =>
              openModal({ type: 'addSpouse', personId: treeData.rootPersonId })
            }
          >
            <Plus className="h-4 w-4" />
            Turmush o&apos;rtoq qo&apos;shish
          </button>
        )}
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="relative">
        {/* Toolbar */}
        <div className="mb-3">
          <FamilyTreeToolbar />
        </div>

        {/* React Flow container */}
        <div
          className="rounded-xl border border-base-200 bg-base-200/30"
          style={{ minHeight: '500px', height: '70vh', maxHeight: '800px' }}
        >
          <FamilyFlowTree treeData={treeData} />
        </div>

        {/* Context menu */}
        <TreeContextMenu />

        {/* Modals */}
        <FamilyTreeModals />
      </div>
    </ReactFlowProvider>
  );
}
