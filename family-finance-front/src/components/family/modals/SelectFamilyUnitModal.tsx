import { useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { useFamilyUnitsByPersonQuery } from '../../../hooks/useFamilyTreeQueries';
import { useFamilyTreeStore } from '../../../store/familyTreeStore';
import { MARRIAGE_TYPES } from '../../../config/constants';
import toast from 'react-hot-toast';

interface SelectFamilyUnitModalProps {
  isOpen: boolean;
  personId: number;
  onClose: () => void;
}

export function SelectFamilyUnitModal({
  isOpen,
  personId,
  onClose,
}: SelectFamilyUnitModalProps) {
  const { data: allFamilyUnits = [], isLoading } = useFamilyUnitsByPersonQuery(personId);
  const { openModal } = useFamilyTreeStore();

  // Faqat partner sifatida bo'lgan unitlar (farzand qo'shish uchun)
  const familyUnits = allFamilyUnits.filter(fu =>
    fu.partners.some(p => p.personId === personId)
  );

  const handleSelect = (familyUnitId: number) => {
    onClose();
    openModal({ type: 'addChild', familyUnitId });
  };

  const handleSingleParent = async () => {
    try {
      const { familyUnitApi } = await import('../../../api/family-unit.api');
      const res = await familyUnitApi.createFamilyUnit({ partner1Id: personId });
      const newUnit = (res.data as { data: { id: number } }).data;
      onClose();
      openModal({ type: 'addChild', familyUnitId: newUnit.id });
    } catch {
      toast.error("Oila birligini yaratishda xatolik");
    }
  };

  // If person has only one family unit, auto-select it
  useEffect(() => {
    if (isOpen && !isLoading && familyUnits.length === 1) {
      handleSelect(familyUnits[0].id);
    }
  }, [isOpen, isLoading, familyUnits]);

  // If person has no family units, show single parent option
  if (isOpen && !isLoading && familyUnits.length === 0) {
    return (
      <ModalPortal isOpen={isOpen} onClose={onClose}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-base-content/30" />
            <h3 className="text-lg font-semibold mb-2">Nikoh topilmadi</h3>
            <p className="text-sm text-base-content/60 mb-4">
              Farzand qo&apos;shish uchun turmush o&apos;rtoq qo&apos;shing yoki yagona ota-ona sifatida davom eting.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                Bekor qilish
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  onClose();
                  openModal({ type: 'addSpouse', personId });
                }}
              >
                Turmush o&apos;rtoq qo&apos;shish
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSingleParent}>
                Yagona ota-ona
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Oilani tanlang</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Qaysi nikohga farzand qo&apos;shmoqchisiz?
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {familyUnits.map((fu) => {
                const otherPartner = fu.partners.find(
                  (p) => p.personId !== personId
                );
                return (
                  <button
                    key={fu.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-base-300 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    onClick={() => handleSelect(fu.id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {otherPartner?.fullName || 'Partner'}
                      </p>
                      <p className="text-xs text-base-content/50">
                        {MARRIAGE_TYPES[fu.marriageType]?.label || fu.marriageType}
                        {fu.marriageDate && ` - ${fu.marriageDate}`}
                      </p>
                    </div>
                    <span className="text-xs text-base-content/40">
                      {fu.children.length} farzand
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
