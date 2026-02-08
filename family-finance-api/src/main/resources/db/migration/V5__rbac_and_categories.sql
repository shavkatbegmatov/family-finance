-- =====================================================
-- V5: RBAC Data & Default Categories
-- 53 ta permission, 3 ta rol, admin rol tayinlash,
-- 17 ta default kategoriya
-- =====================================================

-- =====================================================
-- 1. PERMISSIONS (53 ta)
-- =====================================================

-- DASHBOARD (1)
INSERT INTO permissions (code, module, action, description) VALUES
('DASHBOARD_VIEW', 'DASHBOARD', 'VIEW', 'Boshqaruv panelini ko''rish');

-- TRANSACTIONS (5)
INSERT INTO permissions (code, module, action, description) VALUES
('TRANSACTIONS_VIEW', 'TRANSACTIONS', 'VIEW', 'Tranzaksiyalarni ko''rish'),
('TRANSACTIONS_CREATE', 'TRANSACTIONS', 'CREATE', 'Yangi tranzaksiya yaratish'),
('TRANSACTIONS_UPDATE', 'TRANSACTIONS', 'UPDATE', 'Tranzaksiyani tahrirlash'),
('TRANSACTIONS_DELETE', 'TRANSACTIONS', 'DELETE', 'Tranzaksiyani o''chirish'),
('TRANSACTIONS_EXPORT', 'TRANSACTIONS', 'EXPORT', 'Tranzaksiyalarni eksport qilish');

-- ACCOUNTS (6)
INSERT INTO permissions (code, module, action, description) VALUES
('ACCOUNTS_VIEW', 'ACCOUNTS', 'VIEW', 'Hisoblarni ko''rish'),
('ACCOUNTS_CREATE', 'ACCOUNTS', 'CREATE', 'Yangi hisob yaratish'),
('ACCOUNTS_UPDATE', 'ACCOUNTS', 'UPDATE', 'Hisobni tahrirlash'),
('ACCOUNTS_DELETE', 'ACCOUNTS', 'DELETE', 'Hisobni o''chirish'),
('ACCOUNTS_TRANSFER', 'ACCOUNTS', 'TRANSFER', 'Hisoblar o''rtasida o''tkazma qilish'),
('ACCOUNTS_EXPORT', 'ACCOUNTS', 'EXPORT', 'Hisoblarni eksport qilish');

-- CATEGORIES (4)
INSERT INTO permissions (code, module, action, description) VALUES
('CATEGORIES_VIEW', 'CATEGORIES', 'VIEW', 'Kategoriyalarni ko''rish'),
('CATEGORIES_CREATE', 'CATEGORIES', 'CREATE', 'Yangi kategoriya yaratish'),
('CATEGORIES_UPDATE', 'CATEGORIES', 'UPDATE', 'Kategoriyani tahrirlash'),
('CATEGORIES_DELETE', 'CATEGORIES', 'DELETE', 'Kategoriyani o''chirish');

-- BUDGETS (5)
INSERT INTO permissions (code, module, action, description) VALUES
('BUDGETS_VIEW', 'BUDGETS', 'VIEW', 'Byudjetlarni ko''rish'),
('BUDGETS_CREATE', 'BUDGETS', 'CREATE', 'Yangi byudjet yaratish'),
('BUDGETS_UPDATE', 'BUDGETS', 'UPDATE', 'Byudjetni tahrirlash'),
('BUDGETS_DELETE', 'BUDGETS', 'DELETE', 'Byudjetni o''chirish'),
('BUDGETS_EXPORT', 'BUDGETS', 'EXPORT', 'Byudjetlarni eksport qilish');

-- SAVINGS (6)
INSERT INTO permissions (code, module, action, description) VALUES
('SAVINGS_VIEW', 'SAVINGS', 'VIEW', 'Jamg''armalarni ko''rish'),
('SAVINGS_CREATE', 'SAVINGS', 'CREATE', 'Yangi jamg''arma maqsadi yaratish'),
('SAVINGS_UPDATE', 'SAVINGS', 'UPDATE', 'Jamg''arma maqsadini tahrirlash'),
('SAVINGS_DELETE', 'SAVINGS', 'DELETE', 'Jamg''arma maqsadini o''chirish'),
('SAVINGS_CONTRIBUTE', 'SAVINGS', 'CONTRIBUTE', 'Jamg''armaga pul qo''shish'),
('SAVINGS_EXPORT', 'SAVINGS', 'EXPORT', 'Jamg''armalarni eksport qilish');

