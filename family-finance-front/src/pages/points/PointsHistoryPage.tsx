import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpRight, ArrowDownRight, Clock3 } from 'lucide-react';
import clsx from 'clsx';
import { pointBalanceApi, pointParticipantApi } from '../../api/points.api';
import type { PointTransaction, PointParticipant } from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { formatDate } from '../../config/constants';
import { Select } from '../../components/ui/Select';
import {
  PointsActionBar,
  PointsEmptyState,
  PointsLoadingState,
  PointsPageShell,
  PointsPermissionState,
  PointsSectionCard,
  PointsTableShell,
} from '../../components/points/ui';

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
  }, [selectedParticipantId]);

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
    return <PointsPermissionState />;
  }

  return (
    <PointsPageShell
      title="Ball tarixi"
      description="Har bir ishtirokchi bo'yicha kirim-chiqim tranzaksiyalarini ko'ring."
      icon={Clock3}
    >
      <PointsActionBar>
        <Select
          className="w-full max-w-xs"
          label="Ishtirokchini tanlang"
          placeholder="Tanlang..."
          value={selectedParticipantId ?? undefined}
          onChange={(value) => {
            setSelectedParticipantId(value === undefined ? null : Number(value));
            setPage(0);
          }}
          options={participants.map((p) => ({ value: p.id, label: p.displayName }))}
        />
      </PointsActionBar>

      {loading ? (
        <PointsLoadingState />
      ) : !selectedParticipantId ? (
        <PointsEmptyState
          title="Ishtirokchini tanlang"
          description="Tarix ko'rinishi uchun ishtirokchini belgilang."
        />
      ) : transactions.length === 0 ? (
        <PointsEmptyState
          title="Tranzaksiyalar topilmadi"
          description="Tanlangan foydalanuvchi bo'yicha amallar hali yo'q."
        />
      ) : (
        <PointsSectionCard title="Tranzaksiyalar" subtitle="Kirim va chiqim operatsiyalari">
          <>
            <PointsTableShell>
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
            </PointsTableShell>

            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
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
        </PointsSectionCard>
      )}
    </PointsPageShell>
  );
}
