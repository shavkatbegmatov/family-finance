import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import { familyTreeApi } from '../../api/family-tree.api';
import { FamilyTreeCard } from './FamilyTreeCard';
import { RELATIONSHIP_CATEGORIES } from '../../config/constants';
import type { FamilyTreeResponse, FamilyTreeMember, FamilyRelationshipDto } from '../../types';

interface FamilyTreeViewProps {
  onAddRelation?: (fromMemberId: number) => void;
  refreshKey?: number;
}

// Category → daraxt qatorlari tartibi
const CATEGORY_ORDER = [
  'grandparents',
  'parents',
  'siblings',
  'spouse',
  'children',
  'grandchildren',
  'in-laws',
  'extended',
  'other',
];

export function FamilyTreeView({ onAddRelation, refreshKey }: FamilyTreeViewProps) {
  const [treeData, setTreeData] = useState<FamilyTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await familyTreeApi.getTree();
      setTreeData(res.data.data as FamilyTreeResponse);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 404) {
        setError('NOT_LINKED');
      } else {
        setError(axiosErr.response?.data?.message || "Daraxtni yuklashda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree, refreshKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // User oila a'zosiga bog'lanmagan holat
  if (error === 'NOT_LINKED') {
    return (
      <div className="surface-card p-12 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-warning" />
        <h3 className="text-lg font-semibold mb-2">Profilingiz oila a&apos;zosiga bog&apos;lanmagan</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Oila daraxtini ko&apos;rish uchun avval oila a&apos;zosi yaratib, foydalanuvchi akkauntingizga bog&apos;lang.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card p-12 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-error" />
        <h3 className="text-lg font-semibold mb-2">Xatolik</h3>
        <p className="text-sm text-base-content/60 mb-4">{error}</p>
        <button className="btn btn-primary btn-sm" onClick={() => void loadTree()}>
          <RefreshCw className="h-4 w-4" />
          Qayta yuklash
        </button>
      </div>
    );
  }

  if (!treeData || treeData.relationships.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <Users className="h-16 w-16 mx-auto mb-4 text-base-content/20" />
        <h3 className="text-lg font-semibold mb-2">Oila daraxti bo&apos;sh</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Qarindoshlaringizni qo&apos;shib oila daraxtini yarating
        </p>
        {onAddRelation && treeData && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onAddRelation(treeData.rootMemberId)}
          >
            <Plus className="h-4 w-4" />
            Qarindosh qo&apos;shish
          </button>
        )}
      </div>
    );
  }

  // Memberlar map
  const membersMap = new Map<number, FamilyTreeMember>();
  treeData.members.forEach(m => membersMap.set(m.id, m));

  // Root member
  const rootMember = membersMap.get(treeData.rootMemberId);
  if (!rootMember) return null;

  // Munosabatlarni category bo'yicha guruhlash
  const grouped = new Map<string, FamilyRelationshipDto[]>();
  treeData.relationships.forEach(rel => {
    const cat = rel.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(rel);
  });

  // Tartibli category'lar
  const orderedCategories = CATEGORY_ORDER.filter(cat => grouped.has(cat));

  // "MEN" qatorini aniqlash — siblings va spouse bilan bir qatorda
  const siblingsAndSpouse = [
    ...(grouped.get('siblings') || []),
    ...(grouped.get('spouse') || []),
  ];
  const hasSiblingsOrSpouse = siblingsAndSpouse.length > 0;

  // "MEN" qatorida ko'rsatilmaydigan category'lar
  const aboveMe = orderedCategories.filter(c => ['grandparents', 'parents'].includes(c));
  const belowMe = orderedCategories.filter(c => ['children', 'grandchildren'].includes(c));
  const otherCats = orderedCategories.filter(c =>
    !['grandparents', 'parents', 'siblings', 'spouse', 'children', 'grandchildren'].includes(c)
  );

  return (
    <div className="flex flex-col items-center gap-0 py-6 overflow-x-auto">
      {/* Yuqoridagi qatorlar: bobo-buvi, ota-ona */}
      {aboveMe.map(cat => {
        const rels = grouped.get(cat)!;
        return (
          <div key={cat} className="flex flex-col items-center">
            <div className="text-xs font-medium text-base-content/40 mb-2">
              {RELATIONSHIP_CATEGORIES[cat]}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {rels.map(rel => {
                const member = membersMap.get(rel.toMemberId);
                if (!member) return null;
                return (
                  <FamilyTreeCard
                    key={rel.id}
                    member={member}
                    relationLabel={rel.label}
                    size={cat === 'grandparents' ? 'sm' : 'lg'}
                    onAddRelation={onAddRelation}
                  />
                );
              })}
            </div>
            <div className="h-8 w-px border-l-2 border-dashed border-base-content/20" />
          </div>
        );
      })}

      {/* ===== MEN qatori (siblings + ME + spouse) ===== */}
      <div className="flex flex-col items-center">
        {hasSiblingsOrSpouse && (
          <div className="text-xs font-medium text-base-content/40 mb-2">
            {/* Label yozmaymiz, chunki MEN marker yetarli */}
          </div>
        )}
        <div className="flex flex-wrap items-end justify-center gap-4">
          {/* Aka-uka, opa-singillar — chapda */}
          {(grouped.get('siblings') || []).map(rel => {
            const member = membersMap.get(rel.toMemberId);
            if (!member) return null;
            return (
              <FamilyTreeCard
                key={rel.id}
                member={member}
                relationLabel={rel.label}
                size="md"
                onAddRelation={onAddRelation}
              />
            );
          })}

          {/* MEN — markazda */}
          <FamilyTreeCard
            member={rootMember}
            isRoot
            size="lg"
            onAddRelation={onAddRelation}
          />

          {/* Turmush o'rtog'i — o'ngda */}
          {(grouped.get('spouse') || []).map(rel => {
            const member = membersMap.get(rel.toMemberId);
            if (!member) return null;
            return (
              <FamilyTreeCard
                key={rel.id}
                member={member}
                relationLabel={rel.label}
                size="lg"
                onAddRelation={onAddRelation}
              />
            );
          })}
        </div>
      </div>

      {/* Pastdagi qatorlar: farzandlar, nevaralar */}
      {belowMe.map(cat => {
        const rels = grouped.get(cat)!;
        return (
          <div key={cat} className="flex flex-col items-center">
            <div className="h-8 w-px border-l-2 border-dashed border-base-content/20" />
            <div className="text-xs font-medium text-base-content/40 mb-2">
              {RELATIONSHIP_CATEGORIES[cat]}
            </div>
            {rels.length > 1 && (
              <div
                className="border-t-2 border-dashed border-base-content/20 mb-0"
                style={{
                  width: `${Math.min(rels.length * 176, 700)}px`,
                  maxWidth: '90vw',
                }}
              />
            )}
            <div className="flex flex-wrap justify-center gap-4">
              {rels.map(rel => {
                const member = membersMap.get(rel.toMemberId);
                if (!member) return null;
                return (
                  <div key={rel.id} className="flex flex-col items-center">
                    <div className="h-4 w-px border-l-2 border-dashed border-base-content/20" />
                    <FamilyTreeCard
                      member={member}
                      relationLabel={rel.label}
                      size="md"
                      onAddRelation={onAddRelation}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Boshqa kategoriyalar: in-laws, extended, other */}
      {otherCats.length > 0 && (
        <div className="w-full mt-10">
          <div className="border-t-2 border-dashed border-base-content/10 pt-6">
            {otherCats.map(cat => {
              const rels = grouped.get(cat)!;
              return (
                <div key={cat} className="mb-6">
                  <h3 className="text-center text-sm font-medium text-base-content/50 mb-4">
                    {RELATIONSHIP_CATEGORIES[cat]}
                  </h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {rels.map(rel => {
                      const member = membersMap.get(rel.toMemberId);
                      if (!member) return null;
                      return (
                        <FamilyTreeCard
                          key={rel.id}
                          member={member}
                          relationLabel={rel.label}
                          size="sm"
                          onAddRelation={onAddRelation}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
