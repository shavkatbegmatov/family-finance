import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  PieChart,
  Target,
  HandMetal,
  Users,
  BarChart3,
  Bell,
  Settings,
  Shield,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { transactionsApi } from '../../api/transactions.api';
import { accountsApi } from '../../api/accounts.api';
import { familyMembersApi } from '../../api/family-members.api';
import { familyDebtsApi } from '../../api/family-debts.api';
import { formatCurrency } from '../../config/constants';
import type { Transaction, Account, FamilyMember, FamilyDebt, ApiResponse, PagedResponse } from '../../types';

type ResultType = 'transaction' | 'account' | 'member' | 'debt' | 'page';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

const ICON_MAP: Record<ResultType, LucideIcon> = {
  transaction: ArrowLeftRight,
  account: Wallet,
  member: Users,
  debt: HandMetal,
  page: LayoutDashboard,
};

const PAGE_ICONS: Record<string, LucideIcon> = {
  'page-dashboard': LayoutDashboard,
  'page-transactions': ArrowLeftRight,
  'page-accounts': Wallet,
  'page-categories': Tags,
  'page-budget': PieChart,
  'page-savings': Target,
  'page-debts': HandMetal,
  'page-family': Users,
  'page-reports': BarChart3,
  'page-notifications': Bell,
  'page-roles': Shield,
  'page-audit-logs': FileText,
  'page-settings': Settings,
  'page-profile': UserCircle,
};

const QUICK_ACTIONS: SearchResult[] = [
  { id: 'page-dashboard', type: 'page', title: 'Bosh sahifa', href: '/' },
  { id: 'page-transactions', type: 'page', title: 'Tranzaksiyalar', subtitle: 'Daromad va xarajatlar', href: '/transactions' },
  { id: 'page-accounts', type: 'page', title: 'Hisoblar', subtitle: 'Hisob raqamlar', href: '/accounts' },
  { id: 'page-categories', type: 'page', title: 'Kategoriyalar', subtitle: 'Daromad/Xarajat kategoriyalari', href: '/categories' },
  { id: 'page-budget', type: 'page', title: 'Byudjet', subtitle: 'Oylik byudjet rejasi', href: '/budget' },
  { id: 'page-savings', type: 'page', title: "Jamg'armalar", subtitle: "Tejash maqsadlari", href: '/savings' },
  { id: 'page-debts', type: 'page', title: 'Qarzlar', subtitle: 'Qarzdorlik nazorati', href: '/debts' },
  { id: 'page-family', type: 'page', title: "Oila a'zolari", subtitle: "Oila a'zolarini boshqarish", href: '/family' },
  { id: 'page-reports', type: 'page', title: 'Hisobotlar', subtitle: 'Moliyaviy hisobotlar', href: '/reports' },
  { id: 'page-notifications', type: 'page', title: 'Bildirishnomalar', href: '/notifications' },
  { id: 'page-roles', type: 'page', title: 'Rollar', subtitle: 'Ruxsatlar boshqaruvi', href: '/roles' },
  { id: 'page-audit-logs', type: 'page', title: 'Audit loglar', href: '/audit-logs' },
  { id: 'page-settings', type: 'page', title: 'Sozlamalar', href: '/settings' },
  { id: 'page-profile', type: 'page', title: 'Profil', href: '/profile' },
];

const RECENT_SEARCHES_KEY = 'search_recent';
const MAX_RECENT = 5;

function getResultIcon(result: SearchResult): LucideIcon {
  if (result.type === 'page' && PAGE_ICONS[result.id]) {
    return PAGE_ICONS[result.id];
  }
  return ICON_MAP[result.type] || LayoutDashboard;
}

