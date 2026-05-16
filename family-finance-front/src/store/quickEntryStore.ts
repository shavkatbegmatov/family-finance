import { create } from 'zustand';
import type { TransactionType } from '../types';

interface QuickEntryState {
  isOpen: boolean;
  defaultType: TransactionType;
  /** Modal yopilganda agar tranzaksiya yaratilgan bo'lsa, hozirgi sahifani yangilash uchun signal. */
  lastCreatedAt: number;
  open: (defaultType?: TransactionType) => void;
  close: () => void;
  markCreated: () => void;
}

export const useQuickEntryStore = create<QuickEntryState>((set) => ({
  isOpen: false,
  defaultType: 'EXPENSE',
  lastCreatedAt: 0,
  open: (defaultType = 'EXPENSE') => set({ isOpen: true, defaultType }),
  close: () => set({ isOpen: false }),
  markCreated: () => set({ lastCreatedAt: Date.now() }),
}));
