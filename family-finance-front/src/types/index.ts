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
  familyMemberId?: number;
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

export interface RegisterRequest {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
  phone?: string;
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
export type Gender = 'MALE' | 'FEMALE';

export interface FamilyMember {
  id: number;
  firstName: string;
  middleName?: string;
  fullName: string;
  lastName?: string;
  role: FamilyRole;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  userId?: number;
  userName?: string;
  createdAt: string;
  credentials?: CredentialsInfo;
}

export interface FamilyMemberRequest {
  firstName: string;
  middleName?: string;
  lastName?: string;
  role?: FamilyRole;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  phone?: string;
  avatar?: string;
  userId?: number;
  createAccount?: boolean;
  accountPassword?: string;
  accountRole?: string;
}

export interface UpdateSelfRequest {
  firstName: string;
  lastName?: string;
  middleName?: string;
  gender?: Gender;
  phone?: string;
  birthDate?: string;
  birthPlace?: string;
  avatar?: string;
  email?: string;
}

// Card Types
export type CardType = 'UZCARD' | 'HUMO' | 'VISA' | 'MASTERCARD';
export type AccountAccessRole = 'OWNER' | 'CO_OWNER' | 'VIEWER';
export type TransactionStatus = 'CONFIRMED' | 'REVERSED' | 'PENDING';
export type CurrencyCode = 'UZS' | 'USD' | 'EUR';

export interface Card {
  id: number;
  accountId: number;
  cardType: CardType;
  cardBin?: string;
  cardLastFour: string;
  maskedNumber: string;
  cardHolderName?: string;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CardRequest {
  cardType: CardType;
  cardNumber: string;
  cardHolderName?: string;
  expiryDate?: string;
}

export interface AccountAccessEntry {
  id: number;
  accountId: number;
  userId: number;
  userName: string;
  userFullName: string;
  role: AccountAccessRole;
  grantedAt: string;
  grantedByName?: string;
}

export interface AccountAccessRequest {
  userId: number;
  role: AccountAccessRole;
}

export interface ReverseTransactionRequest {
  reason: string;
}

// Account Types
export type AccountType = 'CASH' | 'BANK_CARD' | 'SAVINGS' | 'TERM_DEPOSIT' | 'E_WALLET' | 'CREDIT';
export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';
export type AccountScope = 'PERSONAL' | 'FAMILY';

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
  // Banking fields
  accCode?: string;
  accCodeFormatted?: string;
  balanceAccountCode?: string;
  currencyCode?: string;
  ownerId?: number;
  ownerName?: string;
  description?: string;
  status?: AccountStatus;
  scope?: AccountScope;
  myAccessRole?: string;
  openingBalance?: number;
  bankName?: string;
  bankMfo?: string;
  bankInn?: string;
  cards?: Card[];
  accessList?: AccountAccessEntry[];
}

export interface AccountRequest {
  name: string;
  type: AccountType;
  scope?: AccountScope;
  currency?: string;
  balance?: number;
  color?: string;
  icon?: string;
  ownerId?: number;
  currencyCode?: string;
  description?: string;
  openingBalance?: number;
  bankName?: string;
  bankMfo?: string;
  bankInn?: string;
  cardNumber?: string;
  cardHolderName?: string;
  cardExpiryDate?: string;
  cardType?: string;
}

export interface AccountBalanceSummary {
  accountId: number;
  accCode: string;
  accountName: string;
  accountType: AccountType;
  openingBalance: number;
  debitTurnover: number;
  creditTurnover: number;
  closingBalance: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface AccountFilters {
  page?: number;
  size?: number;
  search?: string;
  accountType?: AccountType;
  status?: AccountStatus;
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
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'REVERSAL';
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
  // Banking fields
  debitAccountId?: number;
  debitAccountName?: string;
  debitAccCode?: string;
  creditAccountId?: number;
  creditAccountName?: string;
  creditAccCode?: string;
  status?: TransactionStatus;
  balanceBeforeDebit?: number;
  balanceAfterDebit?: number;
  balanceBeforeCredit?: number;
  balanceAfterCredit?: number;
  originalTransactionId?: number;
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

// Family Tree V2 Types
export * from './family-tree.types';
