import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  BarChart3,
} from 'lucide-react';
import { useQuickEntryStore } from '../../store/quickEntryStore';

// ── Mobil: tezkor amallar qatori ──
interface QuickAction {
  key: string;
  label: string;
  icon: React.ElementType;
  tile: string;
  to?: string;
  onClick?: () => void;
}

export function MobileQuickActions({ canCreate }: { canCreate: boolean }) {
  const openQuickEntry = useQuickEntryStore((s) => s.open);

  const actions: QuickAction[] = [
    ...(canCreate
      ? [
          { key: 'exp', label: 'Xarajat', icon: TrendingDown, tile: 'bg-error/10 text-error', onClick: () => openQuickEntry('EXPENSE') },
          { key: 'inc', label: 'Daromad', icon: TrendingUp, tile: 'bg-success/10 text-success', onClick: () => openQuickEntry('INCOME') },
        ]
      : []),
    { key: 'acc', label: 'Hisoblar', icon: Wallet, tile: 'bg-primary/10 text-primary', to: '/accounts' },
    { key: 'rep', label: 'Hisobot', icon: BarChart3, tile: 'bg-info/10 text-info', to: '/reports' },
    { key: 'bud', label: 'Byudjet', icon: Target, tile: 'bg-secondary/10 text-secondary', to: '/budget' },
    { key: 'sav', label: "Jamg'arma", icon: PiggyBank, tile: 'bg-success/10 text-success', to: '/savings' },
  ].slice(0, 4);

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((a) => {
        const inner = (
          <>
            <span className={clsx('grid h-[52px] w-full place-items-center rounded-2xl', a.tile)}>
              <a.icon className="h-[22px] w-[22px]" />
            </span>
            <span className="text-xs font-medium leading-tight text-base-content/70">{a.label}</span>
          </>
        );
        return a.to ? (
          <Link key={a.key} to={a.to} className="tap-sm flex flex-col items-center gap-1.5">
            {inner}
          </Link>
        ) : (
          <button key={a.key} type="button" onClick={a.onClick} className="tap-sm flex flex-col items-center gap-1.5">
            {inner}
          </button>
        );
      })}
    </div>
  );
}
