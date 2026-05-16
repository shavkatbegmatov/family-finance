import { useEffect } from 'react';
import {
  isEditableElementFocused,
  matchesShortcut,
  type ShortcutDefinition,
} from '../utils/keyboardHelpers';

export interface KeyboardShortcut {
  definition: ShortcutDefinition;
  handler: (e: KeyboardEvent) => void;
  /** Foydalanuvchiga ko'rsatish uchun yorliq (KeyboardShortcutsModal'da). */
  label?: string;
}

export interface UseKeyboardShortcutsOptions {
  /** Hook ishga tushmasligi uchun (masalan, login sahifasida). */
  enabled?: boolean;
}

/**
 * Markaziy keyboard shortcuts hooki.
 * Inputlar fokusda bo'lganda shortcut'lar ishlamaydi (allowInInput=true bo'lmasa).
 */
export function useKeyboardShortcuts(
  shortcuts: readonly KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled || shortcuts.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      const editable = isEditableElementFocused();
      for (const shortcut of shortcuts) {
        if (editable && !shortcut.definition.allowInInput) continue;
        if (matchesShortcut(e, shortcut.definition)) {
          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
