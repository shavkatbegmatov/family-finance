import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Phone,
  Calendar,
  User,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import clsx from 'clsx';
import { familyMembersApi } from '../../api/family-members.api';
import { formatDate, FAMILY_ROLES } from '../../config/constants';
import { ModalPortal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import type {
  CredentialsInfo,
  FamilyMember,
  FamilyMemberRequest,
  FamilyRole,
  PagedResponse,
} from '../../types';

export function FamilyMembersPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState<FamilyMemberRequest>({
    fullName: '',
    role: 'OTHER',
    phone: '',
    birthDate: '',
    avatar: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Credentials modal
  const [credentialsInfo, setCredentialsInfo] = useState<CredentialsInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Delete confirmation
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);

  // ==================== DATA LOADING ====================

  const loadMembers = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await familyMembersApi.getAll(page, pageSize, searchQuery || undefined);
      const data = res.data.data as PagedResponse<FamilyMember>;
      setMembers(data.content);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load family members:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  useEffect(() => {
    loadMembers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  // ==================== MODAL ====================

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setForm({
      fullName: '',
      role: 'OTHER',
      phone: '',
      birthDate: '',
      avatar: '',
      createAccount: false,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setForm({
      fullName: member.fullName,
      role: member.role,
      phone: member.phone || '',
      birthDate: member.birthDate || '',
      avatar: member.avatar || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim()) return;
    setSubmitting(true);
    try {
      if (editingMember) {
        await familyMembersApi.update(editingMember.id, form);
      } else {
        const res = await familyMembersApi.create(form);
        const created = res.data.data as FamilyMember;
        if (created.credentials) {
          setCredentialsInfo(created.credentials);
        }
      }
      handleCloseModal();
      void loadMembers();
    } catch (error) {
      console.error('Failed to save family member:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  };

  // ==================== DELETE ====================

  const handleDelete = async () => {
    if (!deletingMemberId) return;
    try {
      await familyMembersApi.delete(deletingMemberId);
      setDeletingMemberId(null);
      void loadMembers();
    } catch (error) {
      console.error('Failed to delete family member:', error);
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
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  // ==================== HELPERS ====================

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getRoleColor = (role: FamilyRole) => {
    switch (role) {
      case 'FATHER': return 'bg-blue-500';
      case 'MOTHER': return 'bg-pink-500';
      case 'CHILD': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Oila a'zolari</h1>
          <p className="section-subtitle">Oila a'zolarini boshqarish</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill">
            {totalElements} ta a'zo
          </span>
          <PermissionGate permission={PermissionCode.FAMILY_EXPORT}>
            <ExportButtons
              onExportExcel={() => handleExport('excel')}
              onExportPdf={() => handleExport('pdf')}
              disabled={members.length === 0}
              loading={loading}
            />
          </PermissionGate>
          <PermissionGate permission={PermissionCode.FAMILY_CREATE}>
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4" />
              Yangi a'zo
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Search */}
      <div className="surface-card p-4">
        <SearchInput
          value={searchQuery}
          onValueChange={(val) => {
            setSearchQuery(val);
            setPage(0);
          }}
          placeholder="Ism bo'yicha qidirish..."
          hideLabel
          ariaLabel="Qidirish"
          className="max-w-sm"
        />
      </div>

      {/* Members Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : members.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-base-content/20" />
          <h3 className="text-lg font-semibold mb-2">Oila a'zolari topilmadi</h3>
          <p className="text-sm text-base-content/60 mb-4">
            {searchQuery
              ? `"${searchQuery}" bo'yicha natijalar topilmadi`
              : "Birinchi oila a'zosini qo'shing"}
          </p>
          {!searchQuery && (
            <PermissionGate permission={PermissionCode.FAMILY_CREATE}>
              <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
                <Plus className="h-4 w-4" />
                Yangi a'zo qo'shish
              </button>
            </PermissionGate>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className={clsx(
                'surface-card p-5 flex flex-col items-center text-center relative group transition-shadow hover:shadow-md',
                !member.isActive && 'opacity-60'
              )}
            >
              {/* Active indicator */}
              <div
                className={clsx(
                  'absolute top-3 right-3 h-2.5 w-2.5 rounded-full',
                  member.isActive ? 'bg-success' : 'bg-base-content/20'
                )}
                title={member.isActive ? 'Faol' : 'Nofaol'}
              />

              {/* Avatar */}
              <div
                className={clsx(
                  'h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3',
                  getRoleColor(member.role)
                )}
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.fullName}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  getInitial(member.fullName)
                )}
              </div>

              {/* Name */}
              <h3 className="font-semibold text-base mb-1">{member.fullName}</h3>

              {/* Role */}
              <span className="badge badge-sm badge-outline mb-3">
                {FAMILY_ROLES[member.role]?.label || member.role}
              </span>

              {/* Info */}
              <div className="w-full space-y-1.5 text-sm text-base-content/70">
                {member.phone && (
                  <div className="flex items-center justify-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-base-content/40" />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.birthDate && (
                  <div className="flex items-center justify-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-base-content/40" />
                    <span>{formatDate(member.birthDate)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <PermissionGate permission={PermissionCode.FAMILY_UPDATE}>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleOpenEditModal(member)}
                    title="Tahrirlash"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Tahrirlash
                  </button>
                </PermissionGate>
                <PermissionGate permission={PermissionCode.FAMILY_DELETE}>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => setDeletingMemberId(member.id)}
                    title="O'chirish"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <ModalPortal isOpen={showModal} onClose={handleCloseModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingMember ? "A'zoni tahrirlash" : "Yangi a'zo"}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingMember ? "A'zo ma'lumotlarini yangilang" : "Yangi oila a'zosini kiriting"}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* Full Name */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  To'liq ism <span className="text-error">*</span>
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Ism familiya"
                />
              </label>

              {/* Role */}
              <Select
                label="Rol"
                required
                value={form.role}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, role: (val as FamilyRole) || 'OTHER' }))
                }
                options={Object.entries(FAMILY_ROLES).map(([key, { label }]) => ({
                  value: key,
                  label,
                }))}
                placeholder="Rolni tanlang"
                icon={<User className="h-4 w-4" />}
              />

              {/* Phone */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Telefon raqami
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.phone || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+998 90 123 45 67"
                />
              </label>

              {/* Birth Date */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Tug'ilgan sana
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={form.birthDate || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                />
              </label>

              {/* Avatar URL */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Avatar URL
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.avatar || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, avatar: e.target.value }))}
                  placeholder="https://..."
                />
              </label>

              {/* Create Account Toggle — faqat yangi a'zo uchun */}
              {!editingMember && (
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={form.createAccount || false}
                      onChange={(e) => setForm((prev) => ({ ...prev, createAccount: e.target.checked }))}
                    />
                    <div>
                      <span className="label-text font-medium">Tizimga kirish imkoniyati</span>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        Avtomatik login va vaqtinchalik parol yaratiladi
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !form.fullName.trim()}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                {editingMember ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Confirmation Modal */}
      <ModalPortal isOpen={!!deletingMemberId} onClose={() => setDeletingMemberId(null)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
              <Trash2 className="h-7 w-7 text-error" />
            </div>
            <h3 className="text-lg font-semibold mb-2">A'zoni o'chirish</h3>
            <p className="text-sm text-base-content/60 mb-6">
              Haqiqatan ham bu oila a'zosini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => setDeletingMemberId(null)}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-error"
                onClick={handleDelete}
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Credentials Modal */}
      <ModalPortal isOpen={!!credentialsInfo} onClose={() => setCredentialsInfo(null)}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <KeyRound className="h-7 w-7 text-success" />
              </div>
              <h3 className="text-xl font-semibold">Kirish ma'lumotlari</h3>
              <p className="text-sm text-base-content/60 mt-1">
                {credentialsInfo?.message}
              </p>
            </div>

            <div className="space-y-3">
              {/* Username */}
              <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-base-content/50 font-medium">Login</p>
                  <p className="font-mono font-semibold text-lg">{credentialsInfo?.username}</p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopyToClipboard(credentialsInfo?.username || '', 'username')}
                  title="Nusxa olish"
                >
                  {copiedField === 'username' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password */}
              <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-base-content/50 font-medium">Vaqtinchalik parol</p>
                  <p className="font-mono font-semibold text-lg">{credentialsInfo?.temporaryPassword}</p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopyToClipboard(credentialsInfo?.temporaryPassword || '', 'password')}
                  title="Nusxa olish"
                >
                  {copiedField === 'password' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="alert alert-warning mt-4">
              <span className="text-sm">Bu ma'lumotlar faqat bir marta ko'rsatiladi. Oila a'zosiga yetkazing!</span>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="btn btn-primary"
                onClick={() => setCredentialsInfo(null)}
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
