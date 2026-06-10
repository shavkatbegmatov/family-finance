import { create } from 'zustand';
import type { FamilyTreeModal } from '../types/family-tree.types';

/** 3D ko'rinish rejimi — 2D React-Flow yoki 3D force-graf. */
export type VisualMode = '2d' | '3d';
/** 3D tugun render uslubi (almashtiriladigan modullar). */
export type RendererKind = 'galaxy' | 'avatars' | 'hybrid';
/** Tugun ranglari nima bo'yicha guruhlanadi (videodagi "COMMUNITIES"). */
export type ColorBy = 'gender' | 'generation' | 'surname' | 'clan';

interface ContextMenuState {
  x: number;
  y: number;
  personId?: number;
  familyUnitId?: number;
  personName?: string;
  isRoot?: boolean;
  personUserId?: number | null;
}

type FocusSource = 'select' | 'find-me' | 'context-eye';

interface PendingFocusState {
  nodeId: string;
  zoom?: number;
  requestId: number;
  source: FocusSource;
  oldPos?: { x: number; y: number };
  oldViewport?: { x: number; y: number; zoom: number };
}

interface FamilyTreeState {
  // Navigation
  rootPersonId: number | null;
  focusedPersonId: number | null;
  viewerPersonId: number | null;
  depth: number;

  // View mode — shaxs-markazli yoki xonadon-markazli
  viewMode: 'person' | 'household';

  // 3D ko'rinish holati — 2D/3D toggle, render uslubi, rang guruhi
  visualMode: VisualMode;
  node3dRenderer: RendererKind;
  colorBy: ColorBy;

  // Selection
  selectedPersonId: number | null;
  selectedFamilyUnitId: number | null;

  // Context Menu
  contextMenu: ContextMenuState | null;

  // Modal
  activeModal: FamilyTreeModal;

  // Sidebar pin
  isSidebarPinned: boolean;

  // Pending center — layout tugagandan keyin node markazga olinadi
  pendingFocus: PendingFocusState | null;
  focusRequestSeq: number;

  // Filters
  showDeceased: boolean;
  genderFilter: 'ALL' | 'MALE' | 'FEMALE';

  // Fetching state for UI
  isFetchingTree: boolean;

  // Actions
  setRootPersonId: (id: number | null) => void;
  setFocusedPersonId: (id: number | null) => void;
  setViewerPersonId: (id: number | null) => void;
  setDepth: (depth: number) => void;
  setViewMode: (mode: 'person' | 'household') => void;
  setVisualMode: (mode: VisualMode) => void;
  setNode3dRenderer: (renderer: RendererKind) => void;
  setColorBy: (colorBy: ColorBy) => void;
  setSelectedPersonId: (id: number | null) => void;
  setSelectedFamilyUnitId: (id: number | null) => void;
  openContextMenu: (state: ContextMenuState) => void;
  closeContextMenu: () => void;
  openModal: (modal: FamilyTreeModal) => void;
  closeModal: () => void;
  toggleSidebarPin: () => void;
  setPendingFocus: (focus: PendingFocusState | null) => void;
  focusPerson: (personId: number, source: FocusSource, oldPos?: { x: number; y: number }, oldViewport?: { x: number; y: number; zoom: number }) => void;
  setShowDeceased: (show: boolean) => void;
  setGenderFilter: (filter: 'ALL' | 'MALE' | 'FEMALE') => void;
  resetFilters: () => void;
  setIsFetchingTree: (fetching: boolean) => void;
}

export const useFamilyTreeStore = create<FamilyTreeState>((set) => ({
  rootPersonId: null,
  focusedPersonId: null,
  viewerPersonId: null,
  depth: 5,
  viewMode: 'person',
  visualMode: '2d',
  node3dRenderer: 'galaxy',
  colorBy: 'gender',
  selectedPersonId: null,
  selectedFamilyUnitId: null,
  contextMenu: null,
  activeModal: null,
  isSidebarPinned: false,
  pendingFocus: null,
  focusRequestSeq: 0,
  showDeceased: true,
  genderFilter: 'ALL',
  isFetchingTree: false,

  setRootPersonId: (id) => set({ rootPersonId: id }),
  setFocusedPersonId: (id) => set({ focusedPersonId: id }),
  setViewerPersonId: (id) => set({ viewerPersonId: id }),
  setDepth: (depth) => set({ depth }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setVisualMode: (mode) => set({ visualMode: mode }),
  setNode3dRenderer: (renderer) => set({ node3dRenderer: renderer }),
  setColorBy: (colorBy) => set({ colorBy }),
  setSelectedPersonId: (id) => set({ selectedPersonId: id }),
  setSelectedFamilyUnitId: (id) => set({ selectedFamilyUnitId: id }),
  openContextMenu: (state) => set({ contextMenu: state }),
  closeContextMenu: () => set({ contextMenu: null }),
  openModal: (modal) => set({ activeModal: modal, contextMenu: null }),
  closeModal: () => set({ activeModal: null, isSidebarPinned: false }),
  toggleSidebarPin: () => set((state) => ({ isSidebarPinned: !state.isSidebarPinned })),
  setPendingFocus: (focus) => set({ pendingFocus: focus }),
  focusPerson: (personId, source, oldPos, oldViewport) =>
    set((state) => {
      const requestId = state.focusRequestSeq + 1;
      return {
        rootPersonId: personId,
        focusedPersonId: personId,
        viewerPersonId: personId,
        // When clicking to focus and load a new tree, optimistically set fetching true
        isFetchingTree: true,
        pendingFocus: {
          nodeId: `person_${personId}`,
          zoom: source === 'find-me' ? 1.1 : undefined,
          requestId,
          source,
          oldPos,
          oldViewport,
        },
        focusRequestSeq: requestId,
      };
    }),
  setShowDeceased: (show) => set({ showDeceased: show }),
  setGenderFilter: (filter) => set({ genderFilter: filter }),
  resetFilters: () => set({ showDeceased: true, genderFilter: 'ALL' }),
  setIsFetchingTree: (fetching) => set({ isFetchingTree: fetching }),
}));
