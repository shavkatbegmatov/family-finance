-- =====================================================
-- V56: Points jadvallariga scope_id + backfill (ADR-002 P1a)
-- =====================================================
-- Hamyon = (shaxs, kontekst-scope) modeliga birinchi qadam: scope_id'siz qolgan
-- 9 ta point_* jadvaliga ustun qo'shiladi va deterministik backfill qilinadi.
-- family_group_id TEGILMAYDI (dual-key davr) — o'qishlar P1b'da, DROP P1c'da.
--
-- Backfill strategiyasi (aniqlik tartibida):
--   A) participant FK borlar (tasks/transactions/conversions/purchases/investments):
--      scope := participant.scope (point_participants.scope_id V39'dan beri NOT NULL — aniq)
--   B) fg-level jadvallar + A'dan qolganlar: fg → fg.admin EGALIK qiladigan eng eski faol
--      HOUSEHOLD (ADR-001 F5 owner-invarianti: household.owner=fg.admin)
--   C) point_achievements'da family_group_id IS NULL = GLOBAL (tizim) yutuq —
--      scope ham NULL qoladi (ataylab).
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS; backfill'lar WHERE scope_id IS NULL.
-- =====================================================

-- 1) Ustunlar (9 jadval; configs/challenges'da V35'dan bor)
ALTER TABLE point_tasks               ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_transactions        ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_conversions         ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_shop_items          ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_purchases           ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_achievements        ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_multiplier_events   ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_investments         ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;
ALTER TABLE point_inflation_snapshots ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;

-- 2) Backfill A — participant scope'i orqali (eng aniq manba)
UPDATE point_transactions t SET scope_id = p.scope_id
FROM point_participants p WHERE t.participant_id = p.id AND t.scope_id IS NULL;

UPDATE point_conversions c SET scope_id = p.scope_id
FROM point_participants p WHERE c.participant_id = p.id AND c.scope_id IS NULL;

UPDATE point_purchases pu SET scope_id = p.scope_id
FROM point_participants p WHERE pu.participant_id = p.id AND pu.scope_id IS NULL;

UPDATE point_investments i SET scope_id = p.scope_id
FROM point_participants p WHERE i.participant_id = p.id AND i.scope_id IS NULL;

UPDATE point_tasks tk SET scope_id = p.scope_id
FROM point_participants p WHERE tk.assigned_to = p.id AND tk.scope_id IS NULL;

-- 3) Backfill B — fg → fg.admin egalik qiladigan eng eski faol HOUSEHOLD
WITH fg_household AS (
    SELECT DISTINCT ON (fg.id) fg.id AS fg_id, s.id AS scope_id
    FROM family_groups fg
    JOIN scopes s ON s.owner_user_id = fg.admin_id
                 AND s.type = 'HOUSEHOLD' AND s.is_active = true
    ORDER BY fg.id, s.id
)
UPDATE point_configs t SET scope_id = m.scope_id
FROM fg_household m WHERE t.family_group_id = m.fg_id AND t.scope_id IS NULL;

WITH fg_household AS (
    SELECT DISTINCT ON (fg.id) fg.id AS fg_id, s.id AS scope_id
    FROM family_groups fg
    JOIN scopes s ON s.owner_user_id = fg.admin_id
                 AND s.type = 'HOUSEHOLD' AND s.is_active = true
    ORDER BY fg.id, s.id
)
UPDATE point_challenges t SET scope_id = m.scope_id
FROM fg_household m WHERE t.family_group_id = m.fg_id AND t.scope_id IS NULL;

WITH fg_household AS (
    SELECT DISTINCT ON (fg.id) fg.id AS fg_id, s.id AS scope_id
    FROM family_groups fg
    JOIN scopes s ON s.owner_user_id = fg.admin_id
                 AND s.type = 'HOUSEHOLD' AND s.is_active = true
    ORDER BY fg.id, s.id
)
UPDATE point_shop_items t SET scope_id = m.scope_id
FROM fg_household m WHERE t.family_group_id = m.fg_id AND t.scope_id IS NULL;

