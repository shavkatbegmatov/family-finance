import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { familyReportsApi, type ExportFormat } from '../../api/family-reports.api';
import { DateRangePicker, type DateRangePreset, type DateRange } from '../../components/common/DateRangePicker';
import { resolvePreset } from '../../utils/dateRangePresets';
import { ExportButtons } from '../../components/common/ExportButtons';
import { PageHeader } from '../../components/layout/PageHeader';
import { downloadBlob, extractFileName } from '../../utils/downloadFile';
import { getTashkentToday } from '../../config/constants';
import { useReportsData, type ReportTab } from '../../hooks/useReportsData';
import { SummaryCards } from '../../components/reports/SummaryCards';
import { IncomeExpenseBarChart } from '../../components/reports/IncomeExpenseBarChart';
import { CategoryToggle } from '../../components/reports/CategoryToggle';
import { CategoryPieChart } from '../../components/reports/CategoryPieChart';
import { CategoryTable } from '../../components/reports/CategoryTable';
import { MemberBarChart } from '../../components/reports/MemberBarChart';
import { MemberTable } from '../../components/reports/MemberTable';
import { BarChart3, PieChart, Users, Calendar } from 'lucide-react';
import clsx from 'clsx';

/**
 * Hisobotlar sahifasi (orchestrator). Ma'lumot/holat/hosilaviy qiymatlar
 * {@link useReportsData} hook'ida (react-query, D8 migratsiyasi — 3 hisobot
 * queryKey scope-aware va date-range/categoryType bilan). Bu komponent faqat
 * date-range/davr holati, tab holati, eksport handler'i va tab dispatcher'ni
 * boshqaradi; tab kontenti reports/ komponentlarida (D10 bo'lish).
 *
 * <p>Xulq original god-sahifa bilan AYNAN: date-range (preset/custom →
 * resolved), categoryType toggle refetch, eksport endpoint tanlash +
 * downloadReport (Blob + file-name extract + toast), chart ranglari, loading
 * overlay, error alert va empty-state'lar saqlangan.</p>
 */
export function ReportsPage() {
  // Default = current month
  const today = getTashkentToday();
  const monthStart = today.slice(0, 8) + '01';

  const [datePreset, setDatePreset] = useState<DateRangePreset>('month');
  const [customRange, setCustomRange] = useState<DateRange>({ start: monthStart, end: today });
  const [activeTab, setActiveTab] = useState<ReportTab>('income-expense');

  const resolvedRange = useMemo(
    () => resolvePreset(datePreset, customRange) ?? { start: monthStart, end: today },
    [datePreset, customRange, monthStart, today]
  );
  const fromDate = resolvedRange.start;
  const toDate = resolvedRange.end;

  const {
    categoryType,
    setCategoryType,
    isLoading,
    error,
    incomeExpense,
    ieLoading,
    difference,
    barChartData,
    catLoading,
    sortedCategories,
    totalCategoryAmount,
    members,
    memLoading,
  } = useReportsData(fromDate, toDate, activeTab);

  const [exporting, setExporting] = useState(false);

  const downloadReport = useCallback(
    async (
      invoke: () => Promise<{ data: Blob; headers: unknown }>,
      fallbackName: string
    ): Promise<void> => {
      setExporting(true);
      try {
        const response = await invoke();
        const headers = response.headers as Record<string, string | undefined>;
        const fileName = extractFileName(headers['content-disposition'] ?? null, fallbackName);
        downloadBlob(response.data, fileName);
        toast.success('Fayl yuklab olindi');
      } catch {
        toast.error('Eksportda xatolik');
      } finally {
        setExporting(false);
      }
    },
    []
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      if (activeTab === 'income-expense') {
        void downloadReport(
          () => familyReportsApi.exportIncomeExpense(fromDate, toDate, format),
          `daromad_xarajat.${ext}`
        );
      } else if (activeTab === 'category') {
        void downloadReport(
          () => familyReportsApi.exportCategoryReport(categoryType, fromDate, toDate, format),
          `kategoriya.${ext}`
        );
      } else if (activeTab === 'member') {
        void downloadReport(
          () => familyReportsApi.exportMemberReport(fromDate, toDate, format),
          `oila_azolari.${ext}`
        );
      }
    },
    [activeTab, categoryType, fromDate, toDate, downloadReport]
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header — eksport amali mobilda ham kerak (FAB qoplamaydi) */}
      <PageHeader
        title="Hisobotlar"
        subtitle="Oilaviy moliyaviy hisobotlar va tahlillar"
        mobileVisible
        actions={
          <ExportButtons
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            disabled={isLoading || exporting}
            loading={exporting}
          />
        }
      />

      {/* Date Range Picker */}
      <div className="surface-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-base-content/60" />
            <span className="text-sm font-medium text-base-content/70">Davr:</span>
          </div>
          <DateRangePicker
            value={datePreset}
            customRange={customRange}
            onChange={(preset, range) => {
              setDatePreset(preset);
              if (range) setCustomRange(range);
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed w-full overflow-x-auto sm:w-fit">
        <button
          className={clsx('tab gap-2', activeTab === 'income-expense' && 'tab-active')}
          onClick={() => setActiveTab('income-expense')}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Daromad/Xarajat</span>
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'category' && 'tab-active')}
          onClick={() => setActiveTab('category')}
        >
          <PieChart className="h-4 w-4" />
          <span className="hidden sm:inline">Kategoriya</span>
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'member' && 'tab-active')}
          onClick={() => setActiveTab('member')}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Oila a'zolari</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Loading Overlay */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-sm font-medium text-base-content/70">Yuklanmoqda...</span>
            </div>
          </div>
        )}

        {/* ====== Tab 1: Income / Expense ====== */}
        {activeTab === 'income-expense' && (
          <div className="space-y-4 lg:space-y-6">
            {incomeExpense && (
              <>
                <SummaryCards incomeExpense={incomeExpense} difference={difference} />
                <IncomeExpenseBarChart data={barChartData} />
              </>
            )}

            {!incomeExpense && !ieLoading && (
              <div className="surface-card p-12 text-center">
                <p className="text-base-content/60">Ma'lumot mavjud emas</p>
              </div>
            )}
          </div>
        )}

        {/* ====== Tab 2: Category Report ====== */}
        {activeTab === 'category' && (
          <div className="space-y-4 lg:space-y-6">
            {/* Toggle: INCOME / EXPENSE */}
            <CategoryToggle value={categoryType} onChange={setCategoryType} />

            {sortedCategories.length > 0 ? (
              <>
                <CategoryPieChart categoryType={categoryType} sortedCategories={sortedCategories} />
                <CategoryTable
                  sortedCategories={sortedCategories}
                  totalCategoryAmount={totalCategoryAmount}
                />
              </>
            ) : (
              !catLoading && (
                <div className="surface-card p-12 text-center">
                  <p className="text-base-content/60">Ma'lumot mavjud emas</p>
                </div>
              )
            )}
          </div>
        )}

        {/* ====== Tab 3: Member Report ====== */}
        {activeTab === 'member' && (
          <div className="space-y-4 lg:space-y-6">
            {members.length > 0 ? (
              <>
                <MemberBarChart members={members} />
                <MemberTable members={members} />
              </>
            ) : (
              !memLoading && (
                <div className="surface-card p-12 text-center">
                  <p className="text-base-content/60">Ma'lumot mavjud emas</p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
