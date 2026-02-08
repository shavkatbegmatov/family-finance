-- =====================================================
-- V25: Update Roles for Family Finance
-- Update existing roles and create new ones,
-- assign permissions accordingly
-- =====================================================

-- =====================================================
-- 1. DELETE OLD ROLE-PERMISSION MAPPINGS (already done in V23 but safe)
-- =====================================================
DELETE FROM role_permissions;

-- =====================================================
-- 2. UPDATE EXISTING ROLES AND ADD NEW ONES
-- =====================================================

-- Update ADMIN role description
UPDATE roles SET
    name = 'Administrator',
    description = 'Oila moliyasini to''liq boshqarish huquqi. Barcha modullar va amaliyotlarga ruxsat.',
    updated_at = now()
WHERE code = 'ADMIN';

-- Delete old MANAGER and SELLER roles (no longer needed)
DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE code IN ('MANAGER', 'SELLER'));
DELETE FROM roles WHERE code IN ('MANAGER', 'SELLER');

-- Create MEMBER role (oila a'zosi - view, create, update for most modules)
INSERT INTO roles (name, code, description, is_system, is_active, created_at)
VALUES ('Oila a''zosi', 'MEMBER', 'Oila a''zosi huquqlari. Ko''rish, yaratish va tahrirlash imkoniyatlari.', true, true, now())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

-- Create VIEWER role (faqat ko'rish huquqi)
INSERT INTO roles (name, code, description, is_system, is_active, created_at)
VALUES ('Kuzatuvchi', 'VIEWER', 'Faqat ko''rish huquqi. Hech qanday o''zgartirish kirita olmaydi.', true, true, now())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- 3. ASSIGN ALL PERMISSIONS TO ADMIN ROLE
-- =====================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE code = 'ADMIN'),
    id
FROM permissions;

-- =====================================================
-- 4. ASSIGN MEMBER ROLE PERMISSIONS
-- (view + create + update for most modules, no delete)
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
-- 5. ASSIGN VIEWER ROLE PERMISSIONS (view only)
-- =====================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'VIEWER'), id
FROM permissions WHERE action = 'VIEW';