WITH fg_household AS (
    SELECT DISTINCT ON (fg.id) fg.id AS fg_id, s.id AS scope_id
    FROM family_groups fg
    JOIN scopes s ON s.owner_user_id = fg.admin_id
                 AND s.type = 'HOUSEHOLD' AND s.is_active = true
    ORDER BY fg.id, s.id
)
UPDATE point_multiplier_events t SET scope_id = m.scope_id
FROM fg_household m WHERE t.family_group_id = m.fg_id AND t.scope_id IS NULL;

WITH fg_household AS (
    SELECT DISTINCT ON (fg.id) fg.id AS fg_id, s.id AS scope_id
    FROM family_groups fg
    JOIN scopes s ON s.owner_user_id = fg.admin_id
                 AND s.type = 'HOUSEHOLD' AND s.is_active = true
    ORDER BY fg.id, s.id
)
UPDATE point_inflation_snapshots t SET scope_id = m.scope_id
FROM fg_household m WHERE t.family_group_id = m.fg_id AND t.scope_id IS NULL;

-- point_achievements: FAQAT oila-maxsus (family_group_id NOT NULL) yutuqlar;
-- global (fg NULL) yutuqlar scope'siz qoladi
WITH fg_household AS (
    SELECT DISTINCT ON (fg.id) fg.id AS fg_id, s.id AS scope_id
    FROM family_groups fg
    JOIN scopes s ON s.owner_user_id = fg.admin_id
                 AND s.type = 'HOUSEHOLD' AND s.is_active = true
    ORDER BY fg.id, s.id
)
UPDATE point_achievements t SET scope_id = m.scope_id
FROM fg_household m WHERE t.family_group_id = m.fg_id AND t.scope_id IS NULL;

-- A'dan participant'siz qolganlar (masalan assigned_to NULL bo'lgan tasks) — B mapping
WITH fg_household AS (
    SELECT DISTINCT ON (fg.id) fg.id AS fg_id, s.id AS scope_id
    FROM family_groups fg
    JOIN scopes s ON s.owner_user_id = fg.admin_id
                 AND s.type = 'HOUSEHOLD' AND s.is_active = true
    ORDER BY fg.id, s.id
)
UPDATE point_tasks t SET scope_id = m.scope_id
FROM fg_household m WHERE t.family_group_id = m.fg_id AND t.scope_id IS NULL;

-- 4) Indekslar (P1b o'qishlari uchun)
CREATE INDEX IF NOT EXISTS idx_point_tasks_scope         ON point_tasks(scope_id)         WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_transactions_scope  ON point_transactions(scope_id)  WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_conversions_scope   ON point_conversions(scope_id)   WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_shop_items_scope    ON point_shop_items(scope_id)    WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_purchases_scope     ON point_purchases(scope_id)     WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_achievements_scope  ON point_achievements(scope_id)  WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_mult_events_scope   ON point_multiplier_events(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_investments_scope   ON point_investments(scope_id)   WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_point_inflation_scope     ON point_inflation_snapshots(scope_id) WHERE scope_id IS NOT NULL;

-- 5) Statistika — qolgan NULL'lar (kutilgan: faqat global achievements + yetim fg'lar)
DO $$
DECLARE
    v_tbl TEXT;
    v_cnt INT;
BEGIN
    FOR v_tbl IN SELECT unnest(ARRAY['point_configs','point_challenges','point_tasks',
        'point_transactions','point_conversions','point_shop_items','point_purchases',
        'point_achievements','point_multiplier_events','point_investments','point_inflation_snapshots'])
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE scope_id IS NULL', v_tbl) INTO v_cnt;
        RAISE NOTICE 'V56: % — scope_id NULL qoldi: %', v_tbl, v_cnt;
    END LOOP;
END $$;
