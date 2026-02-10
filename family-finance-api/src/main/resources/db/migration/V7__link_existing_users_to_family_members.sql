-- =====================================================
-- V7: Mavjud foydalanuvchilarni family_members ga bog'lash
-- family_members da user_id si yo'q bo'lgan userlar uchun
-- avtomatik FamilyMember yozuv yaratadi
-- =====================================================

INSERT INTO family_members (full_name, role, is_active, user_id, created_at)
SELECT u.full_name, 'OTHER', true, u.id, CURRENT_TIMESTAMP
FROM users u
WHERE u.active = true
  AND NOT EXISTS (
    SELECT 1 FROM family_members fm WHERE fm.user_id = u.id
  );
