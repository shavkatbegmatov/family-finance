import { Trash2 } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { useDeletePerson } from '../../../hooks/useFamilyTreeQueries';

interface DeletePersonModalProps {
  isOpen: boolean;
  personId: number;
  personName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeletePersonModal({
  isOpen,
  personId,
  personName,
  onClose,
  onSuccess,
}: DeletePersonModalProps) {
  const deletePerson = useDeletePerson();

  const handleDelete = () => {
    deletePerson.mutate(personId, {
      onSuccess: () => {
        onClose();
        onSuccess();
      },
    });
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <Trash2 className="h-7 w-7 text-error" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Shaxsni o&apos;chirish</h3>
          <p className="text-sm text-base-content/60 mb-6">
            <strong>{personName}</strong>ni o&apos;chirmoqchimisiz? Bu amalni qaytarib bo&apos;lmaydi.
            Barcha nikoh va farzandlik bog&apos;lanishlari ham o&apos;chiriladi.
          </p>
          <div className="flex justify-center gap-3">
            <button
              className="btn btn-ghost"
              onClick={onClose}
              disabled={deletePerson.isPending}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={deletePerson.isPending}
            >
              {deletePerson.isPending && (
                <span className="loading loading-spinner loading-sm" />
              )}
              O&apos;chirish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
