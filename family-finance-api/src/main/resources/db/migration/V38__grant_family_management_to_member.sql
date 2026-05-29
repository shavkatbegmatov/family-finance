-- V38: MEMBER roliga oila a'zolarini boshqarish ruxsatlarini berish
--
-- Sabab: Yangi ro'yxatdan o'tgan har bir user MEMBER roliga ega bo'lib, o'z scope'ining
-- OWNER'i bo'ladi. Lekin legacy `@RequiresPermission(FAMILY_CREATE/UPDATE/DELETE)`
-- tekshiruvi MEMBER roliga bu permission'lar yo'qligi sababli 403 qaytaradi.
-- Misol: Anvar Xolmatov register qildi → o'z Xolmatov urug'iga OWNER → lekin o'g'lini
-- /my-family/settings dan qo'shmoqchi bo'lganda 403.
--
-- Yechim: Bu permission'larni MEMBER roliga ham beramiz. Scope-aware filtering
-- service darajasida (ScopeContextService.canManageScope) ta'minlanadi —
-- shuning uchun MEMBER faqat o'z scope'idagi a'zolarni boshqara oladi.

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'MEMBER'), p.id
FROM permissions p
WHERE p.code IN (
    -- Family — yangi kelganlar qo'shish/o'chirish (asosiy fix)
    'FAMILY_CREATE', 'FAMILY_UPDATE', 'FAMILY_DELETE', 'FAMILY_EXPORT',
    -- Boshqa DELETE operatsiyalar — MEMBER scope OWNER bo'lsa o'z ma'lumotini o'chira olishi kerak
    'TRANSACTIONS_DELETE', 'ACCOUNTS_DELETE', 'CATEGORIES_DELETE',
    'BUDGETS_DELETE', 'SAVINGS_DELETE', 'DEBTS_DELETE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
