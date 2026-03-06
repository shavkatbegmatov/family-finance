import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
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
  X,
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

const STATE_META = {
  ready: {
    label: 'Tayyor',
    className: 'border-success/25 bg-success/10 text-success',
  },
  current: {
    label: 'Guruhda bor',
    className: 'border-info/25 bg-info/10 text-info',
  },
  external: {
    label: 'Boshqa oilada',
    className: 'border-warning/25 bg-warning/10 text-warning',
  },
} as const;

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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setDebouncedSearch('');
      setFilter('all');
      setSelectedCandidateId(null);
      setSubmitError(null);
      setIsHelpOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isHelpOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!helpPopoverRef.current?.contains(event.target as Node)) {
        setIsHelpOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isHelpOpen]);

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
      <form
        className="flex w-[min(80rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] border border-base-300/70 bg-base-100 shadow-[var(--shadow-strong)] lg:max-h-[calc(100vh-3rem)]"
        onSubmit={handleSubmit}
      >
        <div className="relative z-20 shrink-0 border-b border-base-300/60 bg-base-100/90 px-5 py-4 backdrop-blur lg:px-6 lg:py-[1.125rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[var(--shadow-soft)]">
                <UserPlus className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-base-content/45">Family Invite</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="text-lg font-semibold tracking-tight text-base-content">A'zo qo'shish</h3>
                  <div className="relative" ref={helpPopoverRef}>
                    <button
                      type="button"
                      className={clsx(
                        'btn btn-ghost btn-xs btn-circle text-info hover:bg-info/10 hover:text-info',
                        isHelpOpen && 'bg-info/10 text-info ring-1 ring-info/20'
                      )}
                      aria-label="Qidiruv bo'yicha yordam"
                      aria-expanded={isHelpOpen}
                      onClick={() => setIsHelpOpen((current) => !current)}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    {isHelpOpen && (
                      <div
                        className="pointer-events-auto absolute left-0 top-[calc(100%+0.5rem)] z-[60] w-[min(22rem,calc(100vw-4rem))] rounded-2xl border border-base-300/70 bg-base-100 p-3.5 shadow-[var(--shadow-strong)]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
                          Qidiruv bo'yicha yordam
                        </p>
                        <p className="mt-2 text-sm leading-6 text-base-content/70">
                          Foydalanuvchini ism, login, telefon yoki email orqali qidiring. Tanlangan nomzod uchun
                          shajara bog'lanishi shu oynaning o'zida ko'rinadi.
                        </p>
                      </div>
                    )}
                  </div>
                  {isFetching && !isLoading && (
                    <span className="loading loading-spinner loading-xs text-primary" aria-hidden="true" />
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle shrink-0 text-base-content/55 hover:bg-base-200 hover:text-base-content"
              aria-label="Yopish"
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto px-6 py-5 lg:px-7 lg:py-6">
          <div className="shrink-0 space-y-4">
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
                      'rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition',
                      isActive
                        ? 'border-primary/25 bg-primary/10 text-primary shadow-[0_10px_24px_-16px_hsl(var(--p)/0.4)]'
                        : 'border-base-300 bg-base-100 text-base-content/60 hover:border-base-content/30 hover:bg-base-200/40 hover:text-base-content'
                    )}
                    onClick={() => setFilter(item.value)}
                    title={item.description}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid min-h-[34rem] gap-4 lg:items-start lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="surface-card flex min-h-[26rem] flex-col rounded-2xl border-base-300/70 shadow-[var(--shadow-soft)]">
              <div className="shrink-0 flex items-center justify-between border-b border-base-300/60 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">Candidates</p>
                  <p className="mt-1 text-sm font-semibold tracking-tight text-base-content">Topilgan foydalanuvchilar</p>
                  <p className="mt-0.5 text-xs text-base-content/50">
                    {debouncedSearch
                      ? `"${debouncedSearch}" bo'yicha ${filteredCandidates.length} ta natija`
                      : `${filteredCandidates.length} ta tavsiya`}
                  </p>
                </div>
                {(isLoading || (isFetching && filteredCandidates.length === 0)) && (
                  <span className="loading loading-spinner loading-sm text-primary" />
                )}
              </div>

              <div className="flex-1 min-h-[26rem] p-3">
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
                  <div className="space-y-2.5">
                    {filteredCandidates.map((candidate) => {
                      const state = getCandidateState(candidate);
                      const isSelected = selectedCandidateId === candidate.userId;
                      const hasTreeLink = Boolean(candidate.linkedFamilyMemberId);

                      return (
                        <button
                          key={candidate.userId}
                          type="button"
                          className={clsx(
                            'w-full rounded-2xl border px-3.5 py-3 text-left transition duration-200',
                            isSelected
                              ? 'border-primary/25 bg-primary/5 shadow-[0_12px_28px_-20px_hsl(var(--p)/0.45)] ring-1 ring-primary/15'
                              : 'border-base-300/60 bg-base-100/95 hover:border-base-content/15 hover:bg-base-200/40 hover:shadow-[var(--shadow-soft)]'
                          )}
                          onClick={() => setSelectedCandidateId(candidate.userId)}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-semibold">{candidate.fullName}</span>
                              <span className="rounded-full border border-base-300/80 bg-base-100/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/55">
                                @{candidate.username}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {state === 'ready' && (
                                <StatusPill
                                  icon={<CheckCircle2 className="h-2.5 w-2.5" />}
                                  label={STATE_META.ready.label}
                                  tone={STATE_META.ready.className}
                                />
                              )}
                              {state === 'current' && (
                                <StatusPill
                                  icon={<Clock3 className="h-2.5 w-2.5" />}
                                  label={STATE_META.current.label}
                                  tone={STATE_META.current.className}
                                />
                              )}
                              {state === 'external' && (
                                <StatusPill
                                  icon={<ArrowRightLeft className="h-2.5 w-2.5" />}
                                  label={STATE_META.external.label}
                                  tone={STATE_META.external.className}
                                />
                              )}
                              {hasTreeLink && (
                                <StatusPill
                                  icon={<GitBranch className="h-2.5 w-2.5" />}
                                  label="Shajara"
                                  tone="border-base-300/80 bg-base-200/75 text-base-content/70"
                                />
                              )}
                            </div>

                            {(candidate.phone || candidate.email) && (
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-base-content/55">
                                {candidate.phone && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {candidate.phone}
                                  </span>
                                )}
                                {candidate.email && (
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {candidate.email}
                                  </span>
                                )}
                              </div>
                            )}

                            {hasTreeLink && (
                              <p className="mt-2 truncate text-[11px] text-base-content/65">
                                <span className="font-medium text-base-content/75">{candidate.linkedFamilyMemberName}</span>
                                <span className="mx-1 text-base-content/30">|</span>
                                <span>{roleLabel(candidate.linkedFamilyRole)}</span>
                                <span className="mx-1 text-base-content/30">|</span>
                                <span>{genderLabel(candidate.linkedFamilyGender)}</span>
                              </p>
                            )}

                            {state === 'external' && candidate.familyGroupName && (
                              <p className="mt-2 text-[11px] font-medium text-warning">
                                Guruh: {candidate.familyGroupName}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="surface-card flex min-h-[26rem] min-w-0 flex-col rounded-2xl border-base-300/70 p-3.5 shadow-[var(--shadow-soft)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">Selection</p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-base-content">Tanlangan foydalanuvchi</p>
              {!selectedCandidate ? (
                <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-300 bg-base-100/70 px-6 text-center">
                  <UserPlus className="h-9 w-9 text-base-content/20" />
                  <div>
                    <p className="font-medium">Nomzod tanlanmagan</p>
                    <p className="mt-1 text-sm text-base-content/50">
                      Chap tomondan foydalanuvchini tanlang, keyin shajara ma'lumotlari va qo'shish holati ko'rinadi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex-1 min-w-0 space-y-3">
                  <div className="min-w-0 rounded-2xl border border-base-300/60 bg-base-100/95 p-3.5 shadow-[var(--shadow-soft)]">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{selectedCandidate.fullName}</p>
                        <p className="mt-0.5 text-xs text-base-content/60">@{selectedCandidate.username}</p>
                      </div>
                      {selectedState === 'ready' && (
                        <div className="shrink-0">
                          <StatusPill label="Qo'shiladi" tone={STATE_META.ready.className} />
                        </div>
                      )}
                      {selectedState === 'current' && (
                        <div className="shrink-0">
                          <StatusPill label="Allaqachon guruhda" tone={STATE_META.current.className} />
                        </div>
                      )}
                      {selectedState === 'external' && (
                        <div className="shrink-0">
                          <StatusPill label="Boshqa oilada" tone={STATE_META.external.className} />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <InfoRow icon={<AtSign className="h-4 w-4" />} label="Username" value={`@${selectedCandidate.username}`} />
                      <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefon" value={selectedCandidate.phone || "Ko'rsatilmagan"} />
                      <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={selectedCandidate.email || "Ko'rsatilmagan"} />
                      <InfoRow icon={<Users className="h-4 w-4" />} label="Holat" value={selectedCandidate.active ? 'Faol foydalanuvchi' : 'Nofaol foydalanuvchi'} />
                    </div>
                  </div>

                  <div
                    className={clsx(
                      'rounded-2xl border px-3.5 py-3 text-[13px] shadow-[inset_0_1px_0_hsl(var(--b1)/0.14)]',
                      selectedState === 'ready' && 'border-success/25 bg-success/10 text-success',
                      selectedState === 'current' && 'border-info/25 bg-info/10 text-info',
                      selectedState === 'external' && 'border-warning/25 bg-warning/10 text-warning'
                    )}
                  >
                    {selectedState === 'ready' && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>Foydalanuvchini darhol hozirgi oilaga qo'shish mumkin.</p>
                      </div>
                    )}
                    {selectedState === 'current' && (
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>Bu foydalanuvchi oilangiz tarkibida allaqachon mavjud.</p>
                      </div>
                    )}
                    {selectedState === 'external' && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p className="break-words">
                          <span className="font-semibold">{selectedCandidate.familyGroupName}</span> guruhiga biriktirilgan.
                          Avval o'sha guruhdan chiqarilishi kerak.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 rounded-2xl border border-base-300/60 bg-base-100/95 p-3.5 shadow-[var(--shadow-soft)]">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 text-primary" />
                      <p className="text-sm font-semibold">Shajara ma'lumotlari</p>
                    </div>

                    {selectedCandidate.linkedFamilyMemberId ? (
                      <div className="mt-3 grid gap-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <InfoRow label="Shaxs" value={selectedCandidate.linkedFamilyMemberName || "Ko'rsatilmagan"} />
                        <InfoRow label="Rol" value={roleLabel(selectedCandidate.linkedFamilyRole)} />
                        <InfoRow label="Jinsi" value={genderLabel(selectedCandidate.linkedFamilyGender)} />
                        <InfoRow label="Tug'ilgan sana" value={formatDateLabel(selectedCandidate.linkedFamilyBirthDate)} />
                        <InfoRow label="Tug'ilgan joy" value={selectedCandidate.linkedFamilyBirthPlace || "Ko'rsatilmagan"} />
                        <InfoRow label="Shajara telefoni" value={selectedCandidate.linkedFamilyPhone || "Ko'rsatilmagan"} />
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-base-300 px-3.5 py-3 text-[13px] text-base-content/55">
                        Bu foydalanuvchi hali shajara a'zosi bilan bog'lanmagan.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 shrink-0">
            {submitError && (
              <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                {submitError}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 border-t border-base-200 px-6 py-4 lg:px-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/10 px-3 py-2 text-xs text-base-content/70 lg:max-w-[34rem]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
              <p>
                <span className="font-medium text-info">Eslatma.</span> Faqat faol foydalanuvchilar ko'rsatiladi.
                Boshqa oilaga tegishli accountlar bu oynadan ko'chirilmaydi.
              </p>
            </div>

            <div className="flex justify-end gap-2">
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
          </div>
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
    <div className="min-w-0 rounded-xl border border-base-300/60 bg-base-200/50 px-3 py-2 shadow-[inset_0_1px_0_hsl(var(--b1)/0.08)]">
      <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-base-content/45">
        {icon}
        <span>{label}</span>
      </p>
      <p className="mt-1 min-w-0 break-words text-[13px] font-medium leading-snug text-base-content">{value}</p>
    </div>
  );
}

function StatusPill({
  icon,
  label,
  tone,
}: {
  icon?: ReactNode;
  label: string;
  tone: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        tone
      )}
    >
      {icon}
      {label}
    </span>
  );
}
