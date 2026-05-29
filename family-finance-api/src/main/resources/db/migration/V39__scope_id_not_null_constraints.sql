-- =====================================================
-- V39: scope_id NOT NULL constraint (Phase 2.G)
-- =====================================================
-- Maqsad: doimo scope-bound moliyaviy entity'larda scope_id ni MAJBURIY qilish.
-- Bu DB darajasida tenant-izolyatsiyani kafolatlaydi — kelajakda xato bilan
-- scope_id = NULL li orphan/leak yozuv yaratib bo'lmaydi.
--
-- QAMROV (6 jadval — doimo bitta scope'ga tegishli):
--   budgets, debts, savings_goals,
--   point_participants, point_balances, point_savings_accounts
--
-- ATAYLAB ISTISNO QILINGAN:
--   - accounts          → SYSTEM_TRANSIT global buxgalteriya hisoblari bor;
--                         scope'ga bog'lash semantik jihatdan noto'g'ri
--   - point_configs     → createOrUpdate() write path'i scope o'rnatmaydi
--   - family_members    → bog'lanmagan shajara a'zolari scope'siz bo'lishi mumkin
--   - point_challenges  → kelajakda ko'rib chiqiladi
--
-- XAVFSIZLIK: NOT NULL qo'yishdan oldin har ehtimolga qarshi qolgan NULL'larni
-- backfill qilamiz (hozir ma'lumot toza, lekin migration mustahkam bo'lishi kerak).
-- =====================================================

-- =====================================================
-- 1) Xavfsizlik backfill — qolgan NULL scope_id'lar (last-resort)
-- =====================================================

-- 1.a) family_group_id li point_* jadvallar → family_group'ning HOUSEHOLD scope'i
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

-- 1.b) Qolgan har qanday NULL'ni birinchi aktiv HOUSEHOLD'ga (eng oxirgi himoya)
DO $$
DECLARE
    v_default_scope BIGINT;
BEGIN
    SELECT id INTO v_default_scope
    FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1;

    IF v_default_scope IS NOT NULL THEN
        UPDATE budgets                SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE debts                  SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE savings_goals          SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_participants     SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_balances         SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_savings_accounts SET scope_id = v_default_scope WHERE scope_id IS NULL;
    END IF;
END $$;

-- =====================================================
-- 2) NOT NULL constraint qo'yish
-- =====================================================
-- PostgreSQL'da SET NOT NULL idempotent: agar ustun allaqachon NOT NULL bo'lsa
-- xato bermaydi. Agar NULL qator qolsa (bo'lmasligi kerak) — migration to'xtaydi.

ALTER TABLE budgets                ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE debts                  ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE savings_goals          ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_participants     ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_balances         ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_savings_accounts ALTER COLUMN scope_id SET NOT NULL;

-- =====================================================
-- 3) Statistika
-- =====================================================
DO $$
DECLARE
    v_budgets INT;
    v_debts INT;
    v_savings INT;
    v_participants INT;
BEGIN
    SELECT COUNT(*) INTO v_budgets FROM budgets;
    SELECT COUNT(*) INTO v_debts FROM debts;
    SELECT COUNT(*) INTO v_savings FROM savings_goals;
    SELECT COUNT(*) INTO v_participants FROM point_participants;

    RAISE NOTICE 'V39 NOT NULL constraint qo''yildi:';
    RAISE NOTICE '  budgets (% qator), debts (% qator), savings_goals (% qator)',
                 v_budgets, v_debts, v_savings;
    RAISE NOTICE '  point_participants/balances/savings_accounts (% participant)',
                 v_participants;
END $$;
