-- =====================================================
-- V14: V13 matching logikasini to'g'rilash
--
-- V13 dublikatlarni "first_name = first_name" bilan qidirgan,
-- lekin haqiqiy DB da dublikat member "Gulnora Begmatova"
-- (fullName bitta fieldda), original esa "Gulnora" edi.
-- Shuning uchun 0 ta match topilgan.
--
-- Yangi strategiya:
-- SPLIT_PART(dublikat.first_name, ' ', 1) = original.first_name
-- Masalan: "Gulnora Begmatova" -> "Gulnora" = "Gulnora" ✓
-- =====================================================

-- Temp table: dublikat juftliklarni aniqlash
CREATE TEMP TABLE duplicate_pairs AS
WITH standalone AS (
    -- Shajarada hech qanday aloqasi yo'q, lekin user_id bor
    SELECT fm.id AS dup_id, fm.user_id, fm.first_name, fm.last_name, fm.gender, fm.created_at
    FROM family_members fm
    WHERE fm.user_id IS NOT NULL AND fm.is_active = true
      AND NOT EXISTS (SELECT 1 FROM family_partners fp WHERE fp.person_id = fm.id)
      AND NOT EXISTS (SELECT 1 FROM family_children fc WHERE fc.person_id = fm.id)
),
originals AS (
    -- Shajarada aloqalari bor, lekin user_id yo'q
    SELECT fm.id AS orig_id, fm.first_name, fm.last_name, fm.gender, fm.created_at
    FROM family_members fm
    WHERE fm.user_id IS NULL AND fm.is_active = true
      AND (EXISTS (SELECT 1 FROM family_partners fp WHERE fp.person_id = fm.id)
           OR EXISTS (SELECT 1 FROM family_children fc WHERE fc.person_id = fm.id))
)
SELECT s.dup_id, s.user_id, o.orig_id
FROM standalone s
JOIN originals o
  ON LOWER(TRIM(SPLIT_PART(s.first_name, ' ', 1))) = LOWER(TRIM(o.first_name))
  AND s.gender = o.gender
  AND s.created_at > o.created_at;

-- 1. user_id ni dublikatdan olib tashlash (unique constraint uchun)
UPDATE family_members SET user_id = NULL WHERE id IN (SELECT dup_id FROM duplicate_pairs);

-- 2. user_id ni asl member'ga o'tkazish
UPDATE family_members fm
SET user_id = dp.user_id
FROM duplicate_pairs dp
WHERE fm.id = dp.orig_id;

-- 3. Tranzaksiyalarni dublikatdan aslga ko'chirish
UPDATE transactions
SET family_member_id = dp.orig_id
FROM duplicate_pairs dp
WHERE family_member_id = dp.dup_id;

-- 4. Hisoblarni dublikatdan aslga ko'chirish
UPDATE accounts
SET owner_id = dp.orig_id
FROM duplicate_pairs dp
WHERE owner_id = dp.dup_id;

-- 5. Dublikatni soft-delete
UPDATE family_members
SET is_active = false
WHERE id IN (SELECT dup_id FROM duplicate_pairs);

-- 6. Audit log yozish
INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, username, created_at)
SELECT 'FamilyMember', dp.orig_id, 'MERGE_DUPLICATE',
    jsonb_build_object('duplicateId', dp.dup_id, 'userId', dp.user_id),
    jsonb_build_object('action', 'merged_duplicate_to_original', 'matchMethod', 'SPLIT_PART_first_word'),
    'SYSTEM_MIGRATION_V14', CURRENT_TIMESTAMP
FROM duplicate_pairs dp;

-- 7. Dublikat member ning first_name ni to'g'rilash (agar hali active bo'lsa)
-- Bu kerak emas chunki biz allaqachon soft-delete qildik

DROP TABLE duplicate_pairs;
