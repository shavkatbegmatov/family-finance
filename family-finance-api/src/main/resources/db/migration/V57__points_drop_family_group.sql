-- =====================================================
-- V57: Points'dan family_group_id'ni butunlay olib tashlash (ADR-002 P1c)
-- =====================================================
-- Hamyon = (shaxs, kontekst-scope) YAKUNI: family_group Points'dan chiqadi.
-- P1a (V56 backfill+dual-write) va P1b (o'qishlar scope'da) dan keyin ustunlar o'lik.
--
-- Tartib: (1) last-resort backfill (NULL qolmasin), (2) unique constraintlarni
-- scope'ga qayta yozish, (3) scope_id NOT NULL (global achievements'dan tashqari),
-- (4) family_group_id ustunlarini DROP.
-- =====================================================

-- 1) Last-resort backfill — V56'dan keyin yaratilib scope'siz qolganlar (kutilmaydi)
DO $$
DECLARE
    v_default_scope BIGINT;
BEGIN
    SELECT id INTO v_default_scope
    FROM scopes WHERE type = 'HOUSEHOLD' AND is_active = true ORDER BY id LIMIT 1;

    IF v_default_scope IS NOT NULL THEN
        UPDATE point_configs             SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_challenges          SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_tasks               SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_transactions        SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_conversions         SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_shop_items          SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_purchases           SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_multiplier_events   SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_investments         SET scope_id = v_default_scope WHERE scope_id IS NULL;
        UPDATE point_inflation_snapshots SET scope_id = v_default_scope WHERE scope_id IS NULL;
        -- achievements: faqat oila-maxsuslari (family_group_id NOT NULL edi) — global NULL qoladi
        UPDATE point_achievements        SET scope_id = v_default_scope
            WHERE scope_id IS NULL AND family_group_id IS NOT NULL;
    END IF;
END $$;

-- 2) Unique constraintlar: family_group -> scope
ALTER TABLE point_configs             DROP CONSTRAINT IF EXISTS uk_point_configs;
ALTER TABLE point_configs             ADD CONSTRAINT uk_point_configs UNIQUE (scope_id);

ALTER TABLE point_participants        DROP CONSTRAINT IF EXISTS uk_point_participant_member;
ALTER TABLE point_participants        ADD CONSTRAINT uk_point_participant_member UNIQUE (scope_id, family_member_id);

ALTER TABLE point_balances            DROP CONSTRAINT IF EXISTS uk_point_balance_participant;
ALTER TABLE point_balances            ADD CONSTRAINT uk_point_balance_participant UNIQUE (scope_id, participant_id);

ALTER TABLE point_savings_accounts    DROP CONSTRAINT IF EXISTS uk_point_savings_participant;
ALTER TABLE point_savings_accounts    ADD CONSTRAINT uk_point_savings_participant UNIQUE (scope_id, participant_id);

-- 3) NOT NULL (achievements'dan tashqari — global yutuqlar scope'siz)
ALTER TABLE point_configs             ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_challenges          ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_tasks               ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_transactions        ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_conversions         ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_shop_items          ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_purchases           ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_multiplier_events   ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_investments         ALTER COLUMN scope_id SET NOT NULL;
ALTER TABLE point_inflation_snapshots ALTER COLUMN scope_id SET NOT NULL;

-- 4) family_group_id ustunlarini DROP (14 jadval)
ALTER TABLE point_configs             DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_participants        DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_balances            DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_tasks               DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_transactions        DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_conversions         DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_challenges          DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_savings_accounts    DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_shop_items          DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_purchases           DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_achievements        DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_multiplier_events   DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_investments         DROP COLUMN IF EXISTS family_group_id;
ALTER TABLE point_inflation_snapshots DROP COLUMN IF EXISTS family_group_id;

DO $$
BEGIN
    RAISE NOTICE 'V57: Points to''liq hamyon-kontekst (scope) modelida — family_group chiqarildi';
END $$;
