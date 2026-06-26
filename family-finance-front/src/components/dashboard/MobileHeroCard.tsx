import { Wallet, Eye, EyeOff, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '../../config/constants';

// ── Mobil: hero balans kartasi ichidagi statistik plitka ──
function HeroStat({
  label,
  value,
  hidden,
  icon: Icon,
}: {
  label: string;
  value: number;
  hidden: boolean;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl bg-white/12 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/75">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium leading-tight">{label}</span>
      </div>
      <p className="mt-1 truncate text-[15px] font-bold tabular-nums text-white">
        {hidden ? '••••••' : formatCompactCurrency(value)}
        {!hidden && <span className="ml-0.5 text-xs font-medium text-white/70">so'm</span>}
      </p>
    </div>
  );
}

// ── Mobil: gradient hero balans kartasi (fintech uslubi) ──
export function MobileBalanceHero({
  balance,
  income,
  expense,
  hidden,
  onToggleHidden,
  monthLabel,
}: {
  balance: number;
  income: number;
  expense: number;
  hidden: boolean;
  onToggleHidden: () => void;
  monthLabel: string;
}) {
  return (
    <div className="hero-card rounded-3xl p-5">
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/85">
          <Wallet className="h-4 w-4" />
          <span className="text-[13px] font-medium">Umumiy balans</span>
        </div>
        <button
          type="button"
          onClick={onToggleHidden}
          className="tap-sm grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white"
          aria-label={hidden ? "Balansni ko'rsatish" : 'Balansni yashirish'}
        >
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <p className="relative mt-2.5 font-display text-[30px] font-extrabold leading-none tracking-tight tabular-nums text-white">
        {hidden ? '••• ••• •••' : formatCurrency(balance)}
      </p>
      <p className="relative mt-1.5 text-xs text-white/70">
        {monthLabel ? `${monthLabel} · barcha hisoblar` : 'barcha hisoblar'}
      </p>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        <HeroStat label="Bu oy daromad" value={income} hidden={hidden} icon={ArrowDownLeft} />
        <HeroStat label="Bu oy xarajat" value={expense} hidden={hidden} icon={ArrowUpRight} />
      </div>
    </div>
  );
}
