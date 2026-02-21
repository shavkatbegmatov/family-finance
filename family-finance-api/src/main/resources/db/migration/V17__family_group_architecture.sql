-- V17: Family Group Architecture
-- This migration resolves the multi-tenant data isolation issue where family scopes were global.

-- 1. Create family_groups table
CREATE TABLE family_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    admin_id BIGINT NOT NULL REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 2. Add columns to related tables
ALTER TABLE users ADD COLUMN family_group_id BIGINT REFERENCES family_groups(id);
ALTER TABLE family_members ADD COLUMN family_group_id BIGINT REFERENCES family_groups(id);
ALTER TABLE accounts ADD COLUMN family_group_id BIGINT REFERENCES family_groups(id);

-- 3. Data Migration Logic

-- A. Create a default family group for every user existing in the system
INSERT INTO family_groups (name, admin_id, active, created_at, updated_at)
SELECT full_name || ' Oilasi', id, true, NOW(), NOW()
FROM users;

-- B. Assign users to the family group they admin
UPDATE users u
SET family_group_id = fg.id
FROM family_groups fg
WHERE fg.admin_id = u.id;

-- C. Assign family members associated with a user to that user's family group
UPDATE family_members fm
SET family_group_id = u.family_group_id
FROM users u
WHERE fm.user_id = u.id;

-- D. Assign unlinked family members to the family group of their closest known relative (partners)
UPDATE family_members fm
SET family_group_id = u.family_group_id
FROM family_partners fp
JOIN family_units fu ON fp.family_unit_id = fu.id
JOIN family_partners fp_other ON fu.id = fp_other.family_unit_id AND fp_other.person_id != fp.person_id
JOIN family_members fm_other ON fp_other.person_id = fm_other.id
JOIN users u ON fm_other.user_id = u.id
WHERE fm.id = fp.person_id AND fm.user_id IS NULL AND fm.family_group_id IS NULL;

-- E. Assign unlinked family members (children) to their parent's family group
UPDATE family_members fm
SET family_group_id = u.family_group_id
FROM family_children fc
JOIN family_units fu ON fc.family_unit_id = fu.id
JOIN family_partners fp_parent ON fu.id = fp_parent.family_unit_id
JOIN family_members fm_parent ON fp_parent.person_id = fm_parent.id
JOIN users u ON fm_parent.user_id = u.id
WHERE fm.id = fc.person_id AND fm.user_id IS NULL AND fm.family_group_id IS NULL;

-- F. Assign accounts to the family group of their owner
UPDATE accounts a
SET family_group_id = fm.family_group_id
FROM family_members fm
WHERE a.owner_id = fm.id;

-- Optional fallback for remaining orphans: set to the first family group created (superadmin's group usually)
UPDATE family_members
SET family_group_id = (SELECT MIN(id) FROM family_groups)
WHERE family_group_id IS NULL;

UPDATE accounts
SET family_group_id = (SELECT MIN(id) FROM family_groups)
WHERE family_group_id IS NULL;
