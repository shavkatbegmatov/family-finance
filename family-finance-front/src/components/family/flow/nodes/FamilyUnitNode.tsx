import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { FamilyUnitNodeData } from '../../../../types';
import { MARRIAGE_TYPES } from '../../../../config/constants';
import { useFamilyTreeStore } from '../../../../store/familyTreeStore';
import { formatDate } from '../../../../config/constants';

function FamilyUnitNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as FamilyUnitNodeData;
  const { familyUnit, variant = 'pair' } = nodeData;
  const [showTooltip, setShowTooltip] = useState(false);
  const openContextMenu = useFamilyTreeStore(s => s.openContextMenu);

  const isActive = familyUnit.status === 'ACTIVE';
  const marriageLabel = MARRIAGE_TYPES[familyUnit.marriageType]?.label || familyUnit.marriageType;
  const targetHandleClass =
    '!w-2.5 !h-2.5 !rounded-full !bg-base-100 !border-2 !border-primary/75 !opacity-100 !z-20 !pointer-events-none !shadow-sm';
  const sourceHandleClass =
    '!w-2.5 !h-2.5 !rounded-full !bg-primary !border-2 !border-base-100 !opacity-100 !z-20 !pointer-events-none !shadow-sm';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      familyUnitId: familyUnit.id,
    });
  };

  if (variant === 'bus') {
    return (
      <div className="relative pointer-events-none">
        <Handle
          id="trunk-in"
          type="target"
          position={Position.Top}
          className="!w-2 !h-2 !bg-transparent !border-0 !opacity-0"
        />
        <Handle
          id="child-out-center"
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-transparent !border-0 !opacity-0"
          style={{ top: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <Handle
          id="child-out-left"
          type="source"
          position={Position.Left}
          className="!w-2 !h-2 !bg-transparent !border-0 !opacity-0"
        />
        <Handle
          id="child-out-right"
          type="source"
          position={Position.Right}
          className="!w-2 !h-2 !bg-transparent !border-0 !opacity-0"
        />
        <div className="w-[14px] h-[14px] rounded-full bg-primary/25 border border-primary/50 shadow-sm" />
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onContextMenu={handleContextMenu}
    >
      {/* Handles */}
      <Handle
        id="partner-left"
        type="target"
        position={Position.Left}
        className={targetHandleClass}
      />
      <Handle
        id="partner-right"
        type="target"
        position={Position.Right}
        className={targetHandleClass}
      />
      <Handle
        id="children-out"
        type="source"
        position={Position.Bottom}
        className={sourceHandleClass}
      />

      {/* Small junction dot */}
      <div
        className={clsx(
          'w-[40px] h-[20px] rounded-full flex items-center justify-center cursor-pointer transition-all',
          isActive
            ? 'bg-primary/20 border border-primary/40 hover:bg-primary/30'
            : 'bg-warning/20 border border-warning/40 hover:bg-warning/30'
        )}
      >
        <span className="text-[8px] font-medium text-base-content/60">
          {isActive ? '=' : '//'}
        </span>
      </div>

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-base-100 border border-base-300 rounded-lg shadow-lg p-2 z-50 whitespace-nowrap text-xs">
          <div className="font-medium">{marriageLabel}</div>
          {familyUnit.marriageDate && (
            <div className="text-base-content/60">{formatDate(familyUnit.marriageDate)}</div>
          )}
          {familyUnit.divorceDate && (
            <div className="text-error/80">Ajrashgan: {formatDate(familyUnit.divorceDate)}</div>
          )}
        </div>
      )}
    </div>
  );
}

export const FamilyUnitNode = memo(FamilyUnitNodeComponent);
