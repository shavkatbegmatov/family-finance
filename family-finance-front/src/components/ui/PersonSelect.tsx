import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronDown, Check, Search, User, X } from 'lucide-react';

export interface PersonSelectOption {
    value: string | number;
    label: string;
    subLabel?: string;
    icon?: ReactNode;
    disabled?: boolean;
}

interface PersonSelectProps {
    value: string | number | undefined;
    onChange: (value: string | number | undefined) => void;
    options: PersonSelectOption[];
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    className?: string;
    required?: boolean;
}

export function PersonSelect({
    value,
    onChange,
    options,
    label,
    placeholder = 'Shaxsni qidiring...',
    disabled = false,
    error,
    className,
    required,
}: PersonSelectProps) {
    const maxDropdownHeight = 280;
    const dropdownOffset = 4;
    const viewportMargin = 8;
    const estimatedItemHeight = 48; // slightly taller for sublabels

    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState<{
        top: number;
        left: number;
        width: number;
        maxHeight: number;
        overflowY: 'auto' | 'visible';
    }>({
        top: 0,
        left: 0,
        width: 0,
        maxHeight: maxDropdownHeight,
        overflowY: 'auto',
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Calculate dropdown position
    const updateDropdownPosition = useCallback(() => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = Math.max(viewportHeight - rect.bottom - viewportMargin, 0);
        const spaceAbove = Math.max(rect.top - viewportMargin, 0);

        let contentHeight: number;
        if (listRef.current && listRef.current.scrollHeight > 0) {
            contentHeight = listRef.current.scrollHeight;
        } else {
            contentHeight = Math.max(filteredOptions.length * estimatedItemHeight, 40); // at least 40px for empty state
        }

        const preferredHeight = Math.min(contentHeight, maxDropdownHeight);
        const openUp = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
        const availableSpace = openUp ? spaceAbove : spaceBelow;
        const maxHeight = availableSpace > 0 ? Math.min(preferredHeight, availableSpace) : preferredHeight;
        const shouldScroll = contentHeight > maxHeight;
        const effectiveHeight = shouldScroll ? maxHeight : contentHeight;
        const minWidth = Math.max(rect.width, 240); // Slightly wider min width for names

        const left = Math.min(
            Math.max(rect.left, viewportMargin),
            Math.max(viewportMargin, viewportWidth - minWidth - viewportMargin)
        );
        const top = openUp
            ? Math.max(viewportMargin, rect.top - effectiveHeight - dropdownOffset)
            : rect.bottom + dropdownOffset;

        setDropdownPosition({
            top,
            left,
            width: rect.width,
            maxHeight: shouldScroll ? maxHeight : effectiveHeight,
            overflowY: shouldScroll ? 'auto' : 'visible',
        });
    }, [dropdownOffset, maxDropdownHeight, viewportMargin, filteredOptions.length, estimatedItemHeight]);

    // Handle focus behavior
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                listRef.current &&
                !listRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update position when opening and on scroll/resize
    useEffect(() => {
        if (isOpen) {
            updateDropdownPosition();
            const rafId = window.requestAnimationFrame(updateDropdownPosition);

            const handleUpdate = () => updateDropdownPosition();
            window.addEventListener('scroll', handleUpdate, true);
            window.addEventListener('resize', handleUpdate);

            return () => {
                window.cancelAnimationFrame(rafId);
                window.removeEventListener('scroll', handleUpdate, true);
                window.removeEventListener('resize', handleUpdate);
            };
        }
    }, [isOpen, filteredOptions.length, updateDropdownPosition]);

    // Scroll selected option into view when dropdown opens
    useEffect(() => {
        if (isOpen && listRef.current && value) {
            const selectedEl = listRef.current.querySelector('[data-selected="true"]');
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [isOpen, value]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (isOpen && filteredOptions.length > 0) {
                    // If searching, enter selects the first matched item if exact match or just first item
                    onChange(filteredOptions[0].value);
                    setIsOpen(false);
                } else if (!isOpen) {
                    setIsOpen(true);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) setIsOpen(true);
                break;
        }
    };

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(undefined);
        setSearchQuery('');
        if (!isOpen) {
            // Don't open if they just cleared
            setIsFocused(false);
        }
    };

    return (
        <div className={clsx('form-control', className)} ref={containerRef}>
            {label && (
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    {label} {required && <span className="text-error">*</span>}
                </span>
            )}

            <div
                ref={triggerRef}
                className={clsx(
                    'relative flex items-center rounded-xl border bg-base-200/50 transition-all duration-200 h-12 cursor-text',
                    isFocused || isOpen
                        ? 'border-primary ring-2 ring-primary/20 bg-base-100'
                        : error
                            ? 'border-error'
                            : 'border-base-300 hover:border-base-content/30',
                    disabled && 'opacity-50 pointer-events-none bg-base-200'
                )}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(true);
                        setIsFocused(true);
                    }
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={(e) => {
                    if (!listRef.current?.contains(e.relatedTarget as Node)) {
                        setIsFocused(false);
                    }
                }}
                onKeyDown={handleKeyDown}
            >
                <div className="pl-3 text-base-content/40">
                    {isOpen ? <Search className="h-5 w-5 text-primary" /> : <User className="h-5 w-5" />}
                </div>

                <div className="flex-1 min-w-0 px-3 flex items-center h-full">
                    {isOpen ? (
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full h-full bg-transparent outline-none text-base-content placeholder:text-base-content/30 disabled:cursor-not-allowed"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={placeholder}
                            disabled={disabled}
                        />
                    ) : (
                        <div className={clsx(
                            'w-full truncate flex items-center gap-2',
                            selectedOption ? 'text-base-content font-medium' : 'text-base-content/40'
                        )}>
                            {selectedOption ? (
                                <>
                                    {selectedOption.icon && <span className="flex-shrink-0 text-base-content/60">{selectedOption.icon}</span>}
                                    <span className="truncate">{selectedOption.label}</span>
                                </>
                            ) : (
                                <span>{placeholder}</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="pr-3 flex items-center gap-1 text-base-content/40">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            className="p-1 hover:bg-base-300 rounded-full transition-colors text-base-content/50 hover:text-base-content"
                            onClick={clearSelection}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <ChevronDown
                        className={clsx(
                            'h-5 w-5 transition-transform duration-200 cursor-pointer',
                            isOpen && 'rotate-180 text-primary'
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!disabled) setIsOpen(!isOpen);
                        }}
                    />
                </div>
            </div>

            {isOpen && createPortal(
                <div
                    ref={listRef}
                    className="fixed z-[9999] overflow-x-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        minWidth: Math.max(dropdownPosition.width, 240),
                        width: 'auto',
                        maxHeight: dropdownPosition.maxHeight,
                        overflowY: dropdownPosition.overflowY,
                    }}
                >
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-center text-base-content/50 flex flex-col items-center gap-2">
                            <Search className="h-6 w-6 opacity-20" />
                            <p>Topilmadi</p>
                        </div>
                    ) : (
                        <div className="py-1 flex flex-col pt-2 pb-2">
                            {filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    data-selected={option.value === value}
                                    className={clsx(
                                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors outline-none',
                                        option.value === value
                                            ? 'bg-primary/5 text-primary'
                                            : 'hover:bg-base-200 focus:bg-base-200',
                                        option.disabled ? 'opacity-50 cursor-not-allowed hidden' : ''
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!option.disabled) handleSelect(option.value);
                                    }}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (!option.disabled) handleSelect(option.value);
                                        }
                                    }}
                                >
                                    <div className={clsx(
                                        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-1",
                                        option.value === value
                                            ? "bg-primary/10 text-primary ring-primary/20"
                                            : "bg-base-200 text-base-content/50 ring-base-300"
                                    )}>
                                        {option.icon ? option.icon : <User className="h-5 w-5" />}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <span className={clsx("truncate text-sm", option.value === value ? "font-semibold text-primary" : "font-semibold text-base-content")}>
                                            {option.label}
                                        </span>
                                        {option.subLabel && (
                                            <span className="truncate text-xs text-base-content/60 mt-0.5">
                                                {option.subLabel}
                                            </span>
                                        )}
                                    </div>

                                    {option.value === value && (
                                        <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>,
                document.body
            )}

            {error && (
                <label className="label py-1">
                    <span className="label-text-alt text-error">{error}</span>
                </label>
            )}
        </div>
    );
}
