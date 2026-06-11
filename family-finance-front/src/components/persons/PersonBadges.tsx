import { type ComponentType, type MouseEvent } from 'react';
import { KeyRound, Plus, Trophy, Users, type LucideProps } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Types
// =============================================================================

export interface PersonBadgesProps {
  /** Bu shaxsning User akkaunti bormi (tizimga kira oladimi). */
  hasUser?: boolean;
  /** Bu shaxs oila a'zosi sifatida ro'yxatga olinganmi. */
  hasFamilyMember?: boolean;
  /** Bu shaxs ball tizimida qatnashadimi. */
  hasParticipant?: boolean;

  /** Tooltip uchun qo'shimcha matn (masalan, username). */
  userTooltip?: string;
  participantTooltip?: string;

  /** Badge o'lchami. */
  size?: 'xs' | 'sm';
  /** True bo'lsa, yetishmaydigan capability'lar ham xira ko'rsatiladi. */
  showMissing?: boolean;
  /** Faqat bitta badge bo'lsa, full label ko'rsatilsin. */
  showLabel?: boolean;
  className?: string;

  // ===== Click-to-add: agar mos capability yo'q bo'lsa va shu prop berilsa,
  // badge bosib bo'ladigan tugmaga aylanadi (yonida "+" belgisi paydo bo'ladi).
  onAddUser?: () => void;
  onAddFamilyMember?: () => void;
  onAddParticipant?: () => void;
}

interface BadgeDef {
  key: 'user' | 'member' | 'participant';
  label: string;
  icon: ComponentType<LucideProps>;
  /** Aktiv (present) holatdagi rang sinflari. */
  activeClass: string;
  /** Xira (missing) holatdagi rang sinflari. */
  mutedClass: string;
}

// =============================================================================
// Badge definitions
// =============================================================================

const BADGES: Record<BadgeDef['key'], BadgeDef> = {
  user: {
    key: 'user',
    label: 'Login',
    icon: KeyRound,
    activeClass: 'bg-primary/15 text-primary border-primary/30',
    mutedClass: 'bg-base-200 text-base-content/30 border-base-300/50',
  },
  member: {
    key: 'member',
    label: 'Oila a\'zosi',
    icon: Users,
    activeClass: 'bg-info/15 text-info border-info/30',
    mutedClass: 'bg-base-200 text-base-content/30 border-base-300/50',
  },
  participant: {
    key: 'participant',
    label: 'Ball',
    icon: Trophy,
    activeClass: 'bg-accent/15 text-accent border-accent/30',
    mutedClass: 'bg-base-200 text-base-content/30 border-base-300/50',
  },
};

const SIZE_CLASSES = {
  xs: {
    container: 'h-5 px-1.5 text-xs gap-1',
    icon: 'h-3 w-3',
  },
  sm: {
    container: 'h-6 px-2 text-xs gap-1.5',
    icon: 'h-3.5 w-3.5',
  },
} as const;

// =============================================================================
// Component
// =============================================================================

/**
 * Shaxsning capability badge'lari — har bir nom yonida ko'rsatish uchun.
 *
 * @example
 * <PersonBadges hasUser hasFamilyMember hasParticipant size="xs" />
 * <PersonBadges hasFamilyMember showMissing /> // boshqalari xira ko'rinadi
 */
export function PersonBadges({
  hasUser = false,
  hasFamilyMember = false,
  hasParticipant = false,
  userTooltip,
  participantTooltip,
  size = 'xs',
  showMissing = false,
  showLabel = false,
  className,
  onAddUser,
  onAddFamilyMember,
  onAddParticipant,
}: PersonBadgesProps) {
  const sizeClasses = SIZE_CLASSES[size];

  const items: Array<{
    def: BadgeDef;
    present: boolean;
    tooltip?: string;
    onAdd?: () => void;
  }> = [
    {
      def: BADGES.user,
      present: hasUser,
      tooltip: hasUser ? (userTooltip ?? 'Tizimga kira oladi') : 'Login akkaunti yo\'q — qo\'shish uchun bosing',
      onAdd: onAddUser,
    },
    {
      def: BADGES.member,
      present: hasFamilyMember,
      tooltip: hasFamilyMember
        ? 'Oila a\'zolari ro\'yxatida'
        : 'Oila a\'zosi sifatida ro\'yxatga olinmagan — qo\'shish uchun bosing',
      onAdd: onAddFamilyMember,
    },
    {
      def: BADGES.participant,
      present: hasParticipant,
      tooltip: hasParticipant
        ? (participantTooltip ?? 'Ball tizimida qatnashadi')
        : 'Ball tizimida qatnashmaydi — qo\'shish uchun bosing',
      onAdd: onAddParticipant,
    },
  ];

  // showMissing yoki click-to-add berilgan bo'lsa, yetishmaydigan badge'lar ham ko'rsatiladi
  const showAll = showMissing || items.some((i) => !i.present && i.onAdd);
  const visible = showAll ? items : items.filter((i) => i.present);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className={clsx('flex flex-wrap items-center gap-1', className)}>
      {visible.map(({ def, present, tooltip, onAdd }) => {
        const Icon = def.icon;
        const clickable = !present && Boolean(onAdd);

        const baseClasses = clsx(
          'inline-flex items-center rounded-md border font-medium leading-none transition-all',
          sizeClasses.container,
          present ? def.activeClass : def.mutedClass,
          !present && !clickable && 'opacity-60',
          clickable && 'cursor-pointer hover:opacity-100 hover:scale-105 active:scale-95 hover:border-base-content/40',
        );

        if (clickable && onAdd) {
          return (
            <button
              key={def.key}
              type="button"
              title={tooltip}
              aria-label={tooltip}
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onAdd();
              }}
              className={baseClasses}
            >
              <Icon className={sizeClasses.icon} />
              {showLabel && <span>{def.label}</span>}
              <Plus className={clsx(sizeClasses.icon, '-ml-0.5')} />
            </button>
          );
        }

        return (
          <span
            key={def.key}
            title={tooltip}
            aria-label={tooltip}
            className={baseClasses}
          >
            <Icon className={sizeClasses.icon} />
            {showLabel && <span>{def.label}</span>}
          </span>
        );
      })}
    </div>
  );
}
