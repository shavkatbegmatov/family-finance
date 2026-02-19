import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { accountsApi } from '../../api/accounts.api';
import type { Account, AccountRequest, AccountType } from '../../types';
import { ACCOUNT_TYPES, ACCOUNT_ICONS, CARD_TYPES } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#14b8a6', '#6366f1', '#d946ef', '#0ea5e9',
];

const CURRENCY_OPTIONS = [
  { value: 'UZS', label: 'UZS — O\'zbek so\'mi' },
  { value: 'USD', label: 'USD — AQSH dollari' },
  { value: 'EUR', label: 'EUR — Yevro' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAccount?: Account | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountFormModal({ isOpen, onClose, onSuccess, editingAccount }: AccountFormModalProps) {
  const isEdit = !!editingAccount;

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CASH');
  const [currency, setCurrency] = useState('UZS');
  const [balance, setBalance] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [description, setDescription] = useState('');

  // Bank info
  const [bankName, setBankName] = useState('');
  const [bankMfo, setBankMfo] = useState('');
  const [bankInn, setBankInn] = useState('');

  // Card info
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardExpiryDate, setCardExpiryDate] = useState('');
  const [cardType, setCardType] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingAccount) {
        setName(editingAccount.name);
        setType(editingAccount.type);
        setCurrency(editingAccount.currency || 'UZS');
        setBalance(editingAccount.balance);
        setOpeningBalance(editingAccount.openingBalance ?? editingAccount.balance);
        setColor(editingAccount.color || DEFAULT_COLORS[0]);
        setDescription(editingAccount.description || '');
        setBankName(editingAccount.bankName || '');
        setBankMfo(editingAccount.bankMfo || '');
        setBankInn(editingAccount.bankInn || '');
        setCardNumber('');
        setCardHolderName('');
        setCardExpiryDate('');
        setCardType('');
      } else {
        setName('');
        setType('CASH');
        setCurrency('UZS');
        setBalance(0);
        setOpeningBalance(0);
        setColor(DEFAULT_COLORS[0]);
        setDescription('');
        setBankName('');
        setBankMfo('');
        setBankInn('');
        setCardNumber('');
        setCardHolderName('');
        setCardExpiryDate('');
        setCardType('');
      }
    }
  }, [isOpen, editingAccount]);

  const showBankFields = ['BANK_CARD', 'SAVINGS', 'TERM_DEPOSIT', 'CREDIT'].includes(type);
  const showCardFields = type === 'BANK_CARD';

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Hisob nomini kiriting');
      return;
    }

    setSubmitting(true);
    try {
      const payload: AccountRequest = {
        name: name.trim(),
        type,
        currency,
        balance: isEdit ? undefined : balance,
        color,
        description: description || undefined,
        openingBalance: isEdit ? undefined : openingBalance,
        bankName: showBankFields && bankName ? bankName : undefined,
        bankMfo: showBankFields && bankMfo ? bankMfo : undefined,
        bankInn: showBankFields && bankInn ? bankInn : undefined,
        cardNumber: showCardFields && cardNumber ? cardNumber : undefined,
        cardHolderName: showCardFields && cardHolderName ? cardHolderName : undefined,
        cardExpiryDate: showCardFields && cardExpiryDate ? cardExpiryDate : undefined,
        cardType: showCardFields && cardType ? cardType : undefined,
      };

      if (isEdit) {
        await accountsApi.update(editingAccount!.id, payload);
        toast.success('Hisob yangilandi');
      } else {
        await accountsApi.create(payload);
        toast.success('Yangi hisob yaratildi');
      }

      onClose();
      onSuccess();
    } catch {
      toast.error('Saqlashda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const iconName = ACCOUNT_ICONS[type] || 'Wallet';

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="surface-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 p-5">
          <div>
            <h3 className="text-lg font-semibold">
              {isEdit ? 'Hisobni tahrirlash' : 'Yangi hisob yaratish'}
            </h3>
            <p className="text-xs text-base-content/50 mt-0.5">
              Ikonka avtomatik: {iconName}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Name */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Hisob nomi *
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Masalan: Asosiy karta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Type + Currency row */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Hisob turi *"
              value={type}
              onChange={(val) => setType(val as AccountType)}
              options={Object.values(ACCOUNT_TYPES).map((t) => ({
                value: t.value,
                label: t.label,
              }))}
              disabled={isEdit}
            />
            <Select
              label="Valyuta"
              value={currency}
              onChange={(val) => setCurrency(val as string)}
              options={CURRENCY_OPTIONS}
              disabled={isEdit}
            />
          </div>

          {/* Opening Balance */}
          <CurrencyInput
            label={isEdit ? 'Boshlang\'ich saldo (o\'zgarmas)' : 'Boshlang\'ich saldo'}
            value={isEdit ? openingBalance : balance}
            onChange={isEdit ? () => {} : (v) => { setBalance(v); setOpeningBalance(v); }}
            disabled={isEdit}
          />

          {/* Description */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Izoh
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={2}
              placeholder="Qo'shimcha ma'lumot..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Color Picker */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Rang
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={clsx(
                    'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                    color === c
                      ? 'border-base-content scale-110 ring-2 ring-primary/30'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Bank fields */}
          {showBankFields && (
            <div className="border-t border-base-200 pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Bank ma'lumotlari
              </p>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                placeholder="Bank nomi"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="MFO (5 raqam)"
                  value={bankMfo}
                  onChange={(e) => setBankMfo(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  maxLength={5}
                />
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="INN (9 raqam)"
                  value={bankInn}
                  onChange={(e) => setBankInn(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  maxLength={9}
                />
              </div>
            </div>
          )}

          {/* Card fields */}
          {showCardFields && !isEdit && (
            <div className="border-t border-base-200 pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Karta ma'lumotlari
              </p>
              <Select
                label=""
                placeholder="Karta turi"
                value={cardType}
                onChange={(val) => setCardType(val as string)}
                options={CARD_TYPES.map((ct) => ({ value: ct, label: ct }))}
              />
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                placeholder="Karta raqami (16 raqam)"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                maxLength={19}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="Karta egasi"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                />
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="MM/YY"
                  value={cardExpiryDate}
                  onChange={(e) => setCardExpiryDate(e.target.value)}
                  maxLength={5}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-base-200 p-5">
          <button className="btn btn-ghost" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className={clsx('btn btn-primary', submitting && 'loading')}
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
