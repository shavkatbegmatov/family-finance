import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Calendar, MapPin } from 'lucide-react';
import clsx from 'clsx';
import type { PersonNodeData } from '../../../../types';
import type { Gender } from '../../../../types';
import { useFamilyTreeStore } from '../../../../store/familyTreeStore';
import { useAuthStore } from '../../../../store/authStore';

const NODE_PLACEHOLDER = '-';

const getGenderGradient = (gender?: Gender | null) => {
  switch (gender) {
    case 'MALE': return 'bg-gradient-to-br from-blue-400 to-blue-600';
    case 'FEMALE': return 'bg-gradient-to-br from-pink-400 to-pink-600';
    default: return 'bg-gradient-to-br from-amber-400 to-amber-600';
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

const getAge = (birthDate?: string, deathDate?: string): string => {
  if (!birthDate) return NODE_PLACEHOLDER;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return NODE_PLACEHOLDER;

  const end = deathDate ? new Date(deathDate) : new Date();
  if (Number.isNaN(end.getTime())) return NODE_PLACEHOLDER;

  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  if (deathDate) return `${age} yosh (vafot)`;
  return `${age} yosh`;
};

const getNameLines = (firstName?: string, lastName?: string, fullName?: string) => {
  const normalizedFirstName = firstName?.trim();
  const normalizedLastName = lastName?.trim();
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  const lowerLastName = normalizedLastName?.toLocaleLowerCase();
  const fullWithoutLastName =
    normalizedLastName && parts.length > 0 && parts[0].toLocaleLowerCase() === lowerLastName
      ? parts.slice(1).join(' ').trim()
      : '';

  if (normalizedFirstName && normalizedLastName) {
    return {
      displayFirstName: normalizedFirstName,
      displayLastName: normalizedLastName,
    };
  }

  if (normalizedFirstName) {
    return {
      displayFirstName: normalizedFirstName,
      displayLastName: parts.length > 1 ? parts.slice(1).join(' ') : NODE_PLACEHOLDER,
    };
  }

  if (normalizedLastName) {
    return {
      displayFirstName:
        (normalizedFirstName && normalizedFirstName.toLocaleLowerCase() !== lowerLastName
          ? normalizedFirstName
          : fullWithoutLastName) || NODE_PLACEHOLDER,
      displayLastName: normalizedLastName,
    };
  }

  return {
    displayFirstName: parts[0] ?? NODE_PLACEHOLDER,
    displayLastName: parts.length > 1 ? parts.slice(1).join(' ') : NODE_PLACEHOLDER,
  };
};

function PersonNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as PersonNodeData;
  const { person, isRoot, label } = nodeData;
  const openModal = useFamilyTreeStore(s => s.openModal);
  const openContextMenu = useFamilyTreeStore(s => s.openContextMenu);
  const currentUser = useAuthStore(s => s.user);
  const isCurrentUser = currentUser?.familyMemberId === person.id;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      personId: person.id,
      personName: person.fullName,
      isRoot,
      personUserId: person.userId,
    });
  };

  const ageStr = getAge(person.birthDate, person.deathDate);
  const birthPlaceStr = person.birthPlace?.trim() || NODE_PLACEHOLDER;
  const { displayFirstName, displayLastName } = getNameLines(person.firstName, person.lastName, person.fullName);
  const isDead = !!person.deathDate;

  return (
    <div
      className={clsx(
        'relative bg-base-100 rounded-xl border-2 shadow-md p-3 w-[200px] h-[140px] cursor-pointer flex flex-col',
        'transition-all hover:shadow-lg hover:scale-[1.02]',
        getGenderBorderColor(person.gender, isRoot),
        isDead && 'opacity-70'
      )}
      onContextMenu={handleContextMenu}
      onClick={() => openModal({ type: 'personDetail', personId: person.id })}
    >
      {/* Handles for relationship routing */}
      <Handle
        id="parent-in"
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-transparent !border-0 !opacity-0"
      />
      <Handle
        id="child-out"
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-transparent !border-0 !opacity-0"
      />
      <Handle
        id="spouse-left"
        type="source"
        position={Position.Left}
        className="!w-2 !h-2 !bg-transparent !border-0 !opacity-0"
      />
      <Handle
        id="spouse-right"
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-transparent !border-0 !opacity-0"
      />

      {/* Relationship label badge */}
      {label && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-content text-[10px] font-medium rounded-full whitespace-nowrap z-10">
          {label}
        </div>
      )}

      {/* Avatar + Name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={clsx(
            'h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
            getGenderGradient(person.gender)
          )}
        >
          {person.avatar ? (
            <img src={person.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            displayFirstName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate leading-5 text-base-content">{displayFirstName}</div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-base-content/55 truncate leading-4">
            {displayLastName}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-auto space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-base-content/60 min-h-[16px]">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="truncate">{ageStr}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-base-content/60 min-h-[16px]">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{birthPlaceStr}</span>
        </div>
      </div>

      {/* "Siz" indicator */}
      {isCurrentUser && (
        <div className="absolute -top-3 right-2 px-1.5 py-0.5 bg-success text-success-content text-[10px] font-bold rounded-full z-10">
          Men
        </div>
      )}

      {/* Root indicator */}
      {isRoot && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
      )}

      {/* Death indicator */}
      {isDead && (
        <div className="absolute top-1 right-1 text-[10px] text-base-content/40">&#x271D;</div>
      )}
    </div>
  );
}

export const PersonNode = memo(PersonNodeComponent);
