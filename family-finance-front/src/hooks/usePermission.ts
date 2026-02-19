import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

export const PermissionCode = {
  // DASHBOARD
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',

  // TRANSACTIONS
  TRANSACTIONS_VIEW: 'TRANSACTIONS_VIEW',
  TRANSACTIONS_CREATE: 'TRANSACTIONS_CREATE',
  TRANSACTIONS_UPDATE: 'TRANSACTIONS_UPDATE',
  TRANSACTIONS_DELETE: 'TRANSACTIONS_DELETE',
  TRANSACTIONS_EXPORT: 'TRANSACTIONS_EXPORT',
  TRANSACTIONS_CONFIRM: 'TRANSACTIONS_CONFIRM',
  TRANSACTIONS_CANCEL: 'TRANSACTIONS_CANCEL',

  // ACCOUNTS
  ACCOUNTS_VIEW: 'ACCOUNTS_VIEW',
  ACCOUNTS_CREATE: 'ACCOUNTS_CREATE',
  ACCOUNTS_UPDATE: 'ACCOUNTS_UPDATE',
  ACCOUNTS_DELETE: 'ACCOUNTS_DELETE',
  ACCOUNTS_TRANSFER: 'ACCOUNTS_TRANSFER',
  ACCOUNTS_EXPORT: 'ACCOUNTS_EXPORT',

  // CATEGORIES
  CATEGORIES_VIEW: 'CATEGORIES_VIEW',
  CATEGORIES_CREATE: 'CATEGORIES_CREATE',
  CATEGORIES_UPDATE: 'CATEGORIES_UPDATE',
  CATEGORIES_DELETE: 'CATEGORIES_DELETE',

  // BUDGETS
  BUDGETS_VIEW: 'BUDGETS_VIEW',
  BUDGETS_CREATE: 'BUDGETS_CREATE',
  BUDGETS_UPDATE: 'BUDGETS_UPDATE',
  BUDGETS_DELETE: 'BUDGETS_DELETE',
  BUDGETS_EXPORT: 'BUDGETS_EXPORT',

  // SAVINGS
  SAVINGS_VIEW: 'SAVINGS_VIEW',
  SAVINGS_CREATE: 'SAVINGS_CREATE',
  SAVINGS_UPDATE: 'SAVINGS_UPDATE',
  SAVINGS_DELETE: 'SAVINGS_DELETE',
  SAVINGS_CONTRIBUTE: 'SAVINGS_CONTRIBUTE',
  SAVINGS_EXPORT: 'SAVINGS_EXPORT',

  // DEBTS
  DEBTS_VIEW: 'DEBTS_VIEW',
  DEBTS_CREATE: 'DEBTS_CREATE',
  DEBTS_UPDATE: 'DEBTS_UPDATE',
  DEBTS_DELETE: 'DEBTS_DELETE',
  DEBTS_PAY: 'DEBTS_PAY',
  DEBTS_EXPORT: 'DEBTS_EXPORT',

  // FAMILY MEMBERS
  FAMILY_VIEW: 'FAMILY_VIEW',
  FAMILY_CREATE: 'FAMILY_CREATE',
  FAMILY_UPDATE: 'FAMILY_UPDATE',
  FAMILY_DELETE: 'FAMILY_DELETE',
  FAMILY_EXPORT: 'FAMILY_EXPORT',

  // REPORTS
  REPORTS_VIEW: 'REPORTS_VIEW',
  REPORTS_EXPORT: 'REPORTS_EXPORT',

  // USERS
  USERS_VIEW: 'USERS_VIEW',
  USERS_CREATE: 'USERS_CREATE',
  USERS_UPDATE: 'USERS_UPDATE',
  USERS_DELETE: 'USERS_DELETE',
  USERS_CHANGE_ROLE: 'USERS_CHANGE_ROLE',

  // SETTINGS
  SETTINGS_VIEW: 'SETTINGS_VIEW',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',

  // NOTIFICATIONS
  NOTIFICATIONS_VIEW: 'NOTIFICATIONS_VIEW',
  NOTIFICATIONS_MANAGE: 'NOTIFICATIONS_MANAGE',

  // ROLES
  ROLES_VIEW: 'ROLES_VIEW',
  ROLES_CREATE: 'ROLES_CREATE',
  ROLES_UPDATE: 'ROLES_UPDATE',
  ROLES_DELETE: 'ROLES_DELETE',
} as const;

