-- Text search performance: functional index on LOWER(description)
-- Maqsad: TransactionRepository.findWithFilters() ichidagi
-- LOWER(t.description) LIKE LOWER('%search%') tezroq ishlashi uchun.
CREATE INDEX IF NOT EXISTS idx_transactions_description_lower
    ON transactions (LOWER(description))
    WHERE description IS NOT NULL;
