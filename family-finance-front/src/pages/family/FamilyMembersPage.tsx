import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Edit2,
  Trash2,
  X,
  Phone,
  Calendar,
  User,
  Copy,
  Check,
  KeyRound,
  List,
  TreePine,
  Eye,
  EyeOff,
  Shield,
  ClipboardCopy,
  UserCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { familyMembersApi } from '../../api/family-members.api';
import { formatDate, FAMILY_ROLES, GENDERS } from '../../config/constants';
import { ModalPortal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { FamilyTreeView } from '../../components/family/FamilyTreeView';
import { SearchInput } from '../../components/ui/SearchInput';
import { TextInput } from '../../components/ui/TextInput';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { DateInput } from '../../components/ui/DateInput';
import { Select } from '../../components/ui/Select';
import { AvatarUploader } from '../../components/ui/AvatarUploader';
import type {
  CredentialsInfo,
  FamilyMember,
  FamilyMemberRequest,
  FamilyRole,
  Gender,
  PagedResponse,
} from '../../types';

export function FamilyMembersPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'list' | 'tree'>('list');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSizeMode, setPageSizeMode] = useState<'auto' | number>('auto');
  const [autoPageSize, setAutoPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Effective page size — auto rejimda hisoblangan, aks holda tanlangan
  const pageSize = pageSizeMode === 'auto' ? autoPageSize : pageSizeMode;

  // Jadval boshlanadigan joyni DOM'dan o'lchaymiz
  const tableAnchorRef = useRef<HTMLDivElement>(null);

  // Auto: jadval yuqorisidagi sentinel div'dan pastga qancha joy qolishini hisoblaymiz
  useEffect(() => {
    if (pageSizeMode !== 'auto') return;

    const ROW_HEIGHT = 52;   // px — bir qator balandligi
    const BOTTOM_PAD = 24;   // px — pastdan qoldirilgan bo'shliq
    const THEAD_HEIGHT = 40; // px — jadval sarlavhasi

    const calculate = () => {
      const anchor = tableAnchorRef.current;
      if (!anchor) return;
      const top = anchor.getBoundingClientRect().top;
      const available = window.innerHeight - top - THEAD_HEIGHT - BOTTOM_PAD;
      const rows = Math.max(5, Math.floor(available / ROW_HEIGHT));
      setAutoPageSize(rows);
    };

    // Birinchi hisoblash — layout to'liq chizilgandan keyin
    const rafId = requestAnimationFrame(calculate);
    window.addEventListener('resize', calculate);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', calculate);
    };
  }, [pageSizeMode]);


  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState<FamilyMemberRequest>({
    firstName: '',
    role: 'OTHER',
    gender: undefined,
    phone: '',
    birthDate: '',
    avatar: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [showAccountPassword, setShowAccountPassword] = useState(false);

  // Credentials modal
  const [credentialsInfo, setCredentialsInfo] = useState<CredentialsInfo | null>(null);
  const [showCredPassword, setShowCredPassword] = useState(false);
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
    } catch {
      toast.error("Oila a'zolarini yuklashda xatolik");
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

  useEffect(() => {
    if (activeTab === 'list') {
      void loadMembers();
    }
  }, [activeTab]);

  // ==================== MODAL ====================

  const handleOpenEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      middleName: member.middleName,
      role: member.role,
      gender: member.gender,
      phone: member.phone || '',
      birthDate: member.birthDate || '',
      avatar: member.avatar || '',
      userId: member.userId,
      createAccount: false,
      accountPassword: '',
      accountRole: 'MEMBER',
    });
    setShowAccountPassword(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) return;
    setSubmitting(true);
    try {
      if (editingMember) {
        const res = await familyMembersApi.update(editingMember.id, form);
        const updated = res.data.data as FamilyMember;
        if (updated.credentials) {
          setCredentialsInfo(updated.credentials);
        }
      }
      handleCloseModal();
      void loadMembers();
    } catch {
      toast.error("Oila a'zosini saqlashda xatolik");
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
      toast.error('Nusxalashda xatolik');
    }
  };

  // ==================== DELETE ====================

  const handleDelete = async () => {
    if (!deletingMemberId) return;
    try {
      await familyMembersApi.delete(deletingMemberId);
      setDeletingMemberId(null);
      void loadMembers();
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
    <div className={activeTab === 'tree' ? 'h-full min-h-0 flex flex-col gap-3' : 'space-y-3'}>
      {/* Header + Tabs — bitta qatorda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="section-title text-xl">Oila a'zolari</h1>
          <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
            <button
              className={clsx(
                'btn btn-xs gap-1.5',
                activeTab === 'list' ? 'btn-primary' : 'btn-ghost'
              )}
              onClick={() => setActiveTab('list')}
            >
              <List className="h-3.5 w-3.5" />
              Ro'yxat
            </button>
            <button
              className={clsx(
                'btn btn-xs gap-1.5',
                activeTab === 'tree' ? 'btn-primary' : 'btn-ghost'
              )}
              onClick={() => setActiveTab('tree')}
            >
              <TreePine className="h-3.5 w-3.5" />
              Daraxti
            </button>
          </div>
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

        </div>
      </div>

      {/* ============ TREE VIEW ============ */}
      {activeTab === 'tree' && (
        <div className="-mx-4 lg:-mx-8 flex-1 min-h-0">
          <FamilyTreeView />
        </div>
      )}

      {/* ============ LIST VIEW ============ */}
      {activeTab === 'list' && (
        <>
          {/* Search + Pagination toolbar */}
          <div className="surface-card p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <SearchInput
              value={searchQuery}
              onValueChange={(val) => {
                setSearchQuery(val);
                setPage(0);
              }}
              placeholder="Ism, familiya yoki telefon bo'yicha qidirish..."
              hideLabel
              ariaLabel="Qidirish"
              className="flex-1 min-w-0"
            />

            {/* Right side controls */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Total count */}
              {!loading && (
                <span className="text-sm text-base-content/40 whitespace-nowrap">
                  Jami: <strong className="text-base-content/70">{totalElements}</strong> ta
                </span>
              )}

              {/* Separator */}
              <div className="h-5 w-px bg-base-300" />

              {/* Page size selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-base-content/40 whitespace-nowrap">Ko'rsatish:</span>
                <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
                  {(['auto', 10, 20, 50, 100] as const).map((size) => (
                    <button
                      key={size}
                      className={clsx(
                        'btn btn-xs min-w-[2.5rem]',
                        pageSizeMode === size ? 'btn-primary' : 'btn-ghost'
                      )}
                      onClick={() => {
                        setPageSizeMode(size);
                        setPage(0);
                      }}
                    >
                      {size === 'auto' ? (
                        <span className="flex items-center gap-0.5">
                          Auto
                          {pageSizeMode === 'auto' && (
                            <span className="opacity-60">({autoPageSize})</span>
                          )}
                        </span>
                      ) : (
                        size
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Separator */}
              {totalElements > pageSize && <div className="h-5 w-px bg-base-300" />}

              {/* Pagination controls */}
              {totalElements > pageSize && (
                <div className="flex items-center gap-1">
                  <button
                    className="btn btn-xs btn-ghost"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹
                  </button>
                  <span className="text-xs text-base-content/50 px-1 whitespace-nowrap">
                    {page + 1} / {Math.ceil(totalElements / pageSize)}
                  </span>
                  <button
                    className="btn btn-xs btn-ghost"
                    disabled={(page + 1) * pageSize >= totalElements}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sentinel: jadval qayerda boshlanishini o'lchaymiz */}
          <div ref={tableAnchorRef} className="h-0" />

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : members.length === 0 ? (
            <div className="surface-card p-16 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-base-200">
                <Users className="h-10 w-10 text-base-content/20" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Oila a'zolari topilmadi</h3>
              <p className="text-sm text-base-content/50">
                {searchQuery
                  ? `"${searchQuery}" bo'yicha natijalar yo'q`
                  : "Shajaraga a'zo qo'shishni boshlang"}
              </p>
            </div>
          ) : (
            <div className="surface-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-base-content/40 border-b border-base-200">
                      <th className="pl-5 py-3 w-12">#</th>
                      <th className="py-3">A'zo</th>
                      <th className="py-3">Rol</th>
                      <th className="py-3">Jinsi</th>
                      <th className="py-3">Telefon</th>
                      <th className="py-3">Yoshi</th>
                      <th className="py-3">Holat</th>
                      <th className="py-3 pr-5 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-200">
                    {members.map((member, idx) => {
                      const birthYear = member.birthDate
                        ? new Date(member.birthDate).getFullYear()
                        : null;
                      const age = member.birthDate
                        ? Math.floor(
                          (Date.now() - new Date(member.birthDate).getTime()) /
                          (365.25 * 24 * 60 * 60 * 1000)
                        )
                        : null;

                      return (
                        <tr
                          key={member.id}
                          className={clsx(
                            'hover:bg-base-200/40 transition-colors',
                            !member.isActive && 'opacity-50'
                          )}
                        >
                          {/* Index */}
                          <td className="pl-5 py-3 text-sm text-base-content/30 font-mono">
                            {page * pageSize + idx + 1}
                          </td>

                          {/* Avatar + Name */}
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={clsx(
                                  'h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
                                  getRoleColor(member.role)
                                )}
                              >
                                {member.avatar ? (
                                  <img
                                    src={member.avatar}
                                    alt={member.fullName}
                                    className="h-9 w-9 rounded-full object-cover"
                                  />
                                ) : (
                                  getInitial(member.fullName)
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-sm truncate max-w-[180px]">
                                    {member.fullName}
                                  </span>
                                  {member.userId && (
                                    <span
                                      className="badge badge-xs badge-success gap-1"
                                      title="Tizim foydalanuvchisi bilan bog'langan"
                                    >
                                      <UserCheck className="h-2.5 w-2.5" />
                                      Tizimda
                                    </span>
                                  )}
                                  {member.userId === user?.id && (
                                    <span className="badge badge-xs badge-primary">Sen</span>
                                  )}
                                </div>
                                {member.birthPlace && (
                                  <p className="text-xs text-base-content/40 truncate max-w-[160px]">
                                    {member.birthPlace}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3">
                            <span className="badge badge-sm badge-outline">
                              {FAMILY_ROLES[member.role]?.label || member.role}
                            </span>
                          </td>

                          {/* Gender */}
                          <td className="py-3">
                            {member.gender ? (
                              <span
                                className={clsx(
                                  'badge badge-sm',
                                  member.gender === 'MALE' ? 'badge-info' : 'badge-secondary'
                                )}
                              >
                                {GENDERS[member.gender]?.label}
                              </span>
                            ) : (
                              <span className="text-base-content/20 text-xs">—</span>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="py-3">
                            {member.phone ? (
                              <a
                                href={`tel:${member.phone}`}
                                className="flex items-center gap-1.5 text-sm text-base-content/70 hover:text-primary transition-colors"
                              >
                                <Phone className="h-3 w-3 shrink-0" />
                                {member.phone}
                              </a>
                            ) : (
                              <span className="text-base-content/20 text-xs">—</span>
                            )}
                          </td>

                          {/* Age */}
                          <td className="py-3">
                            {age !== null ? (
                              <div className="text-sm">
                                <span className="font-medium">{age} yosh</span>
                                <span className="text-xs text-base-content/40 ml-1">
                                  ({birthYear})
                                </span>
                              </div>
                            ) : member.birthDate ? (
                              <div className="flex items-center gap-1 text-xs text-base-content/50">
                                <Calendar className="h-3 w-3" />
                                {formatDate(member.birthDate)}
                              </div>
                            ) : (
                              <span className="text-base-content/20 text-xs">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3">
                            <span
                              className={clsx(
                                'badge badge-sm',
                                member.isActive ? 'badge-success' : 'badge-ghost'
                              )}
                            >
                              {member.isActive ? 'Faol' : 'Nofaol'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 pr-5">
                            <div className="flex items-center gap-1 justify-end">
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
                              {member.userId !== user?.id && (
                                <PermissionGate permission={PermissionCode.FAMILY_DELETE}>
                                  <button
                                    className="btn btn-ghost btn-xs text-error"
                                    onClick={() => setDeletingMemberId(member.id)}
                                    title="O'chirish"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </PermissionGate>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalElements > pageSize && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-base-200">
                  <span className="text-sm text-base-content/50">
                    {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} / {totalElements} ta
                  </span>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ‹ Oldingi
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={(page + 1) * pageSize >= totalElements}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Keyingi ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <ModalPortal isOpen={showModal} onClose={handleCloseModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  A'zoni tahrirlash
                </h3>
                <p className="text-sm text-base-content/60">
                  A'zo ma'lumotlarini yangilang
                </p>
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* First Name */}
              <TextInput
                label="Ism"
                required
                value={form.firstName}
                onChange={(val) => setForm((prev) => ({ ...prev, firstName: val }))}
                placeholder="Ism"
                leadingIcon={<User className="h-5 w-5" />}
              />

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

              {/* Gender */}
              <Select
                label="Jinsi"
                value={form.gender || ''}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, gender: (val as Gender) || undefined }))
                }
                options={Object.entries(GENDERS).map(([key, { label }]) => ({
                  value: key,
                  label,
                }))}
                placeholder="Tanlanmagan"
              />

              {/* Phone */}
              <PhoneInput
                label="Telefon raqami"
                value={form.phone || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, phone: val }))}
              />

              {/* Birth Date */}
              <DateInput
                label="Tug'ilgan sana"
                value={form.birthDate || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, birthDate: val }))}
                max={new Date().toISOString().slice(0, 10)}
              />

              {/* Avatar Upload */}
              <AvatarUploader
                label="Rasm"
                value={form.avatar || ''}
                onChange={(val) => setForm((prev) => ({ ...prev, avatar: val }))}
              />

              {/* Create Account Section — faqat yangi a'zo uchun */}
              {(!editingMember?.userId || editingMember?.userId === null) && (
                <div className="space-y-3">
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={form.createAccount || false}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            createAccount: e.target.checked,
                            accountPassword: '',
                            accountRole: 'MEMBER',
                          }));
                          setShowAccountPassword(false);
                        }}
                      />
                      <div>
                        <span className="label-text font-medium">Tizimga kirish imkoniyati</span>
                        <p className="text-xs text-base-content/50 mt-0.5">
                          Login avtomatik yaratiladi (ism asosida)
                        </p>
                      </div>
                    </label>
                  </div>

                  {form.createAccount && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                      {/* Account Role */}
                      <div className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Tizim roli
                        </span>
                        <div className="flex gap-2">
                          {[
                            { value: 'MEMBER', label: "A'zo" },
                            { value: 'ADMIN', label: 'Administrator' },
                          ].map((r) => (
                            <button
                              key={r.value}
                              type="button"
                              className={clsx(
                                'btn btn-sm flex-1',
                                form.accountRole === r.value
                                  ? r.value === 'ADMIN'
                                    ? 'btn-warning'
                                    : 'btn-primary'
                                  : 'btn-ghost border-base-300'
                              )}
                              onClick={() => setForm((prev) => ({ ...prev, accountRole: r.value }))}
                            >
                              {r.value === 'ADMIN' && <Shield className="h-3.5 w-3.5" />}
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Password */}
                      <div className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Parol
                        </span>
                        <div className="relative">
                          <input
                            type={showAccountPassword ? 'text' : 'password'}
                            className="input input-bordered input-sm w-full pr-10"
                            placeholder="Bo'sh qolsa avtomatik yaratiladi"
                            value={form.accountPassword || ''}
                            onChange={(e) => setForm((prev) => ({ ...prev, accountPassword: e.target.value }))}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
                            onClick={() => setShowAccountPassword(!showAccountPassword)}
                            aria-label={showAccountPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                          >
                            {showAccountPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {form.accountPassword && form.accountPassword.length > 0 && form.accountPassword.length < 6 && (
                          <span className="text-xs text-error mt-1">Kamida 6 belgi</span>
                        )}
                        <p className="text-xs text-base-content/40 mt-1">
                          {form.accountPassword
                            ? 'Kiritilgan parol ishlatiladi'
                            : 'Vaqtinchalik parol avtomatik yaratiladi'}
                        </p>
                      </div>
                    </div>
                  )}
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
                disabled={submitting || !form.firstName.trim() || (form.createAccount && !!form.accountPassword && form.accountPassword.length < 6)}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                Saqlash
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
      <ModalPortal isOpen={!!credentialsInfo} onClose={() => { setCredentialsInfo(null); setShowCredPassword(false); }}>
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
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-base-content/50 font-medium">
                    {credentialsInfo?.mustChangePassword ? 'Vaqtinchalik parol' : 'Parol'}
                  </p>
                  <p className="font-mono font-semibold text-lg">
                    {showCredPassword
                      ? credentialsInfo?.temporaryPassword
                      : '\u2022'.repeat(credentialsInfo?.temporaryPassword?.length || 8)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowCredPassword(!showCredPassword)}
                    title={showCredPassword ? 'Yashirish' : "Ko'rsatish"}
                  >
                    {showCredPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
            </div>

            {/* Copy All */}
            <button
              className="btn btn-outline btn-sm w-full mt-3"
              onClick={() => handleCopyToClipboard(
                `Login: ${credentialsInfo?.username}\nParol: ${credentialsInfo?.temporaryPassword}`,
                'all'
              )}
            >
              {copiedField === 'all' ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  Nusxalandi!
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-4 w-4" />
                  Hammasini nusxalash
                </>
              )}
            </button>

            <div className="alert alert-warning mt-4">
              <span className="text-sm">Bu ma'lumotlar faqat bir marta ko'rsatiladi. Oila a'zosiga yetkazing!</span>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="btn btn-primary"
                onClick={() => { setCredentialsInfo(null); setShowCredPassword(false); }}
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
