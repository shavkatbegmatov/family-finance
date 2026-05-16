import { useCallback } from 'react';
import type {
  TransactionType,
  TransactionRequest,
  Account,
  FinanceCategory,
  FamilyMember,
} from '../types';

const STORAGE_KEY = 'transaction-defaults-v1';

export interface TransactionDefaults {
  accountId?: number;
  toAccountId?: number;
  categoryId?: number;
  familyMemberId?: number;
  updatedAt: string;
}

type DefaultsByType = Partial<Record<TransactionType, TransactionDefaults>>;

interface ReferenceData {
  accounts: Account[];
  categories: FinanceCategory[];
  members: FamilyMember[];
}

const isValidDefaults = (value: unknown): value is DefaultsByType => {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => v === undefined || (typeof v === 'object' && v !== null && 'updatedAt' in v)
  );
};

const readStorage = (): DefaultsByType => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isValidDefaults(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeStorage = (data: DefaultsByType): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage to'la yoki disabled — silent fail
  }
};

const sanitizeId = <T extends { id: number }>(
  id: number | undefined,
  list: readonly T[]
): number | undefined => (id && list.some((item) => item.id === id) ? id : undefined);

const sanitizeDefaults = (
  defaults: TransactionDefaults | undefined,
  refData: ReferenceData
): TransactionDefaults | null => {
  if (!defaults) return null;
  const accountId = sanitizeId(defaults.accountId, refData.accounts);
  const toAccountId = sanitizeId(defaults.toAccountId, refData.accounts);
  const categoryId = sanitizeId(defaults.categoryId, refData.categories);
  const familyMemberId = sanitizeId(defaults.familyMemberId, refData.members);

  if (!accountId && !categoryId && !familyMemberId) return null;

  return { accountId, toAccountId, categoryId, familyMemberId, updatedAt: defaults.updatedAt };
};

export function useTransactionDefaults(refData: ReferenceData) {
  const getDefaults = useCallback(
    (type: TransactionType): TransactionDefaults | null => {
      const all = readStorage();
      return sanitizeDefaults(all[type], refData);
    },
    [refData]
  );

  const saveDefaults = useCallback(
    (type: TransactionType, request: TransactionRequest): void => {
      const all = readStorage();
      all[type] = {
        accountId: request.accountId || undefined,
        toAccountId: request.toAccountId,
        categoryId: request.categoryId,
        familyMemberId: request.familyMemberId,
        updatedAt: new Date().toISOString(),
      };
      writeStorage(all);
    },
    []
  );

  const clearDefaults = useCallback((type?: TransactionType): void => {
    if (!type) {
      writeStorage({});
      return;
    }
    const all = readStorage();
    delete all[type];
    writeStorage(all);
  }, []);

  return { getDefaults, saveDefaults, clearDefaults };
}
