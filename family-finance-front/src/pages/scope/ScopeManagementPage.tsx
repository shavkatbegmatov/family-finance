import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Link2, Loader2, Plus, ShieldCheck, Unlink, Users2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { scopesApi } from '../../api/scopes.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { ModalPortal } from '../../components/common/Modal';
import { useScopeStore } from '../../store/scopeStore';
import { getScopeTypeMeta } from '../../components/scope/scopeTypeMeta';
import { groupScopesByGroup, ROLE_LABEL, ROLE_TONE } from '../../components/scope/scopeGrouping';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Scope } from '../../types/scope.types';

const MY_SCOPES_QUERY_KEY = ['scopes', 'my'];

/** Xonadon/guruhda boshqaruv huquqi (OWNER/ADMIN) bormi — UI ko'rsatish uchun (backend baribir tekshiradi). */
const canManage = (s: Scope) => s.currentUserRole === 'OWNER' || s.currentUserRole === 'ADMIN';

/** Guruhga yozish huquqi (kamida MEMBER) — biriktirish target'i sifatida ko'rsatish uchun. */
const canWrite = (s: Scope) =>
  s.currentUserRole === 'OWNER' || s.currentUserRole === 'ADMIN' || s.currentUserRole === 'MEMBER';

/**
 * Guruh va xonadonlar boshqaruvi (ADR-001 decoupling UX).
 *
 * <p>Guruh — bir nechta xonadon moliyasini birgalikda ko'rish uchun IXTIYORIY birlashma.
 * Bu sahifada: yangi guruh ochish, mustaqil xonadonni guruhga biriktirish, guruhdan chiqarish.</p>
 */
