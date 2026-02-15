import { useEffect, useState } from 'react';
import { Users, Plus, AlertTriangle, RefreshCw, UserPlus } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyFlowTree } from './flow/FamilyFlowTree';
import { FamilyTreeToolbar } from './FamilyTreeToolbar';
import { TreeContextMenu } from './TreeContextMenu';
import { FamilyTreeModals } from './modals/FamilyTreeModals';
import { useFamilyTreeStore } from '../../store/familyTreeStore';
import { useTreeQuery, useLabeledTreeQuery, useRegisterSelf } from '../../hooks/useFamilyTreeQueries';
import { useAuthStore } from '../../store/authStore';
import { GENDERS, FAMILY_ROLES } from '../../config/constants';
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

  const user = useAuthStore((s) => s.user);

  // Set rootPersonId from initial tree data
  useEffect(() => {
    if (treeQuery.data?.rootPersonId && !rootPersonId) {
      useFamilyTreeStore.getState().setRootPersonId(treeQuery.data.rootPersonId);
    }
  }, [treeQuery.data?.rootPersonId, rootPersonId]);

  // Viewer avtomatik tanlash — labeled tree (qarindoshlik labellari) yoqiladi
  useEffect(() => {
    if (!viewerPersonId && user?.familyMemberId) {
      useFamilyTreeStore.getState().setViewerPersonId(user.familyMemberId);
    }
  }, [viewerPersonId, user?.familyMemberId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // Error: not linked — show register-self form
  if (isError) {
    const axiosErr = error as { response?: { status?: number } };
    if (axiosErr?.response?.status === 404) {
      return <RegisterSelfForm />;
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

function RegisterSelfForm() {
  const user = useAuthStore((s) => s.user);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [gender, setGender] = useState('');
  const registerSelf = useRegisterSelf();

  const inferredRole =
    gender === 'MALE'
      ? FAMILY_ROLES.FATHER.label
      : gender === 'FEMALE'
        ? FAMILY_ROLES.MOTHER.label
        : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !gender) return;
    registerSelf.mutate({ fullName: fullName.trim(), gender });
  };

  return (
    <div className="surface-card p-12 text-center max-w-md mx-auto">
      <UserPlus className="h-16 w-16 mx-auto mb-4 text-primary" />
      <h3 className="text-lg font-semibold mb-2">
        Profilingizni oila a&apos;zosiga bog&apos;lang
      </h3>
      <p className="text-sm text-base-content/60 mb-6">
        Oila daraxtini ko&apos;rish uchun o&apos;zingizni oila a&apos;zosi sifatida ro&apos;yxatdan o&apos;tkazing.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Ism familiya</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={100}
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Jinsi</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
          >
            <option value="" disabled>
              Tanlang
            </option>
            {Object.values(GENDERS).map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {inferredRole && (
          <p className="text-sm text-base-content/60">
            Rol: <span className="font-medium text-base-content">{inferredRole}</span>
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={registerSelf.isPending || !fullName.trim() || !gender}
        >
          {registerSelf.isPending ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Ro&apos;yxatdan o&apos;tish
            </>
          )}
        </button>
      </form>
    </div>
  );
}
