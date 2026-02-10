import { useEffect, useState, useCallback } from 'react';
import { familyReportsApi } from '../../api/family-reports.api';
import type {
  IncomeExpenseReport,
  CategoryReport,
  MemberReport,
  CategoryType,
  ApiResponse,
} from '../../types';
import {
  formatCurrency,
  CATEGORY_TYPES,
  getTashkentToday,
} from '../../config/constants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  PieChart,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

type ReportTab = 'income-expense' | 'category' | 'member';

export function ReportsPage() {
  // Date range: default = current month start to today
  const today = getTashkentToday();
  const monthStart = today.slice(0, 8) + '01';

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [activeTab, setActiveTab] = useState<ReportTab>('income-expense');

  // Tab 1: Income/Expense
  const [incomeExpense, setIncomeExpense] = useState<IncomeExpenseReport | null>(null);
  const [ieLoading, setIeLoading] = useState(false);

  // Tab 2: Category
  const [categoryType, setCategoryType] = useState<CategoryType>('EXPENSE');
  const [categories, setCategories] = useState<CategoryReport[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  // Tab 3: Member
  const [members, setMembers] = useState<MemberReport[]>([]);
  const [memLoading, setMemLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ------ Data Loaders ------

  const loadIncomeExpense = useCallback(async (from: string, to: string) => {
    setIeLoading(true);
    setError(null);
    try {
      const res = await familyReportsApi.getIncomeExpense(from, to);
      const report = (res.data as ApiResponse<IncomeExpenseReport>).data;
      setIncomeExpense(report);
    } catch (err) {
      setError('Daromad/Xarajat hisobotini yuklashda xatolik');
    } finally {
      setIeLoading(false);
    }
  }, []);

  const loadCategoryReport = useCallback(async (type: CategoryType, from: string, to: string) => {
    setCatLoading(true);
    setError(null);
    try {
      const res = await familyReportsApi.getCategoryReport(type, from, to);
      const data = (res.data as ApiResponse<CategoryReport[]>).data;
      setCategories(data);
    } catch (err) {
      setError('Kategoriya hisobotini yuklashda xatolik');
    } finally {
      setCatLoading(false);
    }
  }, []);

  const loadMemberReport = useCallback(async (from: string, to: string) => {
    setMemLoading(true);
    setError(null);
    try {
      const res = await familyReportsApi.getMemberReport(from, to);
      const data = (res.data as ApiResponse<MemberReport[]>).data;
      setMembers(data);
    } catch (err) {
      setError("Oila a'zolari hisobotini yuklashda xatolik");
    } finally {
      setMemLoading(false);
    }
  }, []);

  // ------ Effects ------

  useEffect(() => {
    if (!fromDate || !toDate) return;
    if (activeTab === 'income-expense') {
      loadIncomeExpense(fromDate, toDate);
    } else if (activeTab === 'category') {
      loadCategoryReport(categoryType, fromDate, toDate);
    } else if (activeTab === 'member') {
      loadMemberReport(fromDate, toDate);
    }
  }, [activeTab, fromDate, toDate, categoryType, loadIncomeExpense, loadCategoryReport, loadMemberReport]);

  // ------ Helpers ------

  const isLoading = ieLoading || catLoading || memLoading;

  const difference = incomeExpense ? incomeExpense.totalIncome - incomeExpense.totalExpense : 0;

  const barChartData = incomeExpense
    ? [
        { name: 'Daromad', amount: incomeExpense.totalIncome, fill: '#22c55e' },
        { name: 'Xarajat', amount: incomeExpense.totalExpense, fill: '#ef4444' },
      ]
    : [];

  const sortedCategories = [...categories].sort((a, b) => b.amount - a.amount);

  const totalCategoryAmount = sortedCategories.reduce((sum, c) => sum + c.amount, 0);

  // ------ Render ------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="section-title">Hisobotlar</h1>
          <p className="section-subtitle">Oilaviy moliyaviy hisobotlar va tahlillar</p>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="surface-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-base-content/60" />
            <span className="text-sm font-medium text-base-content/70">Davr:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              className="input input-bordered input-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-base-content/50">—</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed w-fit">
        <button
          className={clsx('tab gap-2', activeTab === 'income-expense' && 'tab-active')}
          onClick={() => setActiveTab('income-expense')}
        >
          <BarChart3 className="h-4 w-4" />
          Daromad/Xarajat
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'category' && 'tab-active')}
          onClick={() => setActiveTab('category')}
        >
          <PieChart className="h-4 w-4" />
          Kategoriya
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'member' && 'tab-active')}
          onClick={() => setActiveTab('member')}
        >
          <Users className="h-4 w-4" />
          Oila a'zolari
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
          <div className="space-y-6">
            {incomeExpense && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Total Income */}
                  <div className="surface-card p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-base-content/60">Jami daromad</p>
                        <p className="mt-2 text-3xl font-bold text-success">
                          {formatCurrency(incomeExpense.totalIncome)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-success/10 p-3 text-success">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Total Expense */}
                  <div className="surface-card p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-base-content/60">Jami xarajat</p>
                        <p className="mt-2 text-3xl font-bold text-error">
                          {formatCurrency(incomeExpense.totalExpense)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-error/10 p-3 text-error">
                        <TrendingDown className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Difference */}
                  <div className="surface-card p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-base-content/60">Farq (Daromad - Xarajat)</p>
                        <p
                          className={clsx(
                            'mt-2 text-3xl font-bold',
                            difference >= 0 ? 'text-success' : 'text-error'
                          )}
                        >
                          {difference >= 0 ? '+' : ''}
                          {formatCurrency(difference)}
                        </p>
                      </div>
                      <div
                        className={clsx(
                          'rounded-xl p-3',
                          difference >= 0
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        )}
                      >
                        <BarChart3 className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="surface-card p-6">
                  <h2 className="mb-4 text-lg font-semibold">Daromad va Xarajat taqqoslash</h2>
                  {barChartData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} barSize={80}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-base-content/10" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis
                            className="text-xs"
                            tickFormatter={(val: number) =>
                              val >= 1_000_000
                                ? `${(val / 1_000_000).toFixed(1)}M`
                                : val >= 1_000
                                  ? `${(val / 1_000).toFixed(0)}K`
                                  : String(val)
                            }
                          />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'Summa']}
                            contentStyle={{
                              borderRadius: '0.75rem',
                              border: 'none',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                          />
                          <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                            {barChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-base-content/60">Ma'lumot mavjud emas</p>
                  )}
                </div>
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
          <div className="space-y-6">
            {/* Toggle: INCOME / EXPENSE */}
            <div className="flex items-center gap-2">
              <button
                className={clsx(
                  'btn btn-sm',
                  categoryType === 'INCOME' ? 'btn-success' : 'btn-outline'
                )}
                onClick={() => setCategoryType('INCOME')}
              >
                {CATEGORY_TYPES.INCOME.label}
              </button>
              <button
                className={clsx(
                  'btn btn-sm',
                  categoryType === 'EXPENSE' ? 'btn-error' : 'btn-outline'
                )}
                onClick={() => setCategoryType('EXPENSE')}
              >
                {CATEGORY_TYPES.EXPENSE.label}
              </button>
            </div>

            {sortedCategories.length > 0 ? (
              <>
                {/* Pie Chart */}
                <div className="surface-card p-6">
                  <h2 className="mb-4 text-lg font-semibold">
                    {categoryType === 'INCOME' ? 'Daromad' : 'Xarajat'} kategoriyalari
                  </h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={sortedCategories}
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          innerRadius={50}
                          dataKey="amount"
                          nameKey="categoryName"
                          label={({ categoryName, percentage }) =>
                            `${categoryName}: ${percentage.toFixed(1)}%`
                          }
                          labelLine={true}
                        >
                          {sortedCategories.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), 'Summa']}
                          contentStyle={{
                            borderRadius: '0.75rem',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category Table */}
                <div className="surface-card p-6">
                  <h2 className="mb-4 text-lg font-semibold">Kategoriya bo'yicha tafsilot</h2>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Kategoriya</th>
                          <th className="text-right">Summa</th>
                          <th className="text-right">Foiz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCategories.map((cat, index) => (
                          <tr key={cat.categoryId}>
                            <td>
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                            </td>
                            <td className="font-medium">{cat.categoryName}</td>
                            <td className="text-right">{formatCurrency(cat.amount)}</td>
                            <td className="text-right">{cat.percentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold">
                          <td></td>
                          <td>Jami</td>
                          <td className="text-right">{formatCurrency(totalCategoryAmount)}</td>
                          <td className="text-right">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
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
          <div className="space-y-6">
            {members.length > 0 ? (
              <>
                {/* Bar Chart */}
                <div className="surface-card p-6">
                  <h2 className="mb-4 text-lg font-semibold">Oila a'zolari xarajatlari</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={members} barSize={60}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-base-content/10" />
                        <XAxis dataKey="memberName" className="text-xs" />
                        <YAxis
                          className="text-xs"
                          tickFormatter={(val: number) =>
                            val >= 1_000_000
                              ? `${(val / 1_000_000).toFixed(1)}M`
                              : val >= 1_000
                                ? `${(val / 1_000).toFixed(0)}K`
                                : String(val)
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), 'Xarajat']}
                          contentStyle={{
                            borderRadius: '0.75rem',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Bar dataKey="totalExpense" name="Xarajat" radius={[8, 8, 0, 0]}>
                          {members.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Member Table */}
                <div className="surface-card p-6">
                  <h2 className="mb-4 text-lg font-semibold">Oila a'zolari bo'yicha tafsilot</h2>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>A'zo ismi</th>
                          <th className="text-right">Jami xarajat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member, index) => (
                          <tr key={member.memberId}>
                            <td>{index + 1}</td>
                            <td className="font-medium">{member.memberName}</td>
                            <td className="text-right">{formatCurrency(member.totalExpense)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold">
                          <td></td>
                          <td>Jami</td>
                          <td className="text-right">
                            {formatCurrency(members.reduce((sum, m) => sum + m.totalExpense, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
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
