import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Clock,
  Copy,
  GraduationCap,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { schoolsApi } from '../../api/schools.api';
import { scopesApi } from '../../api/scopes.api';
import { familyMembersApi } from '../../api/family-members.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { ModalPortal } from '../../components/common/Modal';
import { PersonSelect } from '../../components/ui/PersonSelect';
import { getScopeTypeMeta } from '../../components/scope/scopeTypeMeta';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Enrollment, Scope } from '../../types/scope.types';

const MY_SCOPES_QUERY_KEY = ['scopes', 'my'];
const MY_CHILDREN_QUERY_KEY = ['schools', 'my-children'];

/** Scope'da boshqaruv huquqi (OWNER/ADMIN) — UI uchun (backend baribir tekshiradi). */
const canManage = (s: Scope) => s.currentUserRole === 'OWNER' || s.currentUserRole === 'ADMIN';

/**
 * Maktablar sahifasi (ADR-002 P4).
 *
 * <p>Uch rol bir sahifada: (1) ota-ona — farzandni sinf kodi orqali yozadi va
 * yozilishlarini ko'radi; (2) o'qituvchi/maktab admini — maktab ochadi (SUPER_ADMIN
 * tasdig'i bilan), sinf yaratadi, sinf kodini tarqatadi, ro'yxatni ko'radi;
 * (3) hamma — o'zi a'zo maktab/sinflarini ko'radi. Sinf balllari Ball tizimi
 * sahifasida (scope tanlagichda sinfni tanlab) yuritiladi.</p>
 */
