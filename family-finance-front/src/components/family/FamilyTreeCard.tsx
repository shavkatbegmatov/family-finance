import { Phone, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { FAMILY_ROLES } from '../../config/constants';
import type { FamilyMember, FamilyRole } from '../../types';

interface FamilyTreeCardProps {
  member: FamilyMember;
  size?: 'lg' | 'md' | 'sm';
  onEdit?: (member: FamilyMember) => void;
}

const getRoleColor = (role: FamilyRole) => {
  switch (role) {
    case 'FATHER': return 'bg-blue-500';
    case 'MOTHER': return 'bg-pink-500';
    case 'CHILD': return 'bg-green-500';
    default: return 'bg-amber-500';
  }
};

const getRoleBorderColor = (role: FamilyRole) => {
  switch (role) {
    case 'FATHER': return 'border-blue-500/30';
    case 'MOTHER': return 'border-pink-500/30';
    case 'CHILD': return 'border-green-500/30';
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

export function FamilyTreeCard({ member, size = 'md', onEdit }: FamilyTreeCardProps) {
  const age = getAge(member.birthDate);

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center rounded-xl border-2 bg-base-100 p-3 text-center',
        'cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg',
        getRoleBorderColor(member.role),
        sizeClasses[size]
      )}
      onClick={() => onEdit?.(member)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onEdit?.(member); }}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'rounded-full flex items-center justify-center text-white font-bold mb-2',
          getRoleColor(member.role),
          avatarSizes[size]
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

      {/* Role badge */}
      <span
        className={clsx(
          'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white mb-1.5',
          getRoleColor(member.role)
        )}
      >
        {FAMILY_ROLES[member.role]?.label || member.role}
      </span>

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
  );
}
