// ===== Point System Types =====

export interface PointConfig {
  id: number;
  familyGroupId: number;
  conversionRate: number;
  currency: string;
  inflationEnabled: boolean;
  inflationRateMonthly: number;
  savingsInterestRate: number;
  streakBonusEnabled: boolean;
  streakBonusPercentage: number;
  maxDailyPoints?: number;
  autoApproveBelow?: number;
  isActive: boolean;
  createdAt: string;
}

export interface PointConfigRequest {
  conversionRate: number;
  currency?: string;
  inflationEnabled?: boolean;
  inflationRateMonthly?: number;
  savingsInterestRate?: number;
  streakBonusEnabled?: boolean;
  streakBonusPercentage?: number;
  maxDailyPoints?: number;
  autoApproveBelow?: number;
}

export interface PointParticipant {
  id: number;
  familyGroupId: number;
  firstName: string;
  lastName?: string;
  nickname?: string;
  displayName: string;
  birthDate?: string;
  avatar?: string;
  familyMemberId?: number;
  familyMemberName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PointParticipantRequest {
  firstName: string;
  lastName?: string;
  nickname?: string;
  birthDate?: string;
  avatar?: string;
  familyMemberId?: number;
}

export interface PointParticipantLinkRequest {
  familyMemberId: number;
  reason?: string;
  forceTransfer?: boolean;
}

export interface PointParticipantUnlinkRequest {
  reason: string;
}

export interface PointTask {
  id: number;
  familyGroupId: number;
  title: string;
  description?: string;
  category: string;
  pointValue: number;
  penaltyValue: number;
  assignedToId?: number;
  assignedToName?: string;
  assignedByName: string;
  status: string;
  recurrence: string;
  deadline?: string;
  completedAt?: string;
  verifiedByName?: string;
  rejectionReason?: string;
  icon?: string;
  color?: string;
  parentTaskId?: number;
  multiplier: number;
  effectivePoints: number;
  createdAt: string;
}

export interface PointTaskRequest {
  title: string;
  description?: string;
  category: string;
  pointValue: number;
  penaltyValue?: number;
  assignedToId?: number;
  recurrence?: string;
  deadline?: string;
  icon?: string;
  color?: string;
  parentTaskId?: number;
}

export interface PointBalance {
  id: number;
  participantId: number;
  participantName: string;
  participantAvatar?: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  totalPenalty: number;
  savingsBalance: number;
  investmentBalance: number;
  currentStreak: number;
  longestStreak: number;
  lastTaskCompletedAt?: string;
  inflationMultiplier: number;
  realValue: number;
}

export interface PointTransaction {
  id: number;
  participantId: number;
  participantName: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  taskId?: number;
  taskTitle?: string;
  createdByName?: string;
  transactionDate: string;
}

export interface PointConversion {
  id: number;
  participantId: number;
  participantName: string;
  pointsConverted: number;
  conversionRate: number;
  moneyAmount: number;
  currency: string;
  targetAccountId?: number;
  targetAccountName?: string;
  approvedByName?: string;
  conversionDate: string;
}

export interface PointConversionRequest {
  participantId: number;
  points: number;
  targetAccountId?: number;
}

export interface PointAchievement {
  id: number;
  name: string;
  description?: string;
  type: string;
  icon?: string;
  color?: string;
  requiredValue: number;
  bonusPoints: number;
  isSystem: boolean;
  isActive: boolean;
  earned: boolean;
  earnedAt?: string;
}

export interface PointAchievementRequest {
  name: string;
  description?: string;
  type: string;
  icon?: string;
  color?: string;
  requiredValue: number;
  bonusPoints?: number;
}

export interface PointSavingsAccount {
  id: number;
  participantId: number;
  participantName: string;
  balance: number;
  interestRate: number;
  lastInterestAppliedAt?: string;
  totalInterestEarned: number;
}

export interface PointInvestment {
  id: number;
  participantId: number;
  participantName: string;
  type: string;
  investedAmount: number;
  currentValue: number;
  returnRate: number;
  profitPercentage: number;
  investedAt: string;
  maturityDate?: string;
  isActive: boolean;
}

export interface PointInvestmentRequest {
  type: string;
  amount: number;
  maturityDate?: string;
}

export interface PointMultiplierEvent {
  id: number;
  name: string;
  description?: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  taskCategory?: string;
  isActive: boolean;
  createdByName: string;
  createdAt: string;
}

export interface PointMultiplierEventRequest {
  name: string;
  description?: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  taskCategory?: string;
}

export interface PointShopItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  icon?: string;
  color?: string;
  stock?: number;
  isActive: boolean;
  createdAt: string;
}

