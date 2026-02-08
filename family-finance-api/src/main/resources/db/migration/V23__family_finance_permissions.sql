-- =====================================================
-- V23: Family Finance Permissions
-- Delete old retail permissions and insert new
-- family finance management permissions
-- =====================================================

-- 1. Clear existing permission mappings and permissions
DELETE FROM role_permissions;
DELETE FROM permissions;

-- =====================================================
-- 2. INSERT NEW PERMISSIONS
-- =====================================================

-- DASHBOARD module (1 permission)
INSERT INTO permissions (code, module, action, description) VALUES
('DASHBOARD_VIEW', 'DASHBOARD', 'VIEW', 'Boshqaruv panelini ko''rish');

-- TRANSACTIONS module (5 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('TRANSACTIONS_VIEW', 'TRANSACTIONS', 'VIEW', 'Tranzaksiyalarni ko''rish'),
('TRANSACTIONS_CREATE', 'TRANSACTIONS', 'CREATE', 'Yangi tranzaksiya yaratish'),
('TRANSACTIONS_UPDATE', 'TRANSACTIONS', 'UPDATE', 'Tranzaksiyani tahrirlash'),
('TRANSACTIONS_DELETE', 'TRANSACTIONS', 'DELETE', 'Tranzaksiyani o''chirish'),
('TRANSACTIONS_EXPORT', 'TRANSACTIONS', 'EXPORT', 'Tranzaksiyalarni eksport qilish');

-- ACCOUNTS module (6 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('ACCOUNTS_VIEW', 'ACCOUNTS', 'VIEW', 'Hisoblarni ko''rish'),
('ACCOUNTS_CREATE', 'ACCOUNTS', 'CREATE', 'Yangi hisob yaratish'),
('ACCOUNTS_UPDATE', 'ACCOUNTS', 'UPDATE', 'Hisobni tahrirlash'),
('ACCOUNTS_DELETE', 'ACCOUNTS', 'DELETE', 'Hisobni o''chirish'),
('ACCOUNTS_TRANSFER', 'ACCOUNTS', 'TRANSFER', 'Hisoblar o''rtasida o''tkazma qilish'),
('ACCOUNTS_EXPORT', 'ACCOUNTS', 'EXPORT', 'Hisoblarni eksport qilish');

-- CATEGORIES module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('CATEGORIES_VIEW', 'CATEGORIES', 'VIEW', 'Kategoriyalarni ko''rish'),
('CATEGORIES_CREATE', 'CATEGORIES', 'CREATE', 'Yangi kategoriya yaratish'),
('CATEGORIES_UPDATE', 'CATEGORIES', 'UPDATE', 'Kategoriyani tahrirlash'),
('CATEGORIES_DELETE', 'CATEGORIES', 'DELETE', 'Kategoriyani o''chirish');

-- BUDGETS module (5 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('BUDGETS_VIEW', 'BUDGETS', 'VIEW', 'Byudjetlarni ko''rish'),
('BUDGETS_CREATE', 'BUDGETS', 'CREATE', 'Yangi byudjet yaratish'),
('BUDGETS_UPDATE', 'BUDGETS', 'UPDATE', 'Byudjetni tahrirlash'),
('BUDGETS_DELETE', 'BUDGETS', 'DELETE', 'Byudjetni o''chirish'),
('BUDGETS_EXPORT', 'BUDGETS', 'EXPORT', 'Byudjetlarni eksport qilish');

-- SAVINGS module (6 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('SAVINGS_VIEW', 'SAVINGS', 'VIEW', 'Jamg''armalarni ko''rish'),
('SAVINGS_CREATE', 'SAVINGS', 'CREATE', 'Yangi jamg''arma maqsadi yaratish'),
('SAVINGS_UPDATE', 'SAVINGS', 'UPDATE', 'Jamg''arma maqsadini tahrirlash'),
('SAVINGS_DELETE', 'SAVINGS', 'DELETE', 'Jamg''arma maqsadini o''chirish'),
('SAVINGS_CONTRIBUTE', 'SAVINGS', 'CONTRIBUTE', 'Jamg''armaga pul qo''shish'),
('SAVINGS_EXPORT', 'SAVINGS', 'EXPORT', 'Jamg''armalarni eksport qilish');

-- DEBTS module (6 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('DEBTS_VIEW', 'DEBTS', 'VIEW', 'Qarzlarni ko''rish'),
('DEBTS_CREATE', 'DEBTS', 'CREATE', 'Yangi qarz yaratish'),
('DEBTS_UPDATE', 'DEBTS', 'UPDATE', 'Qarzni tahrirlash'),
('DEBTS_DELETE', 'DEBTS', 'DELETE', 'Qarzni o''chirish'),
('DEBTS_PAY', 'DEBTS', 'PAY', 'Qarzni to''lash'),
('DEBTS_EXPORT', 'DEBTS', 'EXPORT', 'Qarzlarni eksport qilish');

-- FAMILY module (5 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('FAMILY_VIEW', 'FAMILY', 'VIEW', 'Oila a''zolarini ko''rish'),
('FAMILY_CREATE', 'FAMILY', 'CREATE', 'Yangi oila a''zosini qo''shish'),
('FAMILY_UPDATE', 'FAMILY', 'UPDATE', 'Oila a''zosini tahrirlash'),
('FAMILY_DELETE', 'FAMILY', 'DELETE', 'Oila a''zosini o''chirish'),
('FAMILY_EXPORT', 'FAMILY', 'EXPORT', 'Oila a''zolarini eksport qilish');

-- REPORTS module (2 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('REPORTS_VIEW', 'REPORTS', 'VIEW', 'Hisobotlarni ko''rish'),
('REPORTS_EXPORT', 'REPORTS', 'EXPORT', 'Hisobotlarni eksport qilish');

-- USERS module (5 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('USERS_VIEW', 'USERS', 'VIEW', 'Foydalanuvchilarni ko''rish'),
('USERS_CREATE', 'USERS', 'CREATE', 'Yangi foydalanuvchi yaratish'),
('USERS_UPDATE', 'USERS', 'UPDATE', 'Foydalanuvchini tahrirlash'),
('USERS_DELETE', 'USERS', 'DELETE', 'Foydalanuvchini o''chirish'),
('USERS_CHANGE_ROLE', 'USERS', 'CHANGE_ROLE', 'Foydalanuvchi rolini o''zgartirish');

-- SETTINGS module (2 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('SETTINGS_VIEW', 'SETTINGS', 'VIEW', 'Sozlamalarni ko''rish'),
('SETTINGS_UPDATE', 'SETTINGS', 'UPDATE', 'Sozlamalarni o''zgartirish');

-- NOTIFICATIONS module (2 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('NOTIFICATIONS_VIEW', 'NOTIFICATIONS', 'VIEW', 'Bildirishnomalarni ko''rish'),
('NOTIFICATIONS_MANAGE', 'NOTIFICATIONS', 'MANAGE', 'Bildirishnomalarni boshqarish');

-- ROLES module (4 permissions)
INSERT INTO permissions (code, module, action, description) VALUES
('ROLES_VIEW', 'ROLES', 'VIEW', 'Rollarni ko''rish'),
('ROLES_CREATE', 'ROLES', 'CREATE', 'Yangi rol yaratish'),
('ROLES_UPDATE', 'ROLES', 'UPDATE', 'Rolni tahrirlash'),
('ROLES_DELETE', 'ROLES', 'DELETE', 'Rolni o''chirish');
