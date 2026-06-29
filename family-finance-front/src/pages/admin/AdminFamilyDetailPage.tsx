import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Coins, PiggyBank, ShieldCheck } from 'lucide-react';
import { scopesApi } from '../../api/scopes.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { formatCurrency } from '../../config/constants';
import { formatBalance } from '../../components/accounts/accountsHelpers';

/**
 * SUPER_ADMIN — bitta oilaning READ-ONLY moliyaviy ko'rinishi (drill-down).
 * Hech qanday tahrirlash yo'q: super admin'da WRITE huquqi yo'q, faqat nazorat.
 */
export function AdminFamilyDetailPage() {
  const { scopeId } = useParams<{ scopeId: string }>();
  const id = Number(scopeId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-family-overview', id],
    queryFn: async () => (await scopesApi.getFinancialOverview(id)).data.data,
    enabled: Number.isFinite(id) && id > 0,
  });

  const stats = data?.stats;

  return (
    <div className="space-y-4 lg:space-y-6">
      <Link
        to="/admin/families"
        className="inline-flex items-center gap-1.5 text-sm text-base-content/60 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Oilalar ro'yxatiga qaytish
      </Link>

      <PageHeader
        title={data?.scopeName || 'Oila'}
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Faqat ko'rish rejimi (nazorat)
          </span>
        }
      />

      {isLoading && <p className="py-8 text-center text-base-content/60">Yuklanmoqda...</p>}
      {isError && <p className="py-8 text-center text-error">Ma'lumotni yuklab bo'lmadi.</p>}

      {!isLoading && !isError && stats && (
        <>
          {/* Balans (valyutalar bo'yicha) */}
          <div className="rounded-2xl border border-base-200 bg-base-100 p-4 lg:p-5">
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Wallet className="h-4 w-4" />
              Jami balans
            </div>
            <p className="mt-1 text-2xl font-bold">
              {stats.balancesByCurrency && stats.balancesByCurrency.length > 0
                ? formatBalance(stats.balancesByCurrency[0])
                : formatCurrency(stats.totalBalance)}
            </p>
            {stats.balancesByCurrency && stats.balancesByCurrency.length > 1 && (
              <p className="mt-0.5 text-sm text-base-content/50">
                {stats.balancesByCurrency.slice(1).map(formatBalance).join(' · ')}
              </p>
            )}
          </div>

          {/* Asosiy ko'rsatkichlar */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={TrendingUp} tone="text-success" label="Oylik daromad" value={stats.totalIncome} />
            <StatCard icon={TrendingDown} tone="text-error" label="Oylik xarajat" value={stats.totalExpense} />
            <StatCard icon={Coins} tone="text-warning" label="Berilgan qarz" value={stats.totalDebtsGiven} />
            <StatCard icon={Coins} tone="text-info" label="Olingan qarz" value={stats.totalDebtsTaken} />
            <StatCard icon={PiggyBank} tone="text-primary" label="Jamg'arma" value={stats.totalSavings} />
          </div>

          {/* Oxirgi tranzaksiyalar */}
          <div className="space-y-3">
            <h2 className="section-title text-base">Oxirgi tranzaksiyalar</h2>
            <div className="overflow-hidden rounded-2xl border border-base-200 bg-base-100">
              {(data?.recentTransactions ?? []).length === 0 && (
                <p className="py-8 text-center text-base-content/60">Tranzaksiyalar yo'q.</p>
              )}
              {(data?.recentTransactions ?? []).map((tx) => {
                const isIncome = tx.type === 'INCOME';
                const isExpense = tx.type === 'EXPENSE';
                const sign = isIncome ? '+' : isExpense ? '−' : '';
                const tone = isIncome ? 'text-success' : isExpense ? 'text-error' : 'text-base-content';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 border-b border-base-200 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {tx.categoryName || tx.description || tx.accountName}
                      </p>
                      <p className="text-xs text-base-content/50">
                        {new Date(tx.transactionDate).toLocaleDateString('uz-UZ')} · {tx.accountName}
                      </p>
                    </div>
                    <span className={`flex-none text-sm font-semibold ${tone}`}>
                      {sign}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Wallet;
  tone: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-base-200 bg-base-100 p-4">
      <div className={`flex items-center gap-1.5 text-xs text-base-content/60`}>
        <Icon className={`h-4 w-4 ${tone}`} />
        {label}
      </div>
      <p className="mt-1 text-lg font-bold">{formatCurrency(value)}</p>
    </div>
  );
}
