-- =====================================================
-- V12: Bug tufayli buzilgan family_member → user bog'lanishlarni tiklash
--
-- Bug: FamilyMemberService.update() userId yuborilmaganda
-- member.setUser(null) qilib bog'lanishni o'chirib yuborgan.
-- Audit loglardan old_value.userId orqali tiklanadi.
-- =====================================================

-- Audit loglardan oxirgi to'g'ri userId ni topib, tiklash
UPDATE family_members fm
SET user_id = fix.restored_user_id
FROM (
    -- Har bir buzilgan family_member uchun oxirgi audit log dagi userId ni olish
    SELECT DISTINCT ON (al.entity_id)
        al.entity_id AS family_member_id,
        (al.old_value->>'userId')::BIGINT AS restored_user_id
    FROM audit_logs al
    WHERE al.entity_type = 'FamilyMember'
      AND al.action = 'UPDATE'
      -- old_value da userId bor, lekin new_value da yo'q (yoki null)
      AND al.old_value->>'userId' IS NOT NULL
      AND (al.new_value->>'userId' IS NULL OR al.new_value->>'userId' = 'null')
      -- Faqat hozir ham user_id si null bo'lganlarni tiklash
      AND EXISTS (
          SELECT 1 FROM family_members fm2
          WHERE fm2.id = al.entity_id AND fm2.user_id IS NULL
      )
      -- Tiklanayotgan user hali mavjud va boshqa member ga bog'lanmagan
      AND EXISTS (
          SELECT 1 FROM users u WHERE u.id = (al.old_value->>'userId')::BIGINT
      )
      AND NOT EXISTS (
          SELECT 1 FROM family_members fm3
          WHERE fm3.user_id = (al.old_value->>'userId')::BIGINT
      )
    ORDER BY al.entity_id, al.created_at DESC
) fix
WHERE fm.id = fix.family_member_id;
