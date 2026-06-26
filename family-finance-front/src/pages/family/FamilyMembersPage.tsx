import { useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { familyMembersApi } from '../../api/family-members.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { FamilyTreeView } from '../../components/family/FamilyTreeView';
import { AddPersonWizard, SuggestionsBanner } from '../../components/persons';
import { useFamilyMembersData } from '../../hooks/useFamilyMembersData';
import { FamilyMembersHeaderActions } from '../../components/family/FamilyMembersHeader';
import { FamilyMembersToolbar } from '../../components/family/FamilyMembersToolbar';
import { FamilyMembersListView } from '../../components/family/FamilyMembersListView';
import { FamilyMemberModal } from '../../components/family/FamilyMemberModal';
import { DeleteMemberModal } from '../../components/family/DeleteMemberModal';
import { CredentialsModal } from '../../components/family/CredentialsModal';
import { tableViewportStyle } from '../../components/family/familyMembers.utils';
import type { CredentialsInfo, FamilyMember } from '../../types';

export function FamilyMembersPage() {
  const user = useAuthStore((s) => s.user);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'list' | 'tree'>('list');
  const isListTab = activeTab === 'list';

  const data = useFamilyMembersData({ isListTab, activeTab });

  // Wizard ("Yangi shaxs qo'shish")
  const [showWizard, setShowWizard] = useState(false);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // Credentials modal
  const [credentialsInfo, setCredentialsInfo] = useState<CredentialsInfo | null>(null);

  // Delete confirmation
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);

  // ==================== MODAL ====================

  const handleOpenEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
  };

  const handleModalSuccess = (credentials?: CredentialsInfo) => {
    if (credentials) {
      setCredentialsInfo(credentials);
    }
    data.invalidateMembers();
  };

  // ==================== DELETE ====================

  const handleDelete = async () => {
    if (!deletingMemberId) return;
    try {
      await familyMembersApi.delete(deletingMemberId);
      setDeletingMemberId(null);
      data.invalidateMembers();
    } catch {
      toast.error("Oila a'zosini o'chirishda xatolik");
    }
  };

  // ==================== EXPORT ====================

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const res = format === 'excel'
        ? await familyMembersApi.exportExcel()
        : await familyMembersApi.exportPdf();

      const blob = new Blob([res.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oila-azolari.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Eksport qilishda xatolik');
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 lg:gap-6">
      {/* Header + Tabs — bitta qatorda */}
      <PageHeader
        title="Oila a'zolari"
        subtitle={`${data.totalElements} ta a'zo`}
        mobileVisible
        actions={
          <FamilyMembersHeaderActions
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAddPerson={() => setShowWizard(true)}
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            exportDisabled={data.members.length === 0}
            exportLoading={data.loading}
          />
        }
      />

      {/* Smart suggestions — capability bo'shliqlari haqida eslatma */}
      {activeTab === 'list' && data.memberSuggestions.length > 0 && (
        <SuggestionsBanner suggestions={data.memberSuggestions} />
      )}

      {/* ============ TREE VIEW ============ */}
      {activeTab === 'tree' && (
        <div className="-mx-4 lg:-mx-8 flex-1 min-h-0">
          <FamilyTreeView />
        </div>
      )}

      {/* ============ LIST VIEW ============ */}
      {activeTab === 'list' && (
        <>
          <FamilyMembersToolbar
            searchQuery={data.searchQuery}
            onSearchChange={data.setSearchQuery}
            loading={data.loading}
            totalElements={data.totalElements}
            page={data.page}
            setPage={data.setPage}
            pageSize={data.pageSize}
            pageSizeMode={data.pageSizeMode}
            setPageSizeMode={data.setPageSizeMode}
            autoPageSize={data.autoPageSize}
            capFilter={data.capFilter}
            onCapFilterChange={data.setCapFilter}
            capCounts={data.capCounts}
          />

          <FamilyMembersListView
            isMobile={isMobile}
            loading={data.loading}
            currentUserId={user?.id}
            canManagePoints={data.canManagePoints}
            displayedMembers={data.displayedMembers}
            displayedAllMembers={data.displayedAllMembers}
            members={data.members}
            allMembers={data.allMembers}
            searchQuery={data.searchQuery}
            page={data.page}
            setPage={data.setPage}
            pageSize={data.pageSize}
            totalElements={data.totalElements}
            hasMore={data.hasMore}
            loadingMore={data.loadingMore}
            onEdit={handleOpenEditModal}
            onDelete={setDeletingMemberId}
            onQuickAddParticipant={data.handleQuickAddParticipant}
            tableAreaRef={data.tableAreaRef}
            tableContainerRef={data.tableContainerRef}
            tableHeadRef={data.tableHeadRef}
            firstRowRef={data.firstRowRef}
            mobileSentinelRef={data.mobileSentinelRef}
            tableViewportStyle={tableViewportStyle(data.pageSizeMode, data.autoViewportHeight)}
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <FamilyMemberModal
        isOpen={showModal}
        onClose={handleCloseModal}
        member={editingMember}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteMemberModal
        isOpen={!!deletingMemberId}
        onClose={() => setDeletingMemberId(null)}
        onConfirm={handleDelete}
      />

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={!!credentialsInfo}
        onClose={() => setCredentialsInfo(null)}
        credentials={credentialsInfo}
      />

      {/* "Yangi shaxs qo'shish" wizard — atomik tarzda FamilyMember + User (+ Participant) yaratadi */}
      <AddPersonWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={() => data.invalidateMembers()}
      />
    </div>
  );
}
