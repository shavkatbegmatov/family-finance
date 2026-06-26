import { Key } from 'lucide-react';
import type { Permission } from '../../types';

interface PermissionMatrixBaseProps {
  /** Modul bo'yicha guruhlangan barcha ruxsatlar (`['permissions-grouped']` query). */
  permissionsGrouped: Record<string, Permission[]> | undefined;
}

interface EditablePermissionMatrixProps extends PermissionMatrixBaseProps {
  readOnly?: false;
  /** Tanlangan ruxsat kodlari (editable rejim). */
  selectedPermissions: Set<string>;
  togglePermission: (code: string) => void;
  toggleModule: (module: string) => void;
  isModuleSelected: (module: string) => boolean;
  isModulePartiallySelected: (module: string) => boolean;
}

interface ReadOnlyPermissionMatrixProps extends PermissionMatrixBaseProps {
  readOnly: true;
  /** Rolga biriktirilgan ruxsat kodlari (view rejim). */
  assignedCodes: Set<string>;
  /** True bo'lsa — barcha ruxsatlar (biriktirilmaganlari ham), aks holda faqat biriktirilganlar. */
  showUnassigned: boolean;
  /** Hamma narsa yuklanganini bildiradi (loading spinnerni boshqarish uchun). */
  isLoading?: boolean;
}

type PermissionMatrixProps = EditablePermissionMatrixProps | ReadOnlyPermissionMatrixProps;

/**
 * Ruxsatlar matritsasi — modul daraxti + checkbox.
 *
 * <p><b>Editable</b> rejim (Create/Edit modal): har modul sarlavhasida indeterminate checkbox
 * (`ref.indeterminate = isModulePartiallySelected(module)` — DOM ref side-effect AYNAN saqlangan),
 * ostida individual ruxsat checkbox'lari.</p>
 *
 * <p><b>readOnly</b> rejim (View modal): biriktirilgan/biriktirilmagan ruxsatlar kartalar grid'i,
 * `showUnassigned` true bo'lsa barcha ruxsatlar ko'rsatiladi.</p>
 */
export function PermissionMatrix(props: PermissionMatrixProps) {
  const { permissionsGrouped } = props;

  // ----- read-only (view modal) -----
  if (props.readOnly) {
    const { assignedCodes, showUnassigned, isLoading } = props;

    if (isLoading || !permissionsGrouped) {
      return (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      );
    }

    const modules = Object.entries(permissionsGrouped)
      .map(([module, allPerms]) => {
        const modulePerms = showUnassigned
          ? allPerms
          : allPerms.filter(p => assignedCodes.has(p.code));

        return {
          module,
          permissions: modulePerms,
          assignedCount: allPerms.filter(p => assignedCodes.has(p.code)).length,
          totalCount: allPerms.length,
        };
      })
      .filter(({ permissions }) => permissions.length > 0);

    const noneAssigned = assignedCodes.size === 0;

    return (
      <div className="space-y-4">
        {modules.map(({ module, permissions, assignedCount, totalCount }) => (
          <div key={module} className="space-y-2">
            <h5 className="font-medium text-sm text-base-content/70 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary"></div>
              {module}
              <span className="text-xs text-base-content/50">
                {showUnassigned
                  ? `(${assignedCount}/${totalCount})`
                  : `(${assignedCount})`
                }
              </span>
            </h5>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {permissions.map((permission) => {
                const isAssigned = assignedCodes.has(permission.code);
                return (
                  <div
                    key={permission.code}
                    className={`flex items-center gap-2 p-2.5 rounded-lg transition-all ${
                      isAssigned
                        ? 'bg-success/10 border border-success/20'
                        : 'bg-error/5 border border-error/10 opacity-60'
                    }`}
                  >
                    <div className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded ${
                      isAssigned
                        ? 'bg-success/20 text-success'
                        : 'bg-error/20 text-error'
                    }`}>
                      {isAssigned ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${
                        isAssigned ? 'text-base-content' : 'text-base-content/60'
                      }`}>
                        {permission.action}
                      </p>
                      <p className={`text-xs truncate font-mono ${
                        isAssigned ? 'text-base-content/50' : 'text-base-content/40'
                      }`}>
                        {permission.code}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {noneAssigned && !showUnassigned && (
          <div className="text-center py-8 text-base-content/60">
            <Key className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Hech qanday huquq biriktirilmagan</p>
          </div>
        )}
      </div>
    );
  }

  // ----- editable (create/edit modal) -----
  const {
    selectedPermissions,
    togglePermission,
    toggleModule,
    isModuleSelected,
    isModulePartiallySelected,
  } = props;

  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border border-base-200 p-2">
      {permissionsGrouped && Object.entries(permissionsGrouped).map(([module, permissions]) => (
        <div key={module} className="mb-3 last:mb-0">
          <label className="flex items-center gap-2 p-2 rounded-lg bg-base-200/50 cursor-pointer hover:bg-base-200">
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={isModuleSelected(module)}
              ref={(el) => {
                if (el) el.indeterminate = isModulePartiallySelected(module);
              }}
              onChange={() => toggleModule(module)}
            />
            <span className="font-medium text-sm">{module}</span>
            <span className="text-xs text-base-content/50">
              ({permissions.length})
            </span>
          </label>
          <div className="mt-1 ml-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1">
            {permissions.map((permission) => {
              const isSelected = selectedPermissions.has(permission.code);
              return (
                <label
                  key={permission.code}
                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/25 shadow-sm'
                      : 'hover:bg-base-200/50 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    className={`checkbox checkbox-xs ${isSelected ? 'checkbox-primary' : ''}`}
                    checked={isSelected}
                    onChange={() => togglePermission(permission.code)}
                  />
                  <span className={`text-xs ${isSelected ? 'font-medium text-primary' : ''}`}>
                    {permission.action}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
