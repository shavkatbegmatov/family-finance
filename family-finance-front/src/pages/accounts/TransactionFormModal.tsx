import { useEffect, useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { transactionsApi } from '../../api/transactions.api';
import { accountsApi } from '../../api/accounts.api';
import type { Account, TransactionRequest, TransactionType, ApiResponse } from '../../types';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { getTashkentNow } from '../../config/constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedAccountId?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionFormModal({ isOpen, onClose, onSuccess, preselectedAccountId }: TransactionFormModalProps) {
  const [type, setType] = useState<TransactionType>('INCOME');
  const [accountId, setAccountId] = useState<number | undefined>(preselectedAccountId);
  const [toAccountId, setToAccountId] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load active accounts
  useEffect(() => {
    if (isOpen) {
      accountsApi.getList().then((res) => {
        const data = res.data as ApiResponse<Account[]>;
        // Filter only ACTIVE accounts
        setAccounts(data.data.filter((a) => a.status !== 'FROZEN' && a.status !== 'CLOSED'));
      }).catch(() => {});

      // Set default date
      const now = getTashkentNow();
      const pad = (n: number) => n.toString().padStart(2, '0');
      setTransactionDate(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && preselectedAccountId) {
      setAccountId(preselectedAccountId);
    }
  }, [isOpen, preselectedAccountId]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setType('INCOME');
      setAmount(0);
      setDescription('');
      setToAccountId(undefined);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!accountId) {
      toast.error('Hisobni tanlang');
      return;
    }
    if (amount <= 0) {
      toast.error('Summani kiriting');
      return;
    }
    if (!description.trim()) {
      toast.error('Tavsifni kiriting');
      return;
    }
    if (type === 'TRANSFER' && !toAccountId) {
      toast.error('Qabul qiluvchi hisobni tanlang');
      return;
    }

    setSubmitting(true);
    try {
      const payload: TransactionRequest = {
        type,
        amount,
        accountId,
        toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
        transactionDate: transactionDate + ':00',
        description: description.trim(),
      };

      await transactionsApi.create(payload);
      toast.success('Tranzaksiya yaratildi');
      onClose();
      onSuccess();
    } catch {
      toast.error('Tranzaksiya yaratishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.name} (${a.accCodeFormatted || a.accCode || ''})`,
  }));

  const typeButtons: { value: TransactionType; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
    { value: 'INCOME', label: 'Kirim', icon: ArrowDownLeft, color: 'btn-success' },
    { value: 'EXPENSE', label: 'Chiqim', icon: ArrowUpRight, color: 'btn-error' },
    { value: 'TRANSFER', label: "O'tkazma", icon: ArrowRightLeft, color: 'btn-info' },
  ];

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="surface-card w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 p-5">
          <h3 className="text-lg font-semibold">Yangi tranzaksiya</h3>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Transaction Type */}
          <div className="flex gap-2">
            {typeButtons.map(({ value, label, icon: IconComp, color }) => (
              <button
                key={value}
                className={clsx(
                  'btn btn-sm flex-1 gap-1',
                  type === value ? color : 'btn-ghost'
                )}
                onClick={() => setType(value)}
              >
                <IconComp className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Account selection */}
          <Select
            label={type === 'TRANSFER' ? 'Jo\'natuvchi hisob *' : type === 'EXPENSE' ? 'Hisob (chiqim) *' : 'Hisob (kirim) *'}
            value={accountId}
            onChange={(val) => setAccountId(val as number)}
            options={accountOptions}
            required
          />

          {/* Transfer: To account */}
          {type === 'TRANSFER' && (
            <Select
              label="Qabul qiluvchi hisob *"
              value={toAccountId}
              onChange={(val) => setToAccountId(val as number)}
              options={accountOptions.filter((o) => o.value !== accountId)}
              required
            />
          )}

          {/* Amount */}
          <CurrencyInput
            label="Summa *"
            value={amount}
            onChange={setAmount}
            showQuickButtons
          />

          {/* Date */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Sana *
              </span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered input-sm w-full"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Tavsif *
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={2}
              placeholder="Tranzaksiya tavsifi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-base-200 p-5">
          <button className="btn btn-ghost" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className={clsx('btn btn-primary', submitting && 'loading')}
            onClick={handleSubmit}
            disabled={submitting || !accountId || amount <= 0 || !description.trim()}
          >
            {submitting ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
