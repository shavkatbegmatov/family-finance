import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, X } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { familyTreeApi } from '../../api/family-tree.api';
import type { RelationshipTypeInfo } from '../../types';

interface ChangeRelationTypeModalProps {
  isOpen: boolean;
  fromMemberId: number;
  toMemberId: number;
  memberName: string;
  currentType: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangeRelationTypeModal({
  isOpen,
  fromMemberId,
  toMemberId,
  memberName,
  currentType,
  onClose,
  onSuccess,
}: ChangeRelationTypeModalProps) {
  const [types, setTypes] = useState<RelationshipTypeInfo[]>([]);
  const [selectedType, setSelectedType] = useState(currentType);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedType(currentType);
      setLoadingTypes(true);
      familyTreeApi.getRelationshipTypes()
        .then(res => {
          const data = res.data.data as RelationshipTypeInfo[];
          setTypes(data);
        })
        .catch(() => toast.error('Munosabat turlarini yuklashda xatolik'))
        .finally(() => setLoadingTypes(false));
    }
  }, [isOpen, currentType]);

  const handleSubmit = async () => {
    if (selectedType === currentType) return;
    setSubmitting(true);
    try {
      await familyTreeApi.updateRelationshipType({
        fromMemberId,
        toMemberId,
        newRelationshipType: selectedType,
      });
      onSuccess();
    } catch {
      toast.error('Munosabat turini yangilashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  // Categoriyalar bo'yicha guruhlash
  const groupedTypes = types.reduce<Record<string, RelationshipTypeInfo[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Munosabat turini o&apos;zgartirish
              </h3>
              <p className="text-sm text-base-content/60 mt-1">
                <strong>{memberName}</strong> bilan munosabat turini tanlang
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            {loadingTypes ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md text-primary" />
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-4">
                {Object.entries(groupedTypes).map(([category, categoryTypes]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {categoryTypes.map(t => (
                        <button
                          key={t.value}
                          className={`btn btn-sm justify-start ${
                            selectedType === t.value
                              ? 'btn-primary'
                              : 'btn-ghost'
                          }`}
                          onClick={() => setSelectedType(t.value)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || selectedType === currentType}
            >
              {submitting && <span className="loading loading-spinner loading-sm" />}
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
