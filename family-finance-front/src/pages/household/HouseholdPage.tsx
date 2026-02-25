import type { CSSProperties } from 'react';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Home,
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
  Phone,
  Shield,
  UserPlus,
  Settings,
  User,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { householdApi } from '../../api/household.api';
import type { HouseholdDashboardResponse, HouseholdMemberSummary, HouseholdAccountSummary } from '../../api/household.api';
import { familyGroupApi } from '../../api/family-group.api';
import { formatCurrency, FAMILY_ROLES, GENDERS } from '../../config/constants';
import { useAuthStore } from '../../store/authStore';
import { ModalPortal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { TextInput } from '../../components/ui/TextInput';

const roleLabel = (role: string): string =>
  (FAMILY_ROLES as Record<string, { label: string }>)[role]?.label || role;

const genderLabel = (gender: string): string =>
  (GENDERS as Record<string, { label: string }>)[gender]?.label || gender;

const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
};

export function HouseholdPage() {
  const [data, setData] = useState<HouseholdDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((s) => s.user);

  // A'zo qo'shish
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // A'zo o'chirish
  const [memberToRemove, setMemberToRemove] = useState<HouseholdMemberSummary | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await householdApi.getDashboard();
      setData(res.data.data);
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddMember = async () => {
    const trimmed = inviteUsername.trim();
    if (!trimmed) return;
    setIsAdding(true);
    try {
      await familyGroupApi.addMember(trimmed);
      toast.success(`"${trimmed}" guruhga qo'shildi`);
      setIsAddModalOpen(false);
      setInviteUsername('');
      loadData();
    } catch {
      toast.error("A'zo qo'shishda xatolik yuz berdi");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      await familyGroupApi.removeMember(memberToRemove.id);
      toast.success(`"${memberToRemove.fullName}" guruhdan chiqarildi`);
      setMemberToRemove(null);
      loadData();
    } catch {
      toast.error("A'zoni o'chirishda xatolik yuz berdi");
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-3 h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <div className="skeleton h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-base-content/60">
        <Home className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Siz hali biron oila guruhiga a'zo emassiz</p>
        <p className="mt-1 text-sm">Sozlamalar sahifasidan guruh yarating yoki mavjud guruhga qo'shiling.</p>
      </div>
    );
  }

  const totalBalance = data.familyAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold lg:text-3xl">
            <Home className="h-7 w-7 text-primary" />
            {data.groupName}
          </h1>
          <p className="mt-1 text-base-content/60">Oilaviy xo'jalik boshqaruvi</p>
        </div>
        {data.admin && (
          <Link to="/my-family/settings" className="btn btn-outline btn-sm gap-2">
            <Settings className="h-4 w-4" />
            Guruh sozlamalari
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jami balans"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          color="primary"
          style={{ '--i': 0 } as CSSProperties}
        />
        <StatCard
          title="Bu oylik daromad"
          value={formatCurrency(data.totalMonthlyIncome)}
          icon={TrendingUp}
          color="success"
          style={{ '--i': 1 } as CSSProperties}
        />
        <StatCard
          title="Bu oylik xarajat"
          value={formatCurrency(data.totalMonthlyExpense)}
          icon={TrendingDown}
          color="error"
          style={{ '--i': 2 } as CSSProperties}
        />
        <StatCard
          title="A'zolar soni"
          value={data.members.length}
          icon={Users}
          color="info"
          style={{ '--i': 3 } as CSSProperties}
        />
      </div>

      {/* Oila a'zolari */}
      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5 text-primary" />
            Oila a'zolari
          </h3>
          {data.admin && (
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-ghost btn-xs gap-1">
              <UserPlus className="h-3.5 w-3.5" />
              A'zo qo'shish
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              currentUserId={currentUser?.id}
              isAdmin={data.admin}
              onRemove={() => setMemberToRemove(member)}
            />
          ))}
          {data.members.length === 0 && (
            <div className="col-span-full py-8 text-center text-base-content/50">
              Hozircha guruhda a'zolar yo'q
            </div>
          )}
        </div>
      </div>

      {/* Oilaviy hisoblar */}
      {data.familyAccounts.length > 0 && (
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Wallet className="h-5 w-5 text-primary" />
              Oilaviy hisoblar
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-base-200/50">
                <tr>
                  <th>Hisob nomi</th>
                  <th>Turi</th>
                  <th className="text-right">Balans</th>
                  <th>Valyuta</th>
                  <th>Egasi</th>
                </tr>
              </thead>
              <tbody>
                {data.familyAccounts.map((account) => (
                  <AccountRow key={account.id} account={account} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* A'zo qo'shish modali */}
      <ModalPortal isOpen={isAddModalOpen} onClose={() => { if (!isAdding) { setIsAddModalOpen(false); setInviteUsername(''); } }}>
        <div className="w-full max-w-sm rounded-2xl bg-base-100 p-6 shadow-2xl">
          <h3 className="text-lg font-bold">A'zo qo'shish</h3>
          <p className="mt-1 text-sm text-base-content/60">Foydalanuvchi username'ini kiriting</p>
          <div className="mt-4">
            <TextInput
              value={inviteUsername}
              onChange={setInviteUsername}
              placeholder="username"
              autoFocus
              disabled={isAdding}
              leadingIcon={<User className="h-4 w-4" />}
            />
          </div>
          <div className="mt-5 flex gap-3">
            <button
              className="btn btn-ghost flex-1"
              onClick={() => { setIsAddModalOpen(false); setInviteUsername(''); }}
              disabled={isAdding}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={handleAddMember}
              disabled={isAdding || !inviteUsername.trim()}
            >
              {isAdding && <span className="loading loading-spinner loading-sm" />}
              Qo'shish
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* A'zo o'chirish tasdiqlash modali */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="A'zoni o'chirish"
        message={`"${memberToRemove?.fullName}" ni guruhdan chiqarishni tasdiqlaysizmi?`}
        confirmText="O'chirish"
        confirmColor="error"
        loading={isRemoving}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  style,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  style?: CSSProperties;
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  };
  return (
    <div
      className="surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={style}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
          </div>
          <div className={clsx('grid h-12 w-12 place-items-center rounded-2xl border', colorMap[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  currentUserId,
  isAdmin,
  onRemove,
}: {
  member: HouseholdMemberSummary;
  currentUserId?: number;
  isAdmin?: boolean;
  onRemove?: () => void;
}) {
  const isCurrentUser = member.userId != null && member.userId === currentUserId;
  const canRemove = isAdmin && !member.admin && !isCurrentUser;

  return (
    <Link
      to={`/my-family/members/${member.id}`}
      className={clsx(
        'group relative block rounded-xl border p-4 transition hover:shadow-md cursor-pointer',
        isCurrentUser ? 'border-primary/30 bg-primary/5' : 'border-base-200'
      )}
    >
      {canRemove && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove?.(); }}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-base-content/30 opacity-0 transition hover:bg-error/10 hover:text-error group-hover:opacity-100"
          title="Guruhdan chiqarish"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-base-200 text-base-content/50">
          {member.avatar ? (
            <img src={member.avatar} alt={member.fullName} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <User className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{member.fullName}</span>
            {member.admin && (
              <span className="badge badge-warning badge-xs gap-0.5 py-2 shrink-0">
                <Shield className="h-2.5 w-2.5" />
                Admin
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-base-content/50">
            <span>{roleLabel(member.role)}</span>
            {member.gender && (
              <>
                <span>·</span>
                <span>{genderLabel(member.gender)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-4 text-xs text-base-content/60">
        {member.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-success/10 p-2 text-center">
          <p className="text-[10px] font-medium uppercase text-success/70">Daromad</p>
          <p className="text-sm font-bold text-success">
            +{formatCompactCurrency(member.monthlyIncome)}
          </p>
        </div>
        <div className="rounded-lg bg-error/10 p-2 text-center">
          <p className="text-[10px] font-medium uppercase text-error/70">Xarajat</p>
          <p className="text-sm font-bold text-error">
            -{formatCompactCurrency(member.monthlyExpense)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function AccountRow({ account }: { account: HouseholdAccountSummary }) {
  const accountTypeLabels: Record<string, string> = {
    CASH: 'Naqd',
    BANK: 'Bank',
    CARD: 'Karta',
    SAVINGS: "Jamg'arma",
    CREDIT: 'Kredit',
    INVESTMENT: 'Investitsiya',
  };

  return (
    <tr className="hover">
      <td className="font-medium">{account.name}</td>
      <td>
        <span className="badge badge-outline badge-sm">
          {accountTypeLabels[account.accountType] || account.accountType}
        </span>
      </td>
      <td className="text-right font-semibold">{formatCurrency(account.balance)}</td>
      <td className="text-sm text-base-content/60">{account.currency}</td>
      <td className="text-sm text-base-content/60">{account.ownerName || '-'}</td>
    </tr>
  );
}
