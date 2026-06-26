import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { KeyRound, Trophy } from 'lucide-react';
import { useIsMobile } from './useMediaQuery';
import { useActiveScopeId } from './useScopeChange';
import { PermissionCode, usePermission } from './usePermission';
import { familyMembersApi } from '../api/family-members.api';
import { pointParticipantApi } from '../api/points.api';
import { getApiErrorMessage } from '../utils/apiError';
import type { Suggestion } from '../components/persons';
import type { CapabilityFilter, CapabilityCounts } from '../components/persons';
import type { FamilyMember, PagedResponse } from '../types';

const AUTO_DEFAULT_HEADER_HEIGHT = 45;
const AUTO_DEFAULT_ROW_HEIGHT = 61;

interface UseFamilyMembersDataArgs {
  /** Faqat 'list' tabida ma'lumot yuklanadi (tree tabi useFamilyTreeQueries ishlatadi). */
  isListTab: boolean;
  /** Auto-page-size DOM hisobi faqat 'list' tab uchun ishlaydi. */
  activeTab: 'list' | 'tree';
}

/**
 * FamilyMembersPage uchun butun ma'lumot + pagination + auto-page-size DOM mantig'i.
 *
 * <p>Desktop: sahifalangan ({@code useQuery}); Mobile: infinite scroll
 * ({@code useInfiniteQuery}) — UX bir xil. Scope queryKey ichida (D8 migratsiyasi).</p>
 */
export function useFamilyMembersData({ isListTab, activeTab }: UseFamilyMembersDataArgs) {
  const isMobile = useIsMobile();
  const { hasPermission } = usePermission();
  const canManagePoints = hasPermission(PermissionCode.POINTS_MANAGE);

  const queryClient = useQueryClient();
  const activeScopeId = useActiveScopeId();

  const mobileSentinelRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageSizeMode, setPageSizeMode] = useState<'auto' | number>('auto');
  const [autoPageSize, setAutoPageSize] = useState(20);
  const [autoViewportHeight, setAutoViewportHeight] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Effective page size — auto rejimda hisoblangan, aks holda tanlangan
  const pageSize = pageSizeMode === 'auto' ? autoPageSize : pageSizeMode;
  const previousPageSizeRef = useRef(pageSize);

  // ---------- Data (react-query) ----------
  const desktopQuery = useQuery({
    queryKey: ['family-members', activeScopeId, page, pageSize, searchQuery],
    queryFn: async (): Promise<PagedResponse<FamilyMember>> =>
      (await familyMembersApi.getAll(page, pageSize, searchQuery || undefined)).data.data,
    enabled: isListTab && !isMobile,
  });
  const mobileQuery = useInfiniteQuery({
    queryKey: ['family-members-infinite', activeScopeId, pageSize, searchQuery],
    queryFn: async ({ pageParam }): Promise<PagedResponse<FamilyMember>> =>
      (await familyMembersApi.getAll(pageParam, pageSize, searchQuery || undefined)).data.data,
    enabled: isListTab && isMobile,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const pages = Math.ceil(lastPage.totalElements / Math.max(pageSize, 1));
      return allPages.length < pages ? allPages.length : undefined;
    },
  });

  const members = useMemo(() => desktopQuery.data?.content ?? [], [desktopQuery.data]);
  const allMembers = useMemo(
    () => mobileQuery.data?.pages.flatMap((p) => p.content) ?? [],
    [mobileQuery.data],
  );
  const totalElements =
    (isMobile ? mobileQuery.data?.pages[0]?.totalElements : desktopQuery.data?.totalElements) ?? 0;
  const loading = isMobile ? mobileQuery.isLoading : desktopQuery.isLoading;
  const loadingMore = mobileQuery.isFetchingNextPage;

  useEffect(() => {
    if (desktopQuery.isError || mobileQuery.isError) toast.error("Oila a'zolarini yuklashda xatolik");
  }, [desktopQuery.isError, mobileQuery.isError]);

  const invalidateMembers = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['family-members'] });
    void queryClient.invalidateQueries({ queryKey: ['family-members-infinite'] });
  }, [queryClient]);

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

  // Capability filter (chip): joriy sahifa ichida client-side filtrlash
  const [capFilter, setCapFilter] = useState<CapabilityFilter>('all');

  // ==================== DATA LOADING ====================

  // Qidiruv/scope o'zgarsa desktop sahifani boshiga qaytaramiz (mobile queryKey o'zi reset bo'ladi)
  useEffect(() => {
    setPage(0);
  }, [searchQuery, activeScopeId]);

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
  const totalPages = Math.ceil(totalElements / Math.max(pageSize, 1));
  const hasMore = isMobile ? (mobileQuery.hasNextPage ?? false) : page < totalPages - 1;

  const handleLoadMore = useCallback(() => {
    if (mobileQuery.hasNextPage && !mobileQuery.isFetchingNextPage) {
      void mobileQuery.fetchNextPage();
    }
  }, [mobileQuery]);

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

  /**
   * Capability filter chip'lari uchun hisob-kitob (joriy sahifa ichida).
   * Bu yerda total emas, ko'rinadigan sahifa filtrlanadi — backend filter qo'shilsa,
   * counts ham backend'dan kelishi mumkin.
   */
  const capCounts = useMemo<CapabilityCounts>(() => {
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
      void queryClient.invalidateQueries({ queryKey: ['family-members'] });
      void queryClient.invalidateQueries({ queryKey: ['family-members-infinite'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ball tizimiga qo'shishda xatolik"));
    }
  }, [queryClient]);

  return {
    // capability
    canManagePoints,
    // pagination state
    page,
    setPage,
    pageSize,
    pageSizeMode,
    setPageSizeMode,
    autoPageSize,
    autoViewportHeight,
    // search
    searchQuery,
    setSearchQuery,
    // capability filter
    capFilter,
    setCapFilter,
    capCounts,
    displayedMembers,
    displayedAllMembers,
    memberSuggestions,
    // totals + flags
    totalElements,
    totalPages,
    loading,
    loadingMore,
    hasMore,
    members,
    allMembers,
    // actions
    handleLoadMore,
    handleQuickAddParticipant,
    invalidateMembers,
    // refs
    mobileSentinelRef,
    tableAreaRef,
    tableContainerRef,
    tableHeadRef,
    firstRowRef,
  };
}
