-- =====================================================
-- V40: family_units ↔ HOUSEHOLD scope bog'lanishi + scopes.display_code
-- =====================================================
-- Maqsad:
--   1. Har bir nikoh birligini (FamilyUnit) bitta HOUSEHOLD scope'ga ulash —
--      shajara (genealogiya) va byudjet (HOUSEHOLD) tuzilmalarini birlashtirish.
--      Nullable: faqat genealogik (byudjetsiz) birliklar scope'siz qoladi.
--      Bir HOUSEHOLD bir nechta FamilyUnit ga ega bo'lishi mumkin (ManyToOne).
--   2. Xonadon-markazli ko'rinishda ishlatiladigan inson o'qiy oladigan
--      qisqa raqam (display_code, masalan "278-541") — invite uniqueCode'dan ALOHIDA.
--
-- IDEMPOTENT: barcha ALTER/CREATE statement'lar IF NOT EXISTS bilan;
-- backfill'lar WHERE ... IS NULL bilan — qayta ishga tushsa zarar yo'q.
-- =====================================================

-- =====================================================
-- 1) Ustunlar
-- =====================================================

ALTER TABLE family_units ADD COLUMN IF NOT EXISTS scope_id BIGINT REFERENCES scopes(id) ON DELETE RESTRICT;

ALTER TABLE scopes ADD COLUMN IF NOT EXISTS display_code VARCHAR(16);

COMMENT ON COLUMN family_units.scope_id IS
    'Bu nikoh birligi tegishli HOUSEHOLD scope. Bir HOUSEHOLD bir nechta FamilyUnit ga ega bo''lishi mumkin. NULL = faqat genealogik (byudjetsiz) birlik.';

COMMENT ON COLUMN scopes.display_code IS
    'Inson o''qiy oladigan qisqa xonadon raqami (masalan "278-541"). Invite uniqueCode''dan ALOHIDA — sir emas, UI''da ko''rsatish uchun. Faqat HOUSEHOLD uchun to''ldiriladi.';

-- =====================================================
-- 2) Indekslar (idempotent)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_family_units_scope ON family_units(scope_id) WHERE scope_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_scopes_display_code ON scopes(display_code) WHERE display_code IS NOT NULL;

-- =====================================================
-- 3) Backfill — family_units.scope_id
-- =====================================================
-- Mantiq: unit partnerlarining family_members.scope_id'si orqali (faqat HOUSEHOLD).
-- ROW_NUMBER bilan birinchi partner (role, person_id tartibida) scope'i olinadi.
-- 'AND s.type = HOUSEHOLD' filtri MAJBURIY — CLAN'ga noto'g'ri ulanmaslik uchun.
-- ⚠️ Hozir aksar a'zolar V35 da bitta HOUSEHOLD'ga backfill qilingan, shuning uchun
--    ko'p unit o'sha yagona xonadonga ulanadi — kutilgan holat (keyin admin alohida
--    xonadonlar yaratadi).

UPDATE family_units fu
SET scope_id = sub.scope_id
FROM (
    SELECT fp.family_unit_id,
           fm.scope_id,
           ROW_NUMBER() OVER (
               PARTITION BY fp.family_unit_id
               ORDER BY fp.role, fp.person_id
           ) AS rn
    FROM family_partners fp
    JOIN family_members fm ON fm.id = fp.person_id
    JOIN scopes s ON s.id = fm.scope_id AND s.type = 'HOUSEHOLD'
) sub
WHERE fu.id = sub.family_unit_id
  AND sub.rn = 1
  AND fu.scope_id IS NULL;

-- =====================================================
-- 4) Backfill — scopes.display_code (faqat HOUSEHOLD)
-- =====================================================
-- Har bir HOUSEHOLD'ga unique "NNN-NNN" raqam. Collision bo'lsa qayta urinadi.

DO $$
DECLARE
    rec RECORD;
    new_code VARCHAR(16);
    attempts INT;
BEGIN
    FOR rec IN
        SELECT id FROM scopes WHERE type = 'HOUSEHOLD' AND display_code IS NULL
    LOOP
        attempts := 0;
        LOOP
            new_code := lpad((floor(random() * 1000))::int::text, 3, '0')
                        || '-'
                        || lpad((floor(random() * 1000))::int::text, 3, '0');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM scopes WHERE display_code = new_code);
            attempts := attempts + 1;
            IF attempts > 50 THEN
                RAISE EXCEPTION 'display_code generatsiya muvaffaqiyatsiz (scope id=%)', rec.id;
            END IF;
        END LOOP;
        UPDATE scopes SET display_code = new_code WHERE id = rec.id;
    END LOOP;
END $$;

-- =====================================================
-- 5) Statistika
-- =====================================================
DO $$
DECLARE
    v_units_total INT;
    v_units_linked INT;
    v_households INT;
    v_with_code INT;
BEGIN
    SELECT COUNT(*) INTO v_units_total FROM family_units;
    SELECT COUNT(*) INTO v_units_linked FROM family_units WHERE scope_id IS NOT NULL;
    SELECT COUNT(*) INTO v_households FROM scopes WHERE type = 'HOUSEHOLD';
    SELECT COUNT(*) INTO v_with_code FROM scopes WHERE type = 'HOUSEHOLD' AND display_code IS NOT NULL;

    RAISE NOTICE 'V40 Backfill Summary:';
    RAISE NOTICE '  family_units: % / % linked to a HOUSEHOLD scope', v_units_linked, v_units_total;
    RAISE NOTICE '  households with display_code: % / %', v_with_code, v_households;
END $$;
