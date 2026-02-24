import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCog,
  Search,
  Eye,
  Edit2,
  Key,
  Shield,
  Power,
  X,
  Copy,
  AlertTriangle,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users.api';
import { rolesApi } from '../../api/roles.api';
import { ModalPortal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import type { CredentialsInfo, Role } from '../../types';
import type { UserDetail, UpdateUserRequest } from '../../api/users.api';

type ModalType = 'view' | 'edit' | 'password' | 'roles' | null;

export function UsersPage() {
  const queryClient = useQueryClient();

  // Search & filter state
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    fullName: '',
    email: '',
    phone: '',
  });

  // Password reset state
  const [credentials, setCredentials] = useState<CredentialsInfo | null>(null);

  // Role modal state
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // ========================
  // Queries
  // ========================

  const activeParam = activeFilter === 'all' ? undefined : activeFilter === 'active';

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ['users', search, activeFilter, page],
    queryFn: () => usersApi.search({ search: search || undefined, active: activeParam, page, size: pageSize }),
  });

  const { data: userDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['user-detail', selectedUser?.id],
    queryFn: () => usersApi.getById(selectedUser!.id),
    enabled: !!selectedUser && (modalType === 'view' || modalType === 'roles'),
  });

  const { data: allRoles } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => rolesApi.getAll(),
    enabled: modalType === 'roles',
  });

  // ========================
  // Mutations
  // ========================

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foydalanuvchi yangilandi');
      closeModal();
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: usersApi.resetPassword,
    onSuccess: (data) => {
      setCredentials(data);
  
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  const activateMutation = useMutation({
    mutationFn: usersApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foydalanuvchi aktivlashtirildi');
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Foydalanuvchi o'chirildi");
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: number; userId: number }) =>
      rolesApi.assignToUser(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rol biriktirildi');
      setSelectedRoleId(null);
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: number; userId: number }) =>
      rolesApi.removeFromUser(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rol olib tashlandi');
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    },
  });

  // ========================
  // Handlers
  // ========================

  const openModal = (type: ModalType, user: UserDetail) => {
    setSelectedUser(user);
    setModalType(type);
    setCredentials(null);

    setSelectedRoleId(null);

    if (type === 'edit') {
      setEditForm({
        fullName: user.fullName,
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setCredentials(null);

    setSelectedRoleId(null);
  };

  const handleUpdate = () => {
    if (!selectedUser) return;
    updateMutation.mutate({ id: selectedUser.id, data: editForm });
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    resetPasswordMutation.mutate(selectedUser.id);
  };

  const handleToggleActive = (user: UserDetail) => {
    if (user.active) {
      deactivateMutation.mutate(user.id);
    } else {
      activateMutation.mutate(user.id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Nusxalandi');
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    usersApi.export.exportData(format, {
      search: search || undefined,
      active: activeParam,
    });
  };

  // Pagination
  const totalPages = usersPage?.totalPages || 0;

  // Available roles for assignment (exclude already assigned)
  const assignedRoleCodes = new Set(userDetails?.roleDetails?.map(r => r.code) || []);
  const availableRoles = (allRoles || []).filter((r: Role) => !assignedRoleCodes.has(r.code) && r.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Foydalanuvchilar boshqaruvi</h1>
          <p className="text-sm text-base-content/60">
            Tizim foydalanuvchilarini ko'rish va boshqarish
          </p>
        </div>
        <PermissionGate permission={PermissionCode.REPORTS_EXPORT}>
          <div className="flex gap-2">
            <ExportButtons
              onExportExcel={() => handleExport('excel')}
              onExportPdf={() => handleExport('pdf')}
              disabled={!usersPage?.content?.length}
            />
          </div>
        </PermissionGate>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            placeholder="Ism, username, email yoki telefon..."
            className="input input-bordered input-sm w-full pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <select
          className="select select-bordered select-sm w-full sm:w-40"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">Barchasi</option>
          <option value="active">Faol</option>
          <option value="inactive">Nofaol</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : !usersPage?.content?.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-base-content/50">
          <UserCog className="mb-3 h-12 w-12 opacity-30" />
          <p>Foydalanuvchilar topilmadi</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-base-200">
          <table className="table table-zebra">
            <thead>
              <tr className="bg-base-200/50">
                <th className="w-12">#</th>
                <th>Foydalanuvchi</th>
                <th className="hidden md:table-cell">Email</th>
                <th className="hidden lg:table-cell">Telefon</th>
                <th className="hidden sm:table-cell">Rollar</th>
                <th>Holati</th>
                <th className="text-center">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {usersPage.content.map((user, index) => (
                <tr key={user.id} className="hover">
                  <td className="text-base-content/50">
                    {page * pageSize + index + 1}
                  </td>
                  <td>
                    <div>
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-xs text-base-content/50">@{user.username}</div>
                    </div>
                  </td>
                  <td className="hidden text-sm md:table-cell">
                    {user.email || <span className="text-base-content/30">—</span>}
                  </td>
                  <td className="hidden text-sm lg:table-cell">
                    {user.phone || <span className="text-base-content/30">—</span>}
                  </td>
                  <td className="hidden sm:table-cell">
                    {user.rolesText ? (
                      <div className="flex flex-wrap gap-1">
                        {user.rolesText.split(', ').map((role) => (
                          <span key={role} className="badge badge-ghost badge-sm">
                            {role}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-base-content/30">—</span>
                    )}
                  </td>
                  <td>
                    {user.active ? (
                      <span className="badge badge-success badge-sm gap-1">Faol</span>
                    ) : (
                      <span className="badge badge-error badge-sm gap-1">Nofaol</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <PermissionGate permission={PermissionCode.USERS_VIEW}>
                        <button
                          className="btn btn-ghost btn-xs"
                          title="Ko'rish"
                          onClick={() => openModal('view', user)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={PermissionCode.USERS_UPDATE}>
                        <button
                          className="btn btn-ghost btn-xs"
                          title="Tahrirlash"
                          onClick={() => openModal('edit', user)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={PermissionCode.USERS_UPDATE}>
                        <button
                          className="btn btn-ghost btn-xs"
                          title="Parolni tiklash"
                          onClick={() => openModal('password', user)}
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={PermissionCode.USERS_CHANGE_ROLE}>
                        <button
                          className="btn btn-ghost btn-xs"
                          title="Rollar"
                          onClick={() => openModal('roles', user)}
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                      {user.active ? (
                        <PermissionGate permission={PermissionCode.USERS_DELETE}>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            title="O'chirish"
                            onClick={() => handleToggleActive(user)}
                            disabled={deactivateMutation.isPending}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                      ) : (
                        <PermissionGate permission={PermissionCode.USERS_UPDATE}>
                          <button
                            className="btn btn-ghost btn-xs text-success"
                            title="Faollashtirish"
                            onClick={() => handleToggleActive(user)}
                            disabled={activateMutation.isPending}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-base-content/60">
            Jami: {usersPage?.totalElements || 0} ta foydalanuvchi
          </p>
          <div className="join">
            <button
              className="join-item btn btn-sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              «
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`join-item btn btn-sm ${page === pageNum ? 'btn-active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              className="join-item btn btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* ======================== */}
      {/* View Modal */}
      {/* ======================== */}
      <ModalPortal isOpen={modalType === 'view'} onClose={closeModal}>
        <div className="modal modal-open" onClick={closeModal}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={closeModal}>
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-bold">Foydalanuvchi tafsilotlari</h3>

            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner" />
              </div>
            ) : userDetails ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-base-content/50">Username</span>
                    <p className="font-medium">@{userDetails.username}</p>
                  </div>
                  <div>
                    <span className="text-base-content/50">To'liq ism</span>
                    <p className="font-medium">{userDetails.fullName}</p>
                  </div>
                  <div>
                    <span className="text-base-content/50">Email</span>
                    <p className="font-medium">{userDetails.email || '—'}</p>
                  </div>
                  <div>
                    <span className="text-base-content/50">Telefon</span>
                    <p className="font-medium">{userDetails.phone || '—'}</p>
                  </div>
                  <div>
                    <span className="text-base-content/50">Holat</span>
                    <p>
                      {userDetails.active ? (
                        <span className="badge badge-success badge-sm">Faol</span>
                      ) : (
                        <span className="badge badge-error badge-sm">Nofaol</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-base-content/50">Parol o'zgartirilishi kerak</span>
                    <p>{userDetails.mustChangePassword ? 'Ha' : 'Yo\'q'}</p>
                  </div>
                  <div>
                    <span className="text-base-content/50">Yaratuvchi</span>
                    <p className="font-medium">{userDetails.createdByUsername || '—'}</p>
                  </div>
                  <div>
                    <span className="text-base-content/50">Oila guruhi</span>
                    <p className="font-medium">{userDetails.familyGroupName || '—'}</p>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <span className="text-sm text-base-content/50">Rollar</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {userDetails.roleDetails?.length ? (
                      userDetails.roleDetails.map((role) => (
                        <span key={role.id} className="badge badge-primary badge-sm">{role.name}</span>
                      ))
                    ) : (
                      <span className="text-sm text-base-content/30">Rollar biriktirilmagan</span>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-3 border-t border-base-200 pt-3 text-xs text-base-content/50">
                  <div>
                    <span>Yaratilgan:</span>{' '}
                    {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleString('uz') : '—'}
                  </div>
                  <div>
                    <span>Parol o'zgartirilgan:</span>{' '}
                    {userDetails.passwordChangedAt
                      ? new Date(userDetails.passwordChangedAt).toLocaleString('uz')
                      : '—'}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </ModalPortal>

      {/* ======================== */}
      {/* Edit Modal */}
      {/* ======================== */}
      <ModalPortal isOpen={modalType === 'edit'} onClose={closeModal}>
        <div className="modal modal-open" onClick={closeModal}>
          <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={closeModal}>
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-bold">
              Foydalanuvchini tahrirlash
            </h3>

            <div className="space-y-3">
              <div>
                <label className="label">
                  <span className="label-text">To'liq ism *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered input-sm w-full"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Telefon</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered input-sm w-full"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleUpdate}
                disabled={!editForm.fullName.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : null}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* ======================== */}
      {/* Password Reset Modal */}
      {/* ======================== */}
      <ModalPortal isOpen={modalType === 'password'} onClose={closeModal}>
        <div className="modal modal-open" onClick={closeModal}>
          <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={closeModal}>
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-bold">Parolni tiklash</h3>

            {credentials ? (
              /* Show credentials after reset */
              <div className="space-y-4">
                <div className="alert alert-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Bu parol faqat bir marta ko'rsatiladi!</span>
                </div>

                <div className="rounded-lg bg-base-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-base-content/50">Username</span>
                      <p className="font-mono font-bold">{credentials.username}</p>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => copyToClipboard(credentials.username)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-base-content/50">Yangi parol</span>
                      <p className="font-mono font-bold text-primary">
                        {credentials.temporaryPassword}
                      </p>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => copyToClipboard(credentials.temporaryPassword)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-base-content/60">{credentials.message}</p>

                <div className="modal-action">
                  <button className="btn btn-primary btn-sm" onClick={closeModal}>
                    Yopish
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation before reset */
              <div className="space-y-4">
                <p className="text-sm">
                  <strong>{selectedUser?.fullName}</strong> (@{selectedUser?.username})
                  ning parolini tiklashni xohlaysizmi?
                </p>
                <p className="text-xs text-base-content/60">
                  Yangi vaqtinchalik parol yaratiladi. Foydalanuvchi keyingi kirishda parolni o'zgartirishi kerak bo'ladi.
                </p>

                <div className="modal-action">
                  <button className="btn btn-ghost btn-sm" onClick={closeModal}>
                    Bekor qilish
                  </button>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={handleResetPassword}
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Key className="h-3.5 w-3.5" />
                    )}
                    Parolni tiklash
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalPortal>

      {/* ======================== */}
      {/* Role Assignment Modal */}
      {/* ======================== */}
      <ModalPortal isOpen={modalType === 'roles'} onClose={closeModal}>
        <div className="modal modal-open" onClick={closeModal}>
          <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={closeModal}>
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-bold">
              Rollar boshqarish — {selectedUser?.fullName}
            </h3>

            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current roles */}
                <div>
                  <span className="text-sm font-medium text-base-content/60">Mavjud rollar</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {userDetails?.roleDetails?.length ? (
                      userDetails.roleDetails.map((role) => (
                        <div key={role.id} className="badge badge-primary gap-1 pr-1">
                          {role.name}
                          <button
                            className="btn btn-ghost btn-xs btn-circle"
                            onClick={() =>
                              removeRoleMutation.mutate({
                                roleId: role.id,
                                userId: selectedUser!.id,
                              })
                            }
                            disabled={removeRoleMutation.isPending}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-base-content/30">Rollar biriktirilmagan</span>
                    )}
                  </div>
                </div>

                {/* Assign new role */}
                {availableRoles.length > 0 && (
                  <div className="border-t border-base-200 pt-4">
                    <span className="text-sm font-medium text-base-content/60">Yangi rol biriktirish</span>
                    <div className="mt-2 flex gap-2">
                      <select
                        className="select select-bordered select-sm flex-1"
                        value={selectedRoleId || ''}
                        onChange={(e) => setSelectedRoleId(Number(e.target.value) || null)}
                      >
                        <option value="">Rol tanlang...</option>
                        {availableRoles.map((role: Role) => (
                          <option key={role.id} value={role.id}>
                            {role.name} ({role.code})
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!selectedRoleId || assignRoleMutation.isPending}
                        onClick={() => {
                          if (selectedRoleId && selectedUser) {
                            assignRoleMutation.mutate({
                              roleId: selectedRoleId,
                              userId: selectedUser.id,
                            });
                          }
                        }}
                      >
                        {assignRoleMutation.isPending ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