function getIconColorClass(type: ResultType, isSelected: boolean): string {
  if (isSelected) return 'bg-primary-content/20';

  switch (type) {
    case 'transaction':
      return 'bg-info/10 text-info';
    case 'account':
      return 'bg-success/10 text-success';
    case 'debt':
      return 'bg-warning/10 text-warning';
    case 'member':
      return 'bg-secondary/10 text-secondary';
    default:
      return 'bg-base-200 text-base-content/70';
  }
}

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  const saveRecentSearch = useCallback((result: SearchResult) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.id !== result.id);
      const updated = [result, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 400),
      });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      updatePosition();
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (open) {
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }
  }, [open, updatePosition]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [transactionsRes, accountsRes, membersRes, debtsRes] = await Promise.allSettled([
        transactionsApi.getAll(0, 5),
        accountsApi.getAll(0, 5),
        familyMembersApi.getAll(0, 5),
        familyDebtsApi.getAll(0, 5),
      ]);

      const searchResults: SearchResult[] = [];
      const q = searchQuery.toLowerCase();

      // Filter pages by query
      const matchedPages = QUICK_ACTIONS.filter(
        (action) =>
          action.title.toLowerCase().includes(q) ||
          action.subtitle?.toLowerCase().includes(q)
      );
      searchResults.push(...matchedPages);

      // Transactions
      if (transactionsRes.status === 'fulfilled') {
        const transactions = (transactionsRes.value.data as ApiResponse<PagedResponse<Transaction>>).data.content;
        transactions
          .filter((t) =>
            t.description?.toLowerCase().includes(q) ||
            t.categoryName?.toLowerCase().includes(q) ||
            t.accountName?.toLowerCase().includes(q)
          )
          .forEach((t) => {
            searchResults.push({
              id: `transaction-${t.id}`,
              type: 'transaction',
              title: t.description || t.categoryName || t.type,
              subtitle: `${t.accountName} • ${t.transactionDate}`,
              href: `/transactions?highlight=${t.id}`,
              meta: formatCurrency(t.amount),
            });
          });
      }

      // Accounts
      if (accountsRes.status === 'fulfilled') {
        const accounts = (accountsRes.value.data as ApiResponse<PagedResponse<Account>>).data.content;
        accounts
          .filter((a) => a.name.toLowerCase().includes(q))
          .forEach((a) => {
            searchResults.push({
              id: `account-${a.id}`,
              type: 'account',
              title: a.name,
              subtitle: a.type,
              href: `/accounts?highlight=${a.id}`,
              meta: formatCurrency(a.balance),
            });
          });
      }

      // Family members
      if (membersRes.status === 'fulfilled') {
        const members = (membersRes.value.data as ApiResponse<PagedResponse<FamilyMember>>).data.content;
        members
          .filter((m) => m.fullName.toLowerCase().includes(q))
          .forEach((m) => {
            searchResults.push({
              id: `member-${m.id}`,
              type: 'member',
              title: m.fullName,
              subtitle: m.role,
              href: `/family?highlight=${m.id}`,
            });
          });
      }

      // Debts
      if (debtsRes.status === 'fulfilled') {
        const debts = (debtsRes.value.data as ApiResponse<PagedResponse<FamilyDebt>>).data.content;
        debts
          .filter((d) =>
            d.personName.toLowerCase().includes(q) ||
            d.description?.toLowerCase().includes(q)
          )
          .forEach((d) => {
            searchResults.push({
              id: `debt-${d.id}`,
              type: 'debt',
              title: d.personName,
              subtitle: d.type === 'GIVEN' ? 'Berilgan qarz' : 'Olingan qarz',
              href: `/debts?highlight=${d.id}`,
              meta: formatCurrency(d.remainingAmount),
            });
          });
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch {
      toast.error('Qidirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      saveRecentSearch(result);
      navigate(result.href);
      setOpen(false);
    },
    [navigate, saveRecentSearch]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const recentIdsSet = new Set(recentSearches.map((r) => r.id));
    const filteredActions = QUICK_ACTIONS.filter((action) => !recentIdsSet.has(action.id));
    const items = query ? results : [...recentSearches, ...filteredActions];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      handleSelect(items[selectedIndex]);
    }
  };

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const recentIds = new Set(recentSearches.map((r) => r.id));
  const filteredQuickActions = QUICK_ACTIONS.filter((action) => !recentIds.has(action.id));
  const displayItems = query ? results : [...recentSearches, ...filteredQuickActions];
  const hasRecent = !query && recentSearches.length > 0;

  return (
    <>
      {/* Desktop trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className={clsx(
          'hidden md:flex items-center gap-2 w-full max-w-md px-3 py-2 rounded-xl',
          'bg-base-200/50 border border-base-300 transition-all duration-200',
          'hover:bg-base-200 hover:border-base-content/20',
          'text-base-content/50 text-sm',
          open && 'border-primary ring-2 ring-primary/20'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Qidirish...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-base-300/50 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm btn-square md:hidden"
        title="Qidirish"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Dropdown via Portal */}
      {open && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="fixed z-50 w-full max-w-xl"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              minWidth: dropdownPosition.width,
            }}
          >
            <div className="bg-base-100 rounded-xl border border-base-300 shadow-[0_4px_30px_rgba(0,0,0,0.15)] overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-base-200 px-4">
                {loading ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-base-content/40" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Sahifa, hisob yoki tranzaksiya qidiring..."
                  className="flex-1 bg-transparent py-3 text-base outline-none placeholder:text-base-content/40"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
                {displayItems.length === 0 && query && !loading && (
                  <div className="py-8 text-center text-base-content/50">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>"{query}" bo'yicha natija topilmadi</p>
                  </div>
                )}

                {hasRecent && (
                  <div className="px-2 py-1.5 text-xs font-medium text-base-content/50 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    So'nggi qidiruvlar
                  </div>
                )}

                {displayItems.map((item, index) => {
                  const isQuickAction = !query && index >= recentSearches.length;
                  const showQuickActionHeader = isQuickAction && index === recentSearches.length;
                  const Icon = getResultIcon(item);

                  return (
                    <div key={item.id}>
                      {showQuickActionHeader && (
                        <div className="px-2 py-1.5 text-xs font-medium text-base-content/50 mt-2">
                          Tez havolalar
                        </div>
                      )}
                      <button
                        data-index={index}
                        onClick={() => handleSelect(item)}
                        className={clsx(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          selectedIndex === index
                            ? 'bg-primary text-primary-content'
                            : 'hover:bg-base-200/70'
                        )}
                      >
                        <div
                          className={clsx(
                            'grid h-8 w-8 place-items-center rounded-lg',
                            getIconColorClass(item.type, selectedIndex === index)
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          {item.subtitle && (
                            <div
                              className={clsx(
                                'text-xs truncate',
                                selectedIndex === index
                                  ? 'text-primary-content/70'
                                  : 'text-base-content/50'
                              )}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        {item.meta && (
                          <div
                            className={clsx(
                              'text-sm font-medium',
                              selectedIndex === index
                                ? 'text-primary-content/80'
                                : 'text-base-content/60'
                            )}
                          >
                            {item.meta}
                          </div>
                        )}
                        <ArrowRight
                          className={clsx(
                            'h-4 w-4 transition-transform',
                            selectedIndex === index
                              ? 'translate-x-0 opacity-100'
                              : '-translate-x-2 opacity-0'
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-base-200 px-4 py-2 text-xs text-base-content/50">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base-200 rounded">↑↓</kbd>
                    navigatsiya
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base-200 rounded">↵</kbd>
                    tanlash
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-base-200 rounded">esc</kbd>
                    yopish
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
