import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface ComboBoxOption {
  value: string | number;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  pinned?: boolean;
}

interface ComboBoxProps {
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  options: ComboBoxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  allowClear?: boolean;
}

export function ComboBox({
  value,
  onChange,
  options,
  placeholder = 'Tanlang...',
  searchPlaceholder = 'Qidirish...',
  disabled = false,
  className,
  size = 'md',
  icon,
  allowClear = false,
}: ComboBoxProps) {
  const maxDropdownHeight = 260;
  const dropdownOffset = 4;
  const viewportMargin = 8;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    overflowY: 'auto' | 'visible';
  }>({ top: 0, left: 0, width: 0, maxHeight: maxDropdownHeight, overflowY: 'auto' });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Split pinned vs regular, then filter by search
  const { pinnedOptions, regularOptions } = useMemo(() => {
    const q = search.toLowerCase().trim();
    const pinned = options.filter((o) => o.pinned);
    const regular = options.filter((o) => !o.pinned);

    if (!q) return { pinnedOptions: pinned, regularOptions: regular };

    return {
      pinnedOptions: pinned.filter((o) => o.label.toLowerCase().includes(q)),
      regularOptions: regular.filter((o) => o.label.toLowerCase().includes(q)),
    };
  }, [options, search]);

  const flatFiltered = useMemo(
    () => [...pinnedOptions, ...regularOptions],
    [pinnedOptions, regularOptions],
  );

  // Calculate dropdown position (reused from Select.tsx pattern)
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = Math.max(viewportHeight - rect.bottom - viewportMargin, 0);
    const spaceAbove = Math.max(rect.top - viewportMargin, 0);

    const preferredHeight = maxDropdownHeight;
    const openUp = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const availableSpace = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(preferredHeight, availableSpace > 0 ? availableSpace : preferredHeight);
    const minWidth = Math.max(rect.width, 220);

    const left = Math.min(
      Math.max(rect.left, viewportMargin),
      Math.max(viewportMargin, viewportWidth - minWidth - viewportMargin),
    );
    const top = openUp
      ? Math.max(viewportMargin, rect.top - maxHeight - dropdownOffset)
      : rect.bottom + dropdownOffset;

    setDropdownPosition({
      top,
      left,
      width: rect.width,
      maxHeight,
      overflowY: 'auto',
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        listRef.current && !listRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Update position when open
  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();
    const rafId = requestAnimationFrame(updateDropdownPosition);

    const handleUpdate = () => updateDropdownPosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, updateDropdownPosition]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setSearch('');
      setHighlightIndex(-1);
    }
  }, [isOpen]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlightIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const handleTriggerClick = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightIndex >= 0 && highlightIndex < flatFiltered.length) {
          const opt = flatFiltered[highlightIndex];
          if (opt && !opt.disabled) handleSelect(opt.value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightIndex((prev) => {
            let next = prev + 1;
            while (next < flatFiltered.length && flatFiltered[next]?.disabled) next++;
            return next < flatFiltered.length ? next : prev;
          });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightIndex((prev) => {
            let next = prev - 1;
            while (next >= 0 && flatFiltered[next]?.disabled) next--;
            return next >= 0 ? next : prev;
          });
        }
        break;
    }
  };

  const isSm = size === 'sm';

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      <div
        ref={triggerRef}
        className={clsx(
          'flex items-center rounded-lg border bg-base-200/50 transition-all duration-200 cursor-pointer select-none',
          isSm ? 'h-8 text-sm' : 'h-12',
          isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200',
        )}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {icon && (
          <div className={clsx('text-base-content/50', isSm ? 'pl-2' : 'pl-3')}>
            {icon}
          </div>
        )}

        <div className={clsx(
          'flex-1 min-w-0 flex items-center gap-1.5 truncate',
          isSm ? 'px-2' : 'px-3',
          selectedOption ? 'text-base-content font-medium' : 'text-base-content/40',
        )}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="flex-shrink-0 text-base-content/60">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </div>

        {allowClear && selectedOption && (
          <button
            type="button"
            className="p-0.5 mr-1 rounded hover:bg-base-300/50 text-base-content/40 hover:text-base-content/70 transition-colors"
            onClick={handleClear}
            tabIndex={-1}
          >
            <X className={clsx(isSm ? 'h-3 w-3' : 'h-4 w-4')} />
          </button>
        )}

        <div className={clsx('text-base-content/40', isSm ? 'pr-1.5' : 'pr-3')}>
          <ChevronDown className={clsx(
            'transition-transform duration-200',
            isSm ? 'h-3.5 w-3.5' : 'h-5 w-5',
            isOpen && 'rotate-180',
          )} />
        </div>
      </div>

      {isOpen && createPortal(
        <div
          ref={listRef}
          className="fixed z-[9999] rounded-xl border border-base-300 bg-base-100 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            minWidth: Math.max(dropdownPosition.width, 220),
            width: 'auto',
            maxHeight: dropdownPosition.maxHeight,
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="p-2 border-b border-base-300/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-base-content/40" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full h-8 pl-8 pr-3 text-sm rounded-lg bg-base-200/50 border border-base-300/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-base-content/30"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: dropdownPosition.maxHeight - 52 }}>
            {flatFiltered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-base-content/50 text-center">
                Topilmadi
              </div>
            ) : (
              <>
                {pinnedOptions.map((option, i) => {
                  const globalIndex = i;
                  return (
                    <div
                      key={`pinned-${option.value}`}
                      data-index={globalIndex}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-sm',
                        option.value === value
                          ? 'bg-primary/10 text-primary font-medium'
                          : highlightIndex === globalIndex
                            ? 'bg-base-200/80'
                            : 'hover:bg-base-200/60',
                        option.disabled && 'opacity-50 cursor-not-allowed',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!option.disabled) handleSelect(option.value);
                      }}
                      role="option"
                      aria-selected={option.value === value}
                    >
                      {option.icon && <span className="flex-shrink-0 text-primary/70">{option.icon}</span>}
                      <span className="flex-1 truncate">{option.label}</span>
                      {option.value === value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    </div>
                  );
                })}

                {pinnedOptions.length > 0 && regularOptions.length > 0 && (
                  <div className="border-t border-base-300/50 my-0.5" />
                )}

                {regularOptions.map((option, i) => {
                  const globalIndex = pinnedOptions.length + i;
                  return (
                    <div
                      key={option.value}
                      data-index={globalIndex}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-sm',
                        option.value === value
                          ? 'bg-primary/10 text-primary font-medium'
                          : highlightIndex === globalIndex
                            ? 'bg-base-200/80'
                            : 'hover:bg-base-200/60',
                        option.disabled && 'opacity-50 cursor-not-allowed',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!option.disabled) handleSelect(option.value);
                      }}
                      role="option"
                      aria-selected={option.value === value}
                    >
                      {option.icon && <span className="flex-shrink-0 text-base-content/60">{option.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-base-content/40 truncate block">{option.description}</span>
                        )}
                      </div>
                      {option.value === value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>,
        document.fullscreenElement ?? document.body,
      )}
    </div>
  );
}
