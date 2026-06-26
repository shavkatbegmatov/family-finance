import { type CSSProperties, type MutableRefObject, type RefObject } from 'react';
import {
  Users,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { calculateAge, formatDate, FAMILY_ROLES, GENDERS } from '../../config/constants';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../common/PermissionGate';
import { PersonBadges } from '../persons';
import { formatPhoneDisplay } from '../../utils/phone';
import { getInitial, getRoleColor } from './familyMembers.utils';
import type { FamilyMember } from '../../types';

interface FamilyMembersListViewProps {
  isMobile: boolean;
  loading: boolean;
  /** Joriy foydalanuvchi ID si ("Sen" belgisi va o'zini o'chirishni bloklash uchun). */
  currentUserId?: number;
  canManagePoints: boolean;
  /** Desktop jadval uchun joriy sahifa a'zolari (capability filtri qo'llangan). */
  displayedMembers: FamilyMember[];
  /** Mobile cards uchun barcha yuklangan a'zolar (capability filtri qo'llangan). */
  displayedAllMembers: FamilyMember[];
  /** Bo'sh holatni aniqlash uchun (raw, filtrsiz). */
  members: FamilyMember[];
  /** Mobile "Hammasi yuklandi" holati uchun (raw, filtrsiz). */
  allMembers: FamilyMember[];
  searchQuery: string;
  page: number;
  setPage: (updater: (p: number) => number) => void;
  pageSize: number;
  totalElements: number;
  hasMore: boolean;
  loadingMore: boolean;
  onEdit: (member: FamilyMember) => void;
  onDelete: (memberId: number) => void;
  onQuickAddParticipant: (member: FamilyMember) => void;
  // refs
  tableAreaRef: RefObject<HTMLDivElement>;
  tableContainerRef: RefObject<HTMLDivElement>;
  tableHeadRef: RefObject<HTMLTableSectionElement>;
  firstRowRef: MutableRefObject<HTMLTableRowElement | null>;
  mobileSentinelRef: RefObject<HTMLDivElement>;
  tableViewportStyle: CSSProperties;
}

/**
 * Ro'yxat ko'rinishi tanasi: loading/bo'sh holat, mobil kartochkalar (infinite
 * scroll) va desktop jadval (auto-page-size refs bilan) + pastki pagination.
 */
export function FamilyMembersListView({
  isMobile,
  loading,
  currentUserId,
  canManagePoints,
  displayedMembers,
  displayedAllMembers,
  members,
  allMembers,
  searchQuery,
  page,
  setPage,
  pageSize,
  totalElements,
  hasMore,
  loadingMore,
  onEdit,
  onDelete,
  onQuickAddParticipant,
  tableAreaRef,
  tableContainerRef,
  tableHeadRef,
  firstRowRef,
  mobileSentinelRef,
  tableViewportStyle,
}: FamilyMembersListViewProps) {
  if (loading) {
    return (
      <div className="flex-1 flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex-1 surface-card p-16 flex flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-base-200">
          <Users className="h-10 w-10 text-base-content/20" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Oila a'zolari topilmadi</h3>
        <p className="text-sm text-base-content/50">
          {searchQuery
            ? `"${searchQuery}" bo'yicha natijalar yo'q`
            : "Shajaraga a'zo qo'shishni boshlang"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 surface-card overflow-hidden flex flex-col">
      {/* Mobile card view */}
      <div className="flex-1 overflow-auto p-3 space-y-3 lg:hidden">
        {(isMobile ? displayedAllMembers : displayedMembers).map((member) => {
          const age = calculateAge(member.birthDate);

          return (
            <div
              key={member.id}
              className={clsx(
                'rounded-xl border border-base-200 bg-base-100 p-4',
                !member.isActive && 'opacity-50'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={clsx(
                    'h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
                    getRoleColor(member.role)
                  )}
                >
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.fullName}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    getInitial(member.fullName)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{member.fullName}</span>
                    {member.userId === currentUserId && (
                      <span className="badge badge-xs badge-primary">Sen</span>
                    )}
                  </div>
                  <PersonBadges
                    hasUser={!!member.userId}
                    hasFamilyMember
                    hasParticipant={!!member.pointParticipantId}
                    userTooltip={member.userName ? `Tizimga kira oladi: @${member.userName}` : undefined}
                    participantTooltip={member.pointParticipantNickname ? `Ball tizimida: @${member.pointParticipantNickname}` : undefined}
                    onAddParticipant={
                      canManagePoints && member.isActive && !member.pointParticipantId
                        ? () => onQuickAddParticipant(member)
                        : undefined
                    }
                    className="mt-1"
                  />

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="badge badge-sm badge-outline">
                      {FAMILY_ROLES[member.role]?.label || member.role}
                    </span>
                    {member.gender && (
                      <span
                        className={clsx(
                          'badge badge-sm',
                          member.gender === 'MALE' ? 'badge-info' : 'badge-secondary'
                        )}
                      >
                        {GENDERS[member.gender]?.label}
                      </span>
                    )}
                    {age !== null && (
                      <span className="text-xs text-base-content/60">{age} yosh</span>
                    )}
                    <span
                      className={clsx(
                        'badge badge-sm',
                        member.isActive ? 'badge-success' : 'badge-ghost'
                      )}
                    >
                      {member.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>

                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-primary mt-1.5"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhoneDisplay(member.phone)}
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <PermissionGate permission={PermissionCode.FAMILY_UPDATE}>
                    <button
                      className="btn btn-ghost btn-sm btn-square"
                      onClick={() => onEdit(member)}
                      title="Tahrirlash"
                      aria-label="Tahrirlash"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  {member.userId !== currentUserId && (
                    <PermissionGate permission={PermissionCode.FAMILY_DELETE}>
                      <button
                        className="btn btn-ghost btn-sm btn-square text-error"
                        onClick={() => onDelete(member.id)}
                        title="O'chirish"
                        aria-label="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </PermissionGate>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {/* Infinite scroll sentinel */}
        {isMobile && (
          <div ref={mobileSentinelRef} className="py-4 flex justify-center">
            {loadingMore ? (
              <Loader2 className="h-5 w-5 animate-spin text-base-content/40" />
            ) : hasMore ? null : allMembers.length > 0 ? (
              <span className="text-xs text-base-content/60">Hammasi yuklandi</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div
        ref={tableAreaRef}
        className="flex-1 min-h-0 hidden lg:block"
      >
        <div
          ref={tableContainerRef}
          className="min-h-0 h-full overflow-auto"
          style={tableViewportStyle}
        >
          <table className="table table-sm table-fixed w-full relative whitespace-nowrap">
            <thead
              ref={tableHeadRef}
              className="sticky top-0 z-10 bg-base-100 shadow-sm"
            >
              <tr className="text-xs uppercase tracking-wider text-base-content/60 border-b border-base-200">
                <th className="pl-5 py-3 w-[5%] bg-base-100">#</th>
                <th className="py-3 w-[28%] bg-base-100">A'zo</th>
                <th className="py-3 w-[12%] bg-base-100">Rol</th>
                <th className="py-3 w-[10%] bg-base-100">Jinsi</th>
                <th className="py-3 w-[16%] bg-base-100">Telefon</th>
                <th className="py-3 w-[9%] bg-base-100">Yoshi</th>
                <th className="py-3 w-[10%] bg-base-100">Holat</th>
                <th className="py-3 pr-5 w-[10%] text-right bg-base-100">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200">
              {displayedMembers.map((member, idx) => {
                const birthYear = member.birthDate
                  ? new Date(member.birthDate).getFullYear()
                  : null;
                const age = calculateAge(member.birthDate);

                return (
                  <tr
                    ref={idx === 0 ? (node) => { firstRowRef.current = node; } : undefined}
                    key={member.id}
                    className={clsx(
                      'hover:bg-base-200/40 transition-colors',
                      !member.isActive && 'opacity-50'
                    )}
                  >
                  {/* Index */}
                  <td className="pl-5 py-3 text-sm text-base-content/60 font-mono">
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
                          {member.userId === currentUserId && (
                            <span className="badge badge-xs badge-primary">Sen</span>
                          )}
                        </div>
                        <PersonBadges
                          hasUser={!!member.userId}
                          hasFamilyMember
                          hasParticipant={!!member.pointParticipantId}
                          userTooltip={member.userName ? `Tizimga kira oladi: @${member.userName}` : undefined}
                          participantTooltip={member.pointParticipantNickname ? `Ball tizimida: @${member.pointParticipantNickname}` : undefined}
                          className="mt-1"
                        />
                        {member.birthPlace && (
                          <p className="text-xs text-base-content/60 truncate max-w-[160px] mt-1">
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
                        {formatPhoneDisplay(member.phone)}
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
                        <span className="text-xs text-base-content/60 ml-1">
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
                    <div className="flex items-center gap-1.5 justify-end">
                      <PermissionGate permission={PermissionCode.FAMILY_UPDATE}>
                        <button
                          className="btn btn-ghost btn-sm btn-square"
                          onClick={() => onEdit(member)}
                          title="Tahrirlash"
                          aria-label="Tahrirlash"
                        >
                          <Edit2 className="h-[18px] w-[18px]" />
                        </button>
                      </PermissionGate>
                      {member.userId !== currentUserId && (
                        <PermissionGate permission={PermissionCode.FAMILY_DELETE}>
                          <button
                            className="btn btn-ghost btn-sm btn-square text-error"
                            onClick={() => onDelete(member.id)}
                            title="O'chirish"
                            aria-label="O'chirish"
                          >
                            <Trash2 className="h-[18px] w-[18px]" />
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
      </div>

      {/* Pagination */}
      {totalElements > pageSize && (
        <div className={clsx("flex items-center justify-between px-5 py-3 border-t border-base-200", isMobile && "hidden lg:flex")}>
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
  );
}
