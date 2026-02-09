import { useEffect, useState } from 'react';
import { Heart, Plus, Users } from 'lucide-react';
import { familyMembersApi } from '../../api/family-members.api';
import { FamilyTreeCard } from './FamilyTreeCard';
import type { FamilyMember } from '../../types';

interface FamilyTreeViewProps {
  onEdit: (member: FamilyMember) => void;
  onAdd: () => void;
}

export function FamilyTreeView({ onEdit, onAdd }: FamilyTreeViewProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await familyMembersApi.getList();
        const data = res.data.data as FamilyMember[];
        setMembers(data);
      } catch (error) {
        console.error('Failed to load family members:', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const fathers = members.filter((m) => m.role === 'FATHER');
  const mothers = members.filter((m) => m.role === 'MOTHER');
  const children = members.filter((m) => m.role === 'CHILD');
  const others = members.filter((m) => m.role === 'OTHER');

  const father = fathers[0] || null;
  const mother = mothers[0] || null;
  const hasParents = father || mother;
  const hasChildren = children.length > 0;
  const hasOthers = others.length > 0;

  // Bo'sh holat
  if (members.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <Users className="h-16 w-16 mx-auto mb-4 text-base-content/20" />
        <h3 className="text-lg font-semibold mb-2">Oila daraxti bo'sh</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Oila a'zolarini qo'shib, oila daraxtini yarating
        </p>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Yangi a'zo qo'shish
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0 py-6">
      {/* ============ OTA-ONA QATORI ============ */}
      {hasParents && (
        <div className="flex flex-col items-center">
          {/* Ota-Ona kartalari */}
          <div className="flex items-center gap-4 sm:gap-6">
            {father && (
              <FamilyTreeCard member={father} size="lg" onEdit={onEdit} />
            )}
            {father && mother && (
              <Heart className="h-6 w-6 text-red-400 flex-shrink-0" fill="currentColor" />
            )}
            {mother && (
              <FamilyTreeCard member={mother} size="lg" onEdit={onEdit} />
            )}
          </div>

          {/* Qo'shimcha otalar/onalar (agar bir nechta bo'lsa) */}
          {(fathers.length > 1 || mothers.length > 1) && (
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              {fathers.slice(1).map((f) => (
                <FamilyTreeCard key={f.id} member={f} size="md" onEdit={onEdit} />
              ))}
              {mothers.slice(1).map((m) => (
                <FamilyTreeCard key={m.id} member={m} size="md" onEdit={onEdit} />
              ))}
            </div>
          )}

          {/* Vertikal connector — faqat bolalar mavjud bo'lsa */}
          {hasChildren && (
            <div className="tree-connector-vertical h-8 w-px border-l-2 border-dashed border-base-content/20" />
          )}
        </div>
      )}

      {/* ============ BOLALAR QATORI ============ */}
      {hasChildren && (
        <div className="flex flex-col items-center">
          {/* Gorizontal connector */}
          {children.length > 1 && (
            <div
              className="border-t-2 border-dashed border-base-content/20"
              style={{
                width: `${Math.min(children.length * 176, 700)}px`,
                maxWidth: '90vw',
              }}
            />
          )}

          {/* Bolalar kartalari */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertikal chiziq har bir bola uchun */}
                <div className="h-4 w-px border-l-2 border-dashed border-base-content/20" />
                <FamilyTreeCard member={child} size="md" onEdit={onEdit} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ BOSHQA A'ZOLAR ============ */}
      {hasOthers && (
        <div className="w-full mt-10">
          <div className="border-t-2 border-dashed border-base-content/10 pt-6">
            <h3 className="text-center text-sm font-medium text-base-content/50 mb-4">
              Boshqa a'zolar
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              {others.map((other) => (
                <FamilyTreeCard key={other.id} member={other} size="sm" onEdit={onEdit} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
