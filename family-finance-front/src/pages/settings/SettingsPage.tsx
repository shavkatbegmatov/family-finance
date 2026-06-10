import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { settingsApi } from '../../api/settings.api';
import { NumberInput } from '../../components/ui/NumberInput';
import { ExportButtons } from '../../components/common/ExportButtons';
import { useUIStore } from '../../store/uiStore';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';

type Tab = 'appearance' | 'debts';

const DEFAULT_DEBT_DUE_DAYS = 30;

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs: Tab[] = ['appearance', 'debts'];
  const urlTab = searchParams.get('tab') as Tab;
  const initialTab = validTabs.includes(urlTab) ? urlTab : 'appearance';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };
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
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <PageHeader title="Sozlamalar" subtitle="Tizim sozlamalarini boshqarish" />

      {/* Tabs — pill */}
      <div className="flex items-center gap-1.5">
        {([
          { id: 'appearance' as Tab, label: "Ko'rinish", icon: Palette },
          { id: 'debts' as Tab, label: 'Qarzlar', icon: Clock },
        ]).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={clsx(
                'tap-sm flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'bg-base-200 text-base-content/60'
              )}
              onClick={() => handleTabChange(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="surface-card p-4 lg:p-5">
            <h2 className="text-lg font-semibold mb-4">Mavzu</h2>
            <p className="text-sm text-base-content/60 mb-6">
              Interfeys ranglarini tanlang. Tizim rejimi qurilmangiz sozlamalariga mos keladi.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Light Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all sm:gap-3 sm:p-6',
                  themeMode === 'light'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('light')}
              >
                <div className="h-11 w-11 rounded-xl sm:h-16 sm:w-16 bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shadow-inner">
                  <Sun className="h-5 w-5 sm:h-8 sm:w-8 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold sm:text-base">Yorug'</p>
                  <p className="hidden text-xs text-base-content/50 sm:block">Kunduzgi rejim</p>
                </div>
                {themeMode === 'light' && (
                  <span className="badge badge-primary badge-sm">Tanlangan</span>
                )}
              </button>

              {/* Dark Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all sm:gap-3 sm:p-6',
                  themeMode === 'dark'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('dark')}
              >
                <div className="h-11 w-11 rounded-xl sm:h-16 sm:w-16 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-inner">
                  <Moon className="h-5 w-5 sm:h-8 sm:w-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold sm:text-base">Qorong'i</p>
                  <p className="hidden text-xs text-base-content/50 sm:block">Tungi rejim</p>
                </div>
                {themeMode === 'dark' && (
                  <span className="badge badge-primary badge-sm">Tanlangan</span>
                )}
              </button>

              {/* System Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all sm:gap-3 sm:p-6',
                  themeMode === 'system'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('system')}
              >
                <div className="h-11 w-11 rounded-xl sm:h-16 sm:w-16 bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center shadow-inner">
                  <Monitor className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold sm:text-base">Tizim</p>
                  <p className="hidden text-xs text-base-content/50 sm:block">Avtomatik</p>
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
          <div className="surface-card p-4 lg:p-5">
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
    </div>
  );
}
