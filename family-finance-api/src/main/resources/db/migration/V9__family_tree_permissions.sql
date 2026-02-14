-- Yangi FAMILY_TREE permission'lar qo'shish
INSERT INTO permissions (code, module, action, description, created_at)
SELECT 'FAMILY_TREE_VIEW', 'FAMILY_TREE', 'VIEW', 'Oila daraxtini ko''rish', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'FAMILY_TREE_VIEW');

INSERT INTO permissions (code, module, action, description, created_at)
SELECT 'FAMILY_TREE_CREATE', 'FAMILY_TREE', 'CREATE', 'Oila daraxtiga qo''shish', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'FAMILY_TREE_CREATE');

INSERT INTO permissions (code, module, action, description, created_at)
SELECT 'FAMILY_TREE_UPDATE', 'FAMILY_TREE', 'UPDATE', 'Oila daraxtini tahrirlash', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'FAMILY_TREE_UPDATE');

INSERT INTO permissions (code, module, action, description, created_at)
SELECT 'FAMILY_TREE_DELETE', 'FAMILY_TREE', 'DELETE', 'Oila daraxtidan o''chirish', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'FAMILY_TREE_DELETE');

-- ADMIN roliga FAMILY_TREE permission'larni qo'shish
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND p.code IN ('FAMILY_TREE_VIEW', 'FAMILY_TREE_CREATE', 'FAMILY_TREE_UPDATE', 'FAMILY_TREE_DELETE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