export function ScopeManagementPage() {
  const queryClient = useQueryClient();
  const setMyScopes = useScopeStore((s) => s.setMyScopes);

  const [createOpen, setCreateOpen] = useState(false);
  const [attachTarget, setAttachTarget] = useState<Scope | null>(null);

  const { data: scopes = [], isLoading } = useQuery({
    queryKey: MY_SCOPES_QUERY_KEY,
    queryFn: async () => {
      const list = (await scopesApi.getMyScopes()).data.data ?? [];
      setMyScopes(list); // ScopeSwitcher cache'ini ham yangilab boramiz
      return list;
    },
  });

  const grouped = useMemo(() => groupScopesByGroup(scopes), [scopes]);
  const myGroups = useMemo(
    () => scopes.filter((s) => getScopeTypeMeta(s.type).type === 'GROUP' && canWrite(s)),
    [scopes],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: MY_SCOPES_QUERY_KEY });

  const detachMutation = useMutation({
    mutationFn: (household: Scope) => scopesApi.setParent(household.id, null),
    onSuccess: () => {
      toast.success("Xonadon guruhdan chiqarildi — endi mustaqil");
      refresh();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Guruhdan chiqarishda xatolik")),
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Guruh va xonadonlar"
        subtitle="Guruh — bir nechta xonadon moliyasini birgalikda ko'rish uchun ixtiyoriy birlashma"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Yangi guruh
          </button>
        }
      />

      {isLoading && scopes.length === 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-base-100 p-4 text-sm text-base-content/60 lg:p-5">
          <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
        </div>
      )}

      {!isLoading && scopes.length === 0 && (
        <div className="rounded-2xl bg-base-100 p-8 text-center text-sm text-base-content/60">
          Hech qanday scope'ga a'zo emassiz.
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.key} className="rounded-2xl bg-base-100 p-4 shadow-sm lg:p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
            {group.groupName
              ? `${group.groupType === 'SCHOOL' ? 'Maktab' : 'Guruh'}: ${group.groupName}`
              : 'Mustaqil (guruhsiz)'}
          </div>
          <div className="divide-y divide-base-200">
            {group.scopes.map((scope) => (
              <ScopeRow
                key={scope.id}
                scope={scope}
                onAttach={() => setAttachTarget(scope)}
                onDetach={() => detachMutation.mutate(scope)}
                detaching={detachMutation.isPending && detachMutation.variables?.id === scope.id}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Mobil uchun ham yaratish tugmasi (PageHeader actions desktop-only bo'lishi mumkin) */}
      <button className="btn btn-primary btn-sm w-full lg:hidden" onClick={() => setCreateOpen(true)}>
        <Plus className="h-4 w-4" /> Yangi guruh ochish
      </button>

      <CreateGroupModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={refresh} />
      <AttachToGroupModal
        household={attachTarget}
        groups={myGroups}
        onClose={() => setAttachTarget(null)}
        onAttached={refresh}
      />
    </div>
  );
}

/** Bitta scope qatori — meta, rol, va xonadon uchun biriktirish/uzish amallari. */
function ScopeRow({
  scope,
  onAttach,
  onDetach,
  detaching,
}: {
  scope: Scope;
  onAttach: () => void;
  onDetach: () => void;
  detaching: boolean;
}) {
  const meta = getScopeTypeMeta(scope.type);
  const Icon = meta.icon;
  const isHousehold = meta.type === 'HOUSEHOLD';
  const isRoot = !scope.parentScopeId;
  const role = scope.currentUserRole;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{scope.name}</span>
          {role === 'OWNER' && <Crown className="h-3 w-3 shrink-0 text-amber-400" />}
          {role === 'ADMIN' && <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />}
        </div>
        <span className="text-xs text-base-content/60">
          {meta.label}
          {scope.displayCode && ` · № ${scope.displayCode}`}
          {role && <span className={`ml-1.5 ${ROLE_TONE[role]}`}>· {ROLE_LABEL[role]}</span>}
        </span>
      </div>

      {isHousehold && canManage(scope) && (
        isRoot ? (
          <button className="btn btn-outline btn-sm" onClick={onAttach} title="Guruhga biriktirish">
            <Link2 className="h-4 w-4" /> <span className="hidden sm:inline">Guruhga biriktirish</span>
          </button>
        ) : (
          <button
            className="btn btn-ghost btn-sm text-error"
            onClick={onDetach}
            disabled={detaching}
            title="Guruhdan chiqarish"
          >
            {detaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
            <span className="hidden sm:inline">Chiqarish</span>
          </button>
        )
      )}
    </div>
  );
}

/** Yangi GROUP scope yaratish modal'i (faqat nom — guruh har doim root). */
function CreateGroupModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: () => scopesApi.create({ type: 'GROUP', name: name.trim() }),
    onSuccess: () => {
      toast.success("Guruh yaratildi — endi xonadonlarni biriktirishingiz mumkin");
      setName('');
      onCreated();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Guruh yaratishda xatolik")),
  });

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel="Yangi guruh ochish">
      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Users2 className="h-5 w-5 text-emerald-500" />
          <h3 className="font-display text-base font-bold">Yangi guruh ochish</h3>
        </div>
        <p className="mb-3 text-sm text-base-content/60">
          Guruh — bir nechta xonadonni (masalan otangiz, o'zingiz va akangiznikini) birgalikda
          ko'rish uchun moliyaviy birlashma. Qarindoshlik shajarasiga ta'sir qilmaydi.
        </p>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Masalan: Begmatovlar guruhi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={150}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Bekor qilish</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={name.trim().length < 3 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Yaratish
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

/** Mustaqil xonadonni tanlangan guruhga biriktirish modal'i. */
function AttachToGroupModal({
  household,
  groups,
  onClose,
  onAttached,
}: {
  household: Scope | null;
  groups: Scope[];
  onClose: () => void;
  onAttached: () => void;
}) {
  const [groupId, setGroupId] = useState<string>('');

  const attachMutation = useMutation({
    mutationFn: () => scopesApi.setParent(household!.id, Number(groupId)),
    onSuccess: () => {
      toast.success("Xonadon guruhga biriktirildi");
      setGroupId('');
      onAttached();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Biriktirishda xatolik")),
  });

  return (
    <ModalPortal isOpen={household != null} onClose={onClose} ariaLabel="Xonadonni guruhga biriktirish">
      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-bold">Xonadonni guruhga biriktirish</h3>
        </div>
        <p className="mb-3 text-sm text-base-content/60">
          <strong>{household?.name}</strong> xonadoni tanlangan guruh ostiga o'tadi — xonadon
          a'zolari guruh darajasidagi umumiy moliyani ko'ra oladi.
        </p>

        {groups.length === 0 ? (
          <div className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            Siz a'zo bo'lgan guruh yo'q — avval "Yangi guruh" ochib oling.
          </div>
        ) : (
          <select
            className="select select-bordered w-full"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="" disabled>Guruhni tanlang...</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Bekor qilish</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!groupId || attachMutation.isPending}
            onClick={() => attachMutation.mutate()}
          >
            {attachMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Biriktirish
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
