-- Rename legacy business roles to family-appropriate names
UPDATE users SET role = 'MEMBER' WHERE role = 'SELLER';
UPDATE users SET role = 'MEMBER' WHERE role = 'MANAGER';
