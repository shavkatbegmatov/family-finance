import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  Users,
  Key,
  Lock,
  X,
  Eye,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rolesApi, permissionsApi } from '../../api/roles.api';
import { ModalPortal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { usePermission, PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import type { Role, RoleRequest } from '../../types';

export function RolesPage() {
  const { hasPermission } = usePermission();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleRequest>({
    name: '',
    code: '',
    description: '',
    permissions: [],
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  // View modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [showAllPermissions, setShowAllPermissions] = useState(false);
  const [showUsersPopover, setShowUsersPopover] = useState(false);

  // Create/Edit preview state
  const [showRolePreview, setShowRolePreview] = useState(false);
  const [rolePreviewData, setRolePreviewData] = useState<{
    name: string; code: string; description: string; permissions: string[];
  } | null>(null);

  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles', search],
    queryFn: () => rolesApi.search({ search, size: 100 }),
  });

  // Fetch all permissions grouped by module
  const { data: permissionsGrouped } = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: () => permissionsApi.getAllGrouped(),
  });

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol yaratildi');
      closeModal();
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      // Skip toast for 403 errors (axios interceptor handles them)
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  // Update role mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleRequest }) =>
      rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol yangilandi');
      closeModal();
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      // Skip toast for 403 errors (axios interceptor handles them)
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success("Rol o'chirildi");
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      // Skip toast for 403 errors (axios interceptor handles them)
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  const openModal = (role?: Role) => {
    if (role) {
      setSelectedRole(role);
      setFormData({
        name: role.name,
        code: role.code,
        description: role.description || '',
        permissions: role.permissions ? Array.from(role.permissions) : [],
      });
      setSelectedPermissions(new Set(role.permissions || []));
    } else {
      setSelectedRole(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        permissions: [],
      });
      setSelectedPermissions(new Set());
    }
    setShowRolePreview(false);
    setRolePreviewData(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setFormData({ name: '', code: '', description: '', permissions: [] });
    setSelectedPermissions(new Set());
    setShowRolePreview(false);
    setRolePreviewData(null);
  };

  const handleRoleApply = () => {
    setRolePreviewData({
      name: formData.name,
      code: formData.code,
      description: formData.description || '',
      permissions: Array.from(selectedPermissions),
    });
    setShowRolePreview(true);
  };

  // Fetch full role details for view modal
  const { data: fullRoleDetails, isLoading: isLoadingRoleDetails } = useQuery({
    queryKey: ['role', viewingRole?.id],
    queryFn: () => rolesApi.getById(viewingRole!.id),
    enabled: !!viewingRole && showViewModal,
  });

  const openViewModal = (role: Role) => {
    setViewingRole(role);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingRole(null);
  };

  const handleSubmit = () => {
    // Check permission before API call
    const requiredPermission = selectedRole
      ? PermissionCode.ROLES_UPDATE
      : PermissionCode.ROLES_CREATE;

    if (!hasPermission(requiredPermission)) {
      toast.error("Sizda bu amalni bajarish huquqi yo'q", {
        icon: '🔒',
      });
      return;
    }

    const data: RoleRequest = {
      ...formData,
      permissions: Array.from(selectedPermissions),
    };

    if (selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) {
      toast.error("Tizim rollarini o'chirish mumkin emas");
      return;
    }

    // Check permission before API call
    if (!hasPermission(PermissionCode.ROLES_DELETE)) {
      toast.error("Sizda bu amalni bajarish huquqi yo'q", {
        icon: '🔒',
      });
      return;
    }

    if (confirm(`"${role.name}" rolini o'chirishni tasdiqlaysizmi?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  const togglePermission = (code: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedPermissions(newSet);
  };

  const toggleModule = (module: string) => {
    const modulePermissions = permissionsGrouped?.[module] || [];
    const allSelected = modulePermissions.every(p => selectedPermissions.has(p.code));
    const newSet = new Set(selectedPermissions);

    if (allSelected) {
      modulePermissions.forEach(p => newSet.delete(p.code));
    } else {
      modulePermissions.forEach(p => newSet.add(p.code));
    }
    setSelectedPermissions(newSet);
  };

  const isModuleSelected = (module: string) => {
    const modulePermissions = permissionsGrouped?.[module] || [];
    return modulePermissions.length > 0 && modulePermissions.every(p => selectedPermissions.has(p.code));
  };

  const isModulePartiallySelected = (module: string) => {
    const modulePermissions = permissionsGrouped?.[module] || [];
    const selectedCount = modulePermissions.filter(p => selectedPermissions.has(p.code)).length;
    return selectedCount > 0 && selectedCount < modulePermissions.length;
  };

  const selectAllPermissions = () => {
    if (!permissionsGrouped) return;
    const allCodes = Object.values(permissionsGrouped).flat().map(p => p.code);
    setSelectedPermissions(new Set(allCodes));
  };

  const clearAllPermissions = () => {
    setSelectedPermissions(new Set());
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    await rolesApi.export.exportData(format, {
      search: search || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rollar boshqaruvi</h1>
          <p className="text-sm text-base-content/60">
            Foydalanuvchi rollari va huquqlarini boshqarish
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            disabled={!roles?.content || roles.content.length === 0}
            loading={isLoading}
          />
          <PermissionGate permission={PermissionCode.ROLES_CREATE}>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus className="h-5 w-5" />
              Yangi rol
            </button>
          </PermissionGate>
        </div>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles?.content?.map((role) => (
            <div
              key={role.id}
              className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="card-body p-5">
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
      <ModalPortal isOpen={showModal} onClose={closeModal}>
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
            <button className="btn btn-ghost btn-sm flex-shrink-0" onClick={closeModal}>
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
                      className="btn btn-ghost btn-xs"
                      onClick={selectAllPermissions}
                    >
                      Hammasini tanlash
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={clearAllPermissions}
                    >
                      Tozalash
                    </button>
                  </div>
                </div>

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
                              <p className="text-xs text-base-content/40 mb-0.5">{label}</p>
                              <p className={`truncate ${changed ? 'line-through text-base-content/40' : ''}`}>{oldVal}</p>
                            </div>
                            <div className={`px-3 py-2 border-l border-base-200 ${changed ? 'bg-success/5' : ''}`}>
                              <p className="text-xs text-base-content/40 mb-0.5">{label}</p>
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
                      <div className="text-center py-4 text-base-content/40 text-sm">
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
                                <span className="text-base-content/40">({selected.length})</span>
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

                <p className="text-xs text-base-content/40 text-center">
                  Bu faqat ko'rinish — hali saqlanmagan
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex justify-end gap-2 p-4 sm:p-6 border-t border-base-200">
            <button className="btn btn-ghost" onClick={closeModal}>
              Bekor qilish
            </button>
            <button
              className="btn btn-outline btn-secondary hidden sm:inline-flex"
              onClick={handleRoleApply}
              disabled={!formData.name || !formData.code}
            >
              <Eye className="h-4 w-4" />
              Apply
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={
                !formData.name ||
                !formData.code ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <span className="loading loading-spinner loading-sm" />
              )}
              {selectedRole ? 'Saqlash' : 'Yaratish'}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* View Modal - Read-only role details */}
      <ModalPortal isOpen={showViewModal} onClose={closeViewModal}>
        <div className="w-full max-w-7xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className={`grid h-12 w-12 place-items-center rounded-lg ${
                  viewingRole?.isSystem
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary/15 text-secondary'
                }`}>
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{viewingRole?.name}</h3>
                  <p className="text-sm text-base-content/60">Rol tafsilotlari</p>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={closeViewModal}
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* System role badge */}
            {viewingRole?.isSystem && (
              <div className="alert alert-info mb-6">
                <Lock className="h-4 w-4" />
                <span>Bu tizim roli va o'zgartirib bo'lmaydi</span>
              </div>
            )}

            {/* Role Details */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content/80 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Asosiy ma'lumotlar
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-base-content/60 mb-1 block">
                      Rol nomi
                    </label>
                    <div className="px-4 py-2 bg-base-200 rounded-lg">
                      {fullRoleDetails?.name || viewingRole?.name}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-base-content/60 mb-1 block">
                      Rol kodi
                    </label>
                    <div className="px-4 py-2 bg-base-200 rounded-lg font-mono text-sm">
                      {fullRoleDetails?.code || viewingRole?.code}
                    </div>
                  </div>
                </div>

                {(fullRoleDetails?.description || viewingRole?.description) && (
                  <div>
                    <label className="text-sm font-medium text-base-content/60 mb-1 block">
                      Tavsif
                    </label>
                    <div className="px-4 py-2 bg-base-200 rounded-lg">
                      {fullRoleDetails?.description || viewingRole?.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="divider"></div>

              {/* Statistics */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Huquqlar soni</p>
                    <p className="text-2xl font-semibold">
                      {fullRoleDetails?.permissions?.length || viewingRole?.permissionCount || 0}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    className={`flex items-center gap-3 p-4 rounded-lg w-full text-left transition-all ${
                      (fullRoleDetails?.userCount || 0) > 0
                        ? 'bg-base-200 hover:bg-base-300 cursor-pointer'
                        : 'bg-base-200 cursor-default'
                    }`}
                    onClick={() => {
                      if ((fullRoleDetails?.userCount || 0) > 0) {
                        setShowUsersPopover(!showUsersPopover);
                      }
                    }}
                    disabled={(fullRoleDetails?.userCount || 0) === 0}
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary/15 text-secondary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-base-content/60">Foydalanuvchilar</p>
                      <p className="text-2xl font-semibold">
                        {fullRoleDetails?.userCount || viewingRole?.userCount || 0}
                      </p>
                    </div>
                    {(fullRoleDetails?.userCount || 0) > 0 && (
                      <svg
                        className={`h-5 w-5 text-base-content/40 transition-transform ${
                          showUsersPopover ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* Users Popover */}
                  {showUsersPopover && fullRoleDetails?.users && fullRoleDetails.users.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-base-100 rounded-lg shadow-xl border border-base-300 max-h-80 overflow-y-auto">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-base-300">
                          <h5 className="font-semibold text-sm">Biriktirilgan foydalanuvchilar</h5>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setShowUsersPopover(false)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {fullRoleDetails.users.map((user) => (
                            <div
                              key={user.id}
                              className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                                user.active
                                  ? 'bg-base-200 hover:bg-base-300'
                                  : 'bg-base-200/50 opacity-60'
                              }`}
                            >
                              <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ${
                                user.active
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-base-300 text-base-content/40'
                              }`}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {user.fullName}
                                  </p>
                                  {!user.active && (
                                    <span className="badge badge-xs badge-ghost">
                                      Faol emas
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-base-content/60 truncate">
                                  @{user.username}
                                </p>
                                {(user.email || user.phone) && (
                                  <p className="text-xs text-base-content/50 truncate">
                                    {user.email || user.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="divider"></div>

              {/* Permissions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-base-content/80 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Huquqlar
                  </h4>

                  {/* Toggle between assigned only and all permissions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAllPermissions(false)}
                      className={`btn btn-xs ${!showAllPermissions ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Faqat biriktirilganlar
                    </button>
                    <button
                      onClick={() => setShowAllPermissions(true)}
                      className={`btn btn-xs ${showAllPermissions ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Barchasi
                    </button>
                  </div>
                </div>

                {isLoadingRoleDetails || !permissionsGrouped ? (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-md" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      // Get role permission codes
                      const rolePermCodes = new Set(fullRoleDetails?.permissions || []);

                      // Filter and group permissions by module
                      return Object.entries(permissionsGrouped)
                        .map(([module, allPerms]) => {
                          const modulePerms = showAllPermissions
                            ? allPerms
                            : allPerms.filter(p => rolePermCodes.has(p.code));

                          return {
                            module,
                            permissions: modulePerms,
                            assignedCount: allPerms.filter(p => rolePermCodes.has(p.code)).length,
                            totalCount: allPerms.length
                          };
                        })
                        .filter(({ permissions }) => permissions.length > 0)
                        .map(({ module, permissions, assignedCount, totalCount }) => (
                          <div key={module} className="space-y-2">
                            <h5 className="font-medium text-sm text-base-content/70 flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-primary"></div>
                              {module}
                              <span className="text-xs text-base-content/50">
                                {showAllPermissions
                                  ? `(${assignedCount}/${totalCount})`
                                  : `(${assignedCount})`
                                }
                              </span>
                            </h5>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {permissions.map((permission) => {
                                const isAssigned = rolePermCodes.has(permission.code);
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
                        ));
                    })()}

                    {fullRoleDetails && (!fullRoleDetails.permissions || fullRoleDetails.permissions.length === 0) && !showAllPermissions && (
                      <div className="text-center py-8 text-base-content/60">
                        <Key className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Hech qanday huquq biriktirilmagan</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={closeViewModal}>
                Yopish
              </button>

              {/* Quick Edit button if user has permission */}
              <PermissionGate permission={PermissionCode.ROLES_UPDATE}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    closeViewModal();
                    if (fullRoleDetails) {
                      openModal(fullRoleDetails);
                    }
                  }}
                  disabled={(viewingRole?.isSystem && !hasPermission(PermissionCode.ROLES_UPDATE)) || !fullRoleDetails}
                >
                  <Edit2 className="h-4 w-4" />
                  Tahrirlash
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
