import { useState } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  Users,
  Key,
  Lock,
  Eye,
} from 'lucide-react';
import { ExportButtons } from '../../components/common/ExportButtons';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';
import { useRolesData } from '../../hooks/useRolesData';
import { RoleCreateEditModal } from '../../components/roles/RoleCreateEditModal';
import { RoleViewModal } from '../../components/roles/RoleViewModal';
import type { Role } from '../../types';

export function RolesPage() {
  // Create/Edit modal trigger state
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // View modal trigger state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    data.clearForm();
  };

  const data = useRolesData({
    showViewModal,
    viewingRole,
    selectedRole,
    closeModal,
  });

  const {
    search,
    setSearch,
    roles,
    isLoading,
    permissionsGrouped,
    fullRoleDetails,
    isLoadingRoleDetails,
    formData,
    setFormData,
    selectedPermissions,
    showRolePreview,
    setShowRolePreview,
    rolePreviewData,
    resetFormFor,
    handleRoleApply,
    createMutation,
    updateMutation,
    deleteMutation,
    handleSubmit,
    handleDelete,
    togglePermission,
    toggleModule,
    isModuleSelected,
    isModulePartiallySelected,
    selectAllPermissions,
    clearAllPermissions,
    handleExport,
  } = data;

  const openModal = (role?: Role) => {
    setSelectedRole(role ?? null);
    resetFormFor(role);
    setShowModal(true);
  };

  const openViewModal = (role: Role) => {
    setViewingRole(role);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingRole(null);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Rollar"
        subtitle="Rollar va huquqlarni boshqarish"
        actions={
          <>
            <ExportButtons
              onExportExcel={() => handleExport('excel')}
              onExportPdf={() => handleExport('pdf')}
              disabled={!roles?.content || roles.content.length === 0}
              loading={isLoading}
            />
            <PermissionGate permission={PermissionCode.ROLES_CREATE}>
              <button className="btn btn-primary btn-sm gap-1.5" onClick={() => openModal()}>
                <Plus className="h-4 w-4" />
                Yangi rol
              </button>
            </PermissionGate>
          </>
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/40" />
        <input
          type="text"
          placeholder="Rol nomi yoki kodi..."
          className="input input-bordered w-full pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {roles?.content?.map((role) => (
            <div
              key={role.id}
              className="card-native transition-shadow hover:shadow-md"
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-lg ${
                      role.isSystem ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'
                    }`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-xs text-base-content/50">{role.code}</p>
                    </div>
                  </div>
                  {role.isSystem && (
                    <span className="badge badge-primary badge-sm">Tizim</span>
                  )}
                </div>

                {role.description && (
                  <p className="mt-2 text-sm text-base-content/60 line-clamp-2">
                    {role.description}
                  </p>
                )}

                <div className="mt-3 flex gap-4 text-sm text-base-content/60">
                  <div className="flex items-center gap-1">
                    <Key className="h-4 w-4" />
                    <span>{role.permissionCount || 0} huquq</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{role.userCount || 0} foydalanuvchi</span>
                  </div>
                </div>

                <div className="card-actions mt-3 justify-end">
                  <PermissionGate permission={PermissionCode.ROLES_VIEW}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openViewModal(role)}
                      title="Ko'rish"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PermissionCode.ROLES_UPDATE}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openModal(role)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PermissionCode.ROLES_DELETE}>
                    <button
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => handleDelete(role)}
                      disabled={role.isSystem || deleteMutation.isPending}
                    >
                      {role.isSystem ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <RoleCreateEditModal
        isOpen={showModal}
        onClose={closeModal}
        selectedRole={selectedRole}
        permissionsGrouped={permissionsGrouped}
        formData={formData}
        setFormData={setFormData}
        selectedPermissions={selectedPermissions}
        showRolePreview={showRolePreview}
        setShowRolePreview={setShowRolePreview}
        rolePreviewData={rolePreviewData}
        onApply={handleRoleApply}
        togglePermission={togglePermission}
        toggleModule={toggleModule}
        isModuleSelected={isModuleSelected}
        isModulePartiallySelected={isModulePartiallySelected}
        selectAllPermissions={selectAllPermissions}
        clearAllPermissions={clearAllPermissions}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* View Modal - Read-only role details */}
      <RoleViewModal
        isOpen={showViewModal}
        onClose={closeViewModal}
        viewingRole={viewingRole}
        fullRoleDetails={fullRoleDetails}
        isLoadingRoleDetails={isLoadingRoleDetails}
        permissionsGrouped={permissionsGrouped}
        onEdit={(role) => {
          closeViewModal();
          openModal(role);
        }}
      />
    </div>
  );
}
