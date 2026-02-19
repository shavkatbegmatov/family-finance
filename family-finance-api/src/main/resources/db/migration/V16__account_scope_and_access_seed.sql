-- =====================================================
-- V16: Account Scope va Access Seed Data
-- 1. scope ustuni qo'shish (PERSONAL default)
-- 2. Mavjud hisoblar uchun access seed yaratish
-- =====================================================

-- 1. scope column qo'shish
ALTER TABLE accounts ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'PERSONAL';
CREATE INDEX idx_accounts_scope ON accounts(scope);

-- 2. Mavjud hisoblar uchun access seed
-- owner_id orqali FamilyMember → User topib, OWNER access yaratish
-- Faqat hali account_access da record yo'q bo'lganlar uchun
INSERT INTO account_access (account_id, user_id, role, granted_at, created_at, updated_at, version)
SELECT
    a.id,
    fm.user_id,
    'OWNER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
FROM accounts a
JOIN family_members fm ON fm.id = a.owner_id
WHERE fm.user_id IS NOT NULL
  AND a.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = a.id AND aa.user_id = fm.user_id
  );

-- 3. owner_id NULL bo'lgan faol hisoblar uchun — birinchi admin user'ga OWNER
-- (Agar admin user mavjud bo'lsa)
INSERT INTO account_access (account_id, user_id, role, granted_at, created_at, updated_at, version)
SELECT
    a.id,
    (SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.code = 'ADMIN' AND u.active = true
     ORDER BY u.id LIMIT 1),
    'OWNER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
FROM accounts a
WHERE a.owner_id IS NULL
  AND a.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM account_access aa WHERE aa.account_id = a.id
  )
  AND EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'ADMIN' AND u.active = true
  );
