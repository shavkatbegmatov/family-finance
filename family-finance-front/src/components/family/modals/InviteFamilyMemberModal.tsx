import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRightLeft,
  AtSign,
  CheckCircle2,
  Clock3,
  GitBranch,
  Info,
  Mail,
  Phone,
  UserPlus,
  Users,
} from 'lucide-react';
import { familyGroupApi, type FamilyGroupInviteCandidate } from '../../../api/family-group.api';
import { FAMILY_ROLES, GENDERS } from '../../../config/constants';
import { ModalPortal } from '../../common/Modal';
import { SearchInput } from '../../ui/SearchInput';

interface InviteFamilyMemberModalProps {
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onInvite: (username: string) => Promise<void>;
}

type InviteFilter = 'all' | 'ready' | 'with-tree' | 'external';

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
};

const SEARCH_RESULT_LIMIT = 12;

const roleLabel = (role?: string | null) =>
  (role ? (FAMILY_ROLES as Record<string, { label: string }>)[role]?.label : null) ?? role ?? "Ko'rsatilmagan";

const genderLabel = (gender?: string | null) =>
  (gender ? (GENDERS as Record<string, { label: string }>)[gender]?.label : null) ?? gender ?? "Ko'rsatilmagan";

const formatDateLabel = (date?: string | null) => {
  if (!date) return "Ko'rsatilmagan";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('uz-UZ').format(parsed);
};

const getCandidateState = (candidate: FamilyGroupInviteCandidate): 'ready' | 'current' | 'external' => {
  if (candidate.alreadyInCurrentGroup) return 'current';
  if (candidate.familyGroupId) return 'external';
  return 'ready';
};

const FILTERS: Array<{
  value: InviteFilter;
  label: string;
  description: string;
}> = [
  { value: 'all', label: 'Barchasi', description: 'Topilgan barcha foydalanuvchilar' },
  { value: 'ready', label: "Qo'shish mumkin", description: "Hozirgi oilaga darhol qo'shiladi" },
  { value: 'with-tree', label: 'Shajara bor', description: "Shajara a'zosi bilan bog'langanlar" },
  { value: 'external', label: 'Boshqa oilada', description: "Hozircha tanlab bo'lmaydigan foydalanuvchilar" },
];

