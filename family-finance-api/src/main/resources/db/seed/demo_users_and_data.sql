-- =====================================================
-- Demo userlar va scope'lar — Phase 3 ScopeSwitcher'ni test qilish uchun
-- =====================================================
-- Bu skript Flyway migration'i EMAS — qo'lda ishga tushiriladi
-- (pgAdmin yoki `psql -d family_finance_db -f demo_users_and_data.sql`).
--
-- Production'ga aslo qo'shilmaydi. Dev/demo muhitida ScopeSwitcher'da
-- har xil familyalar o'rtasida switch'da turli ma'lumot ko'rinishini
-- ko'rsatish uchun.
--
-- ===== Yaratiladi =====
--   3 ta demo user:
--     - demo_aka      (parol: admin user'iniki bilan bir xil, masalan "admin123")
--     - demo_singil   (parol: shu)
--     - demo_yangam   (parol: shu)
--
--   Har biriga: 1 ta family_group + 1 CLAN + 1 HOUSEHOLD scope + 1 family_member
--
--   Hisoblar (qasdan turli xil katta-kichik balanslar):
--     - Aka oilasi:    naqd 1.5M + karta 5M = ~6.5M so'm
--     - Singil oilasi: naqd 250K so'm (kambag'al/student)
--     - Yangam oilasi: naqd 5M + karta 25M + jamg'arma 100M = ~130M so'm (boy)
--
--   shavkat3 (SUPER_ADMIN) ham har 3 CLAN'ga MEMBER sifatida qo'shiladi —
--   shuning uchun ScopeSwitcher'da ko'rinadi va switch qilib turli oilalarni
--   ko'ra oladi.
--
-- ===== Sinab ko'rish =====
--   1. Bu skriptni ishga tushiring
--   2. shavkat3 bilan login qiling
--   3. Header'dagi ScopeSwitcher'ni oching → 4+ ta CLAN ko'rasiz
--   4. Aka → Singil → Yangam scope'lariga switch qiling
--   5. Dashboard'da Umumiy balans har safar boshqa raqam (~6.5M / ~250K / ~130M)
--
-- ===== Tozalash =====
--   DEMO ma'lumotlarni o'chirish uchun skript oxiridagi ROLLBACK qismidan
--   foydalaning.
-- =====================================================

