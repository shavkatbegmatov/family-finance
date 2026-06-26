import { Shield, Key, Lock, X, Eye, Check } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { PermissionMatrix } from './PermissionMatrix';
import type { Permission, Role, RoleRequest } from '../../types';
import type { RolePreviewData } from '../../hooks/useRolesData';

interface RoleCreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tahrirlanayotgan rol (yo'q bo'lsa — yaratish rejimi). */
  selectedRole: Role | null;
  /** Barcha ruxsatlar modul bo'yicha (`['permissions-grouped']`). */
  permissionsGrouped: Record<string, Permission[]> | undefined;
  // form state
  formData: RoleRequest;
  setFormData: (data: RoleRequest) => void;
  selectedPermissions: Set<string>;
  // preview state
  showRolePreview: boolean;
  setShowRolePreview: (show: boolean) => void;
  rolePreviewData: RolePreviewData | null;
  onApply: () => void;
  // permission matrix handlers
  togglePermission: (code: string) => void;
  toggleModule: (module: string) => void;
  isModuleSelected: (module: string) => boolean;
  isModulePartiallySelected: (module: string) => boolean;
  selectAllPermissions: () => void;
  clearAllPermissions: () => void;
  // submit
  onSubmit: () => void;
  isSubmitting: boolean;
}

