import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Phone, Calendar, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useLongPress } from '../../../hooks/useLongPress';
import type { FamilyNodeData } from '../../../hooks/useElkLayout';
import type { Gender } from '../../../types';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 160;

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

// Direction button for adding relations
interface DirectionButtonProps {
  direction: 'top' | 'bottom' | 'left' | 'right';
  onClick: () => void;
  title: string;
}

function DirectionButton({ direction, onClick, title }: DirectionButtonProps) {
  const positionClasses = {
    top: '-top-3 left-1/2 -translate-x-1/2',
    bottom: '-bottom-3 left-1/2 -translate-x-1/2',
    left: 'top-1/2 -left-3 -translate-y-1/2',
    right: 'top-1/2 -right-3 -translate-y-1/2',
  };

  const Icon = {
    top: ChevronUp,
    bottom: ChevronDown,
    left: ChevronLeft,
    right: ChevronRight,
  }[direction];

  return (
    <button
      className={clsx(
        'absolute flex items-center justify-center',
        'h-6 w-6 rounded-full bg-primary text-primary-content',
        'opacity-0 group-hover:opacity-100 transition-all duration-200',
        'hover:scale-110 active:scale-95',
        'z-20 cursor-pointer shadow-sm',
        positionClasses[direction]
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function FamilyMemberNodeComponent({ data }: NodeProps) {
  const { member, relationship, isRoot, onAddRelation, onEditMember, onContextMenu, onLongPress } = data as unknown as FamilyNodeData;
  const age = getAge(member.birthDate);
  const [showTooltip, setShowTooltip] = useState(false);
  const relationLabel = relationship?.label;

  const longPressHandlers = useLongPress({
    onLongPress: (e) => {
      if (onLongPress) {
        const touch = e.touches[0];
        onLongPress(touch.clientX, touch.clientY, member, isRoot, relationship);
      }
    },
    delay: 500,
  });

  return (
    <div
      className="relative group"
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      {/* Invisible handles for React Flow edges */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-2 !h-2" />
      <Handle
        type="source"
        position={Position.Right}
        id="spouse-right"
        className="!opacity-0 !w-2 !h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="spouse-left"
        className="!opacity-0 !w-2 !h-2"
      />

      {/* Direction + buttons */}
      {onAddRelation && (
        <>
          <DirectionButton
            direction="top"
            onClick={() => onAddRelation(member.id, 'parents')}
            title="Ota-ona qo'shish"
          />
          <DirectionButton
            direction="bottom"
            onClick={() => onAddRelation(member.id, 'children')}
            title="Farzand qo'shish"
          />
          <DirectionButton
            direction="right"
            onClick={() => onAddRelation(member.id, 'spouse')}
            title="Juft qo'shish"
          />
          <DirectionButton
            direction="left"
            onClick={() => onAddRelation(member.id, 'siblings')}
            title="Aka-uka qo'shish"
          />
        </>
      )}

      {/* Card */}
      <div
        className={clsx(
          'flex flex-col items-center justify-center rounded-xl border-2 bg-base-100 p-3 text-center',
          'transition-all duration-200 hover:shadow-lg h-full',
          'animate-tree-node-appear',
          onEditMember && 'cursor-pointer',
          isRoot && 'animate-pulse-ring',
          getGenderBorderColor(member.gender, isRoot),
        )}
        onClick={() => onEditMember?.(member.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu?.(e, member, isRoot, relationship);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        {...longPressHandlers}
      >
        {/* Root marker */}
        {isRoot && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-content text-[10px] font-bold px-2 py-0.5 rounded-full z-10 whitespace-nowrap">
            MEN
          </div>
        )}

        {/* Relation label */}
        {(relationLabel || isRoot) && (
          <div className="text-[10px] font-medium text-base-content/50 mb-1 truncate max-w-full">
            {isRoot ? "O'zim" : relationLabel}
          </div>
        )}

        {/* Avatar */}
        <div
          className={clsx(
            'rounded-full flex items-center justify-center text-white font-bold mb-2 shadow-sm h-12 w-12 text-lg',
            getGenderGradient(member.gender),
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
        <h4 className="font-semibold text-sm leading-tight mb-0.5 line-clamp-2 max-w-[180px]">
          {member.fullName}
        </h4>

        {/* Age */}
        {age !== null && (
          <div className="text-xs text-base-content/50">
            {age} yosh
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {showTooltip && (member.phone || member.birthDate) && (
        <div
          className={clsx(
            'absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2',
            'bg-base-100 border border-base-300 rounded-lg shadow-xl p-3',
            'min-w-[180px] animate-fade-in pointer-events-none'
          )}
        >
          <div className="space-y-1.5">
            {member.birthDate && (
              <div className="flex items-center gap-1.5 text-xs text-base-content/70">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>{new Date(member.birthDate).toLocaleDateString('uz-UZ')}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-1.5 text-xs text-base-content/70">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{member.phone}</span>
              </div>
            )}
            {age !== null && (
              <div className="text-xs text-base-content/50">
                {age} yosh
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const FamilyMemberNode = memo(FamilyMemberNodeComponent);
