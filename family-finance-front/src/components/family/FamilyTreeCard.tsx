import { Phone, Calendar, Plus } from 'lucide-react';
import clsx from 'clsx';
import type { FamilyTreeMember, Gender } from '../../types';

interface FamilyTreeCardProps {
  member: FamilyTreeMember;
  relationLabel?: string;
  isRoot?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  onAddRelation?: (memberId: number) => void;
  onClick?: (member: FamilyTreeMember) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const getGenderColor = (gender?: Gender | null) => {
  switch (gender) {
    case 'MALE': return 'bg-blue-500';
    case 'FEMALE': return 'bg-pink-500';
    default: return 'bg-amber-500';
  }
};

const getGenderBorderColor = (gender?: Gender | null, isRoot?: boolean) => {
  if (isRoot) return 'border-primary ring-2 ring-primary/20';
  switch (gender) {
    case 'MALE': return 'border-blue-500/30';
    case 'FEMALE': return 'border-pink-500/30';
    default: return 'border-amber-500/30';
  }
};

const getAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export function FamilyTreeCard({
  member,
  relationLabel,
  isRoot,
  highlighted = false,
  selected = false,
  onAddRelation,
  onClick,
  onContextMenu,
}: FamilyTreeCardProps) {
  const age = getAge(member.birthDate);

  return (
    <div className={clsx('relative group', onAddRelation && 'pb-2')}>
      <div
        className={clsx(
          'relative flex h-[164px] w-[208px] flex-col items-center rounded-xl border-2 bg-base-100 px-3 pb-3 pt-4 text-center',
          'transition-shadow duration-200 hover:shadow-lg',
          onClick && 'cursor-pointer',
          highlighted && 'ring-2 ring-warning/40 bg-warning/5',
          selected && 'ring-2 ring-primary/45 shadow-md',
          getGenderBorderColor(member.gender, isRoot),
        )}
        onClick={() => onClick?.(member)}
        onContextMenu={onContextMenu}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => { if (e.key === 'Enter' && onClick) onClick(member); }}
      >
        {/* Relation label */}
        {(relationLabel || isRoot) && (
          <div className="text-[10px] font-medium text-base-content/50 mb-1">
            {isRoot ? "O'zim" : relationLabel}
          </div>
        )}

        {/* Root marker */}
        {isRoot && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-content text-[10px] font-bold px-2 py-0.5 rounded-full">
            MEN
          </div>
        )}

        {/* Avatar */}
        <div
          className={clsx(
            'mb-2 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white',
            getGenderColor(member.gender),
          )}
        >
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.fullName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            member.fullName.charAt(0).toUpperCase()
          )}
        </div>

        {/* Name */}
        <h4 className="mb-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">
          {member.fullName}
        </h4>

        {/* Age */}
        {age !== null && (
          <div className="flex items-center gap-1 text-xs text-base-content/60">
            <Calendar className="h-3 w-3" />
            <span>{age} yosh</span>
          </div>
        )}

        {/* Phone */}
        {member.phone && (
          <div className="mt-0.5 flex max-w-[170px] items-center gap-1 text-xs text-base-content/60">
            <Phone className="h-3 w-3" />
            <span className="truncate">{member.phone}</span>
          </div>
        )}
      </div>

      {/* Add relation button */}
      {onAddRelation && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-content opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer hover:brightness-90 active:brightness-75"
          onClick={(e) => {
            e.stopPropagation();
            onAddRelation(member.id);
          }}
          title="Qarindosh qo'shish"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onAddRelation(member.id); } }}
        >
          <Plus className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