/** Rol yaratish/tahrirlash — form + ruxsatlar matritsasi + "Apply" preview/diff paneli. */
export function RoleCreateEditModal({
  isOpen,
  onClose,
  selectedRole,
  permissionsGrouped,
  formData,
  setFormData,
  selectedPermissions,
  showRolePreview,
  setShowRolePreview,
  rolePreviewData,
  onApply,
  togglePermission,
  toggleModule,
  isModuleSelected,
  isModulePartiallySelected,
  selectAllPermissions,
  clearAllPermissions,
  onSubmit,
  isSubmitting,
}: RoleCreateEditModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-[95vw] bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-base-200">
          <div>
            <h3 className="text-xl font-semibold">
              {selectedRole ? 'Rolni tahrirlash' : 'Yangi rol yaratish'}
            </h3>
            <p className="text-sm text-base-content/60">
              {selectedRole ? "Rol ma'lumotlari va huquqlarini o'zgartirish" : "Yangi rol va huquqlarni belgilash"}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm flex-shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — split layout */}
        <div className="flex min-h-0 flex-1">
          {/* Left: form */}
          <div className={`overflow-y-auto p-4 sm:p-6 ${showRolePreview ? 'w-1/2 border-r border-base-200' : 'w-full'}`}>
            <div className="space-y-4">
              {/* System role warning */}
              {selectedRole?.isSystem && (
                <div className="alert alert-warning">
                  <Lock className="h-4 w-4" />
                  <span>Bu tizim roli. Faqat huquqlarni o'zgartirish mumkin.</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-control">
                  <span className="label-text">Rol nomi *</span>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masalan: Buxgalter"
                    disabled={selectedRole?.isSystem}
                  />
                </label>
                <label className="form-control">
                  <span className="label-text">Rol kodi *</span>
                  <input
                    type="text"
                    className="input input-bordered uppercase"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                    placeholder="Masalan: ACCOUNTANT"
                    disabled={!!selectedRole}
                  />
                </label>
              </div>

              <label className="form-control">
                <span className="label-text">Tavsif</span>
                <textarea
                  className="textarea textarea-bordered"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Masalan: Oila byudjetini boshqarish va hisobotlarni ko'rish huquqiga ega"
                  disabled={selectedRole?.isSystem}
                />
              </label>

              {/* Permissions section */}
              <div className="divider">Huquqlar</div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/60">
                  {selectedPermissions.size} ta huquq tanlangan
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={selectAllPermissions}
                  >
                    Hammasini tanlash
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={clearAllPermissions}
                  >
                    Tozalash
                  </button>
                </div>
              </div>

              <PermissionMatrix
                permissionsGrouped={permissionsGrouped}
                selectedPermissions={selectedPermissions}
                togglePermission={togglePermission}
                toggleModule={toggleModule}
                isModuleSelected={isModuleSelected}
                isModulePartiallySelected={isModulePartiallySelected}
              />
            </div>
          </div>

          {/* Right: permissions preview */}
          {showRolePreview && rolePreviewData && (
            <div className="w-1/2 overflow-y-auto p-4 sm:p-6 bg-base-200/20 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {selectedRole ? 'Solishtirish' : 'Ko\'rinish'}
                </span>
                <button
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => setShowRolePreview(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {selectedRole ? (
                /* Edit mode: two-column diff */
                <>
                  {/* Meta fields diff */}
                  <div className="rounded-xl border border-base-200 bg-base-100 overflow-hidden text-sm">
                    <div className="grid grid-cols-2 border-b border-base-200">
                      <div className="px-3 py-1.5 bg-error/10 text-center">
                        <span className="text-xs font-semibold text-error/80 uppercase tracking-wide">Eski</span>
                      </div>
                      <div className="px-3 py-1.5 bg-success/10 text-center border-l border-base-200">
                        <span className="text-xs font-semibold text-success/80 uppercase tracking-wide">Yangi</span>
                      </div>
                    </div>

                    {[
                      { label: 'Nom', old: selectedRole.name, new: rolePreviewData.name },
                      { label: 'Tavsif', old: selectedRole.description || '—', new: rolePreviewData.description || '—' },
                      {
                        label: 'Huquqlar',
                        old: `${(selectedRole.permissions || []).length} ta`,
                        new: `${rolePreviewData.permissions.length} ta`,
                      },
                    ].map(({ label, old: oldVal, new: newVal }) => {
                      const changed = oldVal !== newVal;
                      return (
                        <div
                          key={label}
                          className={`grid grid-cols-2 border-b border-base-200 last:border-0 ${changed ? 'bg-warning/5' : ''}`}
                        >
                          <div className={`px-3 py-2 ${changed ? 'bg-error/5' : ''}`}>
                            <p className="text-xs text-base-content/60 mb-0.5">{label}</p>
                            <p className={`truncate ${changed ? 'line-through text-base-content/60' : ''}`}>{oldVal}</p>
                          </div>
                          <div className={`px-3 py-2 border-l border-base-200 ${changed ? 'bg-success/5' : ''}`}>
                            <p className="text-xs text-base-content/60 mb-0.5">{label}</p>
                            <p className={`truncate ${changed ? 'font-medium text-success' : ''}`}>{newVal}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Permissions diff by module */}
                  {permissionsGrouped && (
                    <div className="space-y-3">
                      {Object.entries(permissionsGrouped).map(([module, allPerms]) => {
                        const oldSet = new Set(selectedRole.permissions || []);
                        const newSet = new Set(rolePreviewData.permissions);
                        // Show module only if anything changed or selected
                        const hasOld = allPerms.some(p => oldSet.has(p.code));
                        const hasNew = allPerms.some(p => newSet.has(p.code));
                        if (!hasOld && !hasNew) return null;

                        return (
                          <div key={module}>
                            <p className="text-xs font-semibold text-base-content/60 mb-1.5 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-primary inline-block" />
                              {module}
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                              <div className="space-y-1">
                                {allPerms.filter(p => oldSet.has(p.code)).map(p => {
                                  const removed = !newSet.has(p.code);
                                  return (
                                    <span
                                      key={p.code}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                                        removed
                                          ? 'bg-error/10 border border-error/20 text-error line-through'
                                          : 'bg-base-200/60 text-base-content/60'
                                      }`}
                                    >
                                      {p.action}
                                    </span>
                                  );
                                })}
                                {!hasOld && <span className="text-xs text-base-content/30 px-2">—</span>}
                              </div>
                              <div className="space-y-1">
                                {allPerms.filter(p => newSet.has(p.code)).map(p => {
                                  const added = !oldSet.has(p.code);
                                  return (
                                    <span
                                      key={p.code}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                                        added
                                          ? 'bg-success/10 border border-success/20 text-success'
                                          : 'bg-base-200/60 text-base-content/60'
                                      }`}
                                    >
                                      {added && <Check className="h-3 w-3 flex-shrink-0" />}
                                      {p.action}
                                    </span>
                                  );
                                })}
                                {!hasNew && <span className="text-xs text-base-content/30 px-2">—</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Create mode: simple preview */
                <div className="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary/15 text-secondary flex-shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{rolePreviewData.name || '—'}</p>
                      <p className="text-xs font-mono text-base-content/50">{rolePreviewData.code || '—'}</p>
                    </div>
                  </div>
                  {rolePreviewData.description && (
                    <p className="text-sm text-base-content/70 border-t border-base-200 pt-3">
                      {rolePreviewData.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 border-t border-base-200 pt-3">
                    <Key className="h-4 w-4 text-base-content/50" />
                    <span className="text-sm text-base-content/60">
                      {rolePreviewData.permissions.length} ta huquq tanlangan
                    </span>
                  </div>
                  {rolePreviewData.permissions.length === 0 ? (
                    <div className="text-center py-4 text-base-content/60 text-sm">
                      Hech qanday huquq tanlanmagan
                    </div>
                  ) : !permissionsGrouped ? (
                    <div className="flex justify-center py-4">
                      <span className="loading loading-spinner loading-sm" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(permissionsGrouped).map(([module, allPerms]) => {
                        const selected = allPerms.filter(p => rolePreviewData.permissions.includes(p.code));
                        if (selected.length === 0) return null;
                        return (
                          <div key={module}>
                            <p className="text-xs font-semibold text-base-content/60 mb-1.5 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-primary inline-block" />
                              {module}
                              <span className="text-base-content/60">({selected.length})</span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {selected.map(p => (
                                <span
                                  key={p.code}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 border border-success/20 text-xs text-success font-medium"
                                >
                                  <Check className="h-3 w-3" />
                                  {p.action}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-base-content/60 text-center">
                Bu faqat ko'rinish — hali saqlanmagan
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 p-4 sm:p-6 border-t border-base-200">
          <button className="btn btn-ghost" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className="btn btn-outline btn-secondary hidden sm:inline-flex"
            onClick={onApply}
            disabled={!formData.name || !formData.code}
          >
            <Eye className="h-4 w-4" />
            Apply
          </button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={
              !formData.name ||
              !formData.code ||
              isSubmitting
            }
          >
            {isSubmitting && (
              <span className="loading loading-spinner loading-sm" />
            )}
            {selectedRole ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
