-- Bitta tranzaksiyani bir nechta kategoriyaga bo'lish.
-- Misol: 500k EXPENSE -> 200k Oziq-ovqat + 100k Maishiy + 200k Boshqa.
CREATE TABLE transaction_splits (
    id              BIGSERIAL PRIMARY KEY,
    transaction_id  BIGINT       NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id     BIGINT       NOT NULL REFERENCES categories(id),
    amount          NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    note            VARCHAR(500),
    version         BIGINT       NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE INDEX idx_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX idx_splits_category    ON transaction_splits(category_id);
