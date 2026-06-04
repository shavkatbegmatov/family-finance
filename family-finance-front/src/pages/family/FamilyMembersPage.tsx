import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';
import {
  Users,
  Edit2,
  Trash2,
  X,
  Phone,
  Calendar,
  User,
  Copy,
  Check,
  KeyRound,
  List,
  TreePine,
  Eye,
  EyeOff,
  Shield,
  ClipboardCopy,
  Loader2,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { familyMembersApi } from '../../api/family-members.api';
import { pointParticipantApi } from '../../api/points.api';
import { formatDate, FAMILY_ROLES, GENDERS } from '../../config/constants';
import { ModalPortal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { PermissionCode, usePermission } from '../../hooks/usePermission';
import { useScopeChangeEffect } from '../../hooks/useScopeChange';
import { PermissionGate } from '../../components/common/PermissionGate';
import { FamilyTreeView } from '../../components/family/FamilyTreeView';
import {
  AddPersonWizard,
  CapabilityFilterChips,
  PersonBadges,
  SuggestionsBanner,
  type Suggestion,
} from '../../components/persons';
import { Trophy } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { TextInput } from '../../components/ui/TextInput';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { UsernameInput } from '../../components/ui/UsernameInput';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { formatPhoneDisplay } from '../../utils/phone';
import { DateInput } from '../../components/ui/DateInput';
import { Select } from '../../components/ui/Select';
import { AvatarUploader } from '../../components/ui/AvatarUploader';
import type {
  CredentialsInfo,
  FamilyMember,
  FamilyMemberRequest,
  FamilyRole,
  Gender,
  PagedResponse,
} from '../../types';

const AUTO_DEFAULT_HEADER_HEIGHT = 45;
const AUTO_DEFAULT_ROW_HEIGHT = 61;

export function FamilyMembersPage() {
  const user = useAuthStore((s) => s.user);
  const isMobile = useIsMobile();
  const { hasPermission } = usePermission();
  const canManagePoints = hasPermission(PermissionCode.POINTS_MANAGE);
  const [activeTab, setActiveTab] = useState<'list' | 'tree'>('list');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const allMembersRef = useRef<FamilyMember[]>([]);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const mobileSentinelRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSizeMode, setPageSizeMode] = useState<'auto' | number>('auto');
  const [autoPageSize, setAutoPageSize] = useState(20);
  const [autoViewportHeight, setAutoViewportHeight] = useState<number | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Effective page size — auto rejimda hisoblangan, aks holda tanlangan
  const pageSize = pageSizeMode === 'auto' ? autoPageSize : pageSizeMode;
  const previousPageSizeRef = useRef(pageSize);
  const latestMembersRequestRef = useRef(0);

  // Jadvalning aylanuvchi (scrollable) container'ini o'lchaymiz
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableHeadRef = useRef<HTMLTableSectionElement>(null);
  const firstRowRef = useRef<HTMLTableRowElement | null>(null);
  // Oxirgi hisoblangan qiymat — cheksiz re-render jaro qilmaslik uchun
  const lastCalcRef = useRef({ rows: 0, viewportHeight: 0 });

  // Haqiqiy DOM balandligidan qatorlar sonini hisoblash
  const recalcRows = useCallback(() => {
    if (pageSizeMode !== 'auto' || activeTab !== 'list') return;

    const area = tableAreaRef.current;
    if (!area) return;

    const availableHeight = area.clientHeight;
    if (availableHeight <= 0) return;

    const headerHeight = tableHeadRef.current?.getBoundingClientRect().height ?? AUTO_DEFAULT_HEADER_HEIGHT;
    const rowHeight = firstRowRef.current?.getBoundingClientRect().height ?? AUTO_DEFAULT_ROW_HEIGHT;
    if (headerHeight <= 0 || rowHeight <= 0) return;

    const maxRowsByHeight = Math.floor((availableHeight - headerHeight + 0.5) / rowHeight);
    const rows = Math.max(1, maxRowsByHeight);
    const viewportHeight = Math.min(
      availableHeight,
      Math.round(headerHeight + rows * rowHeight)
    );

    if (
      rows !== lastCalcRef.current.rows ||
      Math.abs(viewportHeight - lastCalcRef.current.viewportHeight) > 0.5
    ) {
      lastCalcRef.current = { rows, viewportHeight };
      setAutoPageSize(rows);
      setAutoViewportHeight(viewportHeight);
    }
  }, [activeTab, pageSizeMode]);

  // Layout tayyor bo'lgandan keyin auto hisoblash
  useLayoutEffect(() => {
    if (pageSizeMode !== 'auto' || activeTab !== 'list') return;
    const rafId = window.requestAnimationFrame(recalcRows);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeTab, pageSizeMode, loading, members.length, totalElements, recalcRows]);

  // Jadval hududi balandligini kuzatish
  useEffect(() => {
    if (pageSizeMode !== 'auto' || activeTab !== 'list') return;
    const area = tableAreaRef.current;
    if (!area) return;

    let rafId = 0;
    const scheduleRecalc = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(recalcRows);
    };

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', scheduleRecalc);
      scheduleRecalc();
      return () => {
        if (rafId) window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', scheduleRecalc);
      };
    }

    const resizeObserver = new ResizeObserver(scheduleRecalc);
    resizeObserver.observe(area);

    window.addEventListener('resize', scheduleRecalc);
    scheduleRecalc();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleRecalc);
    };
  }, [activeTab, pageSizeMode, recalcRows]);

  useEffect(() => {
    if (pageSizeMode !== 'auto') {
      setAutoViewportHeight(null);
      lastCalcRef.current = { rows: 0, viewportHeight: 0 };
    }
  }, [pageSizeMode]);


  // Wizard ("Yangi shaxs qo'shish")
  const [showWizard, setShowWizard] = useState(false);

  // Capability filter (chip): joriy sahifa ichida client-side filtrlash
  const [capFilter, setCapFilter] = useState<'all' | 'no_login' | 'has_login' | 'no_points' | 'has_points'>('all');

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState<FamilyMemberRequest>({
    firstName: '',
    lastName: '',
    middleName: '',
    role: 'OTHER',
    gender: undefined,
    phone: '',
    birthDate: '',
    birthPlace: '',
    deathDate: '',
    avatar: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Login (username) qo'lda kiritilganda band-emasligi holati — submit'ni boshqaradi
  const [accountUsernameValid, setAccountUsernameValid] = useState(true);

  // Credentials modal
  const [credentialsInfo, setCredentialsInfo] = useState<CredentialsInfo | null>(null);
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Delete confirmation
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);

  // ==================== DATA LOADING ====================

  const loadMembers = useCallback(async () => {
    const requestId = ++latestMembersRequestRef.current;

    if (isMobile && page > 0) setLoadingMore(true);

    try {
      const res = await familyMembersApi.getAll(page, pageSize, searchQuery || undefined);
      if (requestId !== latestMembersRequestRef.current) return;

      const data = res.data.data as PagedResponse<FamilyMember>;
      setMembers(data.content);
      setTotalElements(data.totalElements);

      if (isMobile && page > 0) {
        const newAll = [...allMembersRef.current, ...data.content];
        allMembersRef.current = newAll;
        setAllMembers(newAll);
      } else {
        allMembersRef.current = data.content;
        setAllMembers(data.content);
      }
    } catch {
      if (requestId !== latestMembersRequestRef.current) return;
      toast.error("Oila a'zolarini yuklashda xatolik");
    } finally {
      if (requestId === latestMembersRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [page, pageSize, searchQuery, isMobile]);

  useEffect(() => {
    if (activeTab !== 'list') return;
    void loadMembers();
  }, [activeTab, loadMembers]);

  // Phase 3: aktiv scope o'zgarganda oila a'zolarini qayta yuklash
  useScopeChangeEffect(() => {
    void loadMembers();
  });

  // page size o'zgarganda joriy element atrofidagi sahifani saqlab qolish
  useLayoutEffect(() => {
    const previousPageSize = previousPageSizeRef.current;
    if (previousPageSize === pageSize) return;

    setPage((prevPage) => {
      const firstVisibleItem = prevPage * previousPageSize;
      return Math.floor(firstVisibleItem / pageSize);
    });
    previousPageSizeRef.current = pageSize;
  }, [pageSize]);

  // Mobile infinite scroll
  const totalPages = Math.ceil(totalElements / pageSize);
  const hasMore = page < totalPages - 1;

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      setPage((p) => p + 1);
    }
  }, [hasMore, loadingMore]);

  useEffect(() => {
    if (!isMobile || !mobileSentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(mobileSentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile, hasMore, loadingMore, handleLoadMore]);

  // Reset allMembers when searchQuery changes
  useEffect(() => {
    allMembersRef.current = [];
    setAllMembers([]);
  }, [searchQuery]);

  // ==================== MODAL ====================

  const handleOpenEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      middleName: member.middleName,
      role: member.role,
      gender: member.gender,
      phone: member.phone || '',
      birthDate: member.birthDate || '',
      birthPlace: member.birthPlace || '',
      deathDate: member.deathDate || '',
      avatar: member.avatar || '',
      userId: member.userId,
      createAccount: false,
      accountUsername: '',
      accountPassword: '',
      accountRole: 'MEMBER',
    });
    setAccountUsernameValid(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) return;
    setSubmitting(true);
    try {
      if (editingMember) {
        // Bo'sh string maydonlar backend validatsiyasini buzadi: LocalDate ("" ni parse qila olmaydi)
        // va accountPassword @Size(min=6). Shuning uchun bo'shlarni undefined ga aylantiramiz.
        const payload: FamilyMemberRequest = {
          ...form,
          middleName: form.middleName?.trim() || undefined,
          lastName: form.lastName?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          birthPlace: form.birthPlace?.trim() || undefined,
          birthDate: form.birthDate || undefined,
          deathDate: form.deathDate || undefined,
          avatar: form.avatar || undefined,
          accountUsername: form.createAccount ? (form.accountUsername?.trim() || undefined) : undefined,
          accountPassword: form.createAccount && form.accountPassword ? form.accountPassword : undefined,
          accountRole: form.createAccount ? form.accountRole : undefined,
        };
        const res = await familyMembersApi.update(editingMember.id, payload);
        const updated = res.data.data as FamilyMember;
        if (updated.credentials) {
          setCredentialsInfo(updated.credentials);
        }
      }
      handleCloseModal();
      void loadMembers();
    } catch {
      toast.error("Oila a'zosini saqlashda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Capability filter chip'lari uchun hisob-kitob (joriy sahifa ichida).
   * Bu yerda total emas, ko'rinadigan sahifa filtrlanadi — backend filter qo'shilsa,
   * counts ham backend'dan kelishi mumkin.
   */
  const capCounts = useMemo(() => {
    const active = members.filter((m) => m.isActive);
    return {
      all: members.length,
      has_login: active.filter((m) => m.userId).length,
      no_login: active.filter((m) => !m.userId).length,
      has_points: active.filter((m) => m.pointParticipantId).length,
      no_points: active.filter((m) => !m.pointParticipantId).length,
    };
  }, [members]);

  /** Capability filter qo'llash uchun yordamchi (bitta funksiya — DRY). */
  const applyCapFilter = useCallback((list: FamilyMember[]) => {
    if (capFilter === 'all') return list;
    return list.filter((m) => {
      if (!m.isActive) return false;
      switch (capFilter) {
        case 'has_login': return !!m.userId;
        case 'no_login': return !m.userId;
        case 'has_points': return !!m.pointParticipantId;
        case 'no_points': return !m.pointParticipantId;
        default: return true;
      }
    });
  }, [capFilter]);

  const displayedMembers = useMemo(() => applyCapFilter(members), [members, applyCapFilter]);
  const displayedAllMembers = useMemo(() => applyCapFilter(allMembers), [allMembers, applyCapFilter]);

  /**
   * Joriy sahifadagi a'zolar bo'yicha capability bo'shliqlari — banner uchun.
   */
  const memberSuggestions = useMemo<Suggestion[]>(() => {
    const activeMembers = members.filter((m) => m.isActive);
    const withoutLogin = activeMembers.filter((m) => !m.userId).length;
    const withoutPoints = activeMembers.filter((m) => !m.pointParticipantId).length;

    const list: Suggestion[] = [];
    if (withoutLogin > 0) {
      list.push({
        key: 'members-without-login',
        icon: KeyRound,
        tone: 'info',
        title: `${withoutLogin} ta oila a'zosi tizimga kira olmaydi`,
        description: 'Akkaunt yaratish uchun: a\'zo nomi yonidagi xira "🔑+" belgini bosing yoki "Tahrirlash" → "Akkaunt yaratish" ni belgilang.',
      });
    }
    if (withoutPoints > 0 && canManagePoints) {
      list.push({
        key: 'members-without-points',
        icon: Trophy,
        tone: 'info',
        title: `${withoutPoints} ta oila a'zosi ball tizimida emas`,
        description: 'Ball tizimiga qo\'shish uchun a\'zo nomi yonidagi xira "🏆+" belgini bosing — bir bosishda qo\'shiladi.',
      });
    }
    return list;
  }, [members, canManagePoints]);

  /**
   * Tezkor amal: bu oila a'zosini ball tizimiga ishtirokchi sifatida qo'shish.
   * Badge'dagi "+" tugmasi orqali chaqiriladi.
   */
  const handleQuickAddParticipant = useCallback(async (member: FamilyMember) => {
    try {
      await pointParticipantApi.create({
        firstName: member.firstName,
        lastName: member.lastName,
        familyMemberId: member.id,
      });
      toast.success(`${member.fullName} ball tizimiga qo'shildi`);
      void loadMembers();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Ball tizimiga qo'shishda xatolik";
      toast.error(message);
    }
  }, [loadMembers]);

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Nusxalashda xatolik');
    }
  };

  // ==================== DELETE ====================

  const handleDelete = async () => {
    if (!deletingMemberId) return;
    try {
      await familyMembersApi.delete(deletingMemberId);
      setDeletingMemberId(null);
      void loadMembers();
    } catch {
      toast.error("Oila a'zosini o'chirishda xatolik");
    }
  };

  // ==================== EXPORT ====================

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const res = format === 'excel'
        ? await familyMembersApi.exportExcel()
        : await familyMembersApi.exportPdf();

      const blob = new Blob([res.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oila-azolari.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Eksport qilishda xatolik');
    }
  };

  // ==================== HELPERS ====================

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getRoleColor = (role: FamilyRole) => {
    switch (role) {
      case 'FATHER': return 'bg-blue-500';
      case 'MOTHER': return 'bg-pink-500';
      case 'CHILD': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const tableViewportStyle: CSSProperties = {
    height:
      pageSizeMode === 'auto' && autoViewportHeight
        ? `${autoViewportHeight}px`
        : '100%',
    scrollbarGutter: 'stable',
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {/* Header + Tabs — bitta qatorda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="section-title text-xl">Oila a'zolari</h1>
          <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
            <button
              className={clsx(
                'btn btn-xs gap-1.5',
                activeTab === 'list' ? 'btn-primary' : 'btn-ghost'
              )}
              onClick={() => setActiveTab('list')}
            >
              <List className="h-3.5 w-3.5" />
              Ro'yxat
            </button>
            <button
              className={clsx(
                'btn btn-xs gap-1.5',
                activeTab === 'tree' ? 'btn-primary' : 'btn-ghost'
              )}
              onClick={() => setActiveTab('tree')}
            >
              <TreePine className="h-3.5 w-3.5" />
              Daraxti
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill hidden sm:inline-flex">
            {totalElements} ta a'zo
          </span>
          <PermissionGate permission={PermissionCode.FAMILY_CREATE}>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1.5"
              onClick={() => setShowWizard(true)}
              title="Yangi shaxs qo'shish (wizard)"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Yangi shaxs</span>
            </button>
          </PermissionGate>
          <PermissionGate permission={PermissionCode.FAMILY_EXPORT}>
            <ExportButtons
              onExportExcel={() => handleExport('excel')}
              onExportPdf={() => handleExport('pdf')}
              disabled={members.length === 0}
              loading={loading}
            />
          </PermissionGate>

        </div>
      </div>

      {/* Smart suggestions — capability bo'shliqlari haqida eslatma */}
      {activeTab === 'list' && memberSuggestions.length > 0 && (
        <SuggestionsBanner suggestions={memberSuggestions} />
      )}

      {/* ============ TREE VIEW ============ */}
      {activeTab === 'tree' && (
        <div className="-mx-4 lg:-mx-8 flex-1 min-h-0">
          <FamilyTreeView />
        </div>
      )}

      {/* ============ LIST VIEW ============ */}
      {activeTab === 'list' && (
        <>
          {/* Search + Pagination toolbar */}
          <div className="surface-card p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <SearchInput
              value={searchQuery}
              onValueChange={(val) => {
                setSearchQuery(val);
                setPage(0);
              }}
              placeholder="Ism, familiya yoki telefon bo'yicha qidirish..."
              hideLabel
              ariaLabel="Qidirish"
              className="flex-1 min-w-0"
            />

            {/* Right side controls */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Total count */}
              {!loading && (
                <span className="text-sm text-base-content/40 whitespace-nowrap">
                  Jami: <strong className="text-base-content/70">{totalElements}</strong> ta
                </span>
              )}

              {/* Separator */}
              <div className="h-5 w-px bg-base-300" />

              {/* Page size selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-base-content/40 whitespace-nowrap">Ko'rsatish:</span>
                <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
                  {(['auto', 10, 20, 50, 100] as const).map((size) => (
                    <button
                      key={size}
                      className={clsx(
                        'btn btn-xs min-w-[2.5rem]',
                        pageSizeMode === size ? 'btn-primary' : 'btn-ghost'
                      )}
                      onClick={() => {
                        setPageSizeMode(size);
                        setPage(0);
                      }}
                    >
                      {size === 'auto' ? (
                        <span className="flex items-center gap-0.5">
                          Auto
                          {pageSizeMode === 'auto' && (
                            <span className="opacity-60">({autoPageSize})</span>
                          )}
                        </span>
                      ) : (
                        size
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Separator */}
              {totalElements > pageSize && <div className="h-5 w-px bg-base-300" />}

              {/* Pagination controls */}
              {totalElements > pageSize && (
                <div className="flex items-center gap-1">
                  <button
                    className="btn btn-xs btn-ghost"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹
                  </button>
                  <span className="text-xs text-base-content/50 px-1 whitespace-nowrap">
                    {page + 1} / {Math.ceil(totalElements / pageSize)}
                  </span>
                  <button
                    className="btn btn-xs btn-ghost"
                    disabled={(page + 1) * pageSize >= totalElements}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Capability filter chips — joriy sahifa ichida filtrlash */}
          <CapabilityFilterChips
            value={capFilter}
            onChange={setCapFilter}
            counts={capCounts}
          />

          {/* Table */}
          {loading ? (
            <div className="flex-1 flex justify-center py-16">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : members.length === 0 ? (
            <div className="flex-1 surface-card p-16 flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-base-200">
                <Users className="h-10 w-10 text-base-content/20" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Oila a'zolari topilmadi</h3>
              <p className="text-sm text-base-content/50">
                {searchQuery
                  ? `"${searchQuery}" bo'yicha natijalar yo'q`
                  : "Shajaraga a'zo qo'shishni boshlang"}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 surface-card overflow-hidden flex flex-col">
              {/* Mobile card view */}
              <div className="flex-1 overflow-auto p-3 space-y-3 lg:hidden">
                {(isMobile ? displayedAllMembers : displayedMembers).map((member) => {
                  const age = member.birthDate
                    ? Math.floor(
                      (Date.now() - new Date(member.birthDate).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000)
                    )
                    : null;

                  return (
                    <div
                      key={member.id}
                      className={clsx(
                        'rounded-xl border border-base-200 bg-base-100 p-4',
                        !member.isActive && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div
                          className={clsx(
                            'h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
                            getRoleColor(member.role)
                          )}
                        >
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.fullName}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            getInitial(member.fullName)
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{member.fullName}</span>
                            {member.userId === user?.id && (
                              <span className="badge badge-xs badge-primary">Sen</span>
                            )}
                          </div>
                          <PersonBadges
                            hasUser={!!member.userId}
                            hasFamilyMember
                            hasParticipant={!!member.pointParticipantId}
                            userTooltip={member.userName ? `Tizimga kira oladi: @${member.userName}` : undefined}
                            participantTooltip={member.pointParticipantNickname ? `Ball tizimida: @${member.pointParticipantNickname}` : undefined}
                            onAddParticipant={
                              canManagePoints && member.isActive && !member.pointParticipantId
                                ? () => handleQuickAddParticipant(member)
                                : undefined
                            }
                            className="mt-1"
                          />

                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="badge badge-sm badge-outline">
                              {FAMILY_ROLES[member.role]?.label || member.role}
                            </span>
                            {member.gender && (
                              <span
                                className={clsx(
                                  'badge badge-sm',
                                  member.gender === 'MALE' ? 'badge-info' : 'badge-secondary'
                                )}
                              >
                                {GENDERS[member.gender]?.label}
                              </span>
                            )}
                            {age !== null && (
                              <span className="text-xs text-base-content/60">{age} yosh</span>
                            )}
                            <span
                              className={clsx(
                                'badge badge-sm',
                                member.isActive ? 'badge-success' : 'badge-ghost'
                              )}
                            >
                              {member.isActive ? 'Faol' : 'Nofaol'}
                            </span>
                          </div>

                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-primary mt-1.5"
                            >
                              <Phone className="h-3 w-3" />
                              {formatPhoneDisplay(member.phone)}
                            </a>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <PermissionGate permission={PermissionCode.FAMILY_UPDATE}>
                            <button
                              className="btn btn-ghost btn-sm btn-square"
                              onClick={() => handleOpenEditModal(member)}
                              title="Tahrirlash"
                              aria-label="Tahrirlash"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </PermissionGate>
                          {member.userId !== user?.id && (
                            <PermissionGate permission={PermissionCode.FAMILY_DELETE}>
                              <button
                                className="btn btn-ghost btn-sm btn-square text-error"
                                onClick={() => setDeletingMemberId(member.id)}
                                title="O'chirish"
                                aria-label="O'chirish"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Infinite scroll sentinel */}
                {isMobile && (
                  <div ref={mobileSentinelRef} className="py-4 flex justify-center">
                    {loadingMore ? (
                      <Loader2 className="h-5 w-5 animate-spin text-base-content/40" />
                    ) : hasMore ? null : allMembers.length > 0 ? (
                      <span className="text-xs text-base-content/30">Hammasi yuklandi</span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Desktop table view */}
              <div
                ref={tableAreaRef}
                className="flex-1 min-h-0 hidden lg:block"
              >
                <div
                  ref={tableContainerRef}
                  className="min-h-0 h-full overflow-auto"
                  style={tableViewportStyle}
                >
                  <table className="table table-sm table-fixed w-full relative whitespace-nowrap">
                    <thead
                      ref={tableHeadRef}
                      className="sticky top-0 z-10 bg-base-100 shadow-sm"
                    >
                      <tr className="text-xs uppercase tracking-wider text-base-content/40 border-b border-base-200">
                        <th className="pl-5 py-3 w-[5%] bg-base-100">#</th>
                        <th className="py-3 w-[28%] bg-base-100">A'zo</th>
                        <th className="py-3 w-[12%] bg-base-100">Rol</th>
                        <th className="py-3 w-[10%] bg-base-100">Jinsi</th>
                        <th className="py-3 w-[16%] bg-base-100">Telefon</th>
                        <th className="py-3 w-[9%] bg-base-100">Yoshi</th>
                        <th className="py-3 w-[10%] bg-base-100">Holat</th>
                        <th className="py-3 pr-5 w-[10%] text-right bg-base-100">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200">
                      {displayedMembers.map((member, idx) => {
                        const birthYear = member.birthDate
                          ? new Date(member.birthDate).getFullYear()
                          : null;
                        const age = member.birthDate
                          ? Math.floor(
                            (Date.now() - new Date(member.birthDate).getTime()) /
                            (365.25 * 24 * 60 * 60 * 1000)
                          )
                          : null;

                        return (
                          <tr
                            ref={idx === 0 ? (node) => { firstRowRef.current = node; } : undefined}
                            key={member.id}
                            className={clsx(
                              'hover:bg-base-200/40 transition-colors',
                              !member.isActive && 'opacity-50'
                            )}
                          >
                          {/* Index */}
                          <td className="pl-5 py-3 text-sm text-base-content/30 font-mono">
                            {page * pageSize + idx + 1}
                          </td>

                          {/* Avatar + Name */}
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={clsx(
                                  'h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
                                  getRoleColor(member.role)
                                )}
                              >
                                {member.avatar ? (
                                  <img
                                    src={member.avatar}
                                    alt={member.fullName}
                                    className="h-9 w-9 rounded-full object-cover"
                                  />
                                ) : (
                                  getInitial(member.fullName)
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-sm truncate max-w-[180px]">
                                    {member.fullName}
                                  </span>
                                  {member.userId === user?.id && (
                                    <span className="badge badge-xs badge-primary">Sen</span>
                                  )}
                                </div>
                                <PersonBadges
                                  hasUser={!!member.userId}
                                  hasFamilyMember
                                  hasParticipant={!!member.pointParticipantId}
                                  userTooltip={member.userName ? `Tizimga kira oladi: @${member.userName}` : undefined}
                                  participantTooltip={member.pointParticipantNickname ? `Ball tizimida: @${member.pointParticipantNickname}` : undefined}
                                  className="mt-1"
                                />
                                {member.birthPlace && (
                                  <p className="text-xs text-base-content/40 truncate max-w-[160px] mt-1">
                                    {member.birthPlace}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3">
                            <span className="badge badge-sm badge-outline">
                              {FAMILY_ROLES[member.role]?.label || member.role}
                            </span>
                          </td>

                          {/* Gender */}
                          <td className="py-3">
                            {member.gender ? (
                              <span
                                className={clsx(
                                  'badge badge-sm',
                                  member.gender === 'MALE' ? 'badge-info' : 'badge-secondary'
                                )}
                              >
                                {GENDERS[member.gender]?.label}
                              </span>
                            ) : (
                              <span className="text-base-content/20 text-xs">—</span>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="py-3">
                            {member.phone ? (
                              <a
                                href={`tel:${member.phone}`}
                                className="flex items-center gap-1.5 text-sm text-base-content/70 hover:text-primary transition-colors"
                              >
                                <Phone className="h-3 w-3 shrink-0" />
                                {formatPhoneDisplay(member.phone)}
                              </a>
                            ) : (
                              <span className="text-base-content/20 text-xs">—</span>
                            )}
                          </td>

                          {/* Age */}
                          <td className="py-3">
                            {age !== null ? (
                              <div className="text-sm">
                                <span className="font-medium">{age} yosh</span>
                                <span className="text-xs text-base-content/40 ml-1">
                                  ({birthYear})
                                </span>
                              </div>
                            ) : member.birthDate ? (
                              <div className="flex items-center gap-1 text-xs text-base-content/50">
                                <Calendar className="h-3 w-3" />
                                {formatDate(member.birthDate)}
                              </div>
                            ) : (
                              <span className="text-base-content/20 text-xs">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3">
                            <span
                              className={clsx(
                                'badge badge-sm',
                                member.isActive ? 'badge-success' : 'badge-ghost'
                              )}
                            >
                              {member.isActive ? 'Faol' : 'Nofaol'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 pr-5">
                            <div className="flex items-center gap-1.5 justify-end">
                              <PermissionGate permission={PermissionCode.FAMILY_UPDATE}>
                                <button
                                  className="btn btn-ghost btn-sm btn-square"
                                  onClick={() => handleOpenEditModal(member)}
                                  title="Tahrirlash"
                                  aria-label="Tahrirlash"
                                >
                                  <Edit2 className="h-[18px] w-[18px]" />
                                </button>
                              </PermissionGate>
                              {member.userId !== user?.id && (
                                <PermissionGate permission={PermissionCode.FAMILY_DELETE}>
                                  <button
                                    className="btn btn-ghost btn-sm btn-square text-error"
                                    onClick={() => setDeletingMemberId(member.id)}
                                    title="O'chirish"
                                    aria-label="O'chirish"
                                  >
                                    <Trash2 className="h-[18px] w-[18px]" />
                                  </button>
                                </PermissionGate>
                              )}
                            </div>
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalElements > pageSize && (
                <div className={clsx("flex items-center justify-between px-5 py-3 border-t border-base-200", isMobile && "hidden lg:flex")}>
                  <span className="text-sm text-base-content/50">
                    {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} / {totalElements} ta
                  </span>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ‹ Oldingi
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={(page + 1) * pageSize >= totalElements}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Keyingi ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <ModalPortal isOpen={showModal} onClose={handleCloseModal}>
        <div className="w-full max-w-3xl bg-base-100 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-base-200 bg-base-100 rounded-t-2xl px-4 py-4 sm:px-6">
            <div>
              <h3 className="text-xl font-semibold">
                A'zoni tahrirlash
              </h3>
              <p className="text-sm text-base-content/60 mt-1">
                Ma'lumotlarni yangilang
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleCloseModal}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
              {/* First Name */}
              <TextInput
                label="Ism"
                required
                value={form.firstName}
                onChange={(val) => setForm((prev) => ({ ...prev, firstName: val }))}
                placeholder="Ism"
                leadingIcon={<User className="h-5 w-5" />}
              />

              {/* Last Name */}
              <TextInput
                label="Familiya"
                value={form.lastName || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, lastName: val }))}
                placeholder="Familiya"
              />

              {/* Middle Name — to'liq kenglikda */}
              <div className="sm:col-span-2">
                <TextInput
                  label="Otasining ismi"
                  value={form.middleName || ''}
                  onChange={(val) => setForm((prev) => ({ ...prev, middleName: val }))}
                  placeholder="Otasining ismi"
                />
              </div>

              {/* Role */}
              <Select
                label="Rol"
                required
                value={form.role}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, role: (val as FamilyRole) || 'OTHER' }))
                }
                options={Object.entries(FAMILY_ROLES).map(([key, { label }]) => ({
                  value: key,
                  label,
                }))}
                placeholder="Rolni tanlang"
                icon={<User className="h-4 w-4" />}
              />

              {/* Gender */}
              <Select
                label="Jinsi"
                value={form.gender || ''}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, gender: (val as Gender) || undefined }))
                }
                options={[
                  { value: '', label: 'Tanlanmagan' },
                  ...Object.entries(GENDERS).map(([key, { label }]) => ({
                    value: key,
                    label,
                  })),
                ]}
                placeholder="Tanlanmagan"
              />

              {/* Phone — to'liq kenglikda */}
              <div className="sm:col-span-2">
                <PhoneInput
                  label="Telefon raqami"
                  value={form.phone || ''}
                  onChange={(val) => setForm((prev) => ({ ...prev, phone: val }))}
                />
              </div>

              {/* Birth Date */}
              <DateInput
                label="Tug'ilgan sana"
                value={form.birthDate || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, birthDate: val }))}
                max={new Date().toISOString().slice(0, 10)}
              />

              {/* Death Date */}
              <DateInput
                label="Vafot sanasi"
                value={form.deathDate || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, deathDate: val }))}
                max={new Date().toISOString().slice(0, 10)}
              />

              {/* Birth Place — to'liq kenglikda */}
              <div className="sm:col-span-2">
                <TextInput
                  label="Tug'ilgan joy"
                  value={form.birthPlace || ''}
                  onChange={(val) => setForm((prev) => ({ ...prev, birthPlace: val }))}
                  placeholder="Shahar, viloyat"
                />
              </div>

              {/* Avatar Upload — to'liq kenglikda */}
              <div className="sm:col-span-2">
                <AvatarUploader
                  label="Rasm"
                  value={form.avatar || ''}
                  onChange={(val) => setForm((prev) => ({ ...prev, avatar: val }))}
                />
              </div>

              {/* Create Account Section — faqat yangi a'zo uchun, to'liq kenglikda */}
              {(!editingMember?.userId || editingMember?.userId === null) && (
                <div className="sm:col-span-2 space-y-3">
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={form.createAccount || false}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            createAccount: e.target.checked,
                            accountUsername: '',
                            accountPassword: '',
                            accountRole: 'MEMBER',
                          }));
                          setAccountUsernameValid(true);
                        }}
                      />
                      <div>
                        <span className="label-text font-medium">Tizimga kirish imkoniyati</span>
                        <p className="text-xs text-base-content/50 mt-0.5">
                          Login avtomatik yaratiladi (ism asosida)
                        </p>
                      </div>
                    </label>
                  </div>

                  {form.createAccount && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                      {/* Account Role */}
                      <div className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Tizim roli
                        </span>
                        <div className="flex gap-2">
                          {[
                            { value: 'MEMBER', label: "A'zo" },
                            { value: 'ADMIN', label: 'Administrator' },
                          ].map((r) => (
                            <button
                              key={r.value}
                              type="button"
                              className={clsx(
                                'btn btn-sm flex-1',
                                form.accountRole === r.value
                                  ? r.value === 'ADMIN'
                                    ? 'btn-warning'
                                    : 'btn-primary'
                                  : 'btn-ghost border-base-300'
                              )}
                              onClick={() => setForm((prev) => ({ ...prev, accountRole: r.value }))}
                            >
                              {r.value === 'ADMIN' && <Shield className="h-3.5 w-3.5" />}
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Login (qo'lda yoki avtomatik) + Parol */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <UsernameInput
                          label="Login"
                          value={form.accountUsername || ''}
                          onChange={(val) => setForm((prev) => ({ ...prev, accountUsername: val }))}
                          onValidityChange={setAccountUsernameValid}
                        />
                        <PasswordInput
                          label="Parol"
                          value={form.accountPassword || ''}
                          onChange={(val) => setForm((prev) => ({ ...prev, accountPassword: val }))}
                          placeholder="Bo'sh qolsa avtomatik"
                          showStrength
                          showGenerate
                          error={
                            form.accountPassword && form.accountPassword.length > 0 && form.accountPassword.length < 6
                              ? 'Kamida 6 belgi'
                              : undefined
                          }
                        />
                      </div>
                      <p className="text-xs text-base-content/40">
                        {form.accountPassword
                          ? 'Kiritilgan parol ishlatiladi.'
                          : "Login va parol bo'sh qolsa, ism asosida avtomatik yaratiladi."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-base-200 bg-base-100 rounded-b-2xl px-4 py-3 sm:px-6">
            <button
              className="btn btn-ghost"
              onClick={handleCloseModal}
              disabled={submitting}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !form.firstName.trim() || (form.createAccount && !!form.accountPassword && form.accountPassword.length < 6) || (form.createAccount && !accountUsernameValid)}
            >
              {submitting && <span className="loading loading-spinner loading-sm" />}
              Saqlash
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Confirmation Modal */}
      <ModalPortal isOpen={!!deletingMemberId} onClose={() => setDeletingMemberId(null)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
              <Trash2 className="h-7 w-7 text-error" />
            </div>
            <h3 className="text-lg font-semibold mb-2">A'zoni o'chirish</h3>
            <p className="text-sm text-base-content/60 mb-6">
              Haqiqatan ham bu oila a'zosini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => setDeletingMemberId(null)}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-error"
                onClick={handleDelete}
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Credentials Modal */}
      <ModalPortal isOpen={!!credentialsInfo} onClose={() => { setCredentialsInfo(null); setShowCredPassword(false); }}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <KeyRound className="h-7 w-7 text-success" />
              </div>
              <h3 className="text-xl font-semibold">Kirish ma'lumotlari</h3>
              <p className="text-sm text-base-content/60 mt-1">
                {credentialsInfo?.message}
              </p>
            </div>

            <div className="space-y-3">
              {/* Username */}
              <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-base-content/50 font-medium">Login</p>
                  <p className="font-mono font-semibold text-lg">{credentialsInfo?.username}</p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopyToClipboard(credentialsInfo?.username || '', 'username')}
                  title="Nusxa olish"
                >
                  {copiedField === 'username' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password */}
              <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-base-content/50 font-medium">
                    {credentialsInfo?.mustChangePassword ? 'Vaqtinchalik parol' : 'Parol'}
                  </p>
                  <p className="font-mono font-semibold text-lg">
                    {showCredPassword
                      ? credentialsInfo?.temporaryPassword
                      : '\u2022'.repeat(credentialsInfo?.temporaryPassword?.length || 8)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowCredPassword(!showCredPassword)}
                    title={showCredPassword ? 'Yashirish' : "Ko'rsatish"}
                  >
                    {showCredPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleCopyToClipboard(credentialsInfo?.temporaryPassword || '', 'password')}
                    title="Nusxa olish"
                  >
                    {copiedField === 'password' ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Copy All */}
            <button
              className="btn btn-outline btn-sm w-full mt-3"
              onClick={() => handleCopyToClipboard(
                `Login: ${credentialsInfo?.username}\nParol: ${credentialsInfo?.temporaryPassword}`,
                'all'
              )}
            >
              {copiedField === 'all' ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  Nusxalandi!
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-4 w-4" />
                  Hammasini nusxalash
                </>
              )}
            </button>

            <div className="alert alert-warning mt-4">
              <span className="text-sm">Bu ma'lumotlar faqat bir marta ko'rsatiladi. Oila a'zosiga yetkazing!</span>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="btn btn-primary"
                onClick={() => { setCredentialsInfo(null); setShowCredPassword(false); }}
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* "Yangi shaxs qo'shish" wizard — atomik tarzda FamilyMember + User (+ Participant) yaratadi */}
      <AddPersonWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={() => { void loadMembers(); }}
      />
    </div>
  );
}
