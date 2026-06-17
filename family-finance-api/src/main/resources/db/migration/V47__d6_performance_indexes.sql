-- =====================================================================
-- V47 (D6): Performance indekslari — ADDITIVE, xavfsiz (b-tree, IF NOT EXISTS)
--
-- Faqat indeks qo'shadi: mavjud ma'lumotni o'zgartirmaydi, CHECK/UNIQUE qo'ymaydi
-- (ular mavjud ma'lumotga bog'liq → alohida, prod-validatsiya bilan). pg_trgm GIN
-- ham keyinroq (CREATE EXTENSION prod-rol privilegiyasini talab qiladi).
-- =====================================================================

-- 1) Hisob tranzaksiyalarini sana bo'yicha listing (eng keng tarqalgan query:
--    findByAccount, getRecent — ORDER BY transaction_date DESC ni qoplaydi)
CREATE INDEX IF NOT EXISTS idx_transactions_account_date
    ON transactions (account_id, transaction_date DESC);

-- 2) Storno (reversal) qidiruvi — reversed_by_id orqali bog'langan tranzaksiyalar
CREATE INDEX IF NOT EXISTS idx_transactions_reversed_by
    ON transactions (reversed_by_id)
    WHERE reversed_by_id IS NOT NULL;

-- 3) Scope-filter + faol hisoblar (C3 agregat query'lari: scope_id + is_active +
--    type <> SYSTEM_TRANSIT; partial index NULL scope'larni — global hisoblarni — chiqaradi)
CREATE INDEX IF NOT EXISTS idx_accounts_scope_active
    ON accounts (scope_id, is_active)
    WHERE scope_id IS NOT NULL;
