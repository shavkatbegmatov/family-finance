import { useCallback, useEffect, useState } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Clock,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { settingsApi } from '../../api/settings.api';
import { NumberInput } from '../../components/ui/NumberInput';
import { ExportButtons } from '../../components/common/ExportButtons';
import { useUIStore } from '../../store/uiStore';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { FamilyGroupSettings } from './FamilyGroupSettings';

type Tab = 'appearance' | 'debts' | 'family-group';

const DEFAULT_DEBT_DUE_DAYS = 30;

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const { themeMode, setThemeMode } = useUIStore();

  // Debt settings
  const [debtDueDays, setDebtDueDays] = useState(DEFAULT_DEBT_DUE_DAYS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await settingsApi.get();
      setDebtDueDays(data.debtDueDays);
    } catch {
      toast.error('Sozlamalarni yuklashda xatolik');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleExportSettings = async (format: 'excel' | 'pdf') => {
    await settingsApi.export.exportData(format, {});
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const data = await settingsApi.update({ debtDueDays });
      setDebtDueDays(data.debtDueDays);
      toast.success('Sozlamalar yangilandi');
    } catch {
      toast.error('Sozlamalarni saqlashda xatolik');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDebtDueDaysChange = (value: number | string) => {
    if (typeof value === 'string') {
      if (value === '' || value === '-' || value === '.' || value === '-.') {
        return;
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        setDebtDueDays(parsed);
      }
      return;
    }
    setDebtDueDays(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title">Sozlamalar</h1>
        <p className="section-subtitle">Tizim sozlamalarini boshqarish</p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered">
        <button
          className={clsx('tab gap-2', activeTab === 'appearance' && 'tab-active')}
          onClick={() => setActiveTab('appearance')}
        >
          <Palette className="h-4 w-4" />
          Ko'rinish
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'debts' && 'tab-active')}
          onClick={() => setActiveTab('debts')}
        >
          <Clock className="h-4 w-4" />
          Qarzlar
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'family-group' && 'tab-active')}
          onClick={() => setActiveTab('family-group')}
        >
          <Users className="h-4 w-4" />
          Mening guruhim
        </button>
      </div>

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="text-lg font-semibold mb-4">Mavzu</h2>
            <p className="text-sm text-base-content/60 mb-6">
              Interfeys ranglarini tanlang. Tizim rejimi qurilmangiz sozlamalariga mos keladi.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Light Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'light'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('light')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shadow-inner">
                  <Sun className="h-8 w-8 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Yorug'</p>
                  <p className="text-xs text-base-content/50">Kunduzgi rejim</p>
                </div>
                {themeMode === 'light' && (
                  <span className="badge badge-primary badge-sm">Tanlangan</span>
                )}
              </button>

              {/* Dark Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'dark'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('dark')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-inner">
                  <Moon className="h-8 w-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Qorong'i</p>
                  <p className="text-xs text-base-content/50">Tungi rejim</p>
                </div>
                {themeMode === 'dark' && (
                  <span className="badge badge-primary badge-sm">Tanlangan</span>
                )}
              </button>

              {/* System Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'system'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('system')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center shadow-inner">
                  <Monitor className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Tizim</p>
                  <p className="text-xs text-base-content/50">Avtomatik</p>
                </div>
                {themeMode === 'system' && (
                  <span className="badge badge-primary badge-sm">Tanlangan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debts Tab */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="surface-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Qarz sozlamalari</h2>
                <p className="text-sm text-base-content/60">
                  Yangi qarzlar uchun standart muddatni belgilang
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportButtons
                  onExportExcel={() => handleExportSettings('excel')}
                  onExportPdf={() => handleExportSettings('pdf')}
                  disabled={settingsLoading}
                  loading={settingsLoading}
                />
                <PermissionGate permission={PermissionCode.SETTINGS_UPDATE}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveSettings}
                    disabled={settingsSaving || settingsLoading}
                  >
                    {settingsSaving && <span className="loading loading-spinner loading-sm" />}
                    Saqlash
                  </button>
                </PermissionGate>
              </div>
            </div>

            {settingsLoading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : (
              <div className="mt-6 max-w-sm">
                <NumberInput
                  label="Qarz muddati (kun)"
                  value={debtDueDays}
                  onChange={handleDebtDueDaysChange}
                  min={1}
                  max={365}
                  allowEmpty={false}
                />
                <p className="mt-2 text-xs text-base-content/60">
                  Masalan: 30 kun. Bu qiymat faqat yangi qarzlar uchun ishlaydi.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Family Group Tab */}
      {activeTab === 'family-group' && (
        <FamilyGroupSettings />
      )}
    </div>
  );
}
