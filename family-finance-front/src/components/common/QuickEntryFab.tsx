import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useQuickEntryStore } from '../../store/quickEntryStore';
import { PermissionCode, usePermission } from '../../hooks/usePermission';
import { accountsApi } from '../../api/accounts.api';
import { categoriesApi } from '../../api/categories.api';
import { familyMembersApi } from '../../api/family-members.api';
import { TransactionFormModal } from './TransactionFormModal';
import type {
  Account,
  ApiResponse,
  FamilyMember,
  FinanceCategory,
  PagedResponse,
} from '../../types';

const HIDDEN_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/login/,
  /^\/register/,
  /^\/change-password/,
  /^\/forgot-password/,
];

const isRouteHidden = (pathname: string): boolean =>
  HIDDEN_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));

export function QuickEntryFab() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { hasPermission } = usePermission();
  const { isOpen, defaultType, open, close, markCreated } = useQuickEntryStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [refDataLoaded, setRefDataLoaded] = useState(false);
  const [loadingRefData, setLoadingRefData] = useState(false);

  const canCreate = hasPermission(PermissionCode.TRANSACTIONS_CREATE);
  const shouldRender = isAuthenticated && canCreate && !isRouteHidden(location.pathname);

  const loadReferenceData = useCallback(async () => {
    if (refDataLoaded || loadingRefData) return;
    setLoadingRefData(true);
    try {
      const [accountsRes, categoriesRes, membersRes] = await Promise.all([
        accountsApi.getList(),
        categoriesApi.getAll(),
        familyMembersApi.getList(),
      ]);
      setAccounts(
        (accountsRes.data as ApiResponse<Account[]>).data ?? (accountsRes.data as Account[])
      );

      const catData = categoriesRes.data as
        | ApiResponse<PagedResponse<FinanceCategory>>
        | ApiResponse<FinanceCategory[]>;
      if ('content' in (catData.data as PagedResponse<FinanceCategory>)) {
        setCategories((catData.data as PagedResponse<FinanceCategory>).content);
      } else {
        setCategories(catData.data as FinanceCategory[]);
      }

      setMembers(
        (membersRes.data as ApiResponse<FamilyMember[]>).data ??
          (membersRes.data as FamilyMember[])
      );
      setRefDataLoaded(true);
    } catch {
      toast.error("Ma'lumotnoma yuklashda xatolik");
    } finally {
      setLoadingRefData(false);
    }
  }, [refDataLoaded, loadingRefData]);

  useEffect(() => {
    if (isOpen) {
      void loadReferenceData();
    }
  }, [isOpen, loadReferenceData]);

  const handleOpen = () => open('EXPENSE');

  const handleSuccess = () => {
    markCreated();
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Suzuvchi tugma faqat desktopda — mobilda pastki navigatsiya markazidagi FAB ishlatiladi */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Yangi tranzaksiya qo'shish"
        title="Yangi tranzaksiya (Ctrl+N)"
        className="brand-gradient fixed bottom-6 right-6 z-40 hidden h-14 w-14 place-items-center rounded-2xl text-white shadow-[var(--shadow-brand)] transition-transform duration-200 hover:scale-105 active:scale-95 lg:grid"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <TransactionFormModal
        isOpen={isOpen}
        onClose={close}
        onSuccess={handleSuccess}
        defaultType={defaultType}
        accounts={accounts}
        categories={categories}
        members={members}
      />
    </>
  );
}
