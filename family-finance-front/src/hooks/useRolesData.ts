import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { rolesApi, permissionsApi } from '../api/roles.api';
import { PermissionCode, usePermission } from './usePermission';
import { toastApiError } from '../utils/apiError';
import type { Role, RoleRequest } from '../types';

/** Create/Edit modal'ining "Apply" preview paneli uchun snapshot. */
export interface RolePreviewData {
  name: string;
  code: string;
  description: string;
  permissions: string[];
}

interface UseRolesDataArgs {
  /** View modal ochiqmi — `['role', id]` query enabled bayrog'i uchun. */
  showViewModal: boolean;
  /** View modalida ko'rilayotgan rol — query kaliti uchun. */
  viewingRole: Role | null;
  /** Create/Edit modalida tahrirlanayotgan rol (yo'q bo'lsa — yaratish rejimi). */
  selectedRole: Role | null;
  /** Create/Edit modalni yopish — create/update mutation onSuccess ichida chaqiriladi. */
  closeModal: () => void;
}

/**
 * RolesPage uchun butun react-query (3 query + 3 mutation), qidiruv holati,
 * form/permission-matrix/preview holati va barcha handler'lar.
 *
 * <p>queryKey'lar (`['roles', search]`, `['permissions-grouped']`, `['role', roleId]`) va
 * onSuccess/invalidate (`['roles']`) mantig'i original RolesPage bilan AYNAN bir xil.</p>
 */
export function useRolesData({
  showViewModal,
  viewingRole,
  selectedRole,
  closeModal,
}: UseRolesDataArgs) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();

  // Search state
  const [search, setSearch] = useState('');

  // Create/Edit form state
  const [formData, setFormData] = useState<RoleRequest>({
    name: '',
    code: '',
    description: '',
    permissions: [],
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  // Create/Edit preview state
  const [showRolePreview, setShowRolePreview] = useState(false);
  const [rolePreviewData, setRolePreviewData] = useState<RolePreviewData | null>(null);

  // ========================
  // Queries
  // ========================

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

  // Fetch full role details for view modal
  const { data: fullRoleDetails, isLoading: isLoadingRoleDetails } = useQuery({
    queryKey: ['role', viewingRole?.id],
    queryFn: () => rolesApi.getById(viewingRole!.id),
    enabled: !!viewingRole && showViewModal,
  });

  // ========================
  // Mutations
  // ========================

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol yaratildi');
      closeModal();
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
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
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success("Rol o'chirildi");
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  // ========================
  // Form helpers (Create/Edit modal ochilishi/yopilishi uchun)
  // ========================

  /** Modalni ochishda formani rol bilan (yoki bo'sh) to'ldiradi. Page openModal ichida chaqiradi. */
  const resetFormFor = (role?: Role) => {
    if (role) {
      setFormData({
        name: role.name,
        code: role.code,
        description: role.description || '',
        permissions: role.permissions ? Array.from(role.permissions) : [],
      });
      setSelectedPermissions(new Set(role.permissions || []));
    } else {
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
  };

  /** Form holatini to'liq tozalaydi. Page closeModal ichida chaqiradi. */
  const clearForm = () => {
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

  // ========================
  // Submit / delete handlers
  // ========================

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

  // ========================
  // Permission matrix handlers
  // ========================

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

  // ========================
  // Export
  // ========================

  const handleExport = async (format: 'excel' | 'pdf') => {
    await rolesApi.export.exportData(format, {
      search: search || undefined,
    });
  };

  return {
    // search state
    search,
    setSearch,
    // queries
    roles,
    isLoading,
    permissionsGrouped,
    fullRoleDetails,
    isLoadingRoleDetails,
    // form / preview state
    formData,
    setFormData,
    selectedPermissions,
    showRolePreview,
    setShowRolePreview,
    rolePreviewData,
    // form helpers
    resetFormFor,
    clearForm,
    handleRoleApply,
    // mutations
    createMutation,
    updateMutation,
    deleteMutation,
    // submit / delete handlers
    handleSubmit,
    handleDelete,
    // permission matrix handlers
    togglePermission,
    toggleModule,
    isModuleSelected,
    isModulePartiallySelected,
    selectAllPermissions,
    clearAllPermissions,
    // export
    handleExport,
  };
}
