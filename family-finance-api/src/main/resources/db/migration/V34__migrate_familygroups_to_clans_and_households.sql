-- =====================================================
-- V34: FamilyGroup → Clan + Household ma'lumot migratsiyasi
-- =====================================================
-- Bu migratsiya MAVJUD ma'lumotni V33 dagi yangi sxemaga ko'chiradi:
--
--   Har family_groups yozuvi uchun:
--     1) Yangi CLAN scope yaratiladi (parent=NULL)
--     2) Yangi HOUSEHOLD scope yaratiladi (parent=CLAN)
--
--   Har family_groups da bo'lgan user uchun:
--     3) HOUSEHOLD'ga ScopeMembership (admin=OWNER, boshqalari=MEMBER)
--     4) CLAN'ga ScopeMembership (admin=OWNER, boshqalari=MEMBER)
--     5) User.primary_scope_id = HOUSEHOLD ID
--
--   SUPER_ADMIN:
--     6) fstudioadm@gmail.com → is_super_admin = TRUE
--
-- Eski family_group_id ustunlari Phase 2 oxiriga qadar saqlanadi
-- (dual-read/write paytida).
-- =====================================================

-- 1) Har bir mavjud family_group uchun CLAN va HOUSEHOLD yaratish.
--    Birgalikda yaratamiz va keyin parent_scope_id'larni mapping qilamiz.

-- 1.a) CLAN'larni yaratish
INSERT INTO scopes (type, name, parent_scope_id, owner_user_id, unique_code, is_active, created_at, updated_at, version)
SELECT
    'CLAN',
    COALESCE(fg.name, 'Urug''i') || ' urug''i',
    NULL,
    fg.admin_id,
    'C' || LPAD(fg.id::text, 8, '0') || SUBSTR(MD5(RANDOM()::text), 1, 6),
    COALESCE(fg.active, true),
    COALESCE(fg.created_at, NOW()),
    COALESCE(fg.updated_at, NOW()),
    0
FROM family_groups fg;

-- 1.b) HOUSEHOLD'larni yaratish (har CLAN uchun bittadan)
INSERT INTO scopes (type, name, parent_scope_id, owner_user_id, unique_code, is_active, created_at, updated_at, version)
SELECT
    'HOUSEHOLD',
    'Asosiy xonadon',
    clan_scope.id,
    fg.admin_id,
    'H' || LPAD(fg.id::text, 8, '0') || SUBSTR(MD5(RANDOM()::text), 1, 6),
    COALESCE(fg.active, true),
    COALESCE(fg.created_at, NOW()),
    COALESCE(fg.updated_at, NOW()),
    0
FROM family_groups fg
JOIN scopes clan_scope
    ON clan_scope.type = 'CLAN'
   AND clan_scope.owner_user_id = fg.admin_id
   AND clan_scope.name = COALESCE(fg.name, 'Urug''i') || ' urug''i';


-- 2) Ma'lumotlarni keyingi qadamlarda topish uchun temporary CTE pattern emas,
--    balki to'g'ridan-to'g'ri JOIN bilan ishlaymiz.
--    Mapping mantig'i: family_group → clan_scope (owner_user_id va name bo'yicha) → household_scope (parent bo'yicha)


-- 3) Memberships — HOUSEHOLD ga
INSERT INTO scope_memberships (scope_id, user_id, role, status, joined_at, created_at, updated_at, version)
SELECT
    household_scope.id,
    u.id,
    CASE WHEN u.id = fg.admin_id THEN 'OWNER' ELSE 'MEMBER' END,
    'ACTIVE',
    COALESCE(u.created_at, NOW()),
    COALESCE(u.created_at, NOW()),
    NOW(),
    0
FROM users u
JOIN family_groups fg ON u.family_group_id = fg.id
JOIN scopes clan_scope
    ON clan_scope.type = 'CLAN'
   AND clan_scope.owner_user_id = fg.admin_id
   AND clan_scope.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes household_scope
    ON household_scope.type = 'HOUSEHOLD'
   AND household_scope.parent_scope_id = clan_scope.id
WHERE u.family_group_id IS NOT NULL;


-- 4) Memberships — CLAN ga
INSERT INTO scope_memberships (scope_id, user_id, role, status, joined_at, created_at, updated_at, version)
SELECT
    clan_scope.id,
    u.id,
    CASE WHEN u.id = fg.admin_id THEN 'OWNER' ELSE 'MEMBER' END,
    'ACTIVE',
    COALESCE(u.created_at, NOW()),
    COALESCE(u.created_at, NOW()),
    NOW(),
    0
FROM users u
JOIN family_groups fg ON u.family_group_id = fg.id
JOIN scopes clan_scope
    ON clan_scope.type = 'CLAN'
   AND clan_scope.owner_user_id = fg.admin_id
   AND clan_scope.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
WHERE u.family_group_id IS NOT NULL;


-- 5) User.primary_scope_id ni HOUSEHOLD ID ga o'rnatish
UPDATE users u
SET primary_scope_id = household_scope.id
FROM family_groups fg
JOIN scopes clan_scope
    ON clan_scope.type = 'CLAN'
   AND clan_scope.owner_user_id = fg.admin_id
   AND clan_scope.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
JOIN scopes household_scope
    ON household_scope.type = 'HOUSEHOLD'
   AND household_scope.parent_scope_id = clan_scope.id
WHERE u.family_group_id = fg.id
  AND u.primary_scope_id IS NULL;


-- 6) SUPER_ADMIN belgilash — platforma egasiga (fstudioadm@gmail.com)
UPDATE users
SET is_super_admin = true
WHERE email = 'fstudioadm@gmail.com';

-- Agar fstudioadm@gmail.com email bilan topilmasa, fallback:
-- birinchi yaratilgan user'ga (eng pastki id) is_super_admin = true berish.
-- Bu development/staging muhitlari uchun foydali.
UPDATE users
SET is_super_admin = true
WHERE id = (SELECT MIN(id) FROM users)
  AND NOT EXISTS (SELECT 1 FROM users WHERE is_super_admin = true);


-- 7) Sanity check: agar familyGroup'siz user bo'lsa, ular hali primary_scope_id ga ega bo'lmaydi
--    Bunda hech narsa qilmaymiz — bunday user'lar Phase 2 da scope yaratishi kerak yoki
--    SUPER_ADMIN tomonidan mavjud scope'ga taklif qilinadi.

-- Statistika logga chiqarish (DO blok orqali)
DO $$
DECLARE
    v_family_groups_count INT;
    v_clans_count INT;
    v_households_count INT;
    v_memberships_count INT;
    v_super_admins_count INT;
BEGIN
    SELECT COUNT(*) INTO v_family_groups_count FROM family_groups;
    SELECT COUNT(*) INTO v_clans_count FROM scopes WHERE type = 'CLAN';
    SELECT COUNT(*) INTO v_households_count FROM scopes WHERE type = 'HOUSEHOLD';
    SELECT COUNT(*) INTO v_memberships_count FROM scope_memberships;
    SELECT COUNT(*) INTO v_super_admins_count FROM users WHERE is_super_admin = true;

    RAISE NOTICE 'V34 Migration Summary: family_groups=%, clans=%, households=%, memberships=%, super_admins=%',
        v_family_groups_count, v_clans_count, v_households_count, v_memberships_count, v_super_admins_count;
END $$;
