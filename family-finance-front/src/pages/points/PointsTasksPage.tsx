import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, CheckCircle, XCircle, Send, X, ListTodo,
} from 'lucide-react';
import clsx from 'clsx';
import { pointTaskApi, pointParticipantApi } from '../../api/points.api';
import type {
  PointTask, PointTaskRequest, PointParticipant,
} from '../../types/points.types';
import { PointTaskCategories, PointTaskStatuses } from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { ModalPortal } from '../../components/common/Modal';
import {
  PointsActionBar,
  PointsEmptyState,
  PointsGamifiedBadge,
  PointsLoadingState,
  PointsPageShell,
  PointsPermissionState,
  PointsSectionCard,
  PointsTableShell,
} from '../../components/points/ui';

const STATUS_TABS = [
  { value: '', label: 'Hammasi' },
  { value: 'ASSIGNED', label: 'Tayinlangan' },
  { value: 'SUBMITTED', label: 'Topshirilgan' },
  { value: 'VERIFIED', label: 'Tasdiqlangan' },
];

interface TaskFormState {
  title: string;
  description: string;
  category: string;
  pointValue: number;
  penaltyValue: number;
  assignedToId: string;
  recurrence: string;
  deadline: string;
}

const emptyForm: TaskFormState = {
  title: '',
  description: '',
  category: 'HOMEWORK',
  pointValue: 10,
  penaltyValue: 0,
  assignedToId: '',
  recurrence: 'ONCE',
  deadline: '',
};

const mapStatusColorToVariant = (
  color: string,
): 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral' => {
  if (color.includes('success')) return 'success';
  if (color.includes('warning')) return 'warning';
  if (color.includes('error')) return 'error';
  if (color.includes('info')) return 'info';
  if (color.includes('accent')) return 'accent';
  return 'neutral';
};

