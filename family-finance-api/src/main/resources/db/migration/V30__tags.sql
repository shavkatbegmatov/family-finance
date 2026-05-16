-- Erkin teglar tizimi. Foydalanuvchi tranzaksiyalarga bir nechta tag qo'sha oladi.
CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    color       VARCHAR(20),
    version     BIGINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    CONSTRAINT uk_tag_name UNIQUE (name)
);

-- Many-to-Many bridge: transaction <-> tag
CREATE TABLE transaction_tags (
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id         BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE INDEX idx_transaction_tags_tag ON transaction_tags(tag_id);
