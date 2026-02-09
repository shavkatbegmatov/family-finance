import { Phone, Calendar, Plus } from 'lucide-react';
import clsx from 'clsx';
import type { FamilyTreeMember, Gender } from '../../types';

interface FamilyTreeCardProps {
  member: FamilyTreeMember;
  relationLabel?: string;
  isRoot?: boolean;
  size?: 'lg' | 'md' | 'sm';
  onAddRelation?: (memberId: number) => void;
  onClick?: (member: FamilyTreeMember) => void;
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

const sizeClasses = {
  lg: 'w-44',
  md: 'w-40',
  sm: 'w-36',
};

const avatarSizes = {
  lg: 'h-14 w-14 text-xl',
  md: 'h-12 w-12 text-lg',
  sm: 'h-10 w-10 text-base',
};

export function FamilyTreeCard({ member, relationLabel, isRoot, size = 'md', onAddRelation, onClick }: FamilyTreeCardProps) {
  const age = getAge(member.birthDate);

  return (
    <div className="relative group">
      <div
        className={clsx(
          'relative flex flex-col items-center rounded-xl border-2 bg-base-100 p-3 text-center',
          'transition-all duration-200 hover:shadow-lg',
          onClick && 'cursor-pointer hover:scale-[1.03]',
          getGenderBorderColor(member.gender, isRoot),
          sizeClasses[size]
        )}
        onClick={() => onClick?.(member)}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => { if (e.key === 'Enter' && onClick) onClick(member); }}
      >
        {/* Relation label */}
        {relationLabel && (
          <div className="text-[10px] font-medium text-base-content/50 mb-1">
            {relationLabel}
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
            'rounded-full flex items-center justify-center text-white font-bold mb-2',
            getGenderColor(member.gender),
            avatarSizes[size],
            isRoot && 'mt-1'
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
        <h4 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
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
          <div className="flex items-center gap-1 text-xs text-base-content/60 mt-0.5">
            <Phone className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{member.phone}</span>
          </div>
        )}
      </div>

      {/* Add relation button */}
      {onAddRelation && (
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 btn btn-circle btn-xs btn-primary opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            onAddRelation(member.id);
          }}
          title="Qarindosh qo'shish"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
