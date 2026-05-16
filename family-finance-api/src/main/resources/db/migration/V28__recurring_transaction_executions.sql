-- Recurring tranzaksiyalar idempotentligi uchun yozuvlar.
-- Har bir (template_id, execution_date) jufti UNIQUE — bir kunda ikki marta yaratilmaydi.
CREATE TABLE recurring_transaction_executions (
    id              BIGSERIAL PRIMARY KEY,
    template_id     BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    generated_id    BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    execution_date  DATE   NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT uk_recurring_template_date UNIQUE (template_id, execution_date)
);

CREATE INDEX idx_recurring_executions_template ON recurring_transaction_executions(template_id);
CREATE INDEX idx_recurring_executions_date     ON recurring_transaction_executions(execution_date);
