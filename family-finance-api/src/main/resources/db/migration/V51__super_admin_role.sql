-- =====================================================
-- V51: SUPER_ADMIN roli — platforma operatori (oilasiz)
-- =====================================================
--
-- Super admin endi ALOHIDA platforma profili: o'z oilasi/moliyasi (scope) yo'q,
-- faqat NAZORAT (read-only) va GLOBAL SOZLAMALAR bilan ishlaydi.
--
-- Bu rol quyidagilarni oladi:
--   - Boshqaruv / global sozlamalar (VIEW + WRITE):
--       USERS_*, ROLES_*, SETTINGS_*, NOTIFICATIONS_*, REPORTS_*
--   - Moliyaviy NAZORAT (faqat VIEW): DASHBOARD/ACCOUNTS/TRANSACTIONS/CATEGORIES/
--       BUDGETS/SAVINGS/DEBTS/FAMILY _VIEW
--   - Moliyaviy WRITE (*_CREATE/UPDATE/DELETE/TRANSFER/PAY/...) ATAYIN BERILMAYDI
--       — bu "read-only nazorat" kafolatining huquq-darajadagi qatlami
--       (ikkinchi qatlam: ScopeContextService super admin'ga yozishni o'tkazmaydi).
--
-- ESLATMA: superadmin AKKAUNTI bu yerda yaratilmaydi — paroli env'dan
--   (SUPER_ADMIN_INITIAL_PASSWORD) kelgani uchun startup'dagi SuperAdminSeeder
--   (ApplicationRunner) yaratadi. Bu migration faqat ROL + huquqlarni tayyorlaydi.
--
-- Idempotent (NOT EXISTS): qayta ishga tushsa xatosiz.
-- =====================================================

-- 1) SUPER_ADMIN roli
INSERT INTO roles (name, code, description, is_system, is_active)
SELECT 'Super Administrator', 'SUPER_ADMIN',
       'Platforma operatori: nazorat (read-only) va global sozlamalar. Oila/scope yo''q.',
       true, true
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'SUPER_ADMIN');

-- 2) SUPER_ADMIN roliga huquqlar (aniq ro'yxat — moliyaviy WRITE yo'q)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code IN (
      -- Boshqaruv / global sozlamalar (VIEW + WRITE)
      'USERS_VIEW', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE', 'USERS_CHANGE_ROLE',
      'ROLES_VIEW', 'ROLES_CREATE', 'ROLES_UPDATE', 'ROLES_DELETE',
      'SETTINGS_VIEW', 'SETTINGS_UPDATE',
      'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_MANAGE',
      'REPORTS_VIEW', 'REPORTS_EXPORT',
      -- Moliyaviy NAZORAT (faqat VIEW — read-only)
      'DASHBOARD_VIEW',
      'ACCOUNTS_VIEW',
      'TRANSACTIONS_VIEW',
      'CATEGORIES_VIEW',
      'BUDGETS_VIEW',
      'SAVINGS_VIEW',
      'DEBTS_VIEW',
      'FAMILY_VIEW'
  )
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
  );

-- 3) Eski super admin (fstudioadm@gmail.com) endi alohida emas — oddiy oilaviy
--    foydalanuvchiga qaytariladi (TASDIQLANGAN qaror). Platforma admini sifatida
--    yangi alohida 'superadmin' akkaunti (SuperAdminSeeder) ishlatiladi.
UPDATE users
SET is_super_admin = false
WHERE email = 'fstudioadm@gmail.com'
  AND is_super_admin = true;
