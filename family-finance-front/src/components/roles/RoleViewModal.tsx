import { useEffect, useState } from 'react';
import { Shield, Key, Users, Lock, X, Edit2 } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { PermissionGate } from '../common/PermissionGate';
import { PermissionCode, usePermission } from '../../hooks/usePermission';
import { RoleUsersPopover } from './RoleUsersPopover';
import { PermissionMatrix } from './PermissionMatrix';
import type { Permission, Role } from '../../types';

interface RoleViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ko'rilayotgan rol (grid'dan, ID/kesh uchun). */
  viewingRole: Role | null;
  /** To'liq rol tafsilotlari (`['role', id]` query). */
  fullRoleDetails: Role | undefined;
  /** Tafsilotlar yuklanmoqdami. */
  isLoadingRoleDetails: boolean;
  /** Barcha ruxsatlar modul bo'yicha (`['permissions-grouped']`). */
  permissionsGrouped: Record<string, Permission[]> | undefined;
  /** Tezkor "Tahrirlash" — view yopiladi va to'liq rol bilan edit modal ochiladi. */
  onEdit: (role: Role) => void;
}

/** Rolni ko'rish (read-only): asosiy ma'lumotlar, statistika + foydalanuvchilar popover, ruxsatlar ro'yxati. */
export function RoleViewModal({
  isOpen,
  onClose,
  viewingRole,
  fullRoleDetails,
  isLoadingRoleDetails,
  permissionsGrouped,
  onEdit,
}: RoleViewModalProps) {
  const { hasPermission } = usePermission();
  const [showAllPermissions, setShowAllPermissions] = useState(false);
  const [showUsersPopover, setShowUsersPopover] = useState(false);

  // Modal yopilganda/boshqa rolga o'tilganda view-local holatni tiklaymiz
  useEffect(() => {
    if (!isOpen) {
      setShowUsersPopover(false);
    }
  }, [isOpen]);

  const assignedCodes = new Set(fullRoleDetails?.permissions || []);
  const userCount = fullRoleDetails?.userCount || 0;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
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
              onClick={onClose}
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
                    userCount > 0
                      ? 'bg-base-200 hover:bg-base-300 cursor-pointer'
                      : 'bg-base-200 cursor-default'
                  }`}
                  onClick={() => {
                    if (userCount > 0) {
                      setShowUsersPopover(!showUsersPopover);
                    }
                  }}
                  disabled={userCount === 0}
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
                  {userCount > 0 && (
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
                  <RoleUsersPopover
                    users={fullRoleDetails.users}
                    onClose={() => setShowUsersPopover(false)}
                  />
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
                    className={`btn btn-sm ${!showAllPermissions ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    Faqat biriktirilganlar
                  </button>
                  <button
                    onClick={() => setShowAllPermissions(true)}
                    className={`btn btn-sm ${showAllPermissions ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    Barchasi
                  </button>
                </div>
              </div>

              <PermissionMatrix
                readOnly
                permissionsGrouped={permissionsGrouped}
                assignedCodes={assignedCodes}
                showUnassigned={showAllPermissions}
                isLoading={isLoadingRoleDetails}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              Yopish
            </button>

            {/* Quick Edit button if user has permission */}
            <PermissionGate permission={PermissionCode.ROLES_UPDATE}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (fullRoleDetails) {
                    onEdit(fullRoleDetails);
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
  );
}