export type PermissionCodeType = (typeof PermissionCode)[keyof typeof PermissionCode];

export function usePermission() {
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);

  const hasPermission = useCallback(
    (permission: string) => permissions.has(permission),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (...perms: string[]) => perms.some(p => permissions.has(p)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (...perms: string[]) => perms.every(p => permissions.has(p)),
    [permissions]
  );

  const hasRole = useCallback(
    (role: string) => roles.has(role),
    [roles]
  );

  // Dashboard
  const canViewDashboard = useMemo(() => permissions.has(PermissionCode.DASHBOARD_VIEW), [permissions]);

  // Transactions
  const canViewTransactions = useMemo(() => permissions.has(PermissionCode.TRANSACTIONS_VIEW), [permissions]);
  const canCreateTransactions = useMemo(() => permissions.has(PermissionCode.TRANSACTIONS_CREATE), [permissions]);
  const canUpdateTransactions = useMemo(() => permissions.has(PermissionCode.TRANSACTIONS_UPDATE), [permissions]);
  const canDeleteTransactions = useMemo(() => permissions.has(PermissionCode.TRANSACTIONS_DELETE), [permissions]);
  const canExportTransactions = useMemo(() => permissions.has(PermissionCode.TRANSACTIONS_EXPORT), [permissions]);
  const canConfirmTransactions = useMemo(() => permissions.has(PermissionCode.TRANSACTIONS_CONFIRM), [permissions]);
  const canCancelTransactions = useMemo(() => permissions.has(PermissionCode.TRANSACTIONS_CANCEL), [permissions]);

  // Accounts
  const canViewAccounts = useMemo(() => permissions.has(PermissionCode.ACCOUNTS_VIEW), [permissions]);
  const canCreateAccounts = useMemo(() => permissions.has(PermissionCode.ACCOUNTS_CREATE), [permissions]);
  const canUpdateAccounts = useMemo(() => permissions.has(PermissionCode.ACCOUNTS_UPDATE), [permissions]);
  const canDeleteAccounts = useMemo(() => permissions.has(PermissionCode.ACCOUNTS_DELETE), [permissions]);
  const canTransferAccounts = useMemo(() => permissions.has(PermissionCode.ACCOUNTS_TRANSFER), [permissions]);

  // Categories
  const canViewCategories = useMemo(() => permissions.has(PermissionCode.CATEGORIES_VIEW), [permissions]);
  const canCreateCategories = useMemo(() => permissions.has(PermissionCode.CATEGORIES_CREATE), [permissions]);
  const canUpdateCategories = useMemo(() => permissions.has(PermissionCode.CATEGORIES_UPDATE), [permissions]);
  const canDeleteCategories = useMemo(() => permissions.has(PermissionCode.CATEGORIES_DELETE), [permissions]);

  // Budgets
  const canViewBudgets = useMemo(() => permissions.has(PermissionCode.BUDGETS_VIEW), [permissions]);
  const canCreateBudgets = useMemo(() => permissions.has(PermissionCode.BUDGETS_CREATE), [permissions]);
  const canUpdateBudgets = useMemo(() => permissions.has(PermissionCode.BUDGETS_UPDATE), [permissions]);
  const canDeleteBudgets = useMemo(() => permissions.has(PermissionCode.BUDGETS_DELETE), [permissions]);

  // Savings
  const canViewSavings = useMemo(() => permissions.has(PermissionCode.SAVINGS_VIEW), [permissions]);
  const canCreateSavings = useMemo(() => permissions.has(PermissionCode.SAVINGS_CREATE), [permissions]);
  const canUpdateSavings = useMemo(() => permissions.has(PermissionCode.SAVINGS_UPDATE), [permissions]);
  const canDeleteSavings = useMemo(() => permissions.has(PermissionCode.SAVINGS_DELETE), [permissions]);
  const canContributeSavings = useMemo(() => permissions.has(PermissionCode.SAVINGS_CONTRIBUTE), [permissions]);

  // Debts
  const canViewDebts = useMemo(() => permissions.has(PermissionCode.DEBTS_VIEW), [permissions]);
  const canCreateDebts = useMemo(() => permissions.has(PermissionCode.DEBTS_CREATE), [permissions]);
  const canUpdateDebts = useMemo(() => permissions.has(PermissionCode.DEBTS_UPDATE), [permissions]);
  const canDeleteDebts = useMemo(() => permissions.has(PermissionCode.DEBTS_DELETE), [permissions]);
  const canPayDebts = useMemo(() => permissions.has(PermissionCode.DEBTS_PAY), [permissions]);

  // Family
  const canViewFamily = useMemo(() => permissions.has(PermissionCode.FAMILY_VIEW), [permissions]);
  const canCreateFamily = useMemo(() => permissions.has(PermissionCode.FAMILY_CREATE), [permissions]);
  const canUpdateFamily = useMemo(() => permissions.has(PermissionCode.FAMILY_UPDATE), [permissions]);
  const canDeleteFamily = useMemo(() => permissions.has(PermissionCode.FAMILY_DELETE), [permissions]);

  // Reports
  const canViewReports = useMemo(() => permissions.has(PermissionCode.REPORTS_VIEW), [permissions]);
  const canExportReports = useMemo(() => permissions.has(PermissionCode.REPORTS_EXPORT), [permissions]);

  // Users
  const canViewUsers = useMemo(() => permissions.has(PermissionCode.USERS_VIEW), [permissions]);
  const canCreateUsers = useMemo(() => permissions.has(PermissionCode.USERS_CREATE), [permissions]);
  const canUpdateUsers = useMemo(() => permissions.has(PermissionCode.USERS_UPDATE), [permissions]);
  const canDeleteUsers = useMemo(() => permissions.has(PermissionCode.USERS_DELETE), [permissions]);
  const canChangeUserRole = useMemo(() => permissions.has(PermissionCode.USERS_CHANGE_ROLE), [permissions]);

  // Settings
  const canViewSettings = useMemo(() => permissions.has(PermissionCode.SETTINGS_VIEW), [permissions]);
  const canUpdateSettings = useMemo(() => permissions.has(PermissionCode.SETTINGS_UPDATE), [permissions]);

  // Notifications
  const canViewNotifications = useMemo(() => permissions.has(PermissionCode.NOTIFICATIONS_VIEW), [permissions]);
  const canManageNotifications = useMemo(() => permissions.has(PermissionCode.NOTIFICATIONS_MANAGE), [permissions]);

  // Roles
  const canViewRoles = useMemo(() => permissions.has(PermissionCode.ROLES_VIEW), [permissions]);
  const canCreateRoles = useMemo(() => permissions.has(PermissionCode.ROLES_CREATE), [permissions]);
  const canUpdateRoles = useMemo(() => permissions.has(PermissionCode.ROLES_UPDATE), [permissions]);
  const canDeleteRoles = useMemo(() => permissions.has(PermissionCode.ROLES_DELETE), [permissions]);

  return {
    hasPermission, hasAnyPermission, hasAllPermissions, hasRole,
    permissions, roles,
    canViewDashboard,
    canViewTransactions, canCreateTransactions, canUpdateTransactions, canDeleteTransactions, canExportTransactions, canConfirmTransactions, canCancelTransactions,
    canViewAccounts, canCreateAccounts, canUpdateAccounts, canDeleteAccounts, canTransferAccounts,
    canViewCategories, canCreateCategories, canUpdateCategories, canDeleteCategories,
    canViewBudgets, canCreateBudgets, canUpdateBudgets, canDeleteBudgets,
    canViewSavings, canCreateSavings, canUpdateSavings, canDeleteSavings, canContributeSavings,
    canViewDebts, canCreateDebts, canUpdateDebts, canDeleteDebts, canPayDebts,
    canViewFamily, canCreateFamily, canUpdateFamily, canDeleteFamily,
    canViewReports, canExportReports,
    canViewUsers, canCreateUsers, canUpdateUsers, canDeleteUsers, canChangeUserRole,
    canViewSettings, canUpdateSettings,
    canViewNotifications, canManageNotifications,
    canViewRoles, canCreateRoles, canUpdateRoles, canDeleteRoles,
  };
}
