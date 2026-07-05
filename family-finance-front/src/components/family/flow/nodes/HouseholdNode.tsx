import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Home } from 'lucide-react';
import clsx from 'clsx';
import type { HouseholdNodeData, PartnerDto, ChildDto } from '../../../../types';
import { useFamilyTreeStore } from '../../../../store/familyTreeStore';
import { getGenderGradient, getInitial } from './personCardUtils';
import {
  childDisplayName,
  childHandleId,
  childHandleLeft,
  nodeWidth,
  parentDisplayName,
} from './householdMetrics';

const HANDLE_CLASS =
  '!w-2.5 !h-2.5 !rounded-full !bg-primary/70 !border-2 !border-base-100 !opacity-100';

/** Farzand chizig'i chiqadigan ko'rinmas handle — nuqta chizig'i edge'ning o'zida (tugun). */
const CHILD_HANDLE_CLASS = '!w-1.5 !h-1.5 !rounded-full !bg-transparent !border-0 !opacity-0';

function parentLabel(gender?: PartnerDto['gender']): string {
  if (gender === 'FEMALE') return 'Ona';
  if (gender === 'MALE') return 'Ota';
  return 'Ota-ona';
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
        <span className="block truncate text-xs font-semibold">{parentDisplayName(parent)}</span>
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
      className="flex w-[56px] shrink-0 flex-col items-center gap-1"
      title={child.fullName}
    >
      <span className={clsx(
        'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white',
        getGenderGradient(child.gender),
      )}>
        {child.avatar
          ? <img src={child.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          : getInitial(childDisplayName(child))}
      </span>
      <span className="w-full truncate text-center text-[10px]">{childDisplayName(child)}</span>
    </button>
  );
}

function HouseholdNodeComponent({ data }: NodeProps) {
  const { household } = data as unknown as HouseholdNodeData;
  const openModal = useFamilyTreeStore((s) => s.openModal);
  const openPerson = (personId: number) => openModal({ type: 'personDetail', personId });
  const width = nodeWidth(household);

  return (
    <div
      className="overflow-hidden rounded-2xl border-2 border-base-300 bg-base-200/70 shadow-md"
      style={{ width }}
    >
      <Handle id="hh-top-left" type="target" position={Position.Top} style={{ left: '25%' }} className={HANDLE_CLASS} />
      <Handle id="hh-top-right" type="target" position={Position.Top} style={{ left: '75%' }} className={HANDLE_CLASS} />
      {/* Fallback source (farzand handle topilmagan edge'lar uchun) — markazda */}
      <Handle id="hh-bottom" type="source" position={Position.Bottom} className={CHILD_HANDLE_CLASS} />
      {/* Har farzand o'z chizig'ini O'Z avatari tagidan chiqaradi */}
      {household.children.map((c, idx) => (
        <Handle
          key={c.personId}
          id={childHandleId(c.personId)}
          type="source"
          position={Position.Bottom}
          style={{ left: childHandleLeft(idx) }}
          className={CHILD_HANDLE_CLASS}
        />
      ))}

      {/* Sarlavha — oila boshlig'i ismi + byudjet-xonadon raqami */}
      <div className="flex items-center gap-2 border-b border-base-300 bg-base-300/50 px-3 py-2">
        <Home className="h-4 w-4 shrink-0 text-base-content/60" />
        <span className="flex-1 truncate text-sm font-semibold">{household.name || 'Oila'}</span>
        {household.displayCode && (
          <span className="shrink-0 text-[10px] text-base-content/40" title="Xonadon raqami">
            #{household.displayCode}
          </span>
        )}
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

        {/* Farzandlar — BIR QATORDA (karta kengligi mos ravishda o'sadi) */}
        {household.children.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-base-content/40">Farzandlar</p>
            <div className="flex flex-nowrap gap-2">
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
