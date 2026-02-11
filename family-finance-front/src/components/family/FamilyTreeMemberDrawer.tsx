import { useEffect } from 'react';
import { Calendar, Edit2, Eye, Link2, Phone, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { FAMILY_ROLES, GENDERS, formatDate } from '../../config/constants';
import type { FamilyRelationshipDto, FamilyTreeMember } from '../../types';

interface FamilyTreeMemberDrawerProps {
  isOpen: boolean;
  member: FamilyTreeMember | null;
  relationship?: FamilyRelationshipDto;
  isRoot: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddRelation: () => void;
  onViewTree: () => void;
  onChangeType: () => void;
  onDeleteRelation: () => void;
}

export function FamilyTreeMemberDrawer({
  isOpen,
  member,
  relationship,
  isRoot,
  onClose,
  onEdit,
  onAddRelation,
  onViewTree,
  onChangeType,
  onDeleteRelation,
}: FamilyTreeMemberDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!member) return null;

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-[55] bg-black/30 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-label="Draerni yopish"
      />

      <aside
        className={`fixed right-0 top-0 z-[60] h-full w-full max-w-sm border-l border-base-200 bg-base-100 shadow-2xl transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-base-200 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-base-content/45">A&apos;zo amallari</p>
              <h3 className="mt-1 text-lg font-semibold leading-tight">{member.fullName}</h3>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="rounded-xl border border-base-200 bg-base-200/30 p-3">
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base-content/60">Rol</span>
                  <span className="font-medium">{FAMILY_ROLES[member.role]?.label || member.role}</span>
                </div>
                {member.gender && (
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60">Jinsi</span>
                    <span className="font-medium">{GENDERS[member.gender]?.label || member.gender}</span>
                  </div>
                )}
                {member.birthDate && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-base-content/60">
                      <Calendar className="h-3.5 w-3.5" />
                      Tug&apos;ilgan sana
                    </span>
                    <span className="font-medium">{formatDate(member.birthDate)}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-base-content/60">
                      <Phone className="h-3.5 w-3.5" />
                      Telefon
                    </span>
                    <span className="font-medium">{member.phone}</span>
                  </div>
                )}
                {relationship && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-base-content/60">
                      <Link2 className="h-3.5 w-3.5" />
                      Munosabat
                    </span>
                    <span className="font-medium">{relationship.label}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <button className="btn btn-outline justify-start gap-2" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
                A&apos;zoni tahrirlash
              </button>
              <button className="btn btn-primary justify-start gap-2" onClick={onAddRelation}>
                <Plus className="h-4 w-4" />
                Qarindosh qo&apos;shish
              </button>
              {!isRoot && (
                <button className="btn btn-ghost justify-start gap-2" onClick={onViewTree}>
                  <Eye className="h-4 w-4" />
                  Shu a&apos;zoning daraxti
                </button>
              )}
              {!isRoot && relationship && (
                <button className="btn btn-ghost justify-start gap-2" onClick={onChangeType}>
                  <RefreshCw className="h-4 w-4" />
                  Munosabat turini o&apos;zgartirish
                </button>
              )}
              {!isRoot && relationship && (
                <button className="btn btn-ghost justify-start gap-2 text-error" onClick={onDeleteRelation}>
                  <Trash2 className="h-4 w-4" />
                  Munosabatni o&apos;chirish
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