DO $$
DECLARE
    -- Reference data (mavjud user'lardan)
    v_password_hash TEXT;
    v_shavkat_id BIGINT;
    v_admin_role_id BIGINT;

    -- Demo user IDs
    v_aka_id BIGINT;
    v_singil_id BIGINT;
    v_yangam_id BIGINT;

    -- Family group IDs
    v_aka_fg_id BIGINT;
    v_singil_fg_id BIGINT;
    v_yangam_fg_id BIGINT;

    -- Scope IDs
    v_aka_clan_id BIGINT;
    v_aka_house_id BIGINT;
    v_singil_clan_id BIGINT;
    v_singil_house_id BIGINT;
    v_yangam_clan_id BIGINT;
    v_yangam_house_id BIGINT;

    -- FamilyMember IDs
    v_aka_fm_id BIGINT;
    v_singil_fm_id BIGINT;
    v_yangam_fm_id BIGINT;
BEGIN
    -- Idempotency: agar demo data allaqachon mavjud bo'lsa, skip
    IF EXISTS (SELECT 1 FROM users WHERE username = 'demo_aka') THEN
        RAISE NOTICE '⚠ Demo data allaqachon mavjud — skip qilinmoqda. Tozalash uchun skript oxirini ko''ring.';
        RETURN;
    END IF;

    -- Reference: admin user'ining password hash'i (parolni qayta hisoblamaslik uchun)
    SELECT password INTO v_password_hash FROM users WHERE username = 'admin' LIMIT 1;
    IF v_password_hash IS NULL THEN
        RAISE EXCEPTION '❌ admin user topilmadi — avval admin/admin123 yaratilgan bo''lishi kerak';
    END IF;

    SELECT id INTO v_shavkat_id FROM users WHERE username = 'shavkat3' LIMIT 1;
    SELECT id INTO v_admin_role_id FROM roles WHERE code = 'ADMIN' LIMIT 1;

    IF v_admin_role_id IS NULL THEN
        RAISE EXCEPTION '❌ ADMIN role topilmadi';
    END IF;

    RAISE NOTICE '▶ Demo data seeding boshlandi...';

    -- =========================================
    -- 1) Demo users
    -- =========================================
    INSERT INTO users (username, password, full_name, email, phone, role, active, must_change_password, created_at, updated_at)
    VALUES ('demo_aka', v_password_hash, 'Aka Begmatov (demo)', 'demo_aka@example.com', '+998901111111',
            'ADMIN', true, false, NOW(), NOW())
    RETURNING id INTO v_aka_id;

    INSERT INTO users (username, password, full_name, email, phone, role, active, must_change_password, created_at, updated_at)
    VALUES ('demo_singil', v_password_hash, 'Singil Karimova (demo)', 'demo_singil@example.com', '+998902222222',
            'ADMIN', true, false, NOW(), NOW())
    RETURNING id INTO v_singil_id;

    INSERT INTO users (username, password, full_name, email, phone, role, active, must_change_password, created_at, updated_at)
    VALUES ('demo_yangam', v_password_hash, 'Yangam Toirova (demo)', 'demo_yangam@example.com', '+998903333333',
            'ADMIN', true, false, NOW(), NOW())
    RETURNING id INTO v_yangam_id;

    RAISE NOTICE '  ✓ 3 ta demo user yaratildi (id: %, %, %)', v_aka_id, v_singil_id, v_yangam_id;

    -- 1.b) ADMIN role'ini har biri uchun (RBAC system)
    INSERT INTO user_roles (user_id, role_id) VALUES
        (v_aka_id, v_admin_role_id),
        (v_singil_id, v_admin_role_id),
        (v_yangam_id, v_admin_role_id);

    -- =========================================
    -- 2) Family groups
    -- =========================================
    INSERT INTO family_groups (name, admin_id, active, created_at, updated_at)
    VALUES ('Demo Aka Oilasi', v_aka_id, true, NOW(), NOW())
    RETURNING id INTO v_aka_fg_id;

    INSERT INTO family_groups (name, admin_id, active, created_at, updated_at)
    VALUES ('Demo Singil Oilasi', v_singil_id, true, NOW(), NOW())
    RETURNING id INTO v_singil_fg_id;

    INSERT INTO family_groups (name, admin_id, active, created_at, updated_at)
    VALUES ('Demo Yangam Oilasi', v_yangam_id, true, NOW(), NOW())
    RETURNING id INTO v_yangam_fg_id;

    -- User'larni o'z family_group'iga bog'lash
    UPDATE users SET family_group_id = v_aka_fg_id WHERE id = v_aka_id;
    UPDATE users SET family_group_id = v_singil_fg_id WHERE id = v_singil_id;
    UPDATE users SET family_group_id = v_yangam_fg_id WHERE id = v_yangam_id;

    RAISE NOTICE '  ✓ 3 ta family_group yaratildi (id: %, %, %)', v_aka_fg_id, v_singil_fg_id, v_yangam_fg_id;

    -- =========================================
    -- 3) Family members (har user o'zining family_member'i bo'ladi)
    -- =========================================
    INSERT INTO family_members (first_name, last_name, role, gender, is_active, user_id, family_group_id, created_at, updated_at)
    VALUES ('Aka', 'Begmatov', 'FATHER', 'MALE', true, v_aka_id, v_aka_fg_id, NOW(), NOW())
    RETURNING id INTO v_aka_fm_id;

    INSERT INTO family_members (first_name, last_name, role, gender, is_active, user_id, family_group_id, created_at, updated_at)
    VALUES ('Singil', 'Karimova', 'MOTHER', 'FEMALE', true, v_singil_id, v_singil_fg_id, NOW(), NOW())
    RETURNING id INTO v_singil_fm_id;

    INSERT INTO family_members (first_name, last_name, role, gender, is_active, user_id, family_group_id, created_at, updated_at)
    VALUES ('Yangam', 'Toirova', 'MOTHER', 'FEMALE', true, v_yangam_id, v_yangam_fg_id, NOW(), NOW())
    RETURNING id INTO v_yangam_fm_id;

    -- =========================================
    -- 4) Scopes (CLAN + HOUSEHOLD har bir oila uchun)
    -- =========================================
    -- Aka
    INSERT INTO scopes (type, name, owner_user_id, unique_code, is_active, legacy_family_group_id, created_at, updated_at, version)
    VALUES ('CLAN', 'Aka Begmatov urug''i', v_aka_id,
            'CDEMO' || LPAD(v_aka_id::text, 4, '0') || SUBSTR(MD5(RANDOM()::text), 1, 5),
            true, v_aka_fg_id, NOW(), NOW(), 0)
    RETURNING id INTO v_aka_clan_id;

    INSERT INTO scopes (type, name, parent_scope_id, owner_user_id, unique_code, is_active, created_at, updated_at, version)
    VALUES ('HOUSEHOLD', 'Aka xonadoni', v_aka_clan_id, v_aka_id,
            'HDEMO' || LPAD(v_aka_id::text, 4, '0') || SUBSTR(MD5(RANDOM()::text), 1, 5),
            true, NOW(), NOW(), 0)
    RETURNING id INTO v_aka_house_id;

    -- Singil
    INSERT INTO scopes (type, name, owner_user_id, unique_code, is_active, legacy_family_group_id, created_at, updated_at, version)
    VALUES ('CLAN', 'Singil Karimova urug''i', v_singil_id,
            'CDEMO' || LPAD(v_singil_id::text, 4, '0') || SUBSTR(MD5(RANDOM()::text), 1, 5),
            true, v_singil_fg_id, NOW(), NOW(), 0)
    RETURNING id INTO v_singil_clan_id;

    INSERT INTO scopes (type, name, parent_scope_id, owner_user_id, unique_code, is_active, created_at, updated_at, version)
    VALUES ('HOUSEHOLD', 'Singil xonadoni', v_singil_clan_id, v_singil_id,
            'HDEMO' || LPAD(v_singil_id::text, 4, '0') || SUBSTR(MD5(RANDOM()::text), 1, 5),
            true, NOW(), NOW(), 0)
    RETURNING id INTO v_singil_house_id;

    -- Yangam
    INSERT INTO scopes (type, name, owner_user_id, unique_code, is_active, legacy_family_group_id, created_at, updated_at, version)
    VALUES ('CLAN', 'Yangam Toirova urug''i', v_yangam_id,
            'CDEMO' || LPAD(v_yangam_id::text, 4, '0') || SUBSTR(MD5(RANDOM()::text), 1, 5),
            true, v_yangam_fg_id, NOW(), NOW(), 0)
    RETURNING id INTO v_yangam_clan_id;

    INSERT INTO scopes (type, name, parent_scope_id, owner_user_id, unique_code, is_active, created_at, updated_at, version)
    VALUES ('HOUSEHOLD', 'Yangam xonadoni', v_yangam_clan_id, v_yangam_id,
            'HDEMO' || LPAD(v_yangam_id::text, 4, '0') || SUBSTR(MD5(RANDOM()::text), 1, 5),
            true, NOW(), NOW(), 0)
    RETURNING id INTO v_yangam_house_id;

    RAISE NOTICE '  ✓ 6 ta scope yaratildi (3 CLAN + 3 HOUSEHOLD)';

    -- =========================================
    -- 5) Scope memberships
    -- =========================================
    -- Har demo user o'z CLAN va HOUSEHOLD'ining OWNER'i
    INSERT INTO scope_memberships (scope_id, user_id, role, status, joined_at, created_at, updated_at, version)
    VALUES
        (v_aka_clan_id,   v_aka_id, 'OWNER', 'ACTIVE', NOW(), NOW(), NOW(), 0),
        (v_aka_house_id,  v_aka_id, 'OWNER', 'ACTIVE', NOW(), NOW(), NOW(), 0),
        (v_singil_clan_id,  v_singil_id, 'OWNER', 'ACTIVE', NOW(), NOW(), NOW(), 0),
        (v_singil_house_id, v_singil_id, 'OWNER', 'ACTIVE', NOW(), NOW(), NOW(), 0),
        (v_yangam_clan_id,  v_yangam_id, 'OWNER', 'ACTIVE', NOW(), NOW(), NOW(), 0),
        (v_yangam_house_id, v_yangam_id, 'OWNER', 'ACTIVE', NOW(), NOW(), NOW(), 0);

    -- shavkat3 (SUPER_ADMIN) — har CLAN'ga MEMBER (ScopeSwitcher'da ko'rsin)
    IF v_shavkat_id IS NOT NULL THEN
        INSERT INTO scope_memberships (scope_id, user_id, role, status, joined_at, invited_by_user_id, created_at, updated_at, version)
        VALUES
            (v_aka_clan_id,    v_shavkat_id, 'MEMBER', 'ACTIVE', NOW(), v_aka_id, NOW(), NOW(), 0),
            (v_singil_clan_id, v_shavkat_id, 'MEMBER', 'ACTIVE', NOW(), v_singil_id, NOW(), NOW(), 0),
            (v_yangam_clan_id, v_shavkat_id, 'MEMBER', 'ACTIVE', NOW(), v_yangam_id, NOW(), NOW(), 0);
        RAISE NOTICE '  ✓ shavkat3 har 3 demo CLAN ga MEMBER sifatida qo''shildi';
    ELSE
        RAISE NOTICE '  ⚠ shavkat3 topilmadi — qo''shilmadi (demo userlar bilan login qiling)';
    END IF;

    -- User'larning primary_scope_id'sini HOUSEHOLD'iga
    UPDATE users SET primary_scope_id = v_aka_house_id    WHERE id = v_aka_id;
    UPDATE users SET primary_scope_id = v_singil_house_id WHERE id = v_singil_id;
    UPDATE users SET primary_scope_id = v_yangam_house_id WHERE id = v_yangam_id;

    -- =========================================
    -- 6) Hisoblar — turli balanslar bilan (FARQNI KO'RISH UCHUN!)
    -- =========================================
    INSERT INTO accounts (name, type, currency, balance, opening_balance, status, scope,
                          color, icon, is_active, owner_id, family_group_id, scope_id,
                          created_at, updated_at)
    VALUES
        -- Aka oilasi: o'rta hol (~6.5M)
        ('Aka naqd',    'CASH',      'UZS', 1500000.00,   1500000.00,   'ACTIVE', 'FAMILY',
         '#10b981', '💵', true, v_aka_fm_id, v_aka_fg_id, v_aka_house_id, NOW(), NOW()),
        ('Aka kartasi', 'BANK_CARD', 'UZS', 5000000.00,   5000000.00,   'ACTIVE', 'FAMILY',
         '#3b82f6', '💳', true, v_aka_fm_id, v_aka_fg_id, v_aka_house_id, NOW(), NOW()),

        -- Singil: student/kambag'al (~250K)
        ('Singil naqd', 'CASH',      'UZS', 250000.00,    250000.00,    'ACTIVE', 'FAMILY',
         '#f59e0b', '💵', true, v_singil_fm_id, v_singil_fg_id, v_singil_house_id, NOW(), NOW()),

        -- Yangam: boy oila (~130M)
        ('Yangam naqd',       'CASH',      'UZS', 5000000.00,    5000000.00,    'ACTIVE', 'FAMILY',
         '#a855f7', '💵', true, v_yangam_fm_id, v_yangam_fg_id, v_yangam_house_id, NOW(), NOW()),
        ('Yangam kartasi',    'BANK_CARD', 'UZS', 25000000.00,   25000000.00,   'ACTIVE', 'FAMILY',
         '#ec4899', '💳', true, v_yangam_fm_id, v_yangam_fg_id, v_yangam_house_id, NOW(), NOW()),
        ('Yangam jamg''armasi', 'SAVINGS',   'UZS', 100000000.00, 100000000.00, 'ACTIVE', 'FAMILY',
         '#eab308', '🐷', true, v_yangam_fm_id, v_yangam_fg_id, v_yangam_house_id, NOW(), NOW());

    RAISE NOTICE '  ✓ 6 ta hisob yaratildi (3 oilada turli balans bilan)';

    -- =========================================
    -- Yakuniy hisobot
    -- =========================================
    RAISE NOTICE '';
    RAISE NOTICE '✅ Demo seeding muvaffaqiyatli yakunlandi!';
    RAISE NOTICE '';
    RAISE NOTICE '   Login ma''lumotlari (admin'' parolingiz bilan bir xil):';
    RAISE NOTICE '     - demo_aka / <admin parolingiz>     → ~6.5M so''m balans';
    RAISE NOTICE '     - demo_singil / <admin parolingiz>  → ~250K so''m';
    RAISE NOTICE '     - demo_yangam / <admin parolingiz>  → ~130M so''m';
    RAISE NOTICE '';
    RAISE NOTICE '   shavkat3 SUPER_ADMIN — Header''dagi ScopeSwitcher orqali';
    RAISE NOTICE '   har 3 oila scope''lariga switch qiling, dashboard har safar';
    RAISE NOTICE '   boshqa balansni ko''rsatadi.';
END $$;


-- =====================================================
-- ROLLBACK (TOZALASH) — KOMMENT'LARNI OLIB TASHLAB ISHGA TUSHIRING
-- =====================================================
-- Demo ma'lumotlarni butunlay o'chirish uchun:
/*
DO $$
DECLARE
    v_aka_id BIGINT;
    v_singil_id BIGINT;
    v_yangam_id BIGINT;
BEGIN
    SELECT id INTO v_aka_id FROM users WHERE username = 'demo_aka';
    SELECT id INTO v_singil_id FROM users WHERE username = 'demo_singil';
    SELECT id INTO v_yangam_id FROM users WHERE username = 'demo_yangam';

    -- O'chirish tartibi muhim — FK constraint'lar uchun
    DELETE FROM accounts WHERE owner_id IN (
        SELECT id FROM family_members WHERE user_id IN (v_aka_id, v_singil_id, v_yangam_id)
    );
    DELETE FROM scope_memberships WHERE user_id IN (v_aka_id, v_singil_id, v_yangam_id);
    DELETE FROM scope_memberships WHERE scope_id IN (
        SELECT id FROM scopes WHERE owner_user_id IN (v_aka_id, v_singil_id, v_yangam_id)
    );
    -- HOUSEHOLD'lardan boshlab (CLAN parent bo'lgani uchun)
    DELETE FROM scopes WHERE type = 'HOUSEHOLD' AND owner_user_id IN (v_aka_id, v_singil_id, v_yangam_id);
    DELETE FROM scopes WHERE type = 'CLAN' AND owner_user_id IN (v_aka_id, v_singil_id, v_yangam_id);
    DELETE FROM family_members WHERE user_id IN (v_aka_id, v_singil_id, v_yangam_id);
    UPDATE users SET family_group_id = NULL, primary_scope_id = NULL
        WHERE id IN (v_aka_id, v_singil_id, v_yangam_id);
    DELETE FROM family_groups WHERE admin_id IN (v_aka_id, v_singil_id, v_yangam_id);
    DELETE FROM user_roles WHERE user_id IN (v_aka_id, v_singil_id, v_yangam_id);
    DELETE FROM users WHERE id IN (v_aka_id, v_singil_id, v_yangam_id);

    RAISE NOTICE '✓ Demo ma''lumotlar o''chirildi';
END $$;
*/
