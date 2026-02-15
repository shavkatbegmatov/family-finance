-- fullName → firstName, middleName qo'shish
ALTER TABLE family_members RENAME COLUMN full_name TO first_name;
ALTER TABLE family_members ADD COLUMN middle_name VARCHAR(100);
