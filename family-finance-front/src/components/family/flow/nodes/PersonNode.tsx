import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Calendar, MapPin } from 'lucide-react';
import clsx from 'clsx';
import type { PersonNodeData } from '../../../../types';
import type { Gender } from '../../../../types';
import { useFamilyTreeStore } from '../../../../store/familyTreeStore';
import { useAuthStore } from '../../../../store/authStore';

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

const getAge = (birthDate?: string, deathDate?: string): string | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  if (deathDate) return `${age} yosh (vafot)`;
  return `${age} yosh`;
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
  const isDead = !!person.deathDate;

  return (
    <div
      className={clsx(
        'relative bg-base-100 rounded-xl border-2 shadow-md p-3 w-[200px] cursor-pointer',
        'transition-all hover:shadow-lg hover:scale-[1.02]',
        getGenderBorderColor(person.gender, isRoot),
        isDead && 'opacity-70'
      )}
      onContextMenu={handleContextMenu}
      onClick={() => openModal({ type: 'personDetail', personId: person.id })}
    >
      {/* Handles for edges */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-1.5 !bg-base-300 !border-0 !rounded-sm" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-1.5 !bg-base-300 !border-0 !rounded-sm" />

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
            person.fullName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{person.fullName}</div>
          {person.lastName && (
            <div className="text-xs text-base-content/50 truncate">{person.lastName}</div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1">
        {ageStr && (
          <div className="flex items-center gap-1.5 text-xs text-base-content/60">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">{ageStr}</span>
          </div>
        )}
        {person.birthPlace && (
          <div className="flex items-center gap-1.5 text-xs text-base-content/60">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{person.birthPlace}</span>
          </div>
        )}
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
