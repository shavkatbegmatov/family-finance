import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  PiggyBank, ArrowDownCircle, ArrowUpCircle, TrendingUp, X, DollarSign,
} from 'lucide-react';
import clsx from 'clsx';
import {
  pointSavingsApi, pointInvestmentApi, pointParticipantApi, pointBalanceApi,
} from '../../api/points.api';
import { PointInvestmentTypes } from '../../types/points.types';
import type {
  PointSavingsAccount, PointInvestment, PointInvestmentRequest,
  PointParticipant, PointBalance,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { ModalPortal } from '../../components/common/Modal';
import { formatDate } from '../../config/constants';

export function PointsSavingsPage() {
  const { canViewPoints } = usePermission();

  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [savings, setSavings] = useState<PointSavingsAccount | null>(null);
  const [investments, setInvestments] = useState<PointInvestment[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit/Withdraw
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositMode, setDepositMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Investment modal
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investForm, setInvestForm] = useState<PointInvestmentRequest>({
    type: 'STABLE',
    amount: 0,
  });

  const loadParticipants = useCallback(async () => {
    try {
      const res = await pointParticipantApi.getAll();
      const parts: PointParticipant[] = res.data?.data ?? res.data ?? [];
      setParticipants(parts.filter((p) => p.isActive));
      if (parts.length > 0 && !selectedParticipantId) {
        setSelectedParticipantId(parts[0].id);
      }
    } catch {
      toast.error("Ishtirokchilarni yuklashda xatolik");
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedParticipantId) return;
    try {
      setLoading(true);
      const [balRes, savRes, invRes] = await Promise.all([
        pointBalanceApi.get(selectedParticipantId).catch(() => null),
        pointSavingsApi.get(selectedParticipantId).catch(() => null),
        pointInvestmentApi.getByParticipant(selectedParticipantId).catch(() => null),
      ]);
      setBalance(balRes ? (balRes.data?.data ?? balRes.data) : null);
      setSavings(savRes ? (savRes.data?.data ?? savRes.data) : null);
      setInvestments(invRes ? (invRes.data?.data ?? invRes.data ?? []) : []);
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [selectedParticipantId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDepositWithdraw = async () => {
    if (!selectedParticipantId || amount <= 0) {
      toast.error("Miqdorni kiriting");
      return;
    }
    try {
      setSubmitting(true);
      if (depositMode === 'deposit') {
        await pointSavingsApi.deposit(selectedParticipantId, amount);
        toast.success("Mablag' kiritildi");
      } else {
        await pointSavingsApi.withdraw(selectedParticipantId, amount);
        toast.success("Mablag' yechildi");
      }
      setShowDepositModal(false);
      setAmount(0);
      loadData();
    } catch {
      toast.error("Amal bajarishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvestment = async () => {
    if (!selectedParticipantId || investForm.amount <= 0) {
      toast.error("Miqdorni kiriting");
      return;
    }
    try {
      setSubmitting(true);
      await pointInvestmentApi.create(selectedParticipantId, investForm);
      toast.success("Investitsiya yaratildi");
      setShowInvestModal(false);
      setInvestForm({ type: 'STABLE', amount: 0 });
      loadData();
    } catch {
      toast.error("Investitsiya yaratishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSellInvestment = async (id: number) => {
    if (!confirm("Investitsiyani sotishni tasdiqlaysizmi?")) return;
    try {
      await pointInvestmentApi.sell(id);
      toast.success("Investitsiya sotildi");
      loadData();
    } catch {
      toast.error("Sotishda xatolik");
    }
  };

  const getInvestmentTypeInfo = (type: string) =>
    PointInvestmentTypes.find((t) => t.value === type) ?? { label: type, description: '', color: '' };

  if (!canViewPoints) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-base-content/60">Sizda bu sahifani ko'rish huquqi yo'q.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PiggyBank className="h-6 w-6" />
          Jamg'arma va investitsiyalar
        </h1>
        <p className="text-base-content/60 mt-1">Ballni jamg'arish va investitsiya qilish</p>
      </div>

      {/* Participant selector */}
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">Ishtirokchini tanlang</span>
        </label>
        <select
          className="select select-bordered"
          value={selectedParticipantId ?? ''}
          onChange={(e) => setSelectedParticipantId(Number(e.target.value))}
        >
          <option value="" disabled>Tanlang...</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>{p.displayName}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : !selectedParticipantId ? (
        <div className="text-center py-16 text-base-content/50">
          Ishtirokchini tanlang
        </div>
      ) : (
        <div className="space-y-6">
          {/* Balance info */}
          {balance && (
            <div className="text-sm text-base-content/60">
              Mavjud balans: <strong className="text-primary">{balance.currentBalance.toLocaleString()}</strong> ball
            </div>
          )}

          {/* Savings card */}
          <div className="card bg-base-100 shadow border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-base gap-2">
                <PiggyBank className="h-5 w-5 text-success" />
                Jamg'arma hisobi
              </h2>

              {savings ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-base-200/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-base-content/60">Balans</p>
                      <p className="text-xl font-bold text-primary">
                        {savings.balance.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-base-200/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-base-content/60">Foiz stavkasi</p>
                      <p className="text-xl font-bold text-success">
                        {savings.interestRate}%
                      </p>
                    </div>
                    <div className="bg-base-200/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-base-content/60">Jami foiz</p>
                      <p className="text-xl font-bold text-warning">
                        {savings.totalInterestEarned.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-base-200/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-base-content/60">Oxirgi foiz</p>
                      <p className="text-sm font-medium">
                        {savings.lastInterestAppliedAt
                          ? formatDate(savings.lastInterestAppliedAt)
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="btn btn-success btn-sm gap-1"
                      onClick={() => {
                        setDepositMode('deposit');
                        setAmount(0);
                        setShowDepositModal(true);
                      }}
                    >
                      <ArrowDownCircle className="h-4 w-4" />
                      Kiritish
                    </button>
                    <button
                      className="btn btn-warning btn-sm gap-1"
                      onClick={() => {
                        setDepositMode('withdraw');
                        setAmount(0);
                        setShowDepositModal(true);
                      }}
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Yechish
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-base-content/50">Jamg'arma hisobi topilmadi</p>
              )}
            </div>
          </div>

          {/* Investments */}
          <div className="card bg-base-100 shadow border border-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title text-base gap-2">
                  <TrendingUp className="h-5 w-5 text-info" />
                  Investitsiyalar
                </h2>
                <button
                  className="btn btn-primary btn-sm gap-1"
                  onClick={() => {
                    setInvestForm({ type: 'STABLE', amount: 0 });
                    setShowInvestModal(true);
                  }}
                >
                  <DollarSign className="h-4 w-4" />
                  Investitsiya qilish
                </button>
              </div>

              {investments.length === 0 ? (
                <p className="text-center py-8 text-base-content/50">Investitsiyalar topilmadi</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Turi</th>
                        <th>Kiritilgan</th>
                        <th>Joriy qiymat</th>
                        <th>Foyda %</th>
                        <th>Sana</th>
                        <th>Amal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investments.map((inv) => {
                        const typeInfo = getInvestmentTypeInfo(inv.type);
                        return (
                          <tr key={inv.id}>
                            <td>
                              <span className={clsx('font-medium', typeInfo.color)}>
                                {typeInfo.label}
                              </span>
                              <p className="text-xs text-base-content/50">{typeInfo.description}</p>
                            </td>
                            <td>{inv.investedAmount.toLocaleString()}</td>
                            <td className="font-semibold">{inv.currentValue.toLocaleString()}</td>
                            <td>
                              <span className={clsx(
                                'font-medium',
                                inv.profitPercentage >= 0 ? 'text-success' : 'text-error'
                              )}>
                                {inv.profitPercentage >= 0 ? '+' : ''}{inv.profitPercentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-sm">{formatDate(inv.investedAt)}</td>
                            <td>
                              {inv.isActive && (
                                <button
                                  className="btn btn-warning btn-xs"
                                  onClick={() => handleSellInvestment(inv.id)}
                                >
                                  Sotish
                                </button>
                              )}
                              {!inv.isActive && (
                                <span className="badge badge-ghost badge-xs">Sotilgan</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deposit/Withdraw Modal */}
      <ModalPortal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {depositMode === 'deposit' ? "Mablag' kiritish" : "Mablag' yechish"}
            </h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowDepositModal(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Miqdor (ball)</span></label>
            <input
              type="number"
              className="input input-bordered"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              placeholder="Ball miqdorini kiriting"
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDepositModal(false)}>
              Bekor qilish
            </button>
            <button
              className={clsx('btn btn-sm', depositMode === 'deposit' ? 'btn-success' : 'btn-warning')}
              onClick={handleDepositWithdraw}
              disabled={submitting || amount <= 0}
            >
              {submitting && <span className="loading loading-spinner loading-xs" />}
              {depositMode === 'deposit' ? 'Kiritish' : 'Yechish'}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Investment Modal */}
      <ModalPortal isOpen={showInvestModal} onClose={() => setShowInvestModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Yangi investitsiya</h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowInvestModal(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Investitsiya turi</span></label>
              <select
                className="select select-bordered"
                value={investForm.type}
                onChange={(e) => setInvestForm({ ...investForm, type: e.target.value })}
              >
                {PointInvestmentTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} - {t.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Miqdor (ball)</span></label>
              <input
                type="number"
                className="input input-bordered"
                value={investForm.amount || ''}
                onChange={(e) => setInvestForm({ ...investForm, amount: Number(e.target.value) })}
                min={1}
                placeholder="Ball miqdorini kiriting"
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Muddat (ixtiyoriy)</span></label>
              <input
                type="date"
                className="input input-bordered"
                value={investForm.maturityDate ?? ''}
                onChange={(e) => setInvestForm({ ...investForm, maturityDate: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowInvestModal(false)}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreateInvestment}
              disabled={submitting || investForm.amount <= 0}
            >
              {submitting && <span className="loading loading-spinner loading-xs" />}
              Investitsiya qilish
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
