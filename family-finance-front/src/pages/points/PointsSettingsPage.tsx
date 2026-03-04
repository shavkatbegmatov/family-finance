import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Save, Zap, Plus, Trash2, X, Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { pointConfigApi, pointEventApi } from '../../api/points.api';
import type {
  PointConfig, PointConfigRequest, PointMultiplierEvent, PointMultiplierEventRequest,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { ModalPortal } from '../../components/common/Modal';
import { formatDate } from '../../config/constants';

interface ConfigFormState {
  conversionRate: number;
  currency: string;
  inflationEnabled: boolean;
  inflationRateMonthly: number;
  savingsInterestRate: number;
  streakBonusEnabled: boolean;
  streakBonusPercentage: number;
  maxDailyPoints: string;
  autoApproveBelow: string;
}

interface EventFormState {
  name: string;
  description: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  taskCategory: string;
}

const emptyEventForm: EventFormState = {
  name: '',
  description: '',
  multiplier: 2,
  startDate: '',
  endDate: '',
  taskCategory: '',
};

export function PointsSettingsPage() {
  const { canManagePoints, canManagePointEvents } = usePermission();

  const [, setConfig] = useState<PointConfig | null>(null);
  const [events, setEvents] = useState<PointMultiplierEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config form
  const [form, setForm] = useState<ConfigFormState>({
    conversionRate: 100,
    currency: 'UZS',
    inflationEnabled: false,
    inflationRateMonthly: 0,
    savingsInterestRate: 0,
    streakBonusEnabled: false,
    streakBonusPercentage: 0,
    maxDailyPoints: '',
    autoApproveBelow: '',
  });

  // Event modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, eventsRes] = await Promise.all([
        pointConfigApi.get().catch(() => null),
        pointEventApi.getAll().catch(() => null),
      ]);

      const cfg: PointConfig | null = configRes ? (configRes.data?.data ?? configRes.data) : null;
      setConfig(cfg);
      if (cfg) {
        setForm({
          conversionRate: cfg.conversionRate,
          currency: cfg.currency ?? 'UZS',
          inflationEnabled: cfg.inflationEnabled ?? false,
          inflationRateMonthly: cfg.inflationRateMonthly ?? 0,
          savingsInterestRate: cfg.savingsInterestRate ?? 0,
          streakBonusEnabled: cfg.streakBonusEnabled ?? false,
          streakBonusPercentage: cfg.streakBonusPercentage ?? 0,
          maxDailyPoints: cfg.maxDailyPoints?.toString() ?? '',
          autoApproveBelow: cfg.autoApproveBelow?.toString() ?? '',
        });
      }

      setEvents(eventsRes ? (eventsRes.data?.data ?? eventsRes.data ?? []) : []);
    } catch {
      toast.error("Sozlamalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async () => {
    if (form.conversionRate <= 0) {
      toast.error("Konversiya kursini kiriting");
      return;
    }
    try {
      setSaving(true);
      const req: PointConfigRequest = {
        conversionRate: form.conversionRate,
        currency: form.currency || undefined,
        inflationEnabled: form.inflationEnabled,
        inflationRateMonthly: form.inflationRateMonthly || undefined,
        savingsInterestRate: form.savingsInterestRate || undefined,
        streakBonusEnabled: form.streakBonusEnabled,
        streakBonusPercentage: form.streakBonusPercentage || undefined,
        maxDailyPoints: form.maxDailyPoints ? Number(form.maxDailyPoints) : undefined,
        autoApproveBelow: form.autoApproveBelow ? Number(form.autoApproveBelow) : undefined,
      };
      await pointConfigApi.save(req);
      toast.success("Sozlamalar saqlandi");
      loadData();
    } catch {
      toast.error("Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.startDate || !eventForm.endDate) {
      toast.error("Majburiy maydonlarni to'ldiring");
      return;
    }
    try {
      setEventSubmitting(true);
      const req: PointMultiplierEventRequest = {
        name: eventForm.name.trim(),
        description: eventForm.description.trim() || undefined,
        multiplier: eventForm.multiplier,
        startDate: eventForm.startDate,
        endDate: eventForm.endDate,
        taskCategory: eventForm.taskCategory || undefined,
      };
      await pointEventApi.create(req);
      toast.success("Hodisa yaratildi");
      setShowEventModal(false);
      setEventForm(emptyEventForm);
      loadData();
    } catch {
      toast.error("Yaratishda xatolik");
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Hodisani o'chirishni tasdiqlaysizmi?")) return;
    try {
      await pointEventApi.delete(id);
      toast.success("Hodisa o'chirildi");
      loadData();
    } catch {
      toast.error("O'chirishda xatolik");
    }
  };

  if (!canManagePoints) {
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
          {/* Config form */}
          <div className="card bg-base-100 shadow border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-base">Asosiy sozlamalar</h2>

              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Konversiya kursi</span></label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={form.conversionRate}
                      onChange={(e) => setForm({ ...form, conversionRate: Number(e.target.value) })}
                      min={1}
                    />
                    <label className="label">
                      <span className="label-text-alt">1 ball = X pul</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Valyuta</span></label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    />
                  </div>
                </div>

                {/* Inflation */}
                <div className="divider text-xs">Inflyatsiya</div>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={form.inflationEnabled}
                      onChange={(e) => setForm({ ...form, inflationEnabled: e.target.checked })}
                    />
                    <span className="label-text">Inflyatsiyani yoqish</span>
                  </label>
                </div>
                {form.inflationEnabled && (
                  <div className="form-control">
                    <label className="label"><span className="label-text">Oylik inflyatsiya stavkasi (%)</span></label>
                    <input
                      type="number"
                      className="input input-bordered input-sm"
                      value={form.inflationRateMonthly}
                      onChange={(e) => setForm({ ...form, inflationRateMonthly: Number(e.target.value) })}
                      step={0.1}
                      min={0}
                    />
                  </div>
                )}

                {/* Savings */}
                <div className="divider text-xs">Jamg'arma</div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Jamg'arma foiz stavkasi (haftalik %)</span></label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={form.savingsInterestRate}
                    onChange={(e) => setForm({ ...form, savingsInterestRate: Number(e.target.value) })}
                    step={0.1}
                    min={0}
                  />
                </div>

                {/* Streak */}
                <div className="divider text-xs">Streak bonusi</div>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={form.streakBonusEnabled}
                      onChange={(e) => setForm({ ...form, streakBonusEnabled: e.target.checked })}
                    />
                    <span className="label-text">Streak bonusini yoqish</span>
                  </label>
                </div>
                {form.streakBonusEnabled && (
                  <div className="form-control">
                    <label className="label"><span className="label-text">Streak bonus foizi (%)</span></label>
                    <input
                      type="number"
                      className="input input-bordered input-sm"
                      value={form.streakBonusPercentage}
                      onChange={(e) => setForm({ ...form, streakBonusPercentage: Number(e.target.value) })}
                      step={1}
                      min={0}
                    />
                  </div>
                )}

                {/* Limits */}
                <div className="divider text-xs">Limitlar</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Kunlik max ball</span></label>
                    <input
                      type="number"
                      className="input input-bordered input-sm"
                      value={form.maxDailyPoints}
                      onChange={(e) => setForm({ ...form, maxDailyPoints: e.target.value })}
                      min={0}
                      placeholder="Cheksiz"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Avto-tasdiqlash limiti</span></label>
                    <input
                      type="number"
                      className="input input-bordered input-sm"
                      value={form.autoApproveBelow}
                      onChange={(e) => setForm({ ...form, autoApproveBelow: e.target.value })}
                      min={0}
                      placeholder="O'chirilgan"
                    />
                    <label className="label">
                      <span className="label-text-alt">Bu qiymatdan past balllar avto-tasdiqlanadi</span>
                    </label>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm gap-2 mt-4"
                  onClick={handleSaveConfig}
                  disabled={saving}
                >
                  {saving ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Saqlash
                </button>
              </div>
            </div>
          </div>

          {/* Multiplier events */}
          <div className="card bg-base-100 shadow border border-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title text-base gap-2">
                  <Zap className="h-5 w-5 text-warning" />
                  Ko'paytiruvchi hodisalar
                </h2>
                {canManagePointEvents && (
                  <button
                    className="btn btn-primary btn-sm gap-1"
                    onClick={() => {
                      setEventForm(emptyEventForm);
                      setShowEventModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Qo'shish
                  </button>
                )}
              </div>

              {events.length === 0 ? (
                <p className="text-center py-8 text-base-content/50">Hodisalar topilmadi</p>
              ) : (
                <div className="space-y-3 mt-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={clsx(
                        'border rounded-lg p-3',
                        event.isActive ? 'border-warning/50 bg-warning/5' : 'border-base-200'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{event.name}</span>
                            <span className="badge badge-warning badge-sm">x{event.multiplier}</span>
                            {event.isActive && (
                              <span className="badge badge-success badge-xs">Faol</span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-base-content/60 mt-1">{event.description}</p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-base-content/50 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(event.startDate)} - {formatDate(event.endDate)}
                            {event.taskCategory && (
                              <span className="badge badge-ghost badge-xs ml-2">
                                {event.taskCategory}
                              </span>
                            )}
                          </div>
                        </div>
                        {canManagePointEvents && (
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Create Modal */}
      <ModalPortal isOpen={showEventModal} onClose={() => setShowEventModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Yangi hodisa</h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowEventModal(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Nomi *</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                placeholder="Masalan: Hafta oxiri bonusi"
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Tavsif</span></label>
              <textarea
                className="textarea textarea-bordered"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Ko'paytirish koeffitsienti</span></label>
              <input
                type="number"
                className="input input-bordered"
                value={eventForm.multiplier}
                onChange={(e) => setEventForm({ ...eventForm, multiplier: Number(e.target.value) })}
                min={1.1}
                step={0.1}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Boshlanish *</span></label>
                <input
                  type="datetime-local"
                  className="input input-bordered"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Tugash *</span></label>
                <input
                  type="datetime-local"
                  className="input input-bordered"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Vazifa kategoriyasi (ixtiyoriy)</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={eventForm.taskCategory}
                onChange={(e) => setEventForm({ ...eventForm, taskCategory: e.target.value })}
                placeholder="Bo'sh = barcha kategoriyalar"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEventModal(false)}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreateEvent}
              disabled={eventSubmitting}
            >
              {eventSubmitting && <span className="loading loading-spinner loading-xs" />}
              Yaratish
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
