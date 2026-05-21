-- =====================================================
-- V32: MEMBER roliga ball tizimi VIEW ruxsatlari +
--      familyGroup'i yo'q userlarni FamilyMember orqali tiklash
-- =====================================================
--
-- Muammo 1 (UX): "Yangi shaxs qo'shish" wizard'i orqali yaratilgan
-- foydalanuvchilar Ball tizimini ko'ra olmas edi, chunki MEMBER rolida
-- POINTS_VIEW yo'q edi. Endi MEMBER ham o'z balansini va leaderboard'ni
-- ko'ra oladi (POINTS_MANAGE esa faqat ADMIN da qoladi).
--
-- Muammo 2 (data): UserService.createUserForFamilyMember() ilgari
-- User.familyGroup ni o'rnatmasdi. Bu fix bilan birga, eski yaratilgan
-- familyGroup'siz userlarni avtomatik tiklaymiz (agar ular FamilyMember
-- orqali allaqachon ma'lum bir guruhga bog'langan bo'lsa).
-- =====================================================

-- 1) MEMBER roliga POINTS_VIEW va POINTS_VIEW_LEADERBOARD ruxsatlarini berish.
--    ON CONFLICT shu satrlar takror kiritilsa xato chiqarmasligi uchun.
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE code = 'MEMBER'),
    p.id
FROM permissions p
WHERE p.code IN ('POINTS_VIEW', 'POINTS_VIEW_LEADERBOARD')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = (SELECT id FROM roles WHERE code = 'MEMBER')
        AND rp.permission_id = p.id
  );

-- 2) Eski User'larda familyGroup yo'q bo'lsa, ularning FamilyMember'idagi
--    familyGroup'ni inherit qildiramiz. Bu V31 dan oldin yaratilgan userlar
--    uchun login qilganda "guruhga a'zo emassiz" muammosini hal qiladi.
UPDATE users u
SET family_group_id = fm.family_group_id
FROM family_members fm
WHERE fm.user_id = u.id
  AND u.family_group_id IS NULL
  AND fm.family_group_id IS NOT NULL;
