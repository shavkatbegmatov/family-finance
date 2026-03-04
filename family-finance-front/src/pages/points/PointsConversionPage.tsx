import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Calculator, TrendingDown } from 'lucide-react';
import {
  pointConversionApi, pointParticipantApi, pointConfigApi, pointBalanceApi,
} from '../../api/points.api';
import type {
  PointConversion, PointParticipant, PointConfig, PointBalance,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { formatDate } from '../../config/constants';

export function PointsConversionPage() {
  const { canConvertPoints, canViewPoints } = usePermission();

  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [config, setConfig] = useState<PointConfig | null>(null);
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [conversions, setConversions] = useState<PointConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  // Form
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [pointsInput, setPointsInput] = useState<number>(0);
  const [calculatedMoney, setCalculatedMoney] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const [partRes, configRes] = await Promise.all([
        pointParticipantApi.getAll(),
        pointConfigApi.get(),
      ]);
      const parts: PointParticipant[] = partRes.data?.data ?? partRes.data ?? [];
      setParticipants(parts.filter((p) => p.isActive));
      setConfig(configRes.data?.data ?? configRes.data ?? null);

      if (parts.length > 0) {
        setSelectedParticipantId(parts[0].id);
      }
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    if (!selectedParticipantId) return;
    try {
      const res = await pointBalanceApi.get(selectedParticipantId);
      setBalance(res.data?.data ?? res.data ?? null);
    } catch {
      setBalance(null);
    }
  }, [selectedParticipantId]);

  const loadConversions = useCallback(async () => {
    if (!selectedParticipantId) return;
    try {
      const res = await pointConversionApi.getByParticipant(selectedParticipantId, page, 10);
      const data = res.data?.data ?? res.data;
      if (data?.content) {
        setConversions(data.content);
        setTotalPages(data.totalPages ?? 0);
      } else if (Array.isArray(data)) {
        setConversions(data);
      }
    } catch { /* ignore */ }
  }, [selectedParticipantId, page]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadBalance();
    loadConversions();
  }, [loadBalance, loadConversions]);

  const handleCalculate = async () => {
    if (pointsInput <= 0) return;
    try {
      const res = await pointConversionApi.calculate(pointsInput);
      setCalculatedMoney(res.data?.data ?? res.data ?? null);
    } catch {
      toast.error("Hisoblashda xatolik");
    }
  };

  const handleConvert = async () => {
    if (!selectedParticipantId || pointsInput <= 0) {
      toast.error("Ishtirokchi va ball miqdorini kiriting");
      return;
    }
    try {
      setConverting(true);
      await pointConversionApi.convert({
        participantId: selectedParticipantId,
        points: pointsInput,
      });
      toast.success("Konversiya amalga oshirildi");
      setPointsInput(0);
      setCalculatedMoney(null);
      loadBalance();
      loadConversions();
    } catch {
      toast.error("Konversiyada xatolik");
    } finally {
      setConverting(false);
    }
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
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calculator */}
          <div className="card bg-base-100 shadow border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-base gap-2">
                <Calculator className="h-5 w-5" />
                Konversiya kalkulyatori
              </h2>

              {config && (
                <div className="text-sm text-base-content/60 mb-2">
                  Konversiya kursi: <strong>1 ball = {config.conversionRate} {config.currency}</strong>
                </div>
              )}

              {/* Inflation indicator */}
              {config?.inflationEnabled && (
                <div className="alert alert-warning py-2 text-sm">
                  <TrendingDown className="h-4 w-4" />
                  <span>Inflyatsiya yoqilgan: oylik {config.inflationRateMonthly}%</span>
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Ishtirokchi</span>
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

              {balance && (
                <div className="text-sm">
                  Mavjud balans: <strong className="text-primary">{balance.currentBalance.toLocaleString()}</strong> ball
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Ball miqdori</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={pointsInput || ''}
                  onChange={(e) => {
                    setPointsInput(Number(e.target.value));
                    setCalculatedMoney(null);
                  }}
                  placeholder="Ball kiriting"
                  min={1}
                  max={balance?.currentBalance ?? undefined}
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button className="btn btn-outline btn-sm flex-1" onClick={handleCalculate}>
                  Hisoblash
                </button>
                {canConvertPoints && (
                  <button
                    className="btn btn-primary btn-sm flex-1"
                    onClick={handleConvert}
                    disabled={converting || pointsInput <= 0}
                  >
                    {converting && <span className="loading loading-spinner loading-xs" />}
                    Aylantirish
                  </button>
                )}
              </div>

              {calculatedMoney !== null && (
                <div className="bg-success/10 rounded-lg p-4 text-center mt-2">
                  <p className="text-sm text-base-content/60">Natija</p>
                  <p className="text-2xl font-bold text-success">
                    {calculatedMoney.toLocaleString()} {config?.currency ?? 'UZS'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Conversion history */}
          <div className="card bg-base-100 shadow border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-base">Konversiya tarixi</h2>

              {conversions.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  Konversiyalar topilmadi
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th>Sana</th>
                        <th>Ball</th>
                        <th>Pul</th>
                        <th>Kurs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversions.map((c) => (
                        <tr key={c.id}>
                          <td className="whitespace-nowrap">{formatDate(c.conversionDate)}</td>
                          <td className="font-medium">{c.pointsConverted.toLocaleString()}</td>
                          <td className="text-success font-medium">
                            {c.moneyAmount.toLocaleString()} {c.currency}
                          </td>
                          <td className="text-xs text-base-content/60">{c.conversionRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-2">
                  <div className="join">
                    <button
                      className="join-item btn btn-xs"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      &laquo;
                    </button>
                    <button className="join-item btn btn-xs">
                      {page + 1} / {totalPages}
                    </button>
                    <button
                      className="join-item btn btn-xs"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                    >
                      &raquo;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
