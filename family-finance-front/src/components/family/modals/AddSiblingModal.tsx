import { Users } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { useFamilyUnitsByPersonQuery } from '../../../hooks/useFamilyTreeQueries';
import { useFamilyTreeStore } from '../../../store/familyTreeStore';

interface AddSiblingModalProps {
  isOpen: boolean;
  personId: number;
  onClose: () => void;
}

export function AddSiblingModal({
  isOpen,
  personId,
  onClose,
}: AddSiblingModalProps) {
  const { data: familyUnits = [], isLoading } = useFamilyUnitsByPersonQuery(personId);
  const { openModal } = useFamilyTreeStore();

  // Ota-ona unitlarini topish (personId children[] da bo'lgan unitlar)
  const parentUnits = familyUnits.filter(fu =>
    fu.children.some(c => c.personId === personId)
  );

  const handleSelect = (familyUnitId: number) => {
    onClose();
    openModal({ type: 'addChild', familyUnitId });
  };

  // 1 ta ota-ona unit — avtomatik yo'naltirish
  if (isOpen && !isLoading && parentUnits.length === 1) {
    handleSelect(parentUnits[0].id);
    return null;
  }

  // Ota-ona topilmadi
  if (isOpen && !isLoading && parentUnits.length === 0) {
    return (
      <ModalPortal isOpen={isOpen} onClose={onClose}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-base-content/30" />
            <h3 className="text-lg font-semibold mb-2">Ota-ona topilmadi</h3>
            <p className="text-sm text-base-content/60 mb-4">
              Aka-uka qo&apos;shish uchun avval ota-ona qo&apos;shing.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  openModal({ type: 'addParents', personId });
                }}
              >
                Ota-ona qo&apos;shish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  // 2+ ota-ona unit — tanlash
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Ota-onani tanlang</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Qaysi ota-ona orqali aka-uka qo&apos;shmoqchisiz?
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
              <span className="text-lg">&times;</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {parentUnits.map((fu) => {
                const partnerNames = fu.partners.map(p => p.fullName).join(' & ');
                return (
                  <button
                    key={fu.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-base-300 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    onClick={() => handleSelect(fu.id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{partnerNames}</p>
                      <p className="text-xs text-base-content/50">
                        {fu.children.length} farzand
                      </p>
                    </div>
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
