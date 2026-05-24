-- =====================================================
-- V35: Moliyaviy entity'larga scope_id qo'shish + backfill
-- =====================================================
-- Phase 2.A: barcha moliyaviy ma'lumotlarni yangi scope tuzilmasiga ulash.
--
-- O'zgarishlar:
--   1. Mavjud family_group_id li jadvallar (Account, FamilyMember, Point*) ga
--      scope_id ustun qo'shish va backfill qilish (family_group → HOUSEHOLD scope)
--   2. family_group_id BO'LMAGAN entity'larga (Budget, Debt, SavingsGoal —
--      hozirgi kunda bug!) scope_id qo'shish va eng yaxshi taxminga ko'ra backfill
--   3. Indekslar qo'shish (query performance uchun)
--
-- Hozircha NOT NULL emas — Phase 2 oxirida V37 da NOT NULL qilinadi
-- (servislar yangilangach va yangi yozuvlar to'g'ri yaratiladigan bo'lgach).
--
-- Eski family_group_id ustunlari saqlanadi (dual-read/write Phase 2 davomida).
-- =====================================================

-- =====================================================
-- 1) family_group_id li jadvallar — scope_id ustun
-- =====================================================

ALTER TABLE accounts ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE family_members ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_configs ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_participants ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_balances ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_savings_accounts ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_challenges ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;

-- =====================================================
-- 2) family_group_id BO'LMAGAN entity'lar (bug fix)
-- =====================================================

ALTER TABLE budgets ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE debts ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE savings_goals ADD COLUMN scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;


-- =====================================================
-- 3) Backfill — family_group_id li jadvallar
-- =====================================================
-- Mapping: family_group → o'sha guruhning HOUSEHOLD scope'i
-- (V34 da har family_group uchun 1 CLAN + 1 HOUSEHOLD yaratilgan)

-- Helper CTE pattern: family_group_id → household_scope_id
-- (Har UPDATE'da takrorlanadi — PostgreSQL'da CTE faqat 1 ta statement uchun)

UPDATE accounts a
SET scope_id = hs.id
FROM family_groups fg
JOIN scopes cs ON cs.type = 'CLAN'
              AND cs.owner_user_id = fg.admin_id
              AND cs.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes hs ON hs.type = 'HOUSEHOLD' AND hs.parent_scope_id = cs.id
WHERE a.family_group_id = fg.id AND a.scope_id IS NULL;

UPDATE family_members fm
SET scope_id = hs.id
FROM family_groups fg
JOIN scopes cs ON cs.type = 'CLAN'
              AND cs.owner_user_id = fg.admin_id
              AND cs.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes hs ON hs.type = 'HOUSEHOLD' AND hs.parent_scope_id = cs.id
WHERE fm.family_group_id = fg.id AND fm.scope_id IS NULL;

UPDATE point_configs pc
SET scope_id = hs.id
FROM family_groups fg
JOIN scopes cs ON cs.type = 'CLAN'
              AND cs.owner_user_id = fg.admin_id
              AND cs.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes hs ON hs.type = 'HOUSEHOLD' AND hs.parent_scope_id = cs.id
WHERE pc.family_group_id = fg.id AND pc.scope_id IS NULL;

UPDATE point_participants pp
SET scope_id = hs.id
FROM family_groups fg
JOIN scopes cs ON cs.type = 'CLAN'
              AND cs.owner_user_id = fg.admin_id
              AND cs.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes hs ON hs.type = 'HOUSEHOLD' AND hs.parent_scope_id = cs.id
WHERE pp.family_group_id = fg.id AND pp.scope_id IS NULL;

UPDATE point_balances pb
SET scope_id = hs.id
FROM family_groups fg
JOIN scopes cs ON cs.type = 'CLAN'
              AND cs.owner_user_id = fg.admin_id
              AND cs.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes hs ON hs.type = 'HOUSEHOLD' AND hs.parent_scope_id = cs.id
WHERE pb.family_group_id = fg.id AND pb.scope_id IS NULL;