export function SchoolsPage() {
  const queryClient = useQueryClient();

  const [applyOpen, setApplyOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [classTarget, setClassTarget] = useState<Scope | null>(null);
  const [rosterTarget, setRosterTarget] = useState<Scope | null>(null);

  const { data: scopes = [], isLoading } = useQuery({
    queryKey: MY_SCOPES_QUERY_KEY,
    queryFn: async () => (await scopesApi.getMyScopes()).data.data ?? [],
  });

  const { data: myChildren = [] } = useQuery({
    queryKey: MY_CHILDREN_QUERY_KEY,
    queryFn: async () => (await schoolsApi.getMyChildrenEnrollments()).data.data ?? [],
  });

  const schools = useMemo(() => scopes.filter((s) => s.type === 'SCHOOL'), [scopes]);
  const classes = useMemo(() => scopes.filter((s) => s.type === 'CLASS'), [scopes]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: MY_SCOPES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: MY_CHILDREN_QUERY_KEY });
  };

  const unenrollMutation = useMutation({
    mutationFn: (e: Enrollment) => schoolsApi.unenroll(e.classScopeId, e.familyMemberId),
    onSuccess: () => {
      toast.success('Farzand sinfdan chiqarildi');
      refresh();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Sinfdan chiqarishda xatolik')),
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Maktablar"
        subtitle="Sinf kodi orqali farzandingizni yozing — sinf balllari uy ballaridan alohida yuritiladi"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => setEnrollOpen(true)}>
              <KeyRound className="h-4 w-4" /> Sinfga yozish
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setApplyOpen(true)}>
              <Plus className="h-4 w-4" /> Maktab ochish
            </button>
          </div>
        }
      />

      {/* ===== Mening farzandlarim (ota-ona ko'rinishi) ===== */}
      <div className="rounded-2xl bg-base-100 p-4 shadow-sm lg:p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
          <Users className="h-3.5 w-3.5" /> Mening farzandlarim sinflarda
        </div>
        {myChildren.length === 0 ? (
          <p className="py-2 text-sm text-base-content/60">
            Hozircha yozilgan farzand yo'q. O'qituvchi bergan sinf kodi bilan{' '}
            <button className="link link-primary" onClick={() => setEnrollOpen(true)}>
              yozishingiz
            </button>{' '}
            mumkin.
          </p>
        ) : (
          <div className="divide-y divide-base-200">
            {myChildren.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-500/10 text-teal-500">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {e.realName ?? e.nickname}
                    <span className="ml-1.5 text-xs font-normal text-base-content/60">
                      taxallus: {e.nickname}
                    </span>
                  </span>
                  <span className="text-xs text-base-content/60">{e.className}</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => unenrollMutation.mutate(e)}
                  disabled={unenrollMutation.isPending}
                  title="Sinfdan chiqarish"
                >
                  {unenrollMutation.isPending && unenrollMutation.variables?.id === e.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Chiqarish</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Mening maktablarim / sinflarim (o'qituvchi ko'rinishi) ===== */}
      {(schools.length > 0 || classes.length > 0) && (
        <div className="rounded-2xl bg-base-100 p-4 shadow-sm lg:p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
            <GraduationCap className="h-3.5 w-3.5" /> Mening maktab va sinflarim
          </div>
          <div className="divide-y divide-base-200">
            {[...schools, ...classes].map((scope) => (
              <SchoolRow
                key={scope.id}
                scope={scope}
                onCreateClass={() => setClassTarget(scope)}
                onRoster={() => setRosterTarget(scope)}
              />
            ))}
          </div>
        </div>
      )}

      {isLoading && scopes.length === 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-base-100 p-4 text-sm text-base-content/60 lg:p-5">
          <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
        </div>
      )}

      {/* Mobil uchun asosiy amallar (PageHeader actions desktop-only) */}
      <div className="flex flex-col gap-2 lg:hidden">
        <button className="btn btn-primary btn-sm w-full" onClick={() => setEnrollOpen(true)}>
          <KeyRound className="h-4 w-4" /> Sinf kodi bilan yozish
        </button>
        <button className="btn btn-outline btn-sm w-full" onClick={() => setApplyOpen(true)}>
          <Plus className="h-4 w-4" /> Maktab ochish arizasi
        </button>
      </div>

      <ApplySchoolModal isOpen={applyOpen} onClose={() => setApplyOpen(false)} onDone={refresh} />
      <EnrollChildModal isOpen={enrollOpen} onClose={() => setEnrollOpen(false)} onDone={refresh} />
      <CreateClassModal school={classTarget} onClose={() => setClassTarget(null)} onDone={refresh} />
      <ClassRosterModal classScope={rosterTarget} onClose={() => setRosterTarget(null)} />
    </div>
  );
}

/** Bitta maktab/sinf qatori — holat badge, sinf ochish / ro'yxat amallari. */
function SchoolRow({
  scope,
  onCreateClass,
  onRoster,
}: {
  scope: Scope;
  onCreateClass: () => void;
  onRoster: () => void;
}) {
  const meta = getScopeTypeMeta(scope.type);
  const Icon = meta.icon;
  const isSchool = meta.type === 'SCHOOL';
  const pendingApproval = isSchool && scope.isActive === false;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{scope.name}</span>
          {pendingApproval && (
            <span className="badge badge-warning badge-sm gap-1">
              <Clock className="h-3 w-3" /> Tasdiq kutilmoqda
            </span>
          )}
        </div>
        <span className="text-xs text-base-content/60">
          {meta.label}
          {scope.parentScopeName && ` · ${scope.parentScopeName}`}
        </span>
      </div>

      {isSchool && !pendingApproval && canManage(scope) && (
        <button className="btn btn-outline btn-sm" onClick={onCreateClass}>
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Sinf ochish</span>
        </button>
      )}
      {!isSchool && (
        <button className="btn btn-outline btn-sm" onClick={onRoster}>
          <Users className="h-4 w-4" /> <span className="hidden sm:inline">Ro'yxat</span>
        </button>
      )}
    </div>
  );
}

