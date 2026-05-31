import { useCallback, useEffect, useMemo } from 'react';
import { X, HeartOff, HeartHandshake, User, ChevronRight } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { useFamilyUnitsByPersonQuery } from '../../../hooks/useFamilyTreeQueries';
import { useFamilyTreeStore } from '../../../store/familyTreeStore';
import { MARRIAGE_TYPES } from '../../../config/constants';

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
  const familyUnits = useMemo(
    () =>
      allFamilyUnits.filter((fu) =>
        fu.partners.some((p) => p.personId === personId)
      ),
    [allFamilyUnits, personId]
  );

  const handleSelect = useCallback(
    (familyUnitId: number) => {
      onClose();
      openModal({ type: 'addChild', familyUnitId });
    },
    [onClose, openModal]
  );

  const handleSingleParent = () => {
    // FamilyUnit'ni darhol YARATMAYMIZ — AddChildModal uni farzand bilan birga (atomik)
    // yaratadi. Aks holda farzand saqlanmasa ham bo'sh nikoh qolib ketib, keyingi safar
    // "turmush o'rtoq / yagona ota-ona" tanlovi o'tkazib yuborilardi.
    onClose();
    openModal({ type: 'addChild', singleParentPersonId: personId });
  };

  // If person has only one family unit, auto-select it
  useEffect(() => {
    if (isOpen && !isLoading && familyUnits.length === 1) {
      handleSelect(familyUnits[0].id);
    }
  }, [familyUnits, handleSelect, isLoading, isOpen]);

  // If person has no family units, show single parent option
  if (isOpen && !isLoading && familyUnits.length === 0) {
    return (
      <ModalPortal isOpen={isOpen} onClose={onClose}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-base-200">
                <HeartOff className="h-7 w-7 text-base-content/40" />
              </div>
              <h3 className="text-lg font-semibold">Nikoh topilmadi</h3>
              <p className="mt-1.5 text-sm text-base-content/60">
                Farzand qo&apos;shish uchun avval turmush o&apos;rtoq qo&apos;shing yoki yagona ota-ona sifatida davom eting.
              </p>
            </div>

            {/* Choice cards */}
            <div className="mt-5 space-y-2.5">
              <button
                className="group w-full flex items-center gap-3 p-3 rounded-xl border border-base-300 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                onClick={() => {
                  onClose();
                  openModal({ type: 'addSpouse', personId });
                }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HeartHandshake className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="font-medium">Turmush o&apos;rtoq qo&apos;shish</p>
                  <p className="text-xs text-base-content/50">Nikoh yaratib, so&apos;ng farzand qo&apos;shasiz</p>
                </div>
                <ChevronRight className="h-4 w-4 text-base-content/30 transition-colors group-hover:text-primary" />
              </button>

              <button
                className="group w-full flex items-center gap-3 p-3 rounded-xl border border-base-300 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                onClick={handleSingleParent}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <User className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="font-medium">Yagona ota-ona</p>
                  <p className="text-xs text-base-content/50">Turmush o&apos;rtoqsiz farzand qo&apos;shasiz</p>
                </div>
                <ChevronRight className="h-4 w-4 text-base-content/30 transition-colors group-hover:text-primary" />
              </button>
            </div>

            {/* Cancel */}
            <button
              className="btn btn-ghost btn-sm btn-block mt-3 text-base-content/60"
              onClick={onClose}
            >
              Bekor qilish
            </button>
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
