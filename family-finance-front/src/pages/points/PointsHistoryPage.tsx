import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';
import { pointBalanceApi, pointParticipantApi } from '../../api/points.api';
import type { PointTransaction, PointParticipant } from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { formatDate } from '../../config/constants';

export function PointsHistoryPage() {
  const { canViewPoints } = usePermission();

  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

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

  const loadTransactions = useCallback(async () => {
    if (!selectedParticipantId) return;
    try {
      setLoading(true);
      const res = await pointBalanceApi.getTransactions(selectedParticipantId, page, 20);
      const data = res.data?.data ?? res.data;
      if (data?.content) {
        setTransactions(data.content);
        setTotalPages(data.totalPages ?? 0);
      } else if (Array.isArray(data)) {
        setTransactions(data);
      }
    } catch {
      toast.error("Tranzaksiyalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [selectedParticipantId, page]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const getAmountColor = (amount: number) =>
    amount >= 0 ? 'text-success' : 'text-error';

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      EARNED: 'Topilgan',
      SPENT: 'Sarflangan',
      PENALTY: 'Jarima',
      AWARD: 'Mukofot',
      DEDUCT: 'Ayirma',
      CONVERSION: 'Konversiya',
      SAVINGS_DEPOSIT: 'Jamg\'arma',
      SAVINGS_WITHDRAW: 'Olish',
      INVESTMENT: 'Investitsiya',
      INVESTMENT_RETURN: 'Foyda',
      PURCHASE: 'Xarid',
    };
    return labels[type] ?? type;
  };

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
          <History className="h-6 w-6" />
          Tranzaksiyalar tarixi
        </h1>
        <p className="text-base-content/60 mt-1">Ball tranzaksiyalari tarixi</p>
      </div>

      {/* Participant selector */}
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">Ishtirokchini tanlang</span>
        </label>
        <select
          className="select select-bordered"
          value={selectedParticipantId ?? ''}
          onChange={(e) => {
            setSelectedParticipantId(Number(e.target.value));
            setPage(0);
          }}
        >
          <option value="" disabled>Tanlang...</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>{p.displayName}</option>
          ))}
        </select>
      </div>

      {/* Transactions table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : !selectedParticipantId ? (
        <div className="text-center py-16 text-base-content/50">
          Ishtirokchini tanlang
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-base-content/50">
          Tranzaksiyalar topilmadi
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Turi</th>
                  <th>Miqdor</th>
                  <th>Balans</th>
                  <th>Tavsif</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="text-sm whitespace-nowrap">
                      {formatDate(tx.transactionDate)}
                    </td>
                    <td>
                      <span className="badge badge-ghost badge-sm">
                        {getTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('font-semibold flex items-center gap-1', getAmountColor(tx.amount))}>
                        {tx.amount > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-sm">
                      <span className="text-base-content/60">
                        {tx.balanceBefore.toLocaleString()}
                      </span>
                      {' -> '}
                      <span className="font-medium">
                        {tx.balanceAfter.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-sm text-base-content/70 max-w-[200px] truncate">
                      {tx.description || tx.taskTitle || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <div className="join">
                <button
                  className="join-item btn btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  &laquo;
                </button>
                <button className="join-item btn btn-sm">
                  {page + 1} / {totalPages}
                </button>
                <button
                  className="join-item btn btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  &raquo;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