export function PointsTasksPage() {
  const {
    canViewPoints, canManagePoints, canAssignPointTasks, canVerifyPointTasks,
  } = usePermission();

  const [tasks, setTasks] = useState<PointTask[]>([]);
  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PointTask | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTaskId, setRejectTaskId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pointTaskApi.getAll(page, 20, statusFilter || undefined);
      const data = res.data?.data ?? res.data;
      if (data?.content) {
        setTasks(data.content);
        setTotalPages(data.totalPages ?? 0);
      } else if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch {
      toast.error("Vazifalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const loadParticipants = useCallback(async () => {
    try {
      const res = await pointParticipantApi.getAll();
      setParticipants(res.data?.data ?? res.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const getCategoryLabel = (val: string) =>
    PointTaskCategories.find((c) => c.value === val)?.label ?? val;

  const getStatusInfo = (val: string) =>
    PointTaskStatuses.find((s) => s.value === val) ?? { label: val, color: 'badge-ghost' };

  const openCreateModal = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (task: PointTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? '',
      category: task.category,
      pointValue: task.pointValue,
      penaltyValue: task.penaltyValue,
      assignedToId: task.assignedToId?.toString() ?? '',
      recurrence: task.recurrence,
      deadline: task.deadline ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Sarlavha majburiy");
      return;
    }
    try {
      setSubmitting(true);
      const req: PointTaskRequest = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        pointValue: form.pointValue,
        penaltyValue: form.penaltyValue || undefined,
        assignedToId: form.assignedToId ? Number(form.assignedToId) : undefined,
        recurrence: form.recurrence || undefined,
        deadline: form.deadline || undefined,
      };
      if (editingTask) {
        await pointTaskApi.update(editingTask.id, req);
        toast.success("Vazifa yangilandi");
      } else {
        await pointTaskApi.create(req);
        toast.success("Vazifa yaratildi");
      }
      setShowModal(false);
      loadTasks();
    } catch {
      toast.error("Saqlashda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: 'submit' | 'verify' | 'delete', taskId: number) => {
    try {
      if (action === 'submit') {
        await pointTaskApi.submit(taskId);
        toast.success("Vazifa topshirildi");
      } else if (action === 'verify') {
        await pointTaskApi.verify(taskId);
        toast.success("Vazifa tasdiqlandi");
      } else if (action === 'delete') {
        if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
        await pointTaskApi.delete(taskId);
        toast.success("Vazifa o'chirildi");
      }
      loadTasks();
    } catch {
      toast.error("Amal bajarishda xatolik");
    }
  };

  const handleReject = async () => {
    if (!rejectTaskId) return;
    try {
      await pointTaskApi.reject(rejectTaskId, { rejectionReason: rejectReason || undefined });
      toast.success("Vazifa rad etildi");
      setShowRejectModal(false);
      setRejectReason('');
      loadTasks();
    } catch {
      toast.error("Rad etishda xatolik");
    }
  };

  if (!canViewPoints) {
    return <PointsPermissionState />;
  }

  return (
    <PointsPageShell
      title="Vazifalar"
      description="Ball to'plash jarayonidagi topshiriqlarni yarating, kuzating va tasdiqlang."
      icon={ListTodo}
      actions={(canManagePoints || canAssignPointTasks) ? (
        <button className="btn btn-primary btn-sm gap-2" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Yaratish
        </button>
      ) : undefined}
    >
      <PointsActionBar>
        <div className="tabs tabs-boxed w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={clsx('tab tab-sm', statusFilter === tab.value && 'tab-active')}
              onClick={() => { setStatusFilter(tab.value); setPage(0); }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <PointsGamifiedBadge
          variant={tasks.length > 0 ? 'primary' : 'neutral'}
          label={`${tasks.length} ta`}
        />
      </PointsActionBar>

      {loading ? (
        <PointsLoadingState />
      ) : (
        <PointsSectionCard title="Vazifalar ro'yxati" subtitle="Barcha topshiriqlar va holatlar">
          {tasks.length === 0 ? (
            <PointsEmptyState
              title="Vazifalar topilmadi"
              description="Yangi topshiriq yaratib jarayonni boshlang."
            />
          ) : (
            <>
              <PointsTableShell>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Sarlavha</th>
                      <th>Kategoriya</th>
                      <th>Ball</th>
                      <th>Holat</th>
                      <th>Tayinlangan</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const status = getStatusInfo(task.status);
                      return (
                        <tr key={task.id}>
                          <td>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-base-content/50 truncate max-w-[200px]">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td>
                            <PointsGamifiedBadge variant="outline" label={getCategoryLabel(task.category)} />
                          </td>
                          <td>
                            <span className="font-semibold text-primary">
                              {task.effectivePoints}
                            </span>
                            {task.multiplier > 1 && (
                              <span className="text-xs text-warning ml-1">x{task.multiplier}</span>
                            )}
                          </td>
                          <td>
                            <PointsGamifiedBadge
                              variant={mapStatusColorToVariant(status.color)}
                              label={status.label}
                            />
                          </td>
                          <td>{task.assignedToName ?? '-'}</td>
                          <td>
                            <div className="flex gap-1">
                              {task.status === 'ASSIGNED' && (
                                <button
                                  className="btn btn-ghost btn-xs text-info tooltip"
                                  data-tip="Topshirish"
                                  onClick={() => handleAction('submit', task.id)}
                                >
                                  <Send className="h-3 w-3" />
                                </button>
                              )}
                              {task.status === 'SUBMITTED' && canVerifyPointTasks && (
                                <>
                                  <button
                                    className="btn btn-ghost btn-xs text-success tooltip"
                                    data-tip="Tasdiqlash"
                                    onClick={() => handleAction('verify', task.id)}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-xs text-error tooltip"
                                    data-tip="Rad etish"
                                    onClick={() => {
                                      setRejectTaskId(task.id);
                                      setShowRejectModal(true);
                                    }}
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                              {canManagePoints && (
                                <>
                                  <button
                                    className="btn btn-ghost btn-xs tooltip"
                                    data-tip="Tahrirlash"
                                    onClick={() => openEditModal(task)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-xs text-error tooltip"
                                    data-tip="O'chirish"
                                    onClick={() => handleAction('delete', task.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
          )}
        </PointsSectionCard>
      )}

      {/* Create/Edit Task Modal */}
      <ModalPortal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingTask ? "Vazifani tahrirlash" : "Yangi vazifa"}
            </h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowModal(false)}>
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
                <label className="label"><span className="label-text">Kategoriya</span></label>
                <select
                  className="select select-bordered"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {PointTaskCategories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Ball qiymati</span></label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.pointValue}
                  onChange={(e) => setForm({ ...form, pointValue: Number(e.target.value) })}
                  min={0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Jarima balli</span></label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.penaltyValue}
                  onChange={(e) => setForm({ ...form, penaltyValue: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Tayinlash</span></label>
                <select
                  className="select select-bordered"
                  value={form.assignedToId}
                  onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                >
                  <option value="">Tanlanmagan</option>
                  {participants.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Takrorlanish</span></label>
                <select
                  className="select select-bordered"
                  value={form.recurrence}
                  onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                >
                  <option value="ONCE">Bir martalik</option>
                  <option value="DAILY">Kunlik</option>
                  <option value="WEEKLY">Haftalik</option>
                  <option value="MONTHLY">Oylik</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Muddat</span></label>
                <input
                  type="datetime-local"
                  className="input input-bordered"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <span className="loading loading-spinner loading-xs" />}
              {editingTask ? 'Yangilash' : 'Yaratish'}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Reject Modal */}
      <ModalPortal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Vazifani rad etish</h3>
          <div className="form-control">
            <label className="label"><span className="label-text">Sabab</span></label>
            <textarea
              className="textarea textarea-bordered"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Rad etish sababini kiriting..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowRejectModal(false)}>
              Bekor qilish
            </button>
            <button className="btn btn-error btn-sm" onClick={handleReject}>
              Rad etish
            </button>
          </div>
        </div>
      </ModalPortal>
    </PointsPageShell>
  );
}
