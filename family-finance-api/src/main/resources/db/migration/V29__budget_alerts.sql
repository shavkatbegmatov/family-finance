-- Byudjet ogohlantirishlari (idempotent notifikatsiya uchun).
-- Bir budget davri ichida bir threshold uchun faqat bitta yozuv.
CREATE TABLE budget_alerts (
    id          BIGSERIAL PRIMARY KEY,
    budget_id   BIGINT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    threshold   INT    NOT NULL CHECK (threshold IN (80, 100)),
    sent_at     TIMESTAMP NOT NULL,
    version     BIGINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    CONSTRAINT uk_budget_alert UNIQUE (budget_id, threshold)
);

CREATE INDEX idx_budget_alerts_budget ON budget_alerts(budget_id);
