import { List, TreePine, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { ExportButtons } from '../common/ExportButtons';
import { PermissionGate } from '../common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';

interface FamilyMembersHeaderActionsProps {
  activeTab: 'list' | 'tree';
  onTabChange: (tab: 'list' | 'tree') => void;
  onAddPerson: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  exportDisabled: boolean;
  exportLoading: boolean;
}

/**
 * PageHeader `actions` ichiga joylanadigan boshqaruvlar: ko'rinish tab'lari
 * (Ro'yxat / Daraxti) + desktop "Yangi shaxs" va eksport tugmalari.
 */
export function FamilyMembersHeaderActions({
  activeTab,
  onTabChange,
  onAddPerson,
  onExportExcel,
  onExportPdf,
  exportDisabled,
  exportLoading,
}: FamilyMembersHeaderActionsProps) {
  return (
    <>
      <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
        <button
          className={clsx(
            'btn btn-sm gap-1.5',
            activeTab === 'list' ? 'btn-primary' : 'btn-ghost'
          )}
          onClick={() => onTabChange('list')}
        >
          <List className="h-3.5 w-3.5" />
          Ro'yxat
        </button>
        <button
          className={clsx(
            'btn btn-sm gap-1.5',
            activeTab === 'tree' ? 'btn-primary' : 'btn-ghost'
          )}
          onClick={() => onTabChange('tree')}
        >
          <TreePine className="h-3.5 w-3.5" />
          Daraxti
        </button>
      </div>
      <div className="hidden items-center gap-2 lg:flex">
        <PermissionGate permission={PermissionCode.FAMILY_CREATE}>
          <button
            type="button"
            className="btn btn-primary btn-sm gap-1.5"
            onClick={onAddPerson}
            title="Yangi shaxs qo'shish (wizard)"
          >
            <Sparkles className="h-4 w-4" />
            Yangi shaxs
          </button>
        </PermissionGate>
        <PermissionGate permission={PermissionCode.FAMILY_EXPORT}>
          <ExportButtons
            onExportExcel={onExportExcel}
            onExportPdf={onExportPdf}
            disabled={exportDisabled}
            loading={exportLoading}
          />
        </PermissionGate>
      </div>
    </>
  );
}
