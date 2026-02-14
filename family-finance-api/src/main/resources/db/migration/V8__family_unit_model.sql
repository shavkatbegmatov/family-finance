-- family_members ga yangi ustunlar
ALTER TABLE family_members ADD COLUMN last_name VARCHAR(100);
ALTER TABLE family_members ADD COLUMN birth_place VARCHAR(200);
ALTER TABLE family_members ADD COLUMN death_date DATE;

-- Yangi jadvallar
CREATE TABLE family_units (
    id BIGSERIAL PRIMARY KEY,
    marriage_date DATE,
    divorce_date DATE,
    marriage_type VARCHAR(20) NOT NULL DEFAULT 'MARRIED',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE TABLE family_partners (
    id BIGSERIAL PRIMARY KEY,
    family_unit_id BIGINT NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
    person_id BIGINT NOT NULL REFERENCES family_members(id),
    role VARCHAR(20) NOT NULL DEFAULT 'PARTNER1',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    CONSTRAINT uq_family_partner UNIQUE (family_unit_id, person_id)
);

CREATE TABLE family_children (
    id BIGSERIAL PRIMARY KEY,
    family_unit_id BIGINT NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
    person_id BIGINT NOT NULL REFERENCES family_members(id),
    lineage_type VARCHAR(20) NOT NULL DEFAULT 'BIOLOGICAL',
    birth_order INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    CONSTRAINT uq_family_child UNIQUE (family_unit_id, person_id)
);

-- Indekslar
CREATE INDEX idx_family_units_status ON family_units(status);
CREATE INDEX idx_family_partners_unit ON family_partners(family_unit_id);
CREATE INDEX idx_family_partners_person ON family_partners(person_id);
CREATE INDEX idx_family_children_unit ON family_children(family_unit_id);
CREATE INDEX idx_family_children_person ON family_children(person_id);

-- Eski jadvalni o'chirish
DROP TABLE IF EXISTS family_relationships;
