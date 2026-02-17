import { useEffect, useRef, useState } from 'react';
import { Users, Plus, AlertTriangle, RefreshCw, UserPlus } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyFlowTree } from './flow/FamilyFlowTree';
import { FamilyTreeToolbar } from './FamilyTreeToolbar';
import { TreeContextMenu } from './TreeContextMenu';
import { FamilyTreeModals } from './modals/FamilyTreeModals';
import { PersonDetailPanel } from './modals/PersonDetailPanel';
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
    activeModal,
    isSidebarPinned,
    closeModal,
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Mount paytida rootPersonId va viewerPersonId ni joriy user ga o'rnatish
  // Har safar tree tab ochilganda user o'zi markazda ko'rinadi
  useEffect(() => {
    if (user?.familyMemberId) {
      useFamilyTreeStore.getState().setRootPersonId(user.familyMemberId);
      useFamilyTreeStore.getState().setViewerPersonId(user.familyMemberId);
    } else if (treeQuery.data?.rootPersonId && !rootPersonId) {
      useFamilyTreeStore.getState().setRootPersonId(treeQuery.data.rootPersonId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.familyMemberId, treeQuery.data?.rootPersonId]);

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

  const isPinnedDetailOpen =
    isSidebarPinned && activeModal?.type === 'personDetail';

  return (
    <ReactFlowProvider>
      <div className="relative" ref={containerRef}>
        {/* Toolbar */}
        <div className="mb-3">
          <FamilyTreeToolbar fullscreenRef={containerRef} />
        </div>

        {/* Main content — flex layout when pinned */}
        <div
          className={`rounded-xl border border-base-200 bg-base-200/30 ${isPinnedDetailOpen ? 'flex' : ''}`}
          style={{ minHeight: '500px', height: '70vh', maxHeight: '800px' }}
        >
          {/* React Flow container */}
          <div className={isPinnedDetailOpen ? 'flex-1 min-w-0' : 'h-full'}>
            <FamilyFlowTree treeData={treeData} />
          </div>

          {/* Pinned sidebar */}
          {isPinnedDetailOpen && (
            <div className="border-l border-base-300 h-full">
              <PersonDetailPanel
                isOpen
                personId={activeModal.personId}
                onClose={closeModal}
              />
            </div>
          )}
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

  // fullName format: "Familiya Ism" — birinchi so'z = lastName, qolgani = firstName
  const nameParts = (user?.fullName ?? '').trim().split(/\s+/);
  const [lastName, setLastName] = useState(nameParts.length > 1 ? nameParts[0] : '');
  const [firstName, setFirstName] = useState(
    nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || ''
  );
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
    if (!firstName.trim() || !gender) return;
    registerSelf.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      gender,
    });
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
            <span className="label-text">Familiya</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Begmatova"
            maxLength={100}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Ism</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Gulnora"
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
          disabled={registerSelf.isPending || !firstName.trim() || !gender}
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
