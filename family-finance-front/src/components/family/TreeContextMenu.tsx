import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit2,
  UserPlus,
  UserRoundPlus,
  Baby,
  Users,
  Eye,
  Trash2,
  Settings2,
} from 'lucide-react';
import { useFamilyTreeStore } from '../../store/familyTreeStore';
import { useAuthStore } from '../../store/authStore';

export function TreeContextMenu() {
  const { contextMenu, closeContextMenu, openModal, setRootPersonId } =
    useFamilyTreeStore();
  const user = useAuthStore((s) => s.user);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu, closeContextMenu]);

  // Adjust position to stay on screen
  useEffect(() => {
    if (!contextMenu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.right > vw) {
      menuRef.current.style.left = `${contextMenu.x - rect.width}px`;
    }
    if (rect.bottom > vh) {
      menuRef.current.style.top = `${contextMenu.y - rect.height}px`;
    }
  }, [contextMenu]);

  if (!contextMenu) return null;

  const isSelf = contextMenu.personUserId != null && contextMenu.personUserId === user?.id;

  const isPersonMenu = !!contextMenu.personId;
  const isFamilyUnitMenu = !!contextMenu.familyUnitId;

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger = false
  ) => (
    <button
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors text-left ${
        danger
          ? 'hover:bg-error/10 text-error'
          : 'hover:bg-base-200 text-base-content'
      }`}
      onClick={() => {
        onClick();
        closeContextMenu();
      }}
    >
      {icon}
      {label}
    </button>
  );

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[10000] min-w-[200px] bg-base-100 border border-base-300 rounded-xl shadow-xl py-1.5 animate-scale-in"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {isPersonMenu && (
        <>
          {/* Edit person */}
          {menuItem(
            <Edit2 className="h-4 w-4 text-base-content/60" />,
            'Tahrirlash',
            () => openModal({ type: 'editPerson', personId: contextMenu.personId! })
          )}

          {/* Add spouse */}
          {menuItem(
            <UserPlus className="h-4 w-4 text-base-content/60" />,
            "Turmush o'rtoq qo'shish",
            () => openModal({ type: 'addSpouse', personId: contextMenu.personId! })
          )}

          {/* Add child — opens selectFamilyUnit if person has multiple FamilyUnits */}
          {menuItem(
            <Baby className="h-4 w-4 text-base-content/60" />,
            "Farzand qo'shish",
            () => openModal({ type: 'selectFamilyUnit', personId: contextMenu.personId! })
          )}

          {/* Add sibling */}
          {menuItem(
            <UserRoundPlus className="h-4 w-4 text-base-content/60" />,
            "Aka-uka qo'shish",
            () => openModal({ type: 'addSibling', personId: contextMenu.personId! })
          )}

          {/* Add parents */}
          {menuItem(
            <Users className="h-4 w-4 text-base-content/60" />,
            "Ota-ona qo'shish",
            () => openModal({ type: 'addParents', personId: contextMenu.personId! })
          )}

          {/* View tree from this person */}
          {!contextMenu.isRoot &&
            menuItem(
              <Eye className="h-4 w-4 text-base-content/60" />,
              'Markazga olish',
              () => setRootPersonId(contextMenu.personId!)
            )}

          {!isSelf && (
            <>
              <div className="my-1.5 border-t border-base-200" />

              {/* Delete person */}
              {menuItem(
                <Trash2 className="h-4 w-4" />,
                "O'chirish",
                () =>
                  openModal({
                    type: 'deletePerson',
                    personId: contextMenu.personId!,
                    personName: contextMenu.personName || '',
                  }),
                true
              )}
            </>
          )}
        </>
      )}

      {isFamilyUnitMenu && (
        <>
          {/* Edit family unit */}
          {menuItem(
            <Settings2 className="h-4 w-4 text-base-content/60" />,
            'Nikoh ma\'lumotlari',
            () =>
              openModal({
                type: 'editFamilyUnit',
                familyUnitId: contextMenu.familyUnitId!,
              })
          )}

          {/* Add child to this family unit */}
          {menuItem(
            <Baby className="h-4 w-4 text-base-content/60" />,
            "Farzand qo'shish",
            () =>
              openModal({
                type: 'addChild',
                familyUnitId: contextMenu.familyUnitId!,
              })
          )}

          <div className="my-1.5 border-t border-base-200" />

          {/* Delete family unit */}
          {menuItem(
            <Trash2 className="h-4 w-4" />,
            "Nikohni o'chirish",
            () =>
              openModal({
                type: 'deleteFamilyUnit',
                familyUnitId: contextMenu.familyUnitId!,
              }),
            true
          )}
        </>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
