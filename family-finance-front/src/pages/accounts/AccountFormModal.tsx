import { useEffect, useState } from 'react';
import { X, Eye } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { accountsApi } from '../../api/accounts.api';
import type { Account, AccountRequest, AccountType, AccountScope } from '../../types';
import { ACCOUNT_TYPES, ACCOUNT_ICONS } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { CreditCardInput } from '../../components/ui/CreditCardInput';
import { useQuery } from '@tanstack/react-query';
import { banksApi } from '../../api/banks.api';

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
  const [scope, setScope] = useState<AccountScope>('PERSONAL');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [description, setDescription] = useState('');

  // Bank info
  const [bankId, setBankId] = useState<number | undefined>();
  const [bankName, setBankName] = useState('');
  const [bankMfo, setBankMfo] = useState('');
  const [bankInn, setBankInn] = useState('');

  // Fetch active banks for dropdown
  const { data: banksResponse } = useQuery({
    queryKey: ['active-banks'],
    queryFn: banksApi.getActive
  });
  const activeBanks = banksResponse?.data || [];

  const bankOptions = activeBanks.map(b => ({
    value: b.id.toString(),
    label: b.name
  }));

  // Card info
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardExpiryDate, setCardExpiryDate] = useState('');
  const [cardType, setCardType] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    name: string; type: AccountType; currency: string; balance: number;
    scope: AccountScope; color: string; description: string;
    bankName: string; cardNumber: string; cardHolderName: string; cardExpiryDate: string;
  } | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) {
      setShowPreview(false);
      setPreviewData(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingAccount) {
        setName(editingAccount.name);
        setType(editingAccount.type);
        setCurrency(editingAccount.currency || 'UZS');
        setBalance(editingAccount.balance);
        setOpeningBalance(editingAccount.openingBalance ?? editingAccount.balance);
        setColor(editingAccount.color || DEFAULT_COLORS[0]);
        setScope(editingAccount.scope || 'PERSONAL');
        setDescription(editingAccount.description || '');
        setBankId(editingAccount.bankId || undefined);
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
        setScope('PERSONAL');
        setDescription('');
        setBankId(undefined);
        setBankName('');
        setBankMfo('');
        setBankInn('');
        setCardNumber('');
        setCardHolderName('');
        setCardExpiryDate('');
        setCardType('');
        setIsVirtual(false);
      }
    }
  }, [isOpen, editingAccount]);

  // CreditCardInput now handles all card specific validations internally
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
        scope,
        currency,
        balance: isEdit ? undefined : balance,
        color,
        description: description || undefined,
        openingBalance: isEdit ? undefined : openingBalance,
        bankId: showBankFields && bankId ? bankId : undefined,
        bankName: showBankFields && bankName ? bankName : undefined,
        bankMfo: showBankFields && bankMfo ? bankMfo : undefined,
        bankInn: showBankFields && bankInn ? bankInn : undefined,
        cardNumber: showCardFields && cardNumber ? cardNumber : undefined,
        cardHolderName: showCardFields && cardHolderName ? cardHolderName : undefined,
        cardExpiryDate: showCardFields && cardExpiryDate ? cardExpiryDate : undefined,
        cardType: showCardFields && cardType ? cardType : undefined,
        isVirtual: showCardFields ? isVirtual : undefined,
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

  const handleApply = () => {
    setPreviewData({ name, type, currency, balance, scope, color, description, bankName, cardNumber, cardHolderName, cardExpiryDate });
    setShowPreview(true);
  };

  const iconName = ACCOUNT_ICONS[type] || 'Wallet';

  // Format balance for preview
  const formatBalance = (val: number, cur: string) =>
    new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: cur, minimumFractionDigits: 0 }).format(val);

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className={clsx(
        'surface-card w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300',
        showPreview ? 'max-w-4xl' : 'max-w-lg'
      )}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-base-200 p-5">
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

        {/* Body — split layout */}
        <div className="flex min-h-0 flex-1">
          {/* Left: form */}
          <div className={clsx(
            'overflow-y-auto',
            showPreview ? 'w-1/2 border-r border-base-200' : 'w-full'
          )}>
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
            onChange={isEdit ? () => { } : (v) => { setBalance(v); setOpeningBalance(v); }}
            disabled={isEdit}
          />

          {/* Scope */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Ko'rinish doirasi
              </span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  className="radio radio-sm radio-primary"
                  checked={scope === 'PERSONAL'}
                  onChange={() => setScope('PERSONAL')}
                />
                <div>
                  <span className="text-sm font-medium">Shaxsiy</span>
                  <p className="text-xs text-base-content/50">Faqat ruxsat berilganlar ko'radi</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  className="radio radio-sm radio-primary"
                  checked={scope === 'FAMILY'}
                  onChange={() => setScope('FAMILY')}
                />
                <div>
                  <span className="text-sm font-medium">Oilaviy</span>
                  <p className="text-xs text-base-content/50">Barcha oila a'zolari ko'radi</p>
                </div>
              </label>
            </div>
          </div>

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

          {/* Bank fields (For Non-Card accounts) */}
          {showBankFields && !showCardFields && (
            <div className="border-t border-base-200 pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Bank ma'lumotlari
              </p>
              <Select
                label=""
                placeholder="Bankni tanlash"
                value={bankId?.toString() || ''}
                onChange={(val) => {
                  setBankId(val ? Number(val) : undefined);
                  const sel = activeBanks.find(b => b.id.toString() === val);
                  if (sel) {
                    setBankName(sel.name);
                    setBankMfo(sel.mfo || '');
                  }
                }}
                options={bankOptions}
              />
              <div className="grid grid-cols-2 gap-3 mt-3">
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

          {/* Card & Bank Select fields for Cards */}
          {showCardFields && !isEdit && (
            <div className="border-t border-base-200 pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Bank & Karta
              </p>
              <Select
                label=""
                placeholder="Bankni avtomatik aniqlash yoki tanlash"
                value={bankId?.toString() || ''}
                onChange={(val) => {
                  setBankId(val ? Number(val) : undefined);
                  const sel = activeBanks.find(b => b.id.toString() === val);
                  if (sel) {
                    setBankName(sel.name);
                    setBankMfo(sel.mfo || '');
                  }
                }}
                options={bankOptions}
              />

              <div className="pt-2">
                <CreditCardInput
                  cardNumber={cardNumber}
                  cardHolderName={cardHolderName}
                  cardExpiryDate={cardExpiryDate}
                  cardType={cardType}
                  isVirtual={isVirtual}
                  onCardNumberChange={(num, type, detectedBank) => {
                    setCardNumber(num);
                    if (type) setCardType(type);
                    if (detectedBank) {
                      setBankId(detectedBank.id);
                      setBankName(detectedBank.name);
                      setBankMfo(detectedBank.mfo || '');
                    }
                  }}
                  onCardHolderNameChange={setCardHolderName}
                  onCardExpiryDateChange={setCardExpiryDate}
                  onIsVirtualChange={setIsVirtual}
                />
              </div>
            </div>
          )}
        </div>
          </div>{/* end left form panel */}

          {/* Right: preview panel */}
          {showPreview && previewData && (
            <div className="w-1/2 overflow-y-auto bg-base-200/30 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Ko'rinish
                </span>
                <button
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {isEdit && editingAccount ? (
                /* Edit mode: two-column diff */
                <div className="rounded-2xl border border-base-200 bg-base-100 shadow-sm overflow-hidden">
                  {/* Column headers */}
                  <div className="grid grid-cols-2 border-b border-base-200">
                    <div className="px-4 py-2 bg-error/10 text-center">
                      <span className="text-xs font-semibold text-error/80 uppercase tracking-wide">Eski</span>
                    </div>
                    <div className="px-4 py-2 bg-success/10 text-center border-l border-base-200">
                      <span className="text-xs font-semibold text-success/80 uppercase tracking-wide">Yangi</span>
                    </div>
                  </div>

                  {/* Rows */}
                  {[
                    {
                      label: 'Nom',
                      old: editingAccount.name,
                      new: previewData.name,
                    },
                    {
                      label: 'Doira',
                      old: editingAccount.scope === 'FAMILY' ? 'Oilaviy' : 'Shaxsiy',
                      new: previewData.scope === 'FAMILY' ? 'Oilaviy' : 'Shaxsiy',
                    },
                    {
                      label: 'Rang',
                      old: editingAccount.color || DEFAULT_COLORS[0],
                      new: previewData.color,
                      isColor: true,
                    },
                    {
                      label: 'Izoh',
                      old: editingAccount.description || '—',
                      new: previewData.description || '—',
                    },
                    ...(editingAccount.bankName || previewData.bankName ? [{
                      label: 'Bank',
                      old: editingAccount.bankName || '—',
                      new: previewData.bankName || '—',
                    }] : []),
                  ].map(({ label, old: oldVal, new: newVal, isColor }) => {
                    const changed = oldVal !== newVal;
                    return (
                      <div
                        key={label}
                        className={clsx(
                          'grid grid-cols-2 border-b border-base-200 last:border-0 text-sm',
                          changed && 'bg-warning/5'
                        )}
                      >
                        <div className={clsx(
                          'px-3 py-2.5 flex items-center gap-2',
                          changed && 'bg-error/5'
                        )}>
                          {isColor ? (
                            <span
                              className="h-4 w-4 rounded-full flex-shrink-0 border border-base-300"
                              style={{ backgroundColor: oldVal as string }}
                            />
                          ) : null}
                          <span className={clsx(
                            'truncate',
                            changed ? 'line-through text-base-content/40' : 'text-base-content'
                          )}>
                            {label}: {isColor ? '' : oldVal}
                          </span>
                        </div>
                        <div className={clsx(
                          'px-3 py-2.5 flex items-center gap-2 border-l border-base-200',
                          changed && 'bg-success/5'
                        )}>
                          {isColor ? (
                            <span
                              className="h-4 w-4 rounded-full flex-shrink-0 border border-base-300"
                              style={{ backgroundColor: newVal as string }}
                            />
                          ) : null}
                          <span className={clsx(
                            'truncate',
                            changed ? 'font-medium text-success' : 'text-base-content'
                          )}>
                            {label}: {isColor ? '' : newVal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Create mode: simple preview card */
                <div className="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                      style={{ backgroundColor: previewData.color }}
                    >
                      {previewData.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-base">{previewData.name}</p>
                      <p className="text-xs text-base-content/50">
                        {ACCOUNT_TYPES[previewData.type]?.label || previewData.type}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-base-200/60 px-4 py-3">
                    <p className="text-xs text-base-content/50 mb-0.5">Balans</p>
                    <p className="text-xl font-bold">
                      {formatBalance(previewData.balance, previewData.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'badge badge-sm',
                      previewData.scope === 'FAMILY' ? 'badge-primary' : 'badge-ghost'
                    )}>
                      {previewData.scope === 'FAMILY' ? 'Oilaviy' : 'Shaxsiy'}
                    </span>
                    <span className="badge badge-ghost badge-sm">{previewData.currency}</span>
                  </div>
                  {previewData.description && (
                    <p className="text-sm text-base-content/70 border-t border-base-200 pt-3">
                      {previewData.description}
                    </p>
                  )}
                  {previewData.bankName && (
                    <div className="text-sm border-t border-base-200 pt-3">
                      <span className="text-base-content/50">Bank: </span>
                      <span className="font-medium">{previewData.bankName}</span>
                    </div>
                  )}
                  {previewData.cardNumber && (
                    <div className="text-sm">
                      <span className="text-base-content/50">Karta: </span>
                      <span className="font-mono font-medium">
                        **** {previewData.cardNumber.replace(/\s/g, '').slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-base-content/40 text-center">
                Bu faqat ko'rinish — hali saqlanmagan
              </p>
            </div>
          )}
        </div>{/* end flex body */}

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-base-200 p-5">
          <button className="btn btn-ghost" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className="btn btn-outline btn-secondary hidden sm:inline-flex"
            onClick={handleApply}
            disabled={!name.trim()}
          >
            <Eye className="h-4 w-4" />
            Apply
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
