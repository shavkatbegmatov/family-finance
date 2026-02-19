import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Plus, Wallet, CreditCard, PiggyBank,
  Smartphone, Landmark, Receipt, Banknote, Snowflake, Play,
  Lock, CheckCircle, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { accountsApi } from '../../api/accounts.api';
import { transactionsApi } from '../../api/transactions.api';
import type {
  Account, AccountBalanceSummary, AccountStatus,
  Transaction, ApiResponse, PagedResponse,
} from '../../types';
import {
  formatCurrency, formatDate, formatDateTime,
  ACCOUNT_TYPES, ACCOUNT_STATUSES, TRANSACTION_TYPES,
} from '../../config/constants';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { PermissionCode, usePermission } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { ModalPortal } from '../../components/common/Modal';
import { TransactionFormModal } from './TransactionFormModal';

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  CASH: Banknote, BANK_CARD: CreditCard, SAVINGS: PiggyBank,
  E_WALLET: Smartphone, TERM_DEPOSIT: Landmark, CREDIT: Receipt,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canConfirmTransactions, canCancelTransactions, canUpdateAccounts } = usePermission();

  // Account data
  const [account, setAccount] = useState<Account | null>(null);
  const [summary, setSummary] = useState<AccountBalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txPage, setTxPage] = useState(0);
  const [txTotalElements, setTxTotalElements] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(0);

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ open: boolean; txId: number | null }>({ open: false, txId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const accountId = Number(id);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchAccount = useCallback(async () => {
    try {
      const [accRes, summaryRes] = await Promise.all([
        accountsApi.getById(accountId),
        accountsApi.getBalanceSummary(accountId),
      ]);
      setAccount((accRes.data as ApiResponse<Account>).data);
      setSummary((summaryRes.data as ApiResponse<AccountBalanceSummary>).data);
    } catch {
      toast.error('Hisob ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await transactionsApi.getByAccount(accountId, txPage, 10);
      const data = res.data as ApiResponse<PagedResponse<Transaction>>;
      setTransactions(data.data.content);
      setTxTotalElements(data.data.totalElements);
      setTxTotalPages(data.data.totalPages);
    } catch {
      toast.error('Tranzaksiyalarni yuklashda xatolik');
    } finally {
      setTxLoading(false);
    }
  }, [accountId, txPage]);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleRefresh = () => {
    fetchAccount();
    fetchTransactions();
  };

  // -----------------------------------------------------------------------
  // Status change
  // -----------------------------------------------------------------------

  const handleStatusChange = async (newStatus: AccountStatus) => {
    try {
      await accountsApi.changeStatus(accountId, newStatus);
      toast.success(`Hisob holati o'zgartirildi: ${ACCOUNT_STATUSES[newStatus].label}`);
      fetchAccount();
    } catch {
      toast.error('Holatni o\'zgartirishda xatolik');
    }
  };

  // -----------------------------------------------------------------------
  // Transaction confirm / cancel
  // -----------------------------------------------------------------------

  const handleConfirm = async (txId: number) => {
    try {
      await transactionsApi.confirm(txId);
      toast.success('Tranzaksiya tasdiqlandi');
      handleRefresh();
    } catch {
      toast.error('Tasdiqlashda xatolik');
    }
  };

  const handleCancel = async () => {
    if (!cancelModal.txId || !cancelReason.trim()) {
      toast.error('Sabab kiriting');
      return;
    }
    setCancelling(true);
    try {
      await transactionsApi.cancel(cancelModal.txId, cancelReason.trim());
      toast.success('Tranzaksiya bekor qilindi');
      setCancelModal({ open: false, txId: null });
      setCancelReason('');
      handleRefresh();
    } catch {
      toast.error('Bekor qilishda xatolik');
    } finally {
      setCancelling(false);
    }
  };

  // -----------------------------------------------------------------------
  // Transaction columns
  // -----------------------------------------------------------------------

  const txColumns: Column<Transaction>[] = [
    {
      key: 'id',
      header: '#',
      className: 'w-16',
      render: (t) => <span className="text-xs text-base-content/60">#{t.id}</span>,
    },
    {
      key: 'type',
      header: 'Tur',
      className: 'w-24',
      render: (t) => {
        const info = TRANSACTION_TYPES[t.type];
        return <span className={`text-xs font-medium ${info?.color || ''}`}>{info?.label || t.type}</span>;
      },
    },
    {
      key: 'amount',
      header: 'Summa',
      className: 'text-right',
      render: (t) => (
        <span className={clsx('font-semibold tabular-nums',
          t.type === 'INCOME' ? 'text-success' : t.type === 'EXPENSE' ? 'text-error' : ''
        )}>
          {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}{formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Tavsif',
      render: (t) => <span className="text-sm truncate max-w-[200px] block">{t.description || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Holat',
      className: 'w-28',
      render: (t) => {
        const s = t.status || 'CONFIRMED';
        const badge = s === 'CONFIRMED' ? 'badge-success' : s === 'PENDING' ? 'badge-warning' : 'badge-error';
        const label = s === 'CONFIRMED' ? 'Tasdiqlangan' : s === 'PENDING' ? 'Kutilmoqda' : 'Bekor';
        return <span className={`badge ${badge} badge-sm`}>{label}</span>;
      },
    },
    {
      key: 'transactionDate',
      header: 'Sana',
      className: 'w-36',
      render: (t) => <span className="text-xs text-base-content/60">{formatDateTime(t.transactionDate)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (t) => (
        <div className="flex items-center gap-1 justify-end">
          {t.status === 'PENDING' && canConfirmTransactions && (
            <button
              className="btn btn-ghost btn-xs btn-square text-success"
              onClick={(e) => { e.stopPropagation(); handleConfirm(t.id); }}
              title="Tasdiqlash"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </button>
          )}
          {t.status !== 'REVERSED' && canCancelTransactions && (
            <button
              className="btn btn-ghost btn-xs btn-square text-error"
              onClick={(e) => { e.stopPropagation(); setCancelModal({ open: true, txId: t.id }); }}
              title="Bekor qilish"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Mobile tx card
  const renderTxMobileCard = (t: Transaction) => {
    const info = TRANSACTION_TYPES[t.type];
    return (
      <div className="surface-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${info?.color || ''}`}>{info?.label || t.type}</span>
          <span className={clsx('font-semibold text-sm',
            t.type === 'INCOME' ? 'text-success' : t.type === 'EXPENSE' ? 'text-error' : ''
          )}>
            {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}{formatCurrency(t.amount)}
          </span>
        </div>
        <p className="text-xs text-base-content/60 truncate">{t.description || '—'}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-content/40">{formatDateTime(t.transactionDate)}</span>
          <span className={`badge badge-sm ${t.status === 'CONFIRMED' ? 'badge-success' : t.status === 'PENDING' ? 'badge-warning' : 'badge-error'}`}>
            {t.status === 'CONFIRMED' ? 'Tasdiqlangan' : t.status === 'PENDING' ? 'Kutilmoqda' : 'Bekor'}
          </span>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded-lg bg-base-300" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-base-300" />)}
        </div>
        <div className="h-64 rounded-xl bg-base-300" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium text-base-content/60">Hisob topilmadi</p>
        <button className="btn btn-ghost mt-4" onClick={() => navigate('/accounts')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Hisoblar ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  const Icon = ICON_MAP[account.type] || Wallet;
  const color = account.color || '#3b82f6';
  const status = account.status || 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm btn-square" onClick={() => navigate('/accounts')}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{account.name}</h1>
              <span className={`badge ${ACCOUNT_STATUSES[status]?.badge || 'badge-ghost'} badge-sm`}>
                {ACCOUNT_STATUSES[status]?.label || status}
              </span>
            </div>
            <p className="text-xs text-base-content/50">
              {account.accCodeFormatted || account.accCode || ''} • {ACCOUNT_TYPES[account.type]?.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-ghost btn-sm btn-square" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Status buttons */}
          {canUpdateAccounts && status === 'ACTIVE' && (
            <button className="btn btn-warning btn-sm gap-1" onClick={() => handleStatusChange('FROZEN')}>
              <Snowflake className="h-3.5 w-3.5" /> Muzlatish
            </button>
          )}
          {canUpdateAccounts && status === 'FROZEN' && (
            <button className="btn btn-success btn-sm gap-1" onClick={() => handleStatusChange('ACTIVE')}>
              <Play className="h-3.5 w-3.5" /> Faollashtirish
            </button>
          )}
          {canUpdateAccounts && status !== 'CLOSED' && (
            <button className="btn btn-error btn-sm btn-outline gap-1" onClick={() => handleStatusChange('CLOSED')}>
              <Lock className="h-3.5 w-3.5" /> Yopish
            </button>
          )}

          <PermissionGate permission={PermissionCode.TRANSACTIONS_CREATE}>
            {status === 'ACTIVE' && (
              <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowTxModal(true)}>
                <Plus className="h-4 w-4" /> Tranzaksiya
              </button>
            )}
          </PermissionGate>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Joriy saldo', value: account.balance, color: 'text-primary' },
          { label: "Boshlang'ich saldo", value: summary?.openingBalance ?? account.openingBalance ?? 0, color: 'text-base-content/70' },
          { label: 'Debet aylanma', value: summary?.debitTurnover ?? 0, color: 'text-success' },
          { label: 'Kredit aylanma', value: summary?.creditTurnover ?? 0, color: 'text-error' },
        ].map(({ label, value, color: c }) => (
          <div key={label} className="surface-card p-4">
            <p className="text-xs text-base-content/50 mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${c}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account info */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-4">
            Hisob ma'lumotlari
          </h3>
          <div className="space-y-3">
            {[
              ['Tur', ACCOUNT_TYPES[account.type]?.label || account.type],
              ['Valyuta', account.currency || 'UZS'],
              ['Rang', account.color || '—'],
              ['Yaratilgan', formatDate(account.createdAt)],
              ['Izoh', account.description || '—'],
              ...(account.bankName ? [['Bank', account.bankName]] : []),
              ...(account.bankMfo ? [['MFO', account.bankMfo]] : []),
              ...(account.bankInn ? [['INN', account.bankInn]] : []),
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between text-sm">
                <span className="text-base-content/50">{label}</span>
                <span className="font-medium">
                  {label === 'Rang' && value !== '—' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: value as string }} />
                      {value}
                    </span>
                  ) : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Access list */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-4">
            Foydalanuvchilar ({account.accessList?.length || 0})
          </h3>
          {account.accessList && account.accessList.length > 0 ? (
            <div className="space-y-2">
              {account.accessList.map((access) => (
                <div key={access.id} className="flex items-center justify-between py-2 border-b border-base-200 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{access.userFullName}</p>
                    <p className="text-xs text-base-content/50">{access.role}</p>
                  </div>
                  <span className="text-xs text-base-content/40">{formatDate(access.grantedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-base-content/40">Foydalanuvchilar topilmadi</p>
          )}

          {/* Cards */}
          {account.cards && account.cards.length > 0 && (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50 mt-6 mb-3">
                Kartalar ({account.cards.length})
              </h3>
              <div className="space-y-2">
                {account.cards.map((card) => (
                  <div key={card.id} className="flex items-center justify-between py-2 border-b border-base-200 last:border-0">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-base-content/40" />
                      <span className="text-sm font-mono">{card.maskedNumber}</span>
                    </div>
                    <span className="badge badge-ghost badge-sm">{card.cardType}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50">
            Tranzaksiyalar tarixi ({txTotalElements})
          </h3>
        </div>

        <DataTable<Transaction>
          data={transactions}
          columns={txColumns}
          keyExtractor={(t) => t.id}
          loading={txLoading}
          totalElements={txTotalElements}
          totalPages={txTotalPages}
          currentPage={txPage}
          pageSize={10}
          onPageChange={setTxPage}
          renderMobileCard={renderTxMobileCard}
          emptyTitle="Tranzaksiya topilmadi"
          emptyDescription="Bu hisobda hali tranzaksiyalar mavjud emas"
        />
      </div>

      {/* Transaction form modal */}
      <TransactionFormModal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        onSuccess={handleRefresh}
        preselectedAccountId={accountId}
      />

      {/* Cancel reason modal */}
      <ModalPortal isOpen={cancelModal.open} onClose={() => setCancelModal({ open: false, txId: null })}>
        <div className="surface-card w-full max-w-sm">
          <div className="p-5 border-b border-base-200">
            <h3 className="text-lg font-semibold">Tranzaksiyani bekor qilish</h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-base-content/60">
              Bekor qilish sababini kiriting:
            </p>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="Sabab..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 p-5 border-t border-base-200">
            <button className="btn btn-ghost btn-sm" onClick={() => setCancelModal({ open: false, txId: null })}>
              Yopish
            </button>
            <button
              className={clsx('btn btn-error btn-sm', cancelling && 'loading')}
              onClick={handleCancel}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? 'Bekor qilinmoqda...' : 'Bekor qilish'}
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
