-- =====================================================
-- V59: Maktablar MVP — SCHOOL/CLASS scope turlari + enrollments (ADR-002 P4)
-- =====================================================
-- SCHOOL: ball-kontekstlari konteyneri, root, MOLIYA YO'Q; ariza orqali (isActive=false),
--         SUPER_ADMIN tasdiqlaguncha ko'rinmaydi (visibility query'lari isActive=true filtrlaydi).
-- CLASS:  maktab ichidagi ball-konteksti (parent=SCHOOL). Sinf hamyoni pulga
--         konvertatsiya QILINMAYDI (P1c servis guard'i).
-- Enrollment: bola (FamilyMember, ko'pincha loginsiz) ↔ sinf; nickname MAJBURIY
--         (K3 maxfiylik: reyting/ro'yxatlarda faqat taxallus), consent = yozgan ota-ona.

-- 1) Scope type/parent constraintlari yangi turlar bilan
ALTER TABLE scopes DROP CONSTRAINT IF EXISTS chk_scope_type;
ALTER TABLE scopes ADD CONSTRAINT chk_scope_type
    CHECK (type IN ('GROUP','HOUSEHOLD','SCHOOL','CLASS','PROJECT','EVENT','FUND','TRUSTEE','PROPERTY'));

ALTER TABLE scopes DROP CONSTRAINT IF EXISTS chk_scope_parent;
ALTER TABLE scopes ADD CONSTRAINT chk_scope_parent
    CHECK (
        (type IN ('GROUP','SCHOOL') AND parent_scope_id IS NULL)
        OR (type = 'HOUSEHOLD')
        OR (type NOT IN ('GROUP','SCHOOL','HOUSEHOLD') AND parent_scope_id IS NOT NULL)
    );

-- 2) Enrollments
CREATE TABLE enrollments (
    id BIGSERIAL PRIMARY KEY,
    class_scope_id BIGINT NOT NULL REFERENCES scopes(id) ON DELETE RESTRICT,
    family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE RESTRICT,
    nickname VARCHAR(50) NOT NULL,
    consent_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'ENROLLED',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    left_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    version BIGINT,

    CONSTRAINT uk_enrollment_class_member UNIQUE (class_scope_id, family_member_id),
    CONSTRAINT chk_enrollment_status CHECK (status IN ('ENROLLED','LEFT'))
);

CREATE INDEX idx_enrollments_class ON enrollments(class_scope_id);
CREATE INDEX idx_enrollments_member ON enrollments(family_member_id);

COMMENT ON TABLE enrollments IS
    'ADR-002 P4: bola (FamilyMember, loginsiz bo''lishi normal) sinfga yozilishi. Nickname majburiy — sinf ichida faqat taxallus ko''rinadi; consent_by_user = yozgan ota-ona.';
