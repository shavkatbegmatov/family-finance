import { useState, type ComponentType, type ReactNode } from 'react';
import { Lightbulb, X, type LucideProps } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Types
// =============================================================================

export interface Suggestion {
  /** Unique identifier — dismiss state'i shu key bo'yicha eslab qolinadi. */
  key: string;
  icon?: ComponentType<LucideProps>;
  tone?: 'info' | 'warning' | 'success';
  title: ReactNode;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export interface SuggestionsBannerProps {
  suggestions: Suggestion[];
  /** Bo'sh ko'rinmasin uchun — false bo'lsa, hech qachon ko'rinmaydi. */
  dismissible?: boolean;
  className?: string;
  /** Bir vaqtda ko'rsatish kerak bo'lgan eng yuqori prioritetli suggestion'lar soni. */
  maxVisible?: number;
}

// =============================================================================
// Tone styles
// =============================================================================

const TONE_CLASSES = {
  info: {
    container: 'bg-info/10 border-info/30 text-info-content',
    icon: 'bg-info/15 text-info',
    button: 'btn-info btn-outline',
  },
  warning: {
    container: 'bg-warning/10 border-warning/30 text-warning-content',
    icon: 'bg-warning/15 text-warning',
    button: 'btn-warning btn-outline',
  },
  success: {
    container: 'bg-success/10 border-success/30 text-success-content',
    icon: 'bg-success/15 text-success',
    button: 'btn-success btn-outline',
  },
} as const;

// =============================================================================
// Component
// =============================================================================

/**
 * Sahifa boshida ko'rsatiladigan "smart suggestion'lar" banneri.
 * Foydalanuvchiga yaxshilanish imkoniyatlarini ta'kidlaydi: masalan,
 * "5 oila a'zosi tizimga kira olmaydi" — bir bosishda akkaunt yaratish tugmasi bilan.
 *
 * Yopilgan suggestion'lar sessiya davomida (sahifa yopilguncha) qayta ko'rinmaydi.
 */
export function SuggestionsBanner({
  suggestions,
  dismissible = true,
  className,
  maxVisible = 2,
}: SuggestionsBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = suggestions.filter((s) => !dismissed.has(s.key)).slice(0, maxVisible);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className={clsx('space-y-2', className)}>
      {visible.map((s) => {
        const tone = TONE_CLASSES[s.tone ?? 'info'];
        const Icon = s.icon ?? Lightbulb;
        return (
          <div
            key={s.key}
            className={clsx(
              'flex items-start gap-3 rounded-xl border p-3 sm:p-4',
              tone.container,
            )}
          >
            <div
              className={clsx(
                'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                tone.icon,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-base-content">{s.title}</p>
              {s.description && (
                <p className="mt-0.5 text-xs text-base-content/70">{s.description}</p>
              )}
              {s.actionLabel && s.onAction && (
                <button
                  type="button"
                  className={clsx('btn btn-sm mt-2', tone.button)}
                  onClick={s.onAction}
                >
                  {s.actionLabel}
                </button>
              )}
            </div>

            {dismissible && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square shrink-0"
                onClick={() =>
                  setDismissed((prev) => {
                    const next = new Set(prev);
                    next.add(s.key);
                    return next;
                  })
                }
                aria-label="Yashirish"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
