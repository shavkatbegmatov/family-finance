import { Wallet } from 'lucide-react';

import type { MemberAccountSummary } from '../../types';
import { AccountCard } from './AccountCard';

/**
 * "Hisoblar" tabi — hisob kartalari grid'i yoki bo'sh holat. Original
 * AccountsTab AYNAN (bo'sh holat matni va grid layout saqlangan).
 */
export function AccountsList({ accounts }: { accounts: MemberAccountSummary[] }) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-base-content/60">
        <Wallet className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">Hisob mavjud emas</p>
        <p className="text-sm mt-1">Bu a'zoda hali hisob ochilmagan</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((acc) => (
        <AccountCard key={acc.id} account={acc} />
      ))}
    </div>
  );
}
