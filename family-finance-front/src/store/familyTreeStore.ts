import { create } from 'zustand';
import type { FamilyTreeModal } from '../types/family-tree.types';

interface ContextMenuState {
  x: number;
  y: number;
  personId?: number;
  familyUnitId?: number;
  personName?: string;
  isRoot?: boolean;
  personUserId?: number | null;
}

interface FamilyTreeState {
  // Navigation
  rootPersonId: number | null;
  focusedPersonId: number | null;
  viewerPersonId: number | null;
  depth: number;

  // Selection
  selectedPersonId: number | null;
  selectedFamilyUnitId: number | null;

  // Context Menu
  contextMenu: ContextMenuState | null;

  // Modal
  activeModal: FamilyTreeModal;

  // Filters
  searchQuery: string;
  showDeceased: boolean;
  genderFilter: 'ALL' | 'MALE' | 'FEMALE';

  // Actions
  setRootPersonId: (id: number | null) => void;
  setFocusedPersonId: (id: number | null) => void;
  setViewerPersonId: (id: number | null) => void;
  setDepth: (depth: number) => void;
  setSelectedPersonId: (id: number | null) => void;
  setSelectedFamilyUnitId: (id: number | null) => void;
  openContextMenu: (state: ContextMenuState) => void;
  closeContextMenu: () => void;
  openModal: (modal: FamilyTreeModal) => void;
  closeModal: () => void;
  setSearchQuery: (query: string) => void;
  setShowDeceased: (show: boolean) => void;
  setGenderFilter: (filter: 'ALL' | 'MALE' | 'FEMALE') => void;
  resetFilters: () => void;
}

export const useFamilyTreeStore = create<FamilyTreeState>((set) => ({
  rootPersonId: null,
  focusedPersonId: null,
  viewerPersonId: null,
  depth: 5,
  selectedPersonId: null,
  selectedFamilyUnitId: null,
  contextMenu: null,
  activeModal: null,
  searchQuery: '',
  showDeceased: true,
  genderFilter: 'ALL',

  setRootPersonId: (id) => set({ rootPersonId: id }),
  setFocusedPersonId: (id) => set({ focusedPersonId: id }),
  setViewerPersonId: (id) => set({ viewerPersonId: id }),
  setDepth: (depth) => set({ depth }),
  setSelectedPersonId: (id) => set({ selectedPersonId: id }),
  setSelectedFamilyUnitId: (id) => set({ selectedFamilyUnitId: id }),
  openContextMenu: (state) => set({ contextMenu: state }),
  closeContextMenu: () => set({ contextMenu: null }),
  openModal: (modal) => set({ activeModal: modal, contextMenu: null }),
  closeModal: () => set({ activeModal: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowDeceased: (show) => set({ showDeceased: show }),
  setGenderFilter: (filter) => set({ genderFilter: filter }),
  resetFilters: () => set({ searchQuery: '', showDeceased: true, genderFilter: 'ALL' }),
}));
