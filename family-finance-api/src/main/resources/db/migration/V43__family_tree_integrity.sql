-- ============================================================================
-- Oila daraxti ma'lumotlari yaxlitligi (Bosqich 3)
--
-- Application qatlamidagi qoidalarni DB darajasida mustahkamlaydi va avval
-- yig'ilib qolgan yetim bog'lanishlarni tozalaydi. Soft-delete ildiz yechimi
-- (Bosqich 1) yangi yetimlar paydo bo'lishini oldini oladi; bu migration esa
-- tarixiy ma'lumotni tozalab, kafolatlarni qo'yadi. Idempotent.
-- ============================================================================

-- 1) O'chirilgan (is_active=false) a'zolarga tegishli yetim bog'lanishlarni tozalash
DELETE FROM family_children fc
USING family_members fm
WHERE fc.person_id = fm.id AND fm.is_active = false;

DELETE FROM family_partners fp
USING family_members fm
WHERE fp.person_id = fm.id AND fm.is_active = false;

-- 2) Tirik partner ham, farzand ham qolmagan bo'sh oila birliklarini o'chirish
--    (cascade qolgan bog'lanishlarni ham tozalaydi)
DELETE FROM family_units fu
WHERE NOT EXISTS (
        SELECT 1 FROM family_partners fp
        JOIN family_members fm ON fm.id = fp.person_id
        WHERE fp.family_unit_id = fu.id AND fm.is_active = true
    )
  AND NOT EXISTS (
        SELECT 1 FROM family_children fc WHERE fc.family_unit_id = fu.id
    );

-- 3) Bitta shaxsda bir nechta biologik farzand bog'lanishi qolgan bo'lsa (eski nomuvofiqlik),
--    eng kichik id'lisini qoldirib qolganlarini o'chiramiz — unique index uchun zamin tayyorlaydi
DELETE FROM family_children fc
USING family_children dup
WHERE fc.lineage_type = 'BIOLOGICAL'
  AND dup.lineage_type = 'BIOLOGICAL'
  AND fc.person_id = dup.person_id
  AND fc.id > dup.id;

-- 4) Bir farzand faqat bitta biologik ota-ona nikohiga biriktirilsin (DB kafolati;
--    ilgari faqat application darajasida edi)
CREATE UNIQUE INDEX IF NOT EXISTS uq_biological_parent
    ON family_children (person_id)
    WHERE lineage_type = 'BIOLOGICAL';

-- 5) person_id FK'lariga ON DELETE CASCADE — kelajakda a'zo hard-delete bo'lsa
--    (masalan tozalash migratsiyasida) yetim bog'lanish qolmasligi uchun.
--    FK nomi muhitlar bo'yicha farq qilishi mumkin, shuning uchun dinamik aniqlaymiz.
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT con.conname, con.conrelid::regclass AS tbl
        FROM pg_constraint con
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
        WHERE con.contype = 'f'
          AND con.conrelid IN ('family_partners'::regclass, 'family_children'::regclass)
          AND att.attname = 'person_id'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
    END LOOP;
END $$;

ALTER TABLE family_partners
    ADD CONSTRAINT family_partners_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES family_members (id) ON DELETE CASCADE;

ALTER TABLE family_children
    ADD CONSTRAINT family_children_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES family_members (id) ON DELETE CASCADE;