-- DEBTS (6)
INSERT INTO permissions (code, module, action, description) VALUES
('DEBTS_VIEW', 'DEBTS', 'VIEW', 'Qarzlarni ko''rish'),
('DEBTS_CREATE', 'DEBTS', 'CREATE', 'Yangi qarz yaratish'),
('DEBTS_UPDATE', 'DEBTS', 'UPDATE', 'Qarzni tahrirlash'),
('DEBTS_DELETE', 'DEBTS', 'DELETE', 'Qarzni o''chirish'),
('DEBTS_PAY', 'DEBTS', 'PAY', 'Qarzni to''lash'),
('DEBTS_EXPORT', 'DEBTS', 'EXPORT', 'Qarzlarni eksport qilish');

-- FAMILY (5)
INSERT INTO permissions (code, module, action, description) VALUES
('FAMILY_VIEW', 'FAMILY', 'VIEW', 'Oila a''zolarini ko''rish'),
('FAMILY_CREATE', 'FAMILY', 'CREATE', 'Yangi oila a''zosini qo''shish'),
('FAMILY_UPDATE', 'FAMILY', 'UPDATE', 'Oila a''zosini tahrirlash'),
('FAMILY_DELETE', 'FAMILY', 'DELETE', 'Oila a''zosini o''chirish'),
('FAMILY_EXPORT', 'FAMILY', 'EXPORT', 'Oila a''zolarini eksport qilish');

-- REPORTS (2)
INSERT INTO permissions (code, module, action, description) VALUES
('REPORTS_VIEW', 'REPORTS', 'VIEW', 'Hisobotlarni ko''rish'),
('REPORTS_EXPORT', 'REPORTS', 'EXPORT', 'Hisobotlarni eksport qilish');

-- USERS (5)
INSERT INTO permissions (code, module, action, description) VALUES
('USERS_VIEW', 'USERS', 'VIEW', 'Foydalanuvchilarni ko''rish'),
('USERS_CREATE', 'USERS', 'CREATE', 'Yangi foydalanuvchi yaratish'),
('USERS_UPDATE', 'USERS', 'UPDATE', 'Foydalanuvchini tahrirlash'),
('USERS_DELETE', 'USERS', 'DELETE', 'Foydalanuvchini o''chirish'),
('USERS_CHANGE_ROLE', 'USERS', 'CHANGE_ROLE', 'Foydalanuvchi rolini o''zgartirish');

-- SETTINGS (2)
INSERT INTO permissions (code, module, action, description) VALUES
('SETTINGS_VIEW', 'SETTINGS', 'VIEW', 'Sozlamalarni ko''rish'),
('SETTINGS_UPDATE', 'SETTINGS', 'UPDATE', 'Sozlamalarni o''zgartirish');

-- NOTIFICATIONS (2)
INSERT INTO permissions (code, module, action, description) VALUES
('NOTIFICATIONS_VIEW', 'NOTIFICATIONS', 'VIEW', 'Bildirishnomalarni ko''rish'),
('NOTIFICATIONS_MANAGE', 'NOTIFICATIONS', 'MANAGE', 'Bildirishnomalarni boshqarish');

-- ROLES (4)
INSERT INTO permissions (code, module, action, description) VALUES
('ROLES_VIEW', 'ROLES', 'VIEW', 'Rollarni ko''rish'),
('ROLES_CREATE', 'ROLES', 'CREATE', 'Yangi rol yaratish'),
('ROLES_UPDATE', 'ROLES', 'UPDATE', 'Rolni tahrirlash'),
('ROLES_DELETE', 'ROLES', 'DELETE', 'Rolni o''chirish');

-- =====================================================
-- 2. ROLES (3 ta tizim rollari)
-- =====================================================

