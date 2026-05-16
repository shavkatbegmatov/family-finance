const EDITABLE_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Faol element matn kirituvchi joymi (input/textarea/select yoki contentEditable).
 * Foydalanuvchi matn yozayotganda keyboard shortcut'lar ishga tushmasligi uchun.
 */
export const isEditableElementFocused = (): boolean => {
  const active = document.activeElement;
  if (!active) return false;
  if (EDITABLE_TAG_NAMES.has(active.tagName)) return true;
  if (active instanceof HTMLElement && active.isContentEditable) return true;
  return false;
};

export interface ShortcutDefinition {
  /** Ctrl yoki Cmd bosilganmi. */
  ctrl?: boolean;
  /** Shift bosilganmi. */
  shift?: boolean;
  /** Alt bosilganmi. */
  alt?: boolean;
  /** Bosiladigan tugma kaliti (lower-case). */
  key: string;
  /** Inputlar fokusda bo'lganda ham ishlasinmi. */
  allowInInput?: boolean;
}

export const matchesShortcut = (e: KeyboardEvent, def: ShortcutDefinition): boolean => {
  const ctrlPressed = e.ctrlKey || e.metaKey;
  if (Boolean(def.ctrl) !== ctrlPressed) return false;
  if (Boolean(def.shift) !== e.shiftKey) return false;
  if (Boolean(def.alt) !== e.altKey) return false;
  return e.key.toLowerCase() === def.key.toLowerCase();
};
