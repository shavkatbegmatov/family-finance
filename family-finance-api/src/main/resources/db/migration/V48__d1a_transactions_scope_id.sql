-- =====================================================================
-- V48 (D1-a): transactions.scope_id — ADDITIVE (nullable + backfill + indeks)
--
-- Tranzaksiyalarga to'g'ridan scope_id qo'shadi (avval scope bilvosita
-- account.homeScope / familyGroup orqali bilinardi). Bu PR-a FAQAT:
--   1) ustun (nullable) + FK
--   2) mavjud qatorlarni backfill (asosiy account.scope_id'dan)
--   3) kompozit indeks (scope_id, transaction_date DESC)
-- Read-path query cutover (21 ta account.familyGroup-query) ALOHIDA PR-b da.
--
-- NULLABLE (NOT NULL EMAS): system/SYSTEM_TRANSIT tranzaksiyalarning asosiy account'i
-- scope'siz bo'lishi mumkin (account.scope_id NULL) — V39 accounts'ni aynan shu sabab
-- NOT NULL'dan ATAYLAB istisno qilgan. Shu bois bu yerda ham NOT NULL qo'yilmaydi.
--
-- IDEMPOTENT: IF NOT EXISTS + WHERE scope_id IS NULL (qisman bajarilgan urinish xavfsiz).
-- =====================================================================

-- 1) Ustun + FK (RESTRICT — scope o'chsa, unga bog'liq tranzaksiya bo'lsa to'sadi)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;

-- 2) Backfill: tranzaksiya scope'i = asosiy (user-facing) account.scope_id
--    (SYSTEM_TRANSIT/system account'larda scope_id NULL → tranzaksiya scope_id ham NULL qoladi)
UPDATE transactions t
SET scope_id = a.scope_id
FROM accounts a
WHERE a.id = t.account_id
  AND a.scope_id IS NOT NULL
  AND t.scope_id IS NULL;

-- 3) Kompozit indeks: scope bo'yicha sana listing (PR-b read-path query'larini qoplaydi)
CREATE INDEX IF NOT EXISTS idx_transactions_scope_date
    ON transactions (scope_id, transaction_date DESC)
    WHERE scope_id IS NOT NULL;

-- 4) Statistika (qancha qator backfill bo'ldi; NULL = system/SYSTEM_TRANSIT kutilgan)
DO $$
DECLARE
    v_total INT;
    v_with INT;
BEGIN
    SELECT COUNT(*) INTO v_total FROM transactions;
    SELECT COUNT(*) INTO v_with FROM transactions WHERE scope_id IS NOT NULL;
    RAISE NOTICE 'V48 transactions.scope_id backfill: % / % populated (% NULL = system/SYSTEM_TRANSIT)',
                 v_with, v_total, (v_total - v_with);
END $$;
