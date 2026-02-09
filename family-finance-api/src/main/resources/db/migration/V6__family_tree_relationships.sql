-- Gender ustuni qo'shish
ALTER TABLE family_members ADD COLUMN gender VARCHAR(10);

-- Oilaviy munosabatlar jadvali
CREATE TABLE family_relationships (
    id BIGSERIAL PRIMARY KEY,
    from_member_id BIGINT NOT NULL REFERENCES family_members(id),
    to_member_id BIGINT NOT NULL REFERENCES family_members(id),
    relationship_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    CONSTRAINT uq_family_relationship UNIQUE (from_member_id, to_member_id),
    CONSTRAINT ck_no_self_relationship CHECK (from_member_id <> to_member_id)
);

CREATE INDEX idx_family_rel_from ON family_relationships(from_member_id);
CREATE INDEX idx_family_rel_to ON family_relationships(to_member_id);
