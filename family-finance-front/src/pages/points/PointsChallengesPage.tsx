import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Swords, Plus, Trophy, Users, Calendar, X, UserPlus,
} from 'lucide-react';
import clsx from 'clsx';
import { pointChallengeApi, pointParticipantApi } from '../../api/points.api';
import type {
  PointChallenge, PointChallengeRequest, PointParticipant, ChallengeParticipantEntry,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { ModalPortal } from '../../components/common/Modal';
import { formatDate } from '../../config/constants';

interface ChallengeFormState {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  rewardPoints: number;
  taskCategory: string;
}

const emptyForm: ChallengeFormState = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  rewardPoints: 100,
  taskCategory: '',
};

export function PointsChallengesPage() {
  const { canViewPoints, canManagePointChallenges } = usePermission();

  const [challenges, setChallenges] = useState<PointChallenge[]>([]);
  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<ChallengeFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Join modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinChallengeId, setJoinChallengeId] = useState<number | null>(null);
  const [joinParticipantId, setJoinParticipantId] = useState<string>('');

  // Results
  const [results, setResults] = useState<ChallengeParticipantEntry[]>([]);
  const [showResults, setShowResults] = useState(false);

  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pointChallengeApi.getAll();
      setChallenges(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error("Musobaqalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadParticipants = useCallback(async () => {
    try {
      const res = await pointParticipantApi.getAll();
      const parts: PointParticipant[] = res.data?.data ?? res.data ?? [];
      setParticipants(parts.filter((p) => p.isActive));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadChallenges();
    loadParticipants();
  }, [loadChallenges, loadParticipants]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      toast.error("Majburiy maydonlarni to'ldiring");
      return;
    }
    try {
      setSubmitting(true);
      const req: PointChallengeRequest = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        rewardPoints: form.rewardPoints,
        taskCategory: form.taskCategory || undefined,
      };
      await pointChallengeApi.create(req);
      toast.success("Musobaqa yaratildi");
      setShowCreateModal(false);
      setForm(emptyForm);
      loadChallenges();
    } catch {
      toast.error("Yaratishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!joinChallengeId || !joinParticipantId) {
      toast.error("Ishtirokchini tanlang");
      return;
    }
    try {
      await pointChallengeApi.join(joinChallengeId, Number(joinParticipantId));
      toast.success("Musobaqaga qo'shildi");
      setShowJoinModal(false);
      setJoinParticipantId('');
      loadChallenges();
    } catch {
      toast.error("Qo'shilishda xatolik");
    }
  };

  const handleComplete = async (id: number) => {
    if (!confirm("Musobaqani yakunlashni tasdiqlaysizmi?")) return;
    try {
      await pointChallengeApi.complete(id);
      toast.success("Musobaqa yakunlandi");
      loadChallenges();
    } catch {
      toast.error("Yakunlashda xatolik");
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Musobaqani bekor qilishni tasdiqlaysizmi?")) return;
    try {
      await pointChallengeApi.cancel(id);
      toast.success("Musobaqa bekor qilindi");
      loadChallenges();
    } catch {
      toast.error("Bekor qilishda xatolik");
    }
  };

  const viewResults = async (id: number) => {
    try {
      const res = await pointChallengeApi.getResults(id);
      const data = res.data?.data ?? res.data;
      setResults(data?.participants ?? data ?? []);
      setShowResults(true);
    } catch {
      toast.error("Natijalarni yuklashda xatolik");
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Kutilmoqda', color: 'badge-ghost' },
      ACTIVE: { label: 'Faol', color: 'badge-success' },
      COMPLETED: { label: 'Yakunlangan', color: 'badge-info' },
      CANCELLED: { label: 'Bekor qilingan', color: 'badge-error' },
    };
    return map[status] ?? { label: status, color: 'badge-ghost' };
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6" />
            Musobaqalar
          </h1>
          <p className="text-base-content/60 mt-1">Ishtirokchilar orasidagi musobaqalar</p>
        </div>
        {canManagePointChallenges && (
          <button className="btn btn-primary btn-sm gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Musobaqa yaratish
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 text-base-content/50">
          Musobaqalar topilmadi
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {challenges.map((challenge) => {
            const status = getStatusBadge(challenge.status);
            return (
              <div
                key={challenge.id}
                className="card bg-base-100 shadow border border-base-200"
              >
                <div className="card-body p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{challenge.title}</h3>
                      {challenge.description && (
                        <p className="text-sm text-base-content/60 mt-1">
                          {challenge.description}
                        </p>
                      )}
                    </div>
                    <span className={clsx('badge badge-sm', status.color)}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-3 text-sm text-base-content/70">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-warning" />
                      {challenge.rewardPoints} ball
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {challenge.participants?.length ?? 0} ishtirokchi
                    </span>
                  </div>

                  {/* Participants list */}
                  {challenge.participants && challenge.participants.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1">
                        {challenge.participants.map((cp) => (
                          <span
                            key={cp.participantId}
                            className="badge badge-outline badge-sm gap-1"
                          >
                            {cp.participantName}
                            {cp.score > 0 && (
                              <span className="text-primary font-medium">{cp.score}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="card-actions justify-end mt-3">
                    <button
                      className="btn btn-ghost btn-xs gap-1"
                      onClick={() => viewResults(challenge.id)}
                    >
                      <Trophy className="h-3 w-3" />
                      Natijalar
                    </button>
                    {challenge.status === 'ACTIVE' && (
                      <button
                        className="btn btn-ghost btn-xs gap-1"
                        onClick={() => {
                          setJoinChallengeId(challenge.id);
                          setJoinParticipantId('');
                          setShowJoinModal(true);
                        }}
                      >
                        <UserPlus className="h-3 w-3" />
                        Qo'shilish
                      </button>
                    )}
                    {canManagePointChallenges && challenge.status === 'ACTIVE' && (
                      <>
                        <button
                          className="btn btn-success btn-xs"
                          onClick={() => handleComplete(challenge.id)}
                        >
                          Yakunlash
                        </button>
                        <button
                          className="btn btn-error btn-xs"
                          onClick={() => handleCancel(challenge.id)}
                        >
                          Bekor qilish
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <ModalPortal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Yangi musobaqa</h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowCreateModal(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Sarlavha *</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Tavsif</span></label>
              <textarea
                className="textarea textarea-bordered"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Boshlanish *</span></label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Tugash *</span></label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Mukofot bali</span></label>
              <input
                type="number"
                className="input input-bordered"
                value={form.rewardPoints}
                onChange={(e) => setForm({ ...form, rewardPoints: Number(e.target.value) })}
                min={1}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Vazifa kategoriyasi (ixtiyoriy)</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={form.taskCategory}
                onChange={(e) => setForm({ ...form, taskCategory: e.target.value })}
                placeholder="Masalan: HOMEWORK"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting && <span className="loading loading-spinner loading-xs" />}
              Yaratish
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Join Modal */}
      <ModalPortal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Musobaqaga qo'shilish</h3>
          <div className="form-control">
            <label className="label"><span className="label-text">Ishtirokchini tanlang</span></label>
            <select
              className="select select-bordered"
              value={joinParticipantId}
              onChange={(e) => setJoinParticipantId(e.target.value)}
            >
              <option value="">Tanlang...</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowJoinModal(false)}>
              Bekor qilish
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleJoin}>
              Qo'shilish
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Results Modal */}
      <ModalPortal isOpen={showResults} onClose={() => setShowResults(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Musobaqa natijalari</h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowResults(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          {results.length === 0 ? (
            <p className="text-center py-8 text-base-content/50">Natijalar topilmadi</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ishtirokchi</th>
                    <th>Ball</th>
                  </tr>
                </thead>
                <tbody>
                  {results
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .map((r, idx) => (
                      <tr key={r.participantId} className={clsx(idx < 3 && 'font-semibold')}>
                        <td>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td>{r.participantName}</td>
                        <td className="text-primary font-bold">{r.score}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModalPortal>
    </div>
  );
}
