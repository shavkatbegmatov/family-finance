import { useState } from 'react';
import { UserCog, Search } from 'lucide-react';
import { ExportButtons } from '../../components/common/ExportButtons';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';
import { SuggestionsBanner } from '../../components/persons';
import { useUsersData, type UsersModalType } from '../../hooks/useUsersData';
import { UserTable } from '../../components/users/UserTable';
import { UserMobileCard } from '../../components/users/UserMobileCard';
import { ViewUserModal } from '../../components/users/ViewUserModal';
import { EditUserModal } from '../../components/users/EditUserModal';
import { LinkFamilyMemberModal } from '../../components/users/LinkFamilyMemberModal';
import { PasswordResetModal } from '../../components/users/PasswordResetModal';
import { RoleAssignmentModal } from '../../components/users/RoleAssignmentModal';
import { ChangeUsernameModal } from '../../components/users/ChangeUsernameModal';
import type { UserDetail } from '../../api/users.api';

export function UsersPage() {
  // Modal state
  const [modalType, setModalType] = useState<UsersModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  // Family link state — hook hosila transfer mantig'i uchun shu qiymatlarni o'qiydi
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<number | null>(null);
  const [familySearch, setFamilySearch] = useState('');
  const [familyLinkReason, setFamilyLinkReason] = useState('');
  const [familyUnlinkReason, setFamilyUnlinkReason] = useState('');

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setSelectedFamilyMemberId(null);
    setFamilySearch('');
    setFamilyLinkReason('');
    setFamilyUnlinkReason('');
  };

  const data = useUsersData({
    modalType,
    selectedUser,
    selectedFamilyMemberId,
    familyLinkReason,
    familySearch,
    closeModal,
  });

  const openModal = (type: UsersModalType, user: UserDetail) => {
    setSelectedUser(user);
    setModalType(type);
    data.setSelectedRoleId(null);

    if (type === 'family-link') {
      setSelectedFamilyMemberId(user.linkedFamilyMemberId ?? null);
      setFamilySearch('');
      setFamilyLinkReason('');
      setFamilyUnlinkReason('');
    }
  };

  const {
    canManagePoints,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    pageSize,
    usersPage,
    isLoading,
    userSuggestions,
    userDetails,
    isLoadingDetails,
    credentials,
    selectedRoleId,
    setSelectedRoleId,
    totalPages,
    availableRoles,
    filteredFamilyMembers,
    isLoadingFamilyMembers,
    willTransfer,
    linkReasonRequired,
    canSubmitLink,
    updateMutation,
    resetPasswordMutation,
    activateMutation,
    deactivateMutation,
    assignRoleMutation,
    removeRoleMutation,
    changeUsernameMutation,
    linkFamilyMemberMutation,
    unlinkFamilyMemberMutation,
    quickAddParticipantMutation,
    handleUpdate,
    handleResetPassword,
    handleChangeUsername,
    handleToggleActive,
    handleLinkFamilyMember,
    handleUnlinkFamilyMember,
    handleExport,
  } = data;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Foydalanuvchilar"
        subtitle="Tizim foydalanuvchilarini ko'rish va boshqarish"
        actions={
          <PermissionGate permission={PermissionCode.REPORTS_EXPORT}>
            <ExportButtons
              onExportExcel={() => handleExport('excel')}
              onExportPdf={() => handleExport('pdf')}
              disabled={!usersPage?.content?.length}
            />
          </PermissionGate>
        }
      />

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

      {/* Smart suggestions — capability bo'shliqlari haqida eslatma */}
      {userSuggestions.length > 0 && (
        <SuggestionsBanner suggestions={userSuggestions} />
      )}

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
        <>
          {/* Mobil: foydalanuvchi kartalari */}
          <div className="space-y-2 lg:hidden">
            {usersPage.content.map((user) => (
              <UserMobileCard
                key={user.id}
                user={user}
                onOpenModal={openModal}
                onToggleActive={handleToggleActive}
                deactivatePending={deactivateMutation.isPending}
                activatePending={activateMutation.isPending}
              />
            ))}
          </div>

          {/* Desktop: jadval */}
          <UserTable
            users={usersPage.content}
            page={page}
            pageSize={pageSize}
            canManagePoints={canManagePoints}
            onOpenModal={openModal}
            onToggleActive={handleToggleActive}
            onQuickAddParticipant={(user) => quickAddParticipantMutation.mutate(user)}
            deactivatePending={deactivateMutation.isPending}
            activatePending={activateMutation.isPending}
          />
        </>
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
              {'<'}
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
              {'>'}
            </button>
          </div>
        </div>
      )}

      {/* ======================== Modals ======================== */}
      <ViewUserModal
        isOpen={modalType === 'view'}
        onClose={closeModal}
        userDetails={userDetails}
        isLoading={isLoadingDetails}
      />

      <EditUserModal
        isOpen={modalType === 'edit'}
        onClose={closeModal}
        user={selectedUser}
        onSave={handleUpdate}
        isSaving={updateMutation.isPending}
      />

      <LinkFamilyMemberModal
        isOpen={modalType === 'family-link'}
        onClose={closeModal}
        selectedUser={selectedUser}
        filteredFamilyMembers={filteredFamilyMembers}
        isLoadingFamilyMembers={isLoadingFamilyMembers}
        familySearch={familySearch}
        onFamilySearchChange={setFamilySearch}
        selectedFamilyMemberId={selectedFamilyMemberId}
        onSelectFamilyMember={setSelectedFamilyMemberId}
        familyLinkReason={familyLinkReason}
        onFamilyLinkReasonChange={setFamilyLinkReason}
        familyUnlinkReason={familyUnlinkReason}
        onFamilyUnlinkReasonChange={setFamilyUnlinkReason}
        willTransfer={willTransfer}
        linkReasonRequired={linkReasonRequired}
        canSubmitLink={canSubmitLink}
        onLink={handleLinkFamilyMember}
        onUnlink={() => handleUnlinkFamilyMember(familyUnlinkReason)}
        linkPending={linkFamilyMemberMutation.isPending}
        unlinkPending={unlinkFamilyMemberMutation.isPending}
      />

      <PasswordResetModal
        isOpen={modalType === 'password'}
        onClose={closeModal}
        selectedUser={selectedUser}
        credentials={credentials}
        onReset={handleResetPassword}
        isResetting={resetPasswordMutation.isPending}
      />

      <RoleAssignmentModal
        isOpen={modalType === 'roles'}
        onClose={closeModal}
        selectedUser={selectedUser}
        userDetails={userDetails}
        isLoadingDetails={isLoadingDetails}
        availableRoles={availableRoles}
        selectedRoleId={selectedRoleId}
        onSelectRole={setSelectedRoleId}
        onAssignRole={(roleId, userId) => assignRoleMutation.mutate({ roleId, userId })}
        onRemoveRole={(roleId, userId) => removeRoleMutation.mutate({ roleId, userId })}
        assignPending={assignRoleMutation.isPending}
        removePending={removeRoleMutation.isPending}
      />

      <ChangeUsernameModal
        isOpen={modalType === 'username'}
        onClose={closeModal}
        user={selectedUser}
        onConfirm={handleChangeUsername}
        isSaving={changeUsernameMutation.isPending}
      />
    </div>
  );
}