UPDATE point_savings_accounts psa
SET scope_id = hs.id
FROM family_groups fg
JOIN scopes cs ON cs.type = 'CLAN'
              AND cs.owner_user_id = fg.admin_id
              AND cs.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes hs ON hs.type = 'HOUSEHOLD' AND hs.parent_scope_id = cs.id
WHERE psa.family_group_id = fg.id AND psa.scope_id IS NULL;

UPDATE point_challenges pch
SET scope_id = hs.id
FROM family_groups fg
JOIN scopes cs ON cs.type = 'CLAN'
              AND cs.owner_user_id = fg.admin_id
              AND cs.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes hs ON hs.type = 'HOUSEHOLD' AND hs.parent_scope_id = cs.id
WHERE pch.family_group_id = fg.id AND pch.scope_id IS NULL;


-- =====================================================
-- 4) Backfill — family_group_id YO'Q entity'lar (best-effort)
-- =====================================================

-- 4.a) SavingsGoal: account orqali (eng yaxshi manba)
UPDATE savings_goals sg
SET scope_id = a.scope_id
FROM accounts a
WHERE sg.account_id = a.id
  AND a.scope_id IS NOT NULL
  AND sg.scope_id IS NULL;

-- 4.b) Budget va Debt — to'g'ridan-to'g'ri scope bog'lanishi yo'q
-- Eng yaxshi taxmin: birinchi HOUSEHOLD'ga biriktirib qo'yamiz.
-- Admin keyinroq qo'lda boshqa HOUSEHOLD'larga ko'chirishi mumkin.
-- Bu lokal dev uchun yetarli. Production'da real ma'lumot bo'lsa,
-- admin'lar bilan kelishilgan qo'shimcha migratsiya qilish kerak.

UPDATE budgets
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

UPDATE debts
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

-- 4.c) SavingsGoal'ning hali ham NULL bo'lganlarini ham birinchi HOUSEHOLD'ga
UPDATE savings_goals
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;


-- =====================================================
-- 5) Indekslar — query performance uchun
-- =====================================================

CREATE INDEX idx_accounts_scope ON accounts(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_family_members_scope ON family_members(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_budgets_scope ON budgets(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_debts_scope ON debts(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_savings_goals_scope ON savings_goals(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_point_configs_scope ON point_configs(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_point_participants_scope ON point_participants(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_point_balances_scope ON point_balances(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_point_savings_accounts_scope ON point_savings_accounts(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX idx_point_challenges_scope ON point_challenges(scope_id) WHERE scope_id IS NOT NULL;


-- =====================================================
-- 6) Statistika
-- =====================================================
DO $$
DECLARE
    v_accounts_with INT;
    v_accounts_total INT;
    v_budgets_with INT;
    v_debts_with INT;
    v_savings_with INT;
    v_members_with INT;
BEGIN
    SELECT COUNT(*) INTO v_accounts_total FROM accounts;
    SELECT COUNT(*) INTO v_accounts_with FROM accounts WHERE scope_id IS NOT NULL;
    SELECT COUNT(*) INTO v_budgets_with FROM budgets WHERE scope_id IS NOT NULL;
    SELECT COUNT(*) INTO v_debts_with FROM debts WHERE scope_id IS NOT NULL;
    SELECT COUNT(*) INTO v_savings_with FROM savings_goals WHERE scope_id IS NOT NULL;
    SELECT COUNT(*) INTO v_members_with FROM family_members WHERE scope_id IS NOT NULL;

    RAISE NOTICE 'V35 Backfill Summary:';
    RAISE NOTICE '  accounts: % / % with scope_id', v_accounts_with, v_accounts_total;
    RAISE NOTICE '  budgets: % with scope_id', v_budgets_with;
    RAISE NOTICE '  debts: % with scope_id', v_debts_with;
    RAISE NOTICE '  savings_goals: % with scope_id', v_savings_with;
    RAISE NOTICE '  family_members: % with scope_id', v_members_with;
END $$;
