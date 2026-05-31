-- =====================================================
-- V41: scope_id va display_code backfill (V40 dan keyingi bo'shliqlar)
-- =====================================================
-- Muammo: V40 backfill faqat V40 ishga tushgan paytdagi mavjud ma'lumot uchun edi.
-- V34/auth provisioning hali ham yangi yozuvlarni faqat family_group ga bog'lardi
-- (scope_id NULL, HOUSEHOLD.display_code NULL). Servislar endi to'g'irlandi, lekin
-- ular tuzatilгунча yaratilган yozuvlarni backfill qilish kerak.
--
-- IDEMPOTENT: barcha UPDATE WHERE ... IS NULL bilan — qayta ishga tushsa zarar yo'q.
-- =====================================================

-- =====================================================
-- 1) family_members.scope_id — legacy_family_group_id orqali (ishonchli mapping)
-- =====================================================
-- Har HOUSEHOLD scope o'zining legacy FamilyGroup'iga bog'langan (provisioning'da).
-- A'zoning family_group_id'sini o'sha guruhga tegishli HOUSEHOLD scope'ga ulaymiz.
UPDATE family_members fm
SET scope_id = hs.id
FROM scopes hs
WHERE hs.type = 'HOUSEHOLD'
  AND hs.is_active = true
  AND hs.legacy_family_group_id = fm.family_group_id
  AND fm.family_group_id IS NOT NULL
  AND fm.scope_id IS NULL;

-- =====================================================
-- 2) family_units.scope_id — partnerlarning scope'i orqali (V40 mantig'i)
-- =====================================================
-- 1-qadamdan KEYIN: endi partnerlarning scope_id'si to'ldirilgan bo'lishi mumkin.
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
-- 3) scopes.display_code — display_code'siz HOUSEHOLD'larga NNN-NNN
-- =====================================================
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
-- 4) Statistika
-- =====================================================
DO $$
DECLARE
    v_members_null INT;
    v_units_null INT;
    v_hh_no_code INT;
BEGIN
    SELECT COUNT(*) INTO v_members_null FROM family_members WHERE scope_id IS NULL AND family_group_id IS NOT NULL;
    SELECT COUNT(*) INTO v_units_null FROM family_units WHERE scope_id IS NULL;
    SELECT COUNT(*) INTO v_hh_no_code FROM scopes WHERE type = 'HOUSEHOLD' AND display_code IS NULL;

    RAISE NOTICE 'V41 Backfill qoldiq (0 bo''lishi kerak yoki kam):';
    RAISE NOTICE '  family_members scope_id NULL (family_group bor): %', v_members_null;
    RAISE NOTICE '  family_units scope_id NULL: %', v_units_null;
    RAISE NOTICE '  HOUSEHOLD display_code NULL: %', v_hh_no_code;
END $$;
