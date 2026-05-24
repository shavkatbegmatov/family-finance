-- =====================================================
-- V33: Multi-level Scope architecture — schema only
-- =====================================================
-- Bu migratsiya yangi "Scope + Membership" tuzilmasini joriy etadi:
--   - Scope: universal guruh entity (CLAN, HOUSEHOLD, PROJECT, EVENT, FUND, TRUSTEE, PROPERTY)
--   - ScopeMembership: user'larning scope'lardagi rollari (OWNER/ADMIN/MEMBER/VIEWER/GUEST)
--   - User.is_super_admin: platforma darajasidagi admin flag'i
--   - User.primary_scope_id: foydalanuvchining default ishlash scope'i
--
-- Eski family_groups jadvali O'CHIRILMAYDI — Phase 2 oxiriga qadar saqlanadi
-- (dual-read/write paytida). V37 da olib tashlanadi.
-- Ma'lumot migratsiyasi V34 da amalga oshiriladi.
-- =====================================================

-- 1) Asosiy Scope jadvali
CREATE TABLE scopes (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    parent_scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT,
    owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    unique_code VARCHAR(32) UNIQUE,
    metadata JSONB,
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    version BIGINT,

    -- Type enum constraint (tuzatish oson bo'lishi uchun string sifatida)
    CONSTRAINT chk_scope_type
        CHECK (type IN ('CLAN','HOUSEHOLD','PROJECT','EVENT','FUND','TRUSTEE','PROPERTY')),

    -- CLAN parent'siz, qolganlari parent bilan
    CONSTRAINT chk_scope_parent
        CHECK (
            (type = 'CLAN' AND parent_scope_id IS NULL)
            OR (type <> 'CLAN' AND parent_scope_id IS NOT NULL)
        )
);

CREATE INDEX idx_scopes_type ON scopes(type);
CREATE INDEX idx_scopes_parent ON scopes(parent_scope_id) WHERE parent_scope_id IS NOT NULL;
CREATE INDEX idx_scopes_owner ON scopes(owner_user_id);
CREATE INDEX idx_scopes_active ON scopes(is_active) WHERE is_active = true;

COMMENT ON TABLE scopes IS 'Universal guruh entity: Clan, Household, Project, Event, Fund, Trustee, Property';
COMMENT ON COLUMN scopes.type IS 'Scope turi: CLAN=urug''/katta oila, HOUSEHOLD=xonadon, PROJECT=loyiha, EVENT=voqea, FUND=fond, TRUSTEE=vasiylik, PROPERTY=mulk';
COMMENT ON COLUMN scopes.parent_scope_id IS 'Ota-scope (CLAN dan tashqari hammasida majburiy)';
COMMENT ON COLUMN scopes.metadata IS 'Tur-specifik konfiguratsiya (JSONB): masalan EVENT uchun expected_budget, PROPERTY uchun shareholders[]';
COMMENT ON COLUMN scopes.starts_at IS 'EVENT/PROJECT boshlanish sanasi (ixtiyoriy)';
COMMENT ON COLUMN scopes.ends_at IS 'EVENT/PROJECT tugash sanasi (avto-arxivlash uchun)';


-- 2) ScopeMembership — user'lar va scope'lar orasidagi rol bog'lanishi
CREATE TABLE scope_memberships (
    id BIGSERIAL PRIMARY KEY,
    scope_id BIGINT NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    invited_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    version BIGINT,

    -- Bir user bir scope'da faqat bitta membership'ga ega bo'la oladi
    CONSTRAINT uk_scope_membership UNIQUE (scope_id, user_id),

    CONSTRAINT chk_membership_role
        CHECK (role IN ('OWNER','ADMIN','MEMBER','VIEWER','GUEST')),

    CONSTRAINT chk_membership_status
        CHECK (status IN ('ACTIVE','LEFT','EXPELLED','PENDING'))
);

CREATE INDEX idx_scope_memberships_scope ON scope_memberships(scope_id);
CREATE INDEX idx_scope_memberships_user ON scope_memberships(user_id);
CREATE INDEX idx_scope_memberships_active ON scope_memberships(user_id, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_scope_memberships_role ON scope_memberships(scope_id, role) WHERE status = 'ACTIVE';

COMMENT ON TABLE scope_memberships IS 'User va Scope orasidagi M:N bog''lanish, har biri rol va status bilan';
COMMENT ON COLUMN scope_memberships.role IS 'OWNER=egasi, ADMIN=boshqaruvchi, MEMBER=a''zo, VIEWER=ko''ruvchi, GUEST=mehmon';
COMMENT ON COLUMN scope_memberships.status IS 'ACTIVE=faol, LEFT=chiqib ketgan, EXPELLED=chiqarib yuborilgan, PENDING=taklif kutilmoqda';


-- 3) Users jadvaliga yangi ustunlar
ALTER TABLE users
    ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN primary_scope_id BIGINT REFERENCES scopes(id) ON DELETE SET NULL;

CREATE INDEX idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;
CREATE INDEX idx_users_primary_scope ON users(primary_scope_id) WHERE primary_scope_id IS NOT NULL;

COMMENT ON COLUMN users.is_super_admin IS 'Platforma darajasidagi super-admin (har qanday scope''ga kira oladi). Audit log bilan kuzatiladi.';
COMMENT ON COLUMN users.primary_scope_id IS 'Foydalanuvchining default "ishlash" scope''i. Login paytida JWT da active_scope_id sifatida o''rnatiladi.';
