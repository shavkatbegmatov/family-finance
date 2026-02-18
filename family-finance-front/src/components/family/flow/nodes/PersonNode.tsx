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

const isSameToken = (left?: string, right?: string) =>
  (left ?? '').trim().toLocaleLowerCase() === (right ?? '').trim().toLocaleLowerCase();

const removeTokenOnce = (tokens: string[], target: string) => {
  const targetLower = target.toLocaleLowerCase();
  const idx = tokens.findIndex((token) => token.toLocaleLowerCase() === targetLower);
  if (idx < 0) return tokens;
  return [...tokens.slice(0, idx), ...tokens.slice(idx + 1)];
};

const getFirstNameFallback = (fullName?: string, lastName?: string) => {
  const tokens = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return NODE_PLACEHOLDER;

  const normalizedLastName = lastName?.trim();
  if (!normalizedLastName) return tokens.join(' ');

  if (isSameToken(tokens[0], normalizedLastName)) {
    const rest = tokens.slice(1).join(' ').trim();
    return rest || NODE_PLACEHOLDER;
  }

  if (isSameToken(tokens[tokens.length - 1], normalizedLastName)) {
    const rest = tokens.slice(0, tokens.length - 1).join(' ').trim();
    return rest || NODE_PLACEHOLDER;
  }

  const rest = removeTokenOnce(tokens, normalizedLastName).join(' ').trim();
  return rest || NODE_PLACEHOLDER;
};

const getNameLines = (firstName?: string, lastName?: string, middleName?: string, fullName?: string) => {
  const normalizedFirstName = firstName?.trim();
  const normalizedLastName = lastName?.trim();
  const normalizedMiddleName = middleName?.trim();

  return {
    displayFirstName: normalizedFirstName || getFirstNameFallback(fullName, normalizedLastName),
    displayLastName: normalizedLastName || NODE_PLACEHOLDER,
    displayMiddleName: normalizedMiddleName || NODE_PLACEHOLDER,
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
  const { displayFirstName, displayLastName, displayMiddleName } = getNameLines(
    person.firstName,
    person.lastName,
    person.middleName,
    person.fullName,
  );
  const avatarInitial = displayFirstName !== NODE_PLACEHOLDER
    ? displayFirstName.charAt(0).toUpperCase()
    : '?';
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
            avatarInitial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="font-semibold text-sm leading-4 text-base-content break-words overflow-hidden"
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
            }}
          >
            {displayFirstName}
          </div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-base-content/55 truncate leading-4">
            {displayLastName}
          </div>
          <div className="text-[10px] text-info/80 italic truncate leading-4">
            {displayMiddleName}
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
