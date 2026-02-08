// Auth Types
export interface User {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  active: boolean;
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
  permissions?: string[];
  roles?: string[];
  requiresPasswordChange?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CredentialsInfo {
  username: string;
  temporaryPassword: string;
  message: string;
  mustChangePassword: boolean;
}

// Settings Types
export interface AppSettings {
  debtDueDays: number;
}

export interface SettingsUpdateRequest {
  debtDueDays: number;
}

// Permission Types
export interface Permission {
  id: number;
  code: string;
  module: string;
  action: string;
  description?: string;
}

// Simple User Type
export interface SimpleUser {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  active: boolean;
}

// Role Types
export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  permissions?: string[];
  permissionCount?: number;
  userCount?: number;
  users?: SimpleUser[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleRequest {
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
}

// Audit Log Types
export interface AuditLog {
  id: number;
  entityType: string;
  entityId?: number;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  userId?: number;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  createdAt: string;
}

export interface AuditLogGroup {
  correlationId: string | null;
  groupKey: string;
  timestamp: string;
  username: string | null;
  primaryAction: string;
  summary: string;
  logCount: number;
  logs: AuditLog[];
  entityTypes: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

// ============================================
// FAMILY FINANCE TYPES
// ============================================

// Family Member Types
export type FamilyRole = 'FATHER' | 'MOTHER' | 'CHILD' | 'OTHER';

export interface FamilyMember {
  id: number;
  fullName: string;
  role: FamilyRole;
  birthDate?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  userId?: number;
  userName?: string;
  createdAt: string;
}

export interface FamilyMemberRequest {
  fullName: string;
  role: FamilyRole;
  birthDate?: string;
  phone?: string;
  avatar?: string;
  userId?: number;
}

// Account Types
export type AccountType = 'CASH' | 'BANK_CARD' | 'SAVINGS' | 'E_WALLET';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AccountRequest {
  name: string;
  type: AccountType;
  currency?: string;
  balance?: number;
  color?: string;
  icon?: string;
}

// Category Types
export type CategoryType = 'INCOME' | 'EXPENSE';

export interface FinanceCategory {
  id: number;
  name: string;
  type: CategoryType;
  parentId?: number;
  parentName?: string;
  icon?: string;
  color?: string;
  isSystem: boolean;
  isActive: boolean;
  children?: FinanceCategory[];
  createdAt: string;
}

export interface FinanceCategoryRequest {
  name: string;
  type: CategoryType;
  parentId?: number;
  icon?: string;
  color?: string;
}

// Transaction Types
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type RecurringPattern = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  accountId: number;
  accountName: string;
  toAccountId?: number;
  toAccountName?: string;
  categoryId?: number;
  categoryName?: string;
  familyMemberId?: number;
  familyMemberName?: string;
  transactionDate: string;
  description?: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  tags?: string;
  createdAt: string;
}

export interface TransactionRequest {
  type: TransactionType;
  amount: number;
  accountId: number;
  toAccountId?: number;
  categoryId?: number;
  familyMemberId?: number;
  transactionDate: string;
  description?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  tags?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  accountId?: number;
  categoryId?: number;
  memberId?: number;
  from?: string;
  to?: string;
}

// Budget Types
export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  amount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface BudgetRequest {
  categoryId: number;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
}

// Savings Goal Types
export interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  deadline?: string;
  accountId?: number;
  accountName?: string;
  icon?: string;
  color?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface SavingsGoalRequest {
  name: string;
  targetAmount: number;
  deadline?: string;
  accountId?: number;
  icon?: string;
  color?: string;
}

export interface GoalContribution {
  id: number;
  savingsGoalId: number;
  savingsGoalName: string;
  amount: number;
  contributionDate: string;
  note?: string;
  createdAt: string;
}

export interface GoalContributionRequest {
  amount: number;
  contributionDate: string;
  note?: string;
}

// Debt Types
export type DebtType = 'GIVEN' | 'TAKEN';
export type DebtStatus = 'ACTIVE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface FamilyDebt {
  id: number;
  type: DebtType;
  personName: string;
  personPhone?: string;
  amount: number;
  remainingAmount: number;
  paidAmount: number;
  paidPercentage: number;
  dueDate?: string;
  status: DebtStatus;
  description?: string;
  isOverdue: boolean;
  createdAt: string;
}

export interface FamilyDebtRequest {
  type: DebtType;
  personName: string;
  personPhone?: string;
  amount: number;
  dueDate?: string;
  description?: string;
}

export interface DebtPayment {
  id: number;
  debtId: number;
  debtPersonName: string;
  amount: number;
  paymentDate: string;
  note?: string;
  createdAt: string;
}

export interface DebtPaymentRequest {
  amount: number;
  paymentDate: string;
  note?: string;
}

// Dashboard Types
export interface FamilyDashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  totalDebtsGiven: number;
  totalDebtsTaken: number;
  activeGoals: number;
  activeBudgets: number;
  budgetProgress: BudgetProgressItem[];
  savingsProgress: SavingsProgressItem[];
}

export interface BudgetProgressItem {
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
}

export interface SavingsProgressItem {
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
}

// Chart Data Types
export interface FamilyChartData {
  monthlyTrend: MonthlyTrendItem[];
  expenseByCategory: CategoryChartItem[];
  incomeByCategory: CategoryChartItem[];
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryChartItem {
  name: string;
  amount: number;
  color?: string;
  percentage: number;
}

// Report Types
export interface IncomeExpenseReport {
  totalIncome: number;
  totalExpense: number;
  from: string;
  to: string;
}

export interface CategoryReport {
  categoryId: number;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface MemberReport {
  memberId: number;
  memberName: string;
  totalExpense: number;
}

// Audit Log Detail Types
export * from './audit-log.types';
