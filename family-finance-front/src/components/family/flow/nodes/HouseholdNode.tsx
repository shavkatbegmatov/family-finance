import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Home } from 'lucide-react';
import clsx from 'clsx';
import type { HouseholdNodeData, PartnerDto, ChildDto } from '../../../../types';
import { useFamilyTreeStore } from '../../../../store/familyTreeStore';
import { getGenderGradient, getInitial } from './personCardUtils';

const HANDLE_CLASS =
  '!w-2.5 !h-2.5 !rounded-full !bg-primary/70 !border-2 !border-base-100 !opacity-100';

function parentLabel(gender?: PartnerDto['gender']): string {
  if (gender === 'FEMALE') return 'Ona';
  if (gender === 'MALE') return 'Ota';
  return 'Ota-ona';
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

interface ParentChipProps {
  parent: PartnerDto;
  onOpen: (personId: number) => void;
}

function ParentChip({ parent, onOpen }: ParentChipProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(parent.personId); }}
      className="flex w-full items-center gap-2 rounded-lg bg-base-100 px-2 py-1.5 text-left transition-colors hover:bg-base-200"
    >
      <span className={clsx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
        getGenderGradient(parent.gender),
      )}>
        {parent.avatar
          ? <img src={parent.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          : getInitial(parent.fullName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{parent.fullName}</span>
        <span className="block text-[10px] text-base-content/50">{parentLabel(parent.gender)}</span>
      </span>
    </button>
  );
}

interface ChildAvatarProps {
  child: ChildDto;
  onOpen: (personId: number) => void;
}

function ChildAvatar({ child, onOpen }: ChildAvatarProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(child.personId); }}
      className="flex w-[56px] flex-col items-center gap-1"
      title={child.fullName}
    >
      <span className={clsx(
        'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white',
        getGenderGradient(child.gender),
      )}>
        {child.avatar
          ? <img src={child.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          : getInitial(child.fullName)}
      </span>
      <span className="w-full truncate text-center text-[10px]">{firstNameOf(child.fullName)}</span>
    </button>
  );
}

function HouseholdNodeComponent({ data }: NodeProps) {
  const { household } = data as unknown as HouseholdNodeData;
  const openModal = useFamilyTreeStore((s) => s.openModal);
  const openPerson = (personId: number) => openModal({ type: 'personDetail', personId });

  return (
    <div className="w-[280px] overflow-hidden rounded-2xl border-2 border-base-300 bg-base-200/70 shadow-md">
      <Handle id="hh-top" type="target" position={Position.Top} className={HANDLE_CLASS} />
      <Handle id="hh-bottom" type="source" position={Position.Bottom} className={HANDLE_CLASS} />

      {/* Sarlavha */}
      <div className="flex items-center gap-2 border-b border-base-300 bg-base-300/50 px-3 py-2">
        <Home className="h-4 w-4 shrink-0 text-base-content/60" />
        <span className="truncate text-sm font-semibold">
          Xonadon{household.displayCode ? `: ${household.displayCode}` : ''}
        </span>
      </div>

      <div className="space-y-3 p-3">
        {/* Ota-ona */}
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-base-content/40">Ota-ona</p>
          {household.parents.length > 0 ? (
            <div className="space-y-1.5">
              {household.parents.map((p) => (
                <ParentChip key={p.personId} parent={p} onOpen={openPerson} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-base-content/30">—</p>
          )}
        </div>

        {/* Farzandlar */}
        {household.children.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-base-content/40">Farzandlar</p>
            <div className="flex flex-wrap gap-2">
              {household.children.map((c) => (
                <ChildAvatar key={c.personId} child={c} onOpen={openPerson} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const HouseholdNode = memo(HouseholdNodeComponent);
