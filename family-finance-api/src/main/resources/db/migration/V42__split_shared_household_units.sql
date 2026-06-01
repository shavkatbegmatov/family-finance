-- =====================================================
-- V42: Bir xonadonga to'plangan oilalarni alohida xonadonlarga ajratish
-- =====================================================
-- Muammo: FamilyUnit yaratilganda yangi HOUSEHOLD scope ochilmasdan, joriy aktiv
--   xonadon (getActiveHousehold) ishlatilardi. Natijada bir xonadonda yaratilgan
--   bir nechta oila (FamilyUnit) bitta scope'ga — demak bitta display_code'ga
--   (masalan "055-330") bog'lanib qolardi. Kod endi har oila uchun alohida xonadon
--   ochadi; bu migratsiya esa MAVJUD aralashgan oilalarni ajratadi.
--
-- Mantiq: har bir HOUSEHOLD scope ichida eng eski FamilyUnit (MIN id) o'z joyida
--   qoladi; qolgan har bir FamilyUnit uchun yangi HOUSEHOLD scope yaratiladi
--   (yangi unique_code + display_code), FamilyUnit shu yangi scope'ga ko'chiriladi va
--   scope egasiga OWNER membership beriladi.
--
-- IDEMPOTENT: ajratilgandan keyin har scope'da bitta unit qoladi (rn > 1 yo'q),
--   shuning uchun qayta ishga tushsa zarar yo'q. Moliyaviy ma'lumot (accounts/budgets)
--   ko'chirilmaydi — bu faqat genealogik xonadon raqamini (display_code) to'g'rilaydi.
-- =====================================================

DO $$
DECLARE
    alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    rec RECORD;
    new_scope_id BIGINT;
    new_unique VARCHAR(32);
    new_display VARCHAR(16);
    attempts INT;
    i INT;
    split_count INT := 0;
BEGIN
    -- Har scope'dagi 2-chi va keyingi oilalar (eng eskisi o'z joyida qoladi).
    -- ROW_NUMBER subquery cursor ochilganda bir marta baholanadi — keyingi UPDATE'lar ta'sir qilmaydi.
    FOR rec IN
        SELECT unit_id, name, parent_scope_id, owner_user_id, legacy_family_group_id
        FROM (
            SELECT fu.id AS unit_id, s.name, s.parent_scope_id,
                   s.owner_user_id, s.legacy_family_group_id,
                   ROW_NUMBER() OVER (PARTITION BY fu.scope_id ORDER BY fu.id) AS rn
            FROM family_units fu
            JOIN scopes s ON s.id = fu.scope_id AND s.type = 'HOUSEHOLD'
            WHERE fu.scope_id IS NOT NULL
        ) ranked
        WHERE rn > 1
    LOOP
        -- Unique invite kod: 'H' + 10 ta belgi (HOUSEHOLD prefiksi, InviteCodeGenerator bilan mos)
        LOOP
            new_unique := 'H';
            FOR i IN 1..10 LOOP
                new_unique := new_unique || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
            END LOOP;
            EXIT WHEN NOT EXISTS (SELECT 1 FROM scopes WHERE unique_code = new_unique);
        END LOOP;

        -- Unique inson o'qiy oladigan raqam: "NNN-NNN"
        attempts := 0;
        LOOP
            new_display := lpad((floor(random() * 1000))::int::text, 3, '0')
                        || '-'
                        || lpad((floor(random() * 1000))::int::text, 3, '0');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM scopes WHERE display_code = new_display);
            attempts := attempts + 1;
            IF attempts > 50 THEN
                RAISE EXCEPTION 'display_code generatsiya muvaffaqiyatsiz (unit id=%)', rec.unit_id;
            END IF;
        END LOOP;

        -- Yangi HOUSEHOLD scope (xuddi shu CLAN ostida, xuddi shu egasi bilan)
        INSERT INTO scopes (type, name, parent_scope_id, owner_user_id, unique_code,
                            display_code, legacy_family_group_id, is_active, created_at)
        VALUES ('HOUSEHOLD', rec.name, rec.parent_scope_id, rec.owner_user_id, new_unique,
                new_display, rec.legacy_family_group_id, true, now())
        RETURNING id INTO new_scope_id;

        -- Oilani yangi xonadonga ko'chirish
        UPDATE family_units SET scope_id = new_scope_id WHERE id = rec.unit_id;

        -- Egasiga OWNER a'zolik (uk_scope_membership tufayli takror bo'lsa o'tkazib yuboriladi)
        INSERT INTO scope_memberships (scope_id, user_id, role, status, joined_at, created_at)
        VALUES (new_scope_id, rec.owner_user_id, 'OWNER', 'ACTIVE', now(), now())
        ON CONFLICT (scope_id, user_id) DO NOTHING;

        split_count := split_count + 1;
    END LOOP;

    RAISE NOTICE 'V42: % ta oila alohida xonadonga ajratildi', split_count;
END $$;