/** Maktab ochish arizasi — SUPER_ADMIN tasdiqlaguncha nofaol qoladi. */
function ApplySchoolModal({
  isOpen,
  onClose,
  onDone,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const applyMutation = useMutation({
    mutationFn: () => schoolsApi.apply(name.trim(), description.trim() || undefined),
    onSuccess: () => {
      toast.success("Ariza yuborildi — platforma administratori tasdiqlagach maktab faollashadi");
      setName('');
      setDescription('');
      onDone();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Ariza yuborishda xatolik')),
  });

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel="Maktab ochish arizasi">
      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-500" />
          <h3 className="font-display text-base font-bold">Maktab ochish arizasi</h3>
        </div>
        <p className="mb-3 text-sm text-base-content/60">
          Maktab — sinflar ochilib, o'quvchilar ball to'playdigan ta'lim maydoni. Bolalar
          xavfsizligi uchun har bir maktab platforma administratori tomonidan tasdiqlanadi.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Maktab nomi (masalan: 21-maktab, Chilonzor)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
          />
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Qisqa tavsif — manzil, kim uchun (administrator arizani baholashda ko'radi)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Bekor qilish</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={name.trim().length < 3 || applyMutation.isPending}
            onClick={() => applyMutation.mutate()}
          >
            {applyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Ariza yuborish
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

/** Tasdiqlangan maktab ichida yangi sinf yaratish. */
function CreateClassModal({
  school,
  onClose,
  onDone,
}: {
  school: Scope | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: () => schoolsApi.createClass(school!.id, name.trim()),
    onSuccess: () => {
      toast.success("Sinf yaratildi — kodini ota-onalarga tarqating (Ro'yxat oynasida)");
      setName('');
      onDone();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Sinf yaratishda xatolik')),
  });

  return (
    <ModalPortal isOpen={school != null} onClose={onClose} ariaLabel="Sinf yaratish">
      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-teal-500" />
          <h3 className="font-display text-base font-bold">Yangi sinf — {school?.name}</h3>
        </div>
        <p className="mb-3 text-sm text-base-content/60">
          Siz sinf admini (o'qituvchi) bo'lasiz: o'quvchilarga ball berish, vazifa va sinf
          do'konini boshqarish Ball tizimi sahifasida (sinf kontekstida) yuritiladi.
        </p>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Masalan: 5-«A» sinf"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={150}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Bekor qilish</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={name.trim().length < 2 || createMutation.isPending}
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

/** Sinf kodi orqali farzandni yozish: kod → sinf preview → farzand + taxallus. */
function EnrollChildModal({
  isOpen,
  onClose,
  onDone,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState('');
  const [foundClass, setFoundClass] = useState<Scope | null>(null);
  const [memberId, setMemberId] = useState<number | undefined>();
  const [nickname, setNickname] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['family-members', 'list'],
    queryFn: async () => (await familyMembersApi.getList()).data.data ?? [],
    enabled: isOpen,
  });

  const memberOptions = useMemo(
    () =>
      members
        .filter((m) => m.isActive)
        .map((m) => ({ value: m.id, label: m.fullName })),
    [members],
  );

  const lookupMutation = useMutation({
    mutationFn: async () => (await scopesApi.lookupByCode(code.trim())).data.data,
    onSuccess: (scope) => {
      if (!scope || scope.type !== 'CLASS') {
        setFoundClass(null);
        toast.error("Bu kod sinfga tegishli emas — o'qituvchidan sinf kodini so'rang");
        return;
      }
      setFoundClass(scope);
    },
    onError: (err) => {
      setFoundClass(null);
      toast.error(getApiErrorMessage(err, 'Kod topilmadi'));
    },
  });

  const enrollMutation = useMutation({
    mutationFn: () => schoolsApi.enroll(foundClass!.id, memberId as number, nickname.trim()),
    onSuccess: () => {
      toast.success("Farzand sinfga yozildi — sinf hamyoni ochildi");
      reset();
      onDone();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Yozishda xatolik')),
  });

  const reset = () => {
    setCode('');
    setFoundClass(null);
    setMemberId(undefined);
    setNickname('');
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={() => { reset(); onClose(); }} ariaLabel="Sinfga yozish">
      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-bold">Farzandni sinfga yozish</h3>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered flex-1 font-mono uppercase"
              placeholder="Sinf kodi (masalan: K3F8A2C1)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={16}
            />
            <button
              className="btn btn-outline btn-sm h-12"
              disabled={code.trim().length < 4 || lookupMutation.isPending}
              onClick={() => lookupMutation.mutate()}
            >
              {lookupMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Topish
            </button>
          </div>

          {foundClass && (
            <>
              <div className="rounded-lg bg-teal-500/10 px-3 py-2 text-sm">
                <span className="font-semibold text-teal-600">{foundClass.name}</span>
                {foundClass.parentScopeName && (
                  <span className="text-base-content/60"> · {foundClass.parentScopeName}</span>
                )}
              </div>

              <PersonSelect
                value={memberId}
                onChange={(v) => setMemberId(v as number | undefined)}
                options={memberOptions}
                label="Farzand"
                placeholder="Farzandni tanlang..."
                required
              />

              <div>
                <label className="label pb-1 pt-0">
                  <span className="label-text text-sm">Sinfdagi taxallusi (majburiy)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Masalan: Chempion_01"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-base-content/60">
                  Maxfiylik uchun sinf reytingida haqiqiy ism o'rniga shu taxallus ko'rinadi
                  (haqiqiy ismni faqat o'qituvchi ko'radi).
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => { reset(); onClose(); }}>
            Bekor qilish
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!foundClass || !memberId || nickname.trim().length < 2 || enrollMutation.isPending}
            onClick={() => enrollMutation.mutate()}
          >
            {enrollMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Yozish
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

/** Sinf ro'yxati (o'qituvchi/a'zo) + sinf kodi (faqat admin oladi). */
function ClassRosterModal({
  classScope,
  onClose,
}: {
  classScope: Scope | null;
  onClose: () => void;
}) {
  const manage = classScope != null && canManage(classScope);

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ['schools', 'roster', classScope?.id],
    queryFn: async () => (await schoolsApi.getClassEnrollments(classScope!.id)).data.data ?? [],
    enabled: classScope != null,
  });

  const { data: inviteCode } = useQuery({
    queryKey: ['schools', 'invite-code', classScope?.id],
    queryFn: async () => (await scopesApi.getInviteCode(classScope!.id)).data.data?.inviteCode,
    enabled: manage,
  });

  const copyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(
      () => toast.success('Kod nusxalandi — ota-onalarga yuboring'),
      () => toast.error('Nusxalashda xatolik'),
    );
  };

  return (
    <ModalPortal isOpen={classScope != null} onClose={onClose} ariaLabel="Sinf ro'yxati">
      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-500" />
          <h3 className="font-display text-base font-bold">{classScope?.name} — ro'yxat</h3>
        </div>

        {manage && inviteCode && (
          <button
            className="mb-3 flex w-full items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm"
            onClick={copyCode}
            title="Nusxalash"
          >
            <span>
              Sinf kodi: <span className="font-mono font-bold text-primary">{inviteCode}</span>
            </span>
            <Copy className="h-4 w-4 text-primary" />
          </button>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-base-content/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
          </div>
        ) : roster.length === 0 ? (
          <p className="py-4 text-center text-sm text-base-content/60">
            Hozircha o'quvchi yozilmagan — sinf kodini ota-onalarga tarqating.
          </p>
        ) : (
          <div className="max-h-80 divide-y divide-base-200 overflow-y-auto">
            {roster.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-500/10 text-xs font-bold text-teal-600">
                  {e.nickname.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.nickname}</span>
                  {e.realName && (
                    <span className="text-xs text-base-content/60">{e.realName}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Yopish</button>
        </div>
      </div>
    </ModalPortal>
  );
}