-- ADMIN (to'liq huquq)
INSERT INTO roles (name, code, description, is_system, is_active)
VALUES ('Administrator', 'ADMIN', 'Oila moliyasini to''liq boshqarish huquqi. Barcha modullar va amaliyotlarga ruxsat.', true, true);

-- MEMBER (oila a'zosi)
INSERT INTO roles (name, code, description, is_system, is_active)
VALUES ('Oila a''zosi', 'MEMBER', 'Oila a''zosi huquqlari. Ko''rish, yaratish va tahrirlash imkoniyatlari.', true, true);

-- VIEWER (faqat ko'rish)
INSERT INTO roles (name, code, description, is_system, is_active)
VALUES ('Kuzatuvchi', 'VIEWER', 'Faqat ko''rish huquqi. Hech qanday o''zgartirish kirita olmaydi.', true, true);

-- =====================================================
-- 3. ADMIN roliga BARCHA permissionlarni berish
-- =====================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE code = 'ADMIN'),
    id
FROM permissions;

-- =====================================================
-- 4. MEMBER roliga permissionlar
-- =====================================================

-- Dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code = 'DASHBOARD_VIEW';

-- Transactions (VIEW, CREATE, UPDATE, EXPORT)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code IN ('TRANSACTIONS_VIEW', 'TRANSACTIONS_CREATE', 'TRANSACTIONS_UPDATE', 'TRANSACTIONS_EXPORT');

-- Accounts (VIEW, CREATE, UPDATE, TRANSFER, EXPORT)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code IN ('ACCOUNTS_VIEW', 'ACCOUNTS_CREATE', 'ACCOUNTS_UPDATE', 'ACCOUNTS_TRANSFER', 'ACCOUNTS_EXPORT');

-- Categories (VIEW, CREATE, UPDATE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code IN ('CATEGORIES_VIEW', 'CATEGORIES_CREATE', 'CATEGORIES_UPDATE');

-- Budgets (VIEW, CREATE, UPDATE, EXPORT)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code IN ('BUDGETS_VIEW', 'BUDGETS_CREATE', 'BUDGETS_UPDATE', 'BUDGETS_EXPORT');

-- Savings (VIEW, CREATE, UPDATE, CONTRIBUTE, EXPORT)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code IN ('SAVINGS_VIEW', 'SAVINGS_CREATE', 'SAVINGS_UPDATE', 'SAVINGS_CONTRIBUTE', 'SAVINGS_EXPORT');

-- Debts (VIEW, CREATE, UPDATE, PAY, EXPORT)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code IN ('DEBTS_VIEW', 'DEBTS_CREATE', 'DEBTS_UPDATE', 'DEBTS_PAY', 'DEBTS_EXPORT');

-- Family (VIEW)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code = 'FAMILY_VIEW';

-- Reports (VIEW, EXPORT)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code IN ('REPORTS_VIEW', 'REPORTS_EXPORT');

-- Notifications (VIEW)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), id
FROM permissions WHERE code = 'NOTIFICATIONS_VIEW';

-- =====================================================
-- 5. VIEWER roliga faqat VIEW permissionlar
-- =====================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'VIEWER'), id
FROM permissions WHERE action = 'VIEW';

-- =====================================================
-- 6. Admin userga ADMIN rolini biriktirish
-- =====================================================

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM roles WHERE code = 'ADMIN'),
    CURRENT_TIMESTAMP;

-- =====================================================
-- 7. DEFAULT KATEGORIYALAR (17 ta)
-- =====================================================

-- Daromad kategoriyalari (6 ta)
INSERT INTO categories (name, type, icon, is_system, is_active) VALUES
('Maosh', 'INCOME', 'wallet', true, true),
('Biznes daromad', 'INCOME', 'briefcase', true, true),
('Investitsiya', 'INCOME', 'trending-up', true, true),
('Freelance', 'INCOME', 'laptop', true, true),
('Sovg''a', 'INCOME', 'gift', true, true),
('Boshqa daromad', 'INCOME', 'plus-circle', true, true);

-- Xarajat kategoriyalari (11 ta)
INSERT INTO categories (name, type, icon, is_system, is_active) VALUES
('Oziq-ovqat', 'EXPENSE', 'shopping-cart', true, true),
('Transport', 'EXPENSE', 'truck', true, true),
('Kommunal to''lovlar', 'EXPENSE', 'home', true, true),
('Uy-joy', 'EXPENSE', 'key', true, true),
('Kiyim-kechak', 'EXPENSE', 'shopping-bag', true, true),
('Sog''liqni saqlash', 'EXPENSE', 'heart', true, true),
('Ta''lim', 'EXPENSE', 'book-open', true, true),
('Ko''ngilochar', 'EXPENSE', 'film', true, true),
('Aloqa va internet', 'EXPENSE', 'wifi', true, true),
('Go''zallik va parvarish', 'EXPENSE', 'scissors', true, true),
('Boshqa xarajat', 'EXPENSE', 'more-horizontal', true, true);