export interface PointShopItemRequest {
  name: string;
  description?: string;
  price: number;
  icon?: string;
  color?: string;
  stock?: number;
}

export interface PointPurchase {
  id: number;
  participantId: number;
  participantName: string;
  shopItemId: number;
  shopItemName: string;
  pointsSpent: number;
  purchaseDate: string;
  isDelivered: boolean;
  deliveredAt?: string;
  deliveredByName?: string;
}

export interface PointChallenge {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  rewardPoints: number;
  status: string;
  taskCategory?: string;
  createdByName: string;
  participants: ChallengeParticipantEntry[];
  createdAt: string;
}

export interface ChallengeParticipantEntry {
  participantId: number;
  participantName: string;
  score: number;
  rank?: number;
}

export interface PointChallengeRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  rewardPoints: number;
  taskCategory?: string;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: number;
  participantName: string;
  participantAvatar?: string;
  totalPoints: number;
  currentBalance: number;
  currentStreak: number;
  tasksCompleted: number;
}

export interface PointWeeklyReport {
  participantId: number;
  participantName: string;
  pointsEarned: number;
  pointsSpent: number;
  tasksCompleted: number;
  tasksFailed: number;
  currentStreak: number;
  rankChange: number;
  achievementsEarned: string[];
}

export interface ManualAwardRequest {
  amount: number;
  description?: string;
}

export interface PointPurchaseRequest {
  participantId: number;
  shopItemId: number;
}

export interface PointTaskVerifyRequest {
  rejectionReason?: string;
}

// Enum-like constants
export const PointTaskCategories = [
  { value: 'HOMEWORK', label: 'Uy vazifasi' },
  { value: 'HOUSEWORK', label: 'Uy ishi' },
  { value: 'BEHAVIOR', label: 'Xulq-atvor' },
  { value: 'READING', label: "O'qish" },
  { value: 'SPORTS', label: 'Sport' },
  { value: 'CREATIVITY', label: 'Ijodkorlik' },
  { value: 'SOCIAL', label: 'Ijtimoiy' },
  { value: 'CUSTOM', label: 'Boshqa' },
] as const;

export const PointTaskStatuses = [
  { value: 'DRAFT', label: 'Qoralama', color: 'badge-ghost' },
  { value: 'ASSIGNED', label: 'Tayinlangan', color: 'badge-info' },
  { value: 'IN_PROGRESS', label: 'Jarayonda', color: 'badge-warning' },
  { value: 'SUBMITTED', label: 'Topshirilgan', color: 'badge-accent' },
  { value: 'VERIFIED', label: 'Tasdiqlangan', color: 'badge-success' },
  { value: 'REJECTED', label: 'Rad etilgan', color: 'badge-error' },
  { value: 'FAILED', label: 'Bajarilmadi', color: 'badge-error' },
  { value: 'EXPIRED', label: 'Muddati o\'tgan', color: 'badge-ghost' },
] as const;

export const PointInvestmentTypes = [
  { value: 'STABLE', label: 'Barqaror', description: '1-3% haftalik', color: 'text-success' },
  { value: 'MODERATE', label: "O'rtacha", description: '-2% dan 5% gacha', color: 'text-warning' },
  { value: 'RISKY', label: 'Xavfli', description: '-10% dan 10% gacha', color: 'text-error' },
] as const;