export function InviteFamilyMemberModal({
  isOpen,
  loading = false,
  onClose,
  onInvite,
}: InviteFamilyMemberModalProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<InviteFilter>('all');
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setDebouncedSearch('');
      setFilter('all');
      setSelectedCandidateId(null);
      setSubmitError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [isOpen, search]);

  const {
    data: candidates = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['family-group', 'invite-candidates', debouncedSearch],
    queryFn: () => familyGroupApi.searchInviteCandidates(debouncedSearch || undefined, SEARCH_RESULT_LIMIT),
    enabled: isOpen,
    staleTime: 15_000,
  });

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const state = getCandidateState(candidate);
      if (filter === 'ready') return state === 'ready';
      if (filter === 'with-tree') return Boolean(candidate.linkedFamilyMemberId);
      if (filter === 'external') return state === 'external';
      return true;
    });
  }, [candidates, filter]);

  useEffect(() => {
    if (!filteredCandidates.length) {
      setSelectedCandidateId(null);
      return;
    }

    const selectedStillVisible = filteredCandidates.some((candidate) => candidate.userId === selectedCandidateId);
    if (!selectedStillVisible) {
      const firstReady = filteredCandidates.find((candidate) => getCandidateState(candidate) === 'ready');
      setSelectedCandidateId(firstReady?.userId ?? filteredCandidates[0].userId);
    }
  }, [filteredCandidates, selectedCandidateId]);

  const selectedCandidate = filteredCandidates.find((candidate) => candidate.userId === selectedCandidateId)
    ?? candidates.find((candidate) => candidate.userId === selectedCandidateId)
    ?? null;
  const selectedState = selectedCandidate ? getCandidateState(selectedCandidate) : null;
  const canSubmit = Boolean(selectedCandidate && selectedState === 'ready' && !loading);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedCandidate || selectedState !== 'ready') {
      return;
    }

    try {
      await onInvite(selectedCandidate.username);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "A'zoni qo'shishda xatolik yuz berdi"));
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={loading ? () => {} : onClose}>
      <form className="w-full max-w-5xl rounded-3xl bg-base-100 p-6 shadow-2xl lg:p-7" onSubmit={handleSubmit}>
        <div className="mb-5 flex items-start gap-3">
          <div className="mt-0.5 grid h-11 w-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">A'zo qo'shish</h3>
            <p className="mt-1 text-sm text-base-content/60">
              Foydalanuvchini ism, login, telefon yoki email orqali qidiring. Tanlangan nomzod uchun shajara
              bog'lanishi ham shu yerning o'zida ko'rinadi.
            </p>
          </div>
          {isFetching && !isLoading && (
            <span className="loading loading-spinner loading-sm text-primary" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-4">
          <SearchInput
            label="Foydalanuvchi qidirish"
            placeholder="Ism, @username, telefon yoki email..."
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              if (submitError) setSubmitError(null);
            }}
            leadingIcon={<AtSign className="h-4 w-4" />}
            disabled={loading}
            inputProps={{ autoFocus: true, maxLength: 80 }}
          />

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const isActive = filter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={clsx(
                    'rounded-full border px-3 py-2 text-xs font-semibold transition',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-base-300 bg-base-100 text-base-content/60 hover:border-base-content/30 hover:text-base-content'
                  )}
                  onClick={() => setFilter(item.value)}
                  title={item.description}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="rounded-2xl border border-base-300 bg-base-100">
              <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Topilgan foydalanuvchilar</p>
                  <p className="text-xs text-base-content/50">
                    {debouncedSearch
                      ? `"${debouncedSearch}" bo'yicha ${filteredCandidates.length} ta natija`
                      : `${filteredCandidates.length} ta tavsiya`}
                  </p>
                </div>
                {(isLoading || (isFetching && filteredCandidates.length === 0)) && (
                  <span className="loading loading-spinner loading-sm text-primary" />
                )}
              </div>

              <div className="max-h-[420px] overflow-y-auto p-3">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-base-200 p-4">
                        <div className="skeleton h-4 w-36" />
                        <div className="skeleton mt-3 h-3 w-56" />
                        <div className="skeleton mt-4 h-8 w-full" />
                      </div>
                    ))}
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-300 px-6 py-10 text-center">
                    <Users className="h-9 w-9 text-base-content/20" />
                    <div>
                      <p className="font-medium">Mos foydalanuvchi topilmadi</p>
                      <p className="mt-1 text-sm text-base-content/50">
                        Qidiruvni kengaytiring yoki filterlarni almashtirib ko'ring.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCandidates.map((candidate) => {
                      const state = getCandidateState(candidate);
                      const isSelected = selectedCandidateId === candidate.userId;
                      const hasTreeLink = Boolean(candidate.linkedFamilyMemberId);

                      return (
                        <button
                          key={candidate.userId}
                          type="button"
                          className={clsx(
                            'w-full rounded-2xl border p-4 text-left transition',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-base-200 bg-base-100 hover:border-base-content/20 hover:bg-base-200/30'
                          )}
                          onClick={() => setSelectedCandidateId(candidate.userId)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate font-semibold">{candidate.fullName}</span>
                                {state === 'ready' && (
                                  <span className="badge badge-success badge-sm gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Tayyor
                                  </span>
                                )}
                                {state === 'current' && (
                                  <span className="badge badge-info badge-sm gap-1">
                                    <Clock3 className="h-3 w-3" />
                                    Guruhda bor
                                  </span>
                                )}
                                {state === 'external' && (
                                  <span className="badge badge-warning badge-sm gap-1">
                                    <ArrowRightLeft className="h-3 w-3" />
                                    Boshqa oilada
                                  </span>
                                )}
                                {hasTreeLink && (
                                  <span className="badge badge-outline badge-sm gap-1">
                                    <GitBranch className="h-3 w-3" />
                                    Shajara
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 truncate text-sm text-base-content/60">
                                @{candidate.username}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-base-content/60">
                            {candidate.phone && (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {candidate.phone}
                              </span>
                            )}
                            {candidate.email && (
                              <span className="inline-flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                {candidate.email}
                              </span>
                            )}
                          </div>

                          {hasTreeLink ? (
                            <div className="mt-3 rounded-xl bg-base-200/60 px-3 py-2 text-xs text-base-content/70">
                              <span className="font-medium text-base-content/80">{candidate.linkedFamilyMemberName}</span>
                              <span className="mx-1.5 text-base-content/30">|</span>
                              <span>{roleLabel(candidate.linkedFamilyRole)}</span>
                              <span className="mx-1.5 text-base-content/30">|</span>
                              <span>{genderLabel(candidate.linkedFamilyGender)}</span>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-dashed border-base-300 px-3 py-2 text-xs text-base-content/50">
                              Shajara bog'lanishi topilmadi
                            </div>
                          )}

                          {state === 'external' && candidate.familyGroupName && (
                            <div className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                              Hozirgi guruhi: <span className="font-semibold">{candidate.familyGroupName}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-200/30 p-4">
              <p className="text-sm font-semibold">Tanlangan foydalanuvchi</p>
              {!selectedCandidate ? (
                <div className="mt-4 flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-300 bg-base-100/70 px-6 text-center">
                  <UserPlus className="h-9 w-9 text-base-content/20" />
                  <div>
                    <p className="font-medium">Nomzod tanlanmagan</p>
                    <p className="mt-1 text-sm text-base-content/50">
                      Chap tomondan foydalanuvchini tanlang, keyin shajara ma'lumotlari va qo'shish holati ko'rinadi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-base-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{selectedCandidate.fullName}</p>
                        <p className="mt-1 text-sm text-base-content/60">@{selectedCandidate.username}</p>
                      </div>
                      {selectedState === 'ready' && (
                        <span className="badge badge-success badge-md">Qo'shiladi</span>
                      )}
                      {selectedState === 'current' && (
                        <span className="badge badge-info badge-md">Allaqachon guruhda</span>
                      )}
                      {selectedState === 'external' && (
                        <span className="badge badge-warning badge-md">Boshqa oilada</span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoRow icon={<AtSign className="h-4 w-4" />} label="Username" value={`@${selectedCandidate.username}`} />
                      <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefon" value={selectedCandidate.phone || "Ko'rsatilmagan"} />
                      <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={selectedCandidate.email || "Ko'rsatilmagan"} />
                      <InfoRow icon={<Users className="h-4 w-4" />} label="Holat" value={selectedCandidate.active ? 'Faol foydalanuvchi' : 'Nofaol foydalanuvchi'} />
                    </div>
                  </div>

                  <div
                    className={clsx(
                      'rounded-2xl border px-4 py-3 text-sm',
                      selectedState === 'ready' && 'border-success/30 bg-success/10 text-success',
                      selectedState === 'current' && 'border-info/30 bg-info/10 text-info',
                      selectedState === 'external' && 'border-warning/30 bg-warning/10 text-warning'
                    )}
                  >
                    {selectedState === 'ready' && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          Bu foydalanuvchini hozirgi oilaga qo'shish mumkin. Qo'shilgach, uning accounti va mavjud
                          shajara bog'lanishi ushbu oilaga ishlaydi.
                        </p>
                      </div>
                    )}
                    {selectedState === 'current' && (
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>Bu foydalanuvchi sizning oilangiz tarkibida allaqachon mavjud.</p>
                      </div>
                    )}
                    {selectedState === 'external' && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          Bu foydalanuvchi <span className="font-semibold">{selectedCandidate.familyGroupName}</span> guruhiga
                          biriktirilgan. Xavfsizlik uchun avval u o'sha guruhdan chiqarilishi kerak.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-base-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Shajara ma'lumotlari</p>
                    </div>

                    {selectedCandidate.linkedFamilyMemberId ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoRow label="Shaxs" value={selectedCandidate.linkedFamilyMemberName || "Ko'rsatilmagan"} />
                        <InfoRow label="Rol" value={roleLabel(selectedCandidate.linkedFamilyRole)} />
                        <InfoRow label="Jinsi" value={genderLabel(selectedCandidate.linkedFamilyGender)} />
                        <InfoRow label="Tug'ilgan sana" value={formatDateLabel(selectedCandidate.linkedFamilyBirthDate)} />
                        <InfoRow label="Tug'ilgan joy" value={selectedCandidate.linkedFamilyBirthPlace || "Ko'rsatilmagan"} />
                        <InfoRow label="Shajara telefoni" value={selectedCandidate.linkedFamilyPhone || "Ko'rsatilmagan"} />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-base-300 px-4 py-5 text-sm text-base-content/55">
                        Bu foydalanuvchi hali shajara a'zosi bilan bog'lanmagan. Qo'shgandan keyin kerak bo'lsa shajara
                        profilini biriktirib, rol va nasab ma'lumotlarini to'ldirishingiz mumkin.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
              {submitError}
            </div>
          )}

          <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-xs text-base-content/70">
            <p className="flex items-center gap-2 font-medium text-info">
              <Info className="h-3.5 w-3.5" />
              Eslatma
            </p>
            <p className="mt-1">
              Faqat faol foydalanuvchilar ko'rsatiladi. Boshqa oilaga tegishli accountlar bu oynadan ko'chirilmaydi.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit}
          >
            {loading && <span className="loading loading-spinner loading-xs" />}
            Qo'shish
          </button>
        </div>
      </form>
    </ModalPortal>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-base-200/50 px-3 py-2.5">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
        {icon}
        <span>{label}</span>
      </p>
      <p className="mt-1 text-sm font-medium text-base-content">{value}</p>
    </div>
  );
}
