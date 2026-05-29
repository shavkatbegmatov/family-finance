-- =====================================================
-- V36: Orphan ma'lumotlar uchun scope_id backfill
-- =====================================================
-- V35 da family_group_id orqali JOIN qildik. Lekin ba'zi yozuvlarda
-- family_group_id NULL (orphan ma'lumotlar) — ular V35 da o'tkazib yuborildi.
--
-- Misol: family_members jadvalida 92 dan 61 tasiga scope_id berilgan,
-- qolgan 31 tasi orphan (eski tarixiy ma'lumot — ehtimol deceased a'zolar
-- yoki test paytida yaratilganlar).
--
-- Bu migratsiya barcha qolgan NULL scope_id'larga **fallback HOUSEHOLD**'ni
-- biriktiradi (V35'dagi Budget/Debt logikasi bilan bir xil). Admin keyinroq
-- to'g'rilashi mumkin — lekin V37 da NOT NULL qilish uchun hozir hech bir
-- yozuvda NULL qolmasligi kerak.
-- =====================================================

-- Fallback HOUSEHOLD (eng birinchi yaratilgani — odatda admin tomonidan)
-- ni bir CTE'ga olamiz va har jadvalda ishlatamiz.

-- 1) family_members orphans
UPDATE family_members
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

-- 2) accounts orphans (ehtimol yo'q, lekin xavfsizlik uchun)
UPDATE accounts
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

-- 3) Point* jadvallari uchun ham (agar orphan bo'lsa)
UPDATE point_configs
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

UPDATE point_participants
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

UPDATE point_balances
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

UPDATE point_savings_accounts
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

UPDATE point_challenges
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

-- 4) Budget, Debt, SavingsGoal — V35 da to'liq backfill qilgan, lekin xavfsizlik
UPDATE budgets
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

UPDATE debts
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

UPDATE savings_goals
SET scope_id = (SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1)
WHERE scope_id IS NULL;

-- =====================================================
-- Statistika
-- =====================================================
DO $$
DECLARE
    v_remaining_orphans INT := 0;
    v_tbl_count INT;
BEGIN
    SELECT COUNT(*) INTO v_tbl_count FROM family_members WHERE scope_id IS NULL;
    v_remaining_orphans := v_remaining_orphans + v_tbl_count;
    IF v_tbl_count > 0 THEN
        RAISE WARNING 'family_members hali ham % ta orphan qoldi', v_tbl_count;
    END IF;

    SELECT COUNT(*) INTO v_tbl_count FROM accounts WHERE scope_id IS NULL;
    v_remaining_orphans := v_remaining_orphans + v_tbl_count;

    SELECT COUNT(*) INTO v_tbl_count FROM budgets WHERE scope_id IS NULL;
    v_remaining_orphans := v_remaining_orphans + v_tbl_count;

    SELECT COUNT(*) INTO v_tbl_count FROM debts WHERE scope_id IS NULL;
    v_remaining_orphans := v_remaining_orphans + v_tbl_count;

    SELECT COUNT(*) INTO v_tbl_count FROM savings_goals WHERE scope_id IS NULL;
    v_remaining_orphans := v_remaining_orphans + v_tbl_count;

    RAISE NOTICE 'V36 Orphan Backfill Summary: % rows remain NULL (kutilgan: 0)', v_remaining_orphans;
END $$;
