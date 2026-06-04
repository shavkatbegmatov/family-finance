import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HandMetal,
  Plus,
  Edit2,
  Trash2,
  X,
  Phone,
  Calendar,
  CreditCard,
  ArrowUpCircle,
  Filter,
  User,
} from 'lucide-react';
import clsx from 'clsx';
import { familyDebtsApi } from '../../api/family-debts.api';
import {
  formatCurrency,
  formatDate,
  getTashkentToday,
  FAMILY_DEBT_TYPES,
  FAMILY_DEBT_STATUSES,
} from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { TextInput } from '../../components/ui/TextInput';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { DateInput } from '../../components/ui/DateInput';
import { TextArea } from '../../components/ui/TextArea';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { DataTable, Column } from '../../components/ui/DataTable';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { useScopeChangeEffect } from '../../hooks/useScopeChange';
import type {
  FamilyDebt,
  FamilyDebtRequest,
  DebtPayment,
  DebtPaymentRequest,
  DebtType,
  DebtStatus,
  PagedResponse,
} from '../../types';

type TabType = 'all' | 'given' | 'taken' | 'closed' | 'stats';

interface DebtSummary {
  totalGiven: number;
  totalTaken: number;
}

export function DebtsPage() {
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [debts, setDebts] = useState<FamilyDebt[]>([]);
  const allItemsRef = useRef<FamilyDebt[]>([]);
  const [allItems, setAllItems] = useState<FamilyDebt[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState<DebtType | ''>('');
  const [statusFilter, setStatusFilter] = useState<DebtStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Summary
  const [summary, setSummary] = useState<DebtSummary>({ totalGiven: 0, totalTaken: 0 });

  // Selected debt & detail panel
  const [selectedDebt, setSelectedDebt] = useState<FamilyDebt | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Add/Edit modal
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<FamilyDebt | null>(null);
  const [debtForm, setDebtForm] = useState<FamilyDebtRequest>({
    type: 'GIVEN',
    personName: '',
    personPhone: '',
    amount: 0,
    dueDate: '',
    description: '',
  });
  const [submittingDebt, setSubmittingDebt] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState<DebtPaymentRequest>({
    amount: 0,
    paymentDate: getTashkentToday(),
    note: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Delete confirmation
  const [deletingDebtId, setDeletingDebtId] = useState<number | null>(null);

  // Tabs configuration
  const tabs = [
    { id: 'all' as TabType, label: 'Barchasi' },
    { id: 'given' as TabType, label: 'Berilgan' },
    { id: 'taken' as TabType, label: 'Olingan' },
    { id: 'closed' as TabType, label: 'Yopilgan' },
    { id: 'stats' as TabType, label: 'Statistika' },
  ];

  // Compute effective filters based on active tab
  const effectiveType = useMemo((): DebtType | undefined => {
    if (activeTab === 'given') return 'GIVEN';
    if (activeTab === 'taken') return 'TAKEN';
    return typeFilter || undefined;
  }, [activeTab, typeFilter]);

  const effectiveStatus = useMemo((): DebtStatus | undefined => {
    if (activeTab === 'closed') return 'PAID';
    return statusFilter || undefined;
  }, [activeTab, statusFilter]);

  // Table columns
  const columns: Column<FamilyDebt>[] = useMemo(() => [
    {
      key: 'personName',
      header: 'Shaxs',
      render: (debt) => (
        <div>
          <div className="font-medium">{debt.personName}</div>
          {debt.personPhone && (
            <div className="flex items-center gap-1 text-xs text-base-content/60">
              <Phone className="h-3 w-3" />
              {debt.personPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tur',
      render: (debt) => (
        <span
          className={clsx(
            'badge badge-sm',
            debt.type === 'GIVEN' ? 'badge-info' : 'badge-warning'
          )}
        >
          {FAMILY_DEBT_TYPES[debt.type]?.label}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Summa',
      getValue: (debt) => debt.amount,
      render: (debt) => formatCurrency(debt.amount),
    },
    {
      key: 'remainingAmount',
      header: 'Qoldiq',
      getValue: (debt) => debt.remainingAmount,
      render: (debt) => (
        <span className="font-semibold text-error">
          {formatCurrency(debt.remainingAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      render: (debt) => {
        const statusInfo = FAMILY_DEBT_STATUSES[debt.status];
        return (
          <span className={clsx('badge badge-sm', statusInfo?.color)}>
            {statusInfo?.label}
          </span>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Muddat',
      render: (debt) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-3.5 w-3.5 text-base-content/50" />
          <span>{debt.dueDate ? formatDate(debt.dueDate) : '—'}</span>
          {debt.isOverdue && (
            <span className="badge badge-error badge-xs ml-1">O'tgan</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (debt) => (
        <div className="flex items-center gap-1">
          <PermissionGate permission={PermissionCode.DEBTS_UPDATE}>
            <button
              className="btn btn-ghost btn-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditModal(debt);
              }}
              title="Tahrirlash"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </PermissionGate>
          <PermissionGate permission={PermissionCode.DEBTS_DELETE}>
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingDebtId(debt.id);
              }}
              title="O'chirish"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ], []);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // ==================== DATA LOADING ====================

  const loadDebts = useCallback(async (isInitial = false) => {
    if (isInitial) { /* keep initialLoading true */ }
    else if (isMobile && page > 0) setLoadingMore(true);
    else setRefreshing(true);
    try {
      const res = await familyDebtsApi.getAll(
        page,
        pageSize,
        effectiveType,
        effectiveStatus,
        searchQuery || undefined
      );
      const data = res.data.data as PagedResponse<FamilyDebt>;
      setDebts(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);

      if (isMobile && page > 0) {
        const newAll = [...allItemsRef.current, ...data.content];
        allItemsRef.current = newAll;
        setAllItems(newAll);
      } else {
        allItemsRef.current = data.content;
        setAllItems(data.content);
      }
    } catch {
      toast.error('Qarzlarni yuklashda xatolik');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [page, pageSize, effectiveType, effectiveStatus, searchQuery, isMobile]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages - 1 && !loadingMore) {
      setPage((p) => p + 1);
    }
  }, [page, totalPages, loadingMore]);

  const loadSummary = useCallback(async () => {
    try {
      const summaryRes = await familyDebtsApi.getSummary();
      const data = summaryRes.data.data as DebtSummary;
      setSummary(data);
    } catch {
      toast.error('Qarz xulosasini yuklashda xatolik');
    }
  }, []);

  const loadDebtPayments = useCallback(async (debtId: number) => {
    setLoadingPayments(true);
    try {
      const paymentsRes = await familyDebtsApi.getPayments(debtId);
      const data = paymentsRes.data.data as DebtPayment[];
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      toast.error("To'lovlarni yuklashda xatolik");
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    loadDebts(true);
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, effectiveType, effectiveStatus, searchQuery]);

  // Phase 3: aktiv scope o'zgarganda qarzlarni qayta yuklash
  useScopeChangeEffect(() => {
    void loadDebts(true);
    void loadSummary();
  });

  // ==================== DEBT MODAL ====================

  const handleOpenAddModal = () => {
    setEditingDebt(null);
    setDebtForm({
      type: 'GIVEN',
      personName: '',
      personPhone: '',
      amount: 0,
      dueDate: '',
      description: '',
    });
    setShowDebtModal(true);
  };

  const handleOpenEditModal = (debt: FamilyDebt) => {
    setEditingDebt(debt);
    setDebtForm({
      type: debt.type,
      personName: debt.personName,
      personPhone: debt.personPhone || '',
      amount: debt.amount,
      dueDate: debt.dueDate || '',
      description: debt.description || '',
    });
    setShowDebtModal(true);
  };

  const handleCloseDebtModal = () => {
    setShowDebtModal(false);
    setEditingDebt(null);
  };

  const handleSubmitDebt = async () => {
    if (!debtForm.personName.trim() || debtForm.amount <= 0) return;
    setSubmittingDebt(true);
    try {
      if (editingDebt) {
        await familyDebtsApi.update(editingDebt.id, debtForm);
      } else {
        await familyDebtsApi.create(debtForm);
      }
      handleCloseDebtModal();
      void loadDebts();
      void loadSummary();
    } catch {
      toast.error('Qarzni saqlashda xatolik');
    } finally {
      setSubmittingDebt(false);
    }
  };

  // ==================== DELETE ====================

  const handleDeleteDebt = async () => {
    if (!deletingDebtId) return;
    try {
      await familyDebtsApi.delete(deletingDebtId);
      setDeletingDebtId(null);
      if (selectedDebt?.id === deletingDebtId) {
        setSelectedDebt(null);
        setPayments([]);
      }
      void loadDebts();
      void loadSummary();
    } catch {
      toast.error("Qarzni o'chirishda xatolik");
    }
  };

  // ==================== PAYMENT MODAL ====================

  const handleOpenPaymentModal = () => {
    setPaymentForm({
      amount: 0,
      paymentDate: getTashkentToday(),
      note: '',
    });
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
  };

  const handleSubmitPayment = async () => {
    if (!selectedDebt || paymentForm.amount <= 0) return;
    setSubmittingPayment(true);
    try {
      await familyDebtsApi.addPayment(selectedDebt.id, paymentForm);
      handleClosePaymentModal();
      void loadDebts();
      void loadSummary();
      // Refresh detail
      const updatedRes = await familyDebtsApi.getById(selectedDebt.id);
      const updatedDebt = updatedRes.data.data as FamilyDebt;
      setSelectedDebt(updatedDebt);
      loadDebtPayments(selectedDebt.id);
    } catch {
      toast.error("To'lov qo'shishda xatolik");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ==================== DETAIL PANEL ====================

  const handleSelectDebt = (debt: FamilyDebt) => {
    setSelectedDebt(debt);
    loadDebtPayments(debt.id);
  };

  const handleCloseDetail = () => {
    setSelectedDebt(null);
    setPayments([]);
  };

  const paidPercentage = selectedDebt
    ? Math.min(Math.round((selectedDebt.paidAmount / selectedDebt.amount) * 100), 100)
    : 0;

  // ==================== STATS ====================

  const renderStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-soft rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami berilgan</p>
              <p className="text-lg font-bold text-info">
                {formatCurrency(summary.totalGiven)}
              </p>
            </div>
          </div>
        </div>
        <div className="surface-soft rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami olingan</p>
              <p className="text-lg font-bold text-warning">
                {formatCurrency(summary.totalTaken)}
              </p>
            </div>
          </div>
        </div>
        <div className="surface-soft rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-error/10 flex items-center justify-center">
              <HandMetal className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Muddati o'tganlar</p>
              <p className="text-lg font-bold text-error">
                {debts.filter(d => d.isOverdue).length} ta
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== DETAIL PANEL RENDER ====================

  // Detail panel ichki kontenti — desktop inline panel va mobil modal'da qayta ishlatiladi
  const renderDebtDetailBody = () => {
    if (!selectedDebt) return null;
    return (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{selectedDebt.personName}</h3>
              <span
                className={clsx(
                  'badge badge-sm mt-1',
                  selectedDebt.type === 'GIVEN' ? 'badge-info' : 'badge-warning'
                )}
              >
                {FAMILY_DEBT_TYPES[selectedDebt.type]?.label}
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={handleCloseDetail}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="surface-soft rounded-lg p-3">
              <p className="text-xs text-base-content/60">Asosiy summa</p>
              <p className="font-semibold">{formatCurrency(selectedDebt.amount)}</p>
            </div>
            <div className="surface-soft rounded-lg p-3">
              <p className="text-xs text-base-content/60">To'langan</p>
              <p className="font-semibold text-success">
                {formatCurrency(selectedDebt.paidAmount)}
              </p>
            </div>
            <div className="surface-soft rounded-lg p-3 col-span-2">
              <p className="text-xs text-base-content/60">Qoldiq</p>
              <p className="text-xl font-bold text-error">
                {formatCurrency(selectedDebt.remainingAmount)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-base-content/60">To'langan</span>
              <span className="font-semibold">{paidPercentage}%</span>
            </div>
            <progress
              className="progress progress-success w-full"
              value={paidPercentage}
              max={100}
            />
          </div>

          {selectedDebt.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-base-content/50" />
              <span>Muddat: {formatDate(selectedDebt.dueDate)}</span>
              {selectedDebt.isOverdue && (
                <span className="badge badge-error badge-sm">O'tgan</span>
              )}
            </div>
          )}

          {selectedDebt.personPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-base-content/50" />
              <span>{selectedDebt.personPhone}</span>
            </div>
          )}

          {selectedDebt.description && (
            <div className="text-sm text-base-content/70 border-t border-base-200 pt-3">
              {selectedDebt.description}
            </div>
          )}

          {selectedDebt.status !== 'PAID' && (
            <PermissionGate permission={PermissionCode.DEBTS_PAY}>
              <button
                className="btn btn-primary w-full"
                onClick={handleOpenPaymentModal}
              >
                <CreditCard className="h-4 w-4" />
                To'lov qilish
              </button>
            </PermissionGate>
          )}

          {/* Payment History */}
          <div className="border-t border-base-200 pt-4">
            <h4 className="text-sm font-semibold mb-3">To'lovlar tarixi</h4>
            {loadingPayments ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner loading-sm" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-sm text-base-content/50 text-center py-4">
                To'lovlar yo'q
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="surface-soft rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-success">
                        +{formatCurrency(payment.amount)}
                      </span>
                      <span className="text-xs text-base-content/60">
                        {formatDate(payment.paymentDate)}
                      </span>
                    </div>
                    {payment.note && (
                      <div className="text-xs text-base-content/70 mt-1">
                        {payment.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
    );
  };

  const renderDetailPanel = () => (
    <div className="lg:col-span-1">
      {selectedDebt ? (
        <div className="surface-card sticky top-4 space-y-4 p-4">{renderDebtDetailBody()}</div>
      ) : (
        <div className="surface-card p-8 text-center text-base-content/50">
          <HandMetal className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Batafsil ko'rish uchun qarzni tanlang</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="section-title">Qarzlar</h1>
          <p className="section-subtitle truncate">Oilaviy qarzlar boshqaruvi</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <span className="pill hidden bg-info/10 text-info lg:inline-flex">
            Berilgan: {formatCurrency(summary.totalGiven)}
          </span>
          <span className="pill hidden bg-warning/10 text-warning lg:inline-flex">
            Olingan: {formatCurrency(summary.totalTaken)}
          </span>
          <PermissionGate permission={PermissionCode.DEBTS_CREATE}>
            <button className="btn btn-primary btn-sm gap-1.5" onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yangi qarz</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Mobil: berilgan/olingan qisqacha summasi */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <div className="card-native flex items-center gap-2.5 p-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-info/10 text-info">
            <ArrowUpCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-base-content/55">Berilgan</p>
            <p className="truncate text-sm font-bold text-info">{formatCurrency(summary.totalGiven)}</p>
          </div>
        </div>
        <div className="card-native flex items-center gap-2.5 p-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-warning/10 text-warning">
            <CreditCard className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-base-content/55">Olingan</p>
            <p className="truncate text-sm font-bold text-warning">{formatCurrency(summary.totalTaken)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface-card">
        <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-base-200 p-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedDebt(null);
                  setPage(0);
                }}
                className={clsx(
                  'tap-sm whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-base-content/60 hover:bg-base-200'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'stats' ? (
            renderStats()
          ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <SearchInput
                    value={searchQuery}
                    onValueChange={(val) => {
                      setSearchQuery(val);
                      setPage(0);
                    }}
                    placeholder="Shaxs bo'yicha qidirish..."
                    hideLabel
                    ariaLabel="Qidirish"
                    className="w-56"
                  />
                  {activeTab === 'all' && (
                    <Select
                      value={typeFilter || undefined}
                      onChange={(val) => {
                        setTypeFilter((val as DebtType | '') || '');
                        setPage(0);
                      }}
                      options={[
                        { value: '', label: 'Barcha turlar' },
                        ...Object.entries(FAMILY_DEBT_TYPES).map(([key, { label }]) => ({
                          value: key,
                          label,
                        })),
                      ]}
                      placeholder="Barcha turlar"
                      icon={<Filter className="h-4 w-4" />}
                    />
                  )}
                  {activeTab !== 'closed' && (
                    <Select
                      value={statusFilter || undefined}
                      onChange={(val) => {
                        setStatusFilter((val as DebtStatus | '') || '');
                        setPage(0);
                      }}
                      options={[
                        { value: '', label: 'Barcha holatlar' },
                        ...Object.entries(FAMILY_DEBT_STATUSES).map(([key, { label }]) => ({
                          value: key,
                          label,
                        })),
                      ]}
                      placeholder="Barcha holatlar"
                    />
                  )}
                </div>
                <p className="text-sm text-base-content/60">
                  {totalElements} ta qarz
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                {/* Debts Table */}
                <div className="relative lg:col-span-2">
                  {refreshing && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                        <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
                      </div>
                    </div>
                  )}
                  <DataTable
                    data={isMobile ? allItems : debts}
                    columns={columns}
                    keyExtractor={(debt) => debt.id}
                    loading={initialLoading && !refreshing}
                    emptyIcon={<HandMetal className="h-12 w-12" />}
                    emptyTitle="Qarzlar topilmadi"
                    emptyDescription="Filtrlarni o'zgartiring yoki yangi qarz qo'shing"
                    onRowClick={handleSelectDebt}
                    rowClassName={(debt) =>
                      clsx(
                        debt.isOverdue && 'bg-error/5',
                        selectedDebt?.id === debt.id && 'bg-primary/10'
                      )
                    }
                    currentPage={page}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
                    onLoadMore={handleLoadMore}
                    hasMore={page < totalPages - 1}
                    loadingMore={loadingMore}
                    renderMobileCard={(debt) => {
                      const overdue = debt.isOverdue;
                      return (
                        <div
                          className={clsx(
                            'flex items-center gap-3 rounded-2xl border bg-base-100 p-3',
                            overdue ? 'border-error/30' : 'border-base-200',
                            selectedDebt?.id === debt.id && 'ring-2 ring-primary'
                          )}
                        >
                          <span
                            className={clsx(
                              'grid h-11 w-11 flex-none place-items-center rounded-2xl',
                              debt.type === 'GIVEN' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'
                            )}
                          >
                            <User className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">{debt.personName}</p>
                              <span className="flex-none text-sm font-bold tabular-nums text-error">
                                {formatCurrency(debt.remainingAmount)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p className="min-w-0 truncate text-xs text-base-content/55">
                                {FAMILY_DEBT_TYPES[debt.type]?.label} · {formatCurrency(debt.amount)}
                              </p>
                              <div className="flex flex-none items-center gap-1">
                                {overdue && <span className="badge badge-error badge-xs">O'tgan</span>}
                                <span className={clsx('badge badge-xs', FAMILY_DEBT_STATUSES[debt.status]?.color)}>
                                  {FAMILY_DEBT_STATUSES[debt.status]?.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>

                {/* Detail Panel — faqat desktop inline; mobilda pastki varaq (modal) */}
                {!isMobile && renderDetailPanel()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Debt Modal */}
      <ModalPortal isOpen={showDebtModal} onClose={handleCloseDebtModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingDebt ? 'Qarzni tahrirlash' : 'Yangi qarz'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingDebt ? 'Qarz ma\'lumotlarini yangilang' : 'Yangi qarz yozuvini kiriting'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseDebtModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* Type */}
              <Select
                label="Qarz turi"
                required
                value={debtForm.type}
                onChange={(val) =>
                  setDebtForm((prev) => ({ ...prev, type: (val as DebtType) || 'GIVEN' }))
                }
                options={Object.entries(FAMILY_DEBT_TYPES).map(([key, { label }]) => ({
                  value: key,
                  label,
                }))}
                placeholder="Turni tanlang"
              />

              {/* Person Name */}
              <TextInput
                label="Shaxs ismi"
                required
                value={debtForm.personName}
                onChange={(val) =>
                  setDebtForm((prev) => ({ ...prev, personName: val }))
                }
                placeholder="To'liq ism"
                leadingIcon={<User className="h-5 w-5" />}
              />

              {/* Person Phone */}
              <PhoneInput
                label="Telefon raqami"
                value={debtForm.personPhone || ''}
                onChange={(val) =>
                  setDebtForm((prev) => ({ ...prev, personPhone: val }))
                }
              />

              {/* Amount */}
              <CurrencyInput
                label="Summa *"
                value={debtForm.amount}
                onChange={(val) => setDebtForm((prev) => ({ ...prev, amount: val }))}
                min={0}
              />

              {/* Due Date */}
              <DateInput
                label="Muddat"
                value={debtForm.dueDate || ''}
                onChange={(val) =>
                  setDebtForm((prev) => ({ ...prev, dueDate: val }))
                }
                min={getTashkentToday()}
              />

              {/* Description */}
              <TextArea
                label="Tavsif"
                value={debtForm.description || ''}
                onChange={(val) =>
                  setDebtForm((prev) => ({ ...prev, description: val }))
                }
                placeholder="Qo'shimcha ma'lumot..."
                rows={2}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={handleCloseDebtModal}
                disabled={submittingDebt}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitDebt}
                disabled={submittingDebt || !debtForm.personName.trim() || debtForm.amount <= 0}
              >
                {submittingDebt && <span className="loading loading-spinner loading-sm" />}
                {editingDebt ? 'Saqlash' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Payment Modal */}
      <ModalPortal isOpen={showPaymentModal && !!selectedDebt} onClose={handleClosePaymentModal}>
        {selectedDebt && (
          <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">To'lov qilish</h3>
                  <p className="text-sm text-base-content/60">
                    {selectedDebt.personName} - Qoldiq: {formatCurrency(selectedDebt.remainingAmount)}
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleClosePaymentModal}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <CurrencyInput
                  label="To'lov summasi *"
                  value={paymentForm.amount}
                  onChange={(val) =>
                    setPaymentForm((prev) => ({ ...prev, amount: val }))
                  }
                  min={0}
                  max={selectedDebt.remainingAmount}
                  showQuickButtons
                />

                <DateInput
                  label="To'lov sanasi"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(val) =>
                    setPaymentForm((prev) => ({ ...prev, paymentDate: val }))
                  }
                />

                <TextArea
                  label="Izoh"
                  value={paymentForm.note || ''}
                  onChange={(val) =>
                    setPaymentForm((prev) => ({ ...prev, note: val }))
                  }
                  placeholder="Qo'shimcha ma'lumot..."
                  rows={2}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="btn btn-ghost"
                  onClick={handleClosePaymentModal}
                  disabled={submittingPayment}
                >
                  Bekor qilish
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitPayment}
                  disabled={submittingPayment || paymentForm.amount <= 0}
                >
                  {submittingPayment && <span className="loading loading-spinner loading-sm" />}
                  To'lash
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Mobil: qarz tafsilotlari pastki varaq (modal) */}
      {isMobile && (
        <ModalPortal isOpen={!!selectedDebt} onClose={handleCloseDetail}>
          <div className="w-full max-w-md rounded-2xl bg-base-100 shadow-2xl">
            <div className="max-h-[85vh] space-y-4 overflow-y-auto p-4">{renderDebtDetailBody()}</div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      <ModalPortal isOpen={!!deletingDebtId} onClose={() => setDeletingDebtId(null)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
              <Trash2 className="h-7 w-7 text-error" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Qarzni o'chirish</h3>
            <p className="text-sm text-base-content/60 mb-6">
              Haqiqatan ham bu qarzni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => setDeletingDebtId(null)}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteDebt}
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
