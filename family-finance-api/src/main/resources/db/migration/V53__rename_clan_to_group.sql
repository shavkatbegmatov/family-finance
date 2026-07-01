-- =====================================================
-- V53: CLAN → GROUP rebrand (ADR-001 Faza 3A)
-- =====================================================
-- ScopeType.CLAN enum GROUP'ga qayta nomlandi: genealogik "urug'" da'vosini yo'qotib,
-- sof moliyaviy IXTIYORIY guruhga aylandi (decoupling). @Enumerated(STRING) bo'lgani
-- uchun DB'dagi type='CLAN' qiymatlari 'GROUP'ga ko'chirilishi SHART — aks holda enum
-- validate xatosi ("No enum constant ... CLAN"). Bu migration enum bilan ATOMIK: Flyway
-- app start'dan oldin ishlaydi, so'ng Hibernate yangi GROUP enum'ni validate qiladi.
--
-- Invite kodlar (unique_code = 'C...') ATAYLAB TEGILMAYDI — invite orqali qo'shilish DB
-- lookup orqali (findByUniqueCode), prefiks faqat kosmetik; mavjud kodlar ishlashda davom
-- etadi. Yangi GROUP scope'lar 'G...' prefiks oladi (InviteCodeGenerator).
-- =====================================================

-- 1) Constraint'larni vaqtincha olib tashlash (UPDATE erkin bo'lishi uchun)
ALTER TABLE scopes DROP CONSTRAINT IF EXISTS chk_scope_type;
ALTER TABLE scopes DROP CONSTRAINT IF EXISTS chk_scope_parent;

-- 2) Ma'lumotni ko'chirish: CLAN → GROUP
UPDATE scopes SET type = 'GROUP' WHERE type = 'CLAN';

-- 3) chk_scope_type — endi 'GROUP' ('CLAN' o'rniga)
ALTER TABLE scopes ADD CONSTRAINT chk_scope_type
    CHECK (type IN ('GROUP','HOUSEHOLD','PROJECT','EVENT','FUND','TRUSTEE','PROPERTY'));

-- 4) chk_scope_parent — GROUP root, HOUSEHOLD ixtiyoriy (V52 mantig'i, CLAN→GROUP)
ALTER TABLE scopes ADD CONSTRAINT chk_scope_parent
    CHECK (
        (type = 'GROUP' AND parent_scope_id IS NULL)
        OR (type = 'HOUSEHOLD')
        OR (type NOT IN ('GROUP', 'HOUSEHOLD') AND parent_scope_id IS NOT NULL)
    );

COMMENT ON COLUMN scopes.type IS
    'Scope turi: GROUP=moliyaviy guruh (ixtiyoriy aggregation root), HOUSEHOLD=xonadon (mustaqil root yoki GROUP ostida), PROJECT, EVENT, FUND, TRUSTEE, PROPERTY';

-- 5) Statistika
DO $$
DECLARE
    v_groups INT;
BEGIN
    SELECT COUNT(*) INTO v_groups FROM scopes WHERE type = 'GROUP';
    RAISE NOTICE 'V53: CLAN → GROUP ko''chirildi (% ta GROUP scope)', v_groups;
END $$;
