-- V20: FamilyMember.family_group_id NULL bo'lib qolgan yozuvlarni tuzatish
-- Sabab: create() va registerSelf() da familyGroup o'rnatilmagan edi

-- 1) User orqali familyGroup o'rnatish
UPDATE family_members
SET family_group_id = u.family_group_id
FROM users u
WHERE family_members.user_id = u.id
  AND family_members.family_group_id IS NULL
  AND u.family_group_id IS NOT NULL;

-- 2) Partner orqali topish (bitta family_unit'dagi boshqa partner)
UPDATE family_members
SET family_group_id = linked.family_group_id
FROM family_partners fp
JOIN family_units fu ON fp.family_unit_id = fu.id
JOIN family_partners fp2 ON fp2.family_unit_id = fu.id
JOIN family_members linked ON linked.id = fp2.person_id
WHERE fp.person_id = family_members.id
  AND fp2.person_id != family_members.id
  AND family_members.family_group_id IS NULL
  AND linked.family_group_id IS NOT NULL;

-- 3) Farzand orqali topish
UPDATE family_members
SET family_group_id = linked.family_group_id
FROM family_children fc
JOIN family_units fu ON fc.family_unit_id = fu.id
JOIN family_partners fp ON fp.family_unit_id = fu.id
JOIN family_members linked ON linked.id = fp.person_id
WHERE fc.person_id = family_members.id
  AND family_members.family_group_id IS NULL
  AND linked.family_group_id IS NOT NULL;
