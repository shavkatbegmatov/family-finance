import { useFamilyTreeStore } from '../../../store/familyTreeStore';
import { AddSpouseModal } from './AddSpouseModal';
import { AddChildModal } from './AddChildModal';
import { AddSiblingModal } from './AddSiblingModal';
import { AddParentsModal } from './AddParentsModal';
import { SelectFamilyUnitModal } from './SelectFamilyUnitModal';
import { EditPersonModal } from './EditPersonModal';
import { EditFamilyUnitModal } from './EditFamilyUnitModal';
import { DeletePersonModal } from './DeletePersonModal';
import { DeleteFamilyUnitModal } from './DeleteFamilyUnitModal';
import { PersonDetailPanel } from './PersonDetailPanel';

export function FamilyTreeModals() {
  const { activeModal, closeModal } = useFamilyTreeStore();

  if (!activeModal) return null;

  const handleSuccess = () => {
    closeModal();
  };

  switch (activeModal.type) {
    case 'addSpouse':
      return (
        <AddSpouseModal
          isOpen
          personId={activeModal.personId}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      );

    case 'addChild':
      return (
        <AddChildModal
          isOpen
          familyUnitId={activeModal.familyUnitId}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      );

    case 'addSibling':
      return (
        <AddSiblingModal
          isOpen
          personId={activeModal.personId}
          onClose={closeModal}
        />
      );

    case 'addParents':
      return (
        <AddParentsModal
          isOpen
          personId={activeModal.personId}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      );

    case 'selectFamilyUnit':
      return (
        <SelectFamilyUnitModal
          isOpen
          personId={activeModal.personId}
          onClose={closeModal}
        />
      );

    case 'editPerson':
      return (
        <EditPersonModal
          isOpen
          personId={activeModal.personId}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      );

    case 'editFamilyUnit':
      return (
        <EditFamilyUnitModal
          isOpen
          familyUnitId={activeModal.familyUnitId}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      );

    case 'deletePerson':
      return (
        <DeletePersonModal
          isOpen
          personId={activeModal.personId}
          personName={activeModal.personName}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      );

    case 'deleteFamilyUnit':
      return (
        <DeleteFamilyUnitModal
          isOpen
          familyUnitId={activeModal.familyUnitId}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      );

    case 'personDetail':
      return (
        <PersonDetailPanel
          isOpen
          personId={activeModal.personId}
          onClose={closeModal}
        />
      );

    default:
      return null;
  }
}
