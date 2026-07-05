-- =====================================================================
-- V60: GROUP scope'ni iste'foga chiqarish (ADR-003)
--
-- GROUP (eski CLAN) hech qanday haqiqiy vazifa bajarmaydi: unda moliyaviy
-- ma'lumot yo'q (hisob ochish P2'da taqiqlangan, tranzaksiya/points/family_unit
-- bog'lanmagan), guruh kontekstiga o'tgan foydalanuvchi bo'sh ekran ko'radi.
-- Bu migratsiya GROUP'larni ARXIVLAYDI (data o'chmaydi) va xonadonlarni
-- mustaqil (root) qiladi. Enum qiymati kodda o'qish uchun qoladi (P3 naqshi).
--
-- MUHIM: `family_groups` jadvali (genealogik tenant) BUNGA ALOQASIZ — tegilmaydi.
-- SCHOOL→CLASS parent ierarxiyasi ham saqlanadi (V59 chk_scope_parent bandiga
-- arxiv GROUP'lar mos: ular baribir parent'siz edi — constraint o'zgarmaydi).
-- =====================================================================

-- 1) Himoya: primary_scope GROUP'ga ko'rsatgan userlarni birinchi faol
--    HOUSEHOLD a'zoligiga ko'chirish (o'lchovda 0 ta, PROD ehtiyoti uchun).
UPDATE users u
SET primary_scope_id = (
    SELECT sm.scope_id
    FROM scope_memberships sm
    JOIN scopes h ON h.id = sm.scope_id
    WHERE sm.user_id = u.id
      AND sm.status = 'ACTIVE'
      AND h.type = 'HOUSEHOLD'
      AND h.is_active = true
    ORDER BY sm.id
    LIMIT 1
)
WHERE u.primary_scope_id IN (SELECT id FROM scopes WHERE type = 'GROUP');

-- 2) Xonadonlarni guruhlardan uzish — endi hammasi mustaqil root.
UPDATE scopes
SET parent_scope_id = NULL
WHERE type = 'HOUSEHOLD'
  AND parent_scope_id IN (SELECT id FROM scopes WHERE type = 'GROUP');

-- 3) GROUP'lardagi faol a'zoliklarni yopish.
UPDATE scope_memberships sm
SET status = 'LEFT'
WHERE sm.status = 'ACTIVE'
  AND sm.scope_id IN (SELECT id FROM scopes WHERE type = 'GROUP');

-- 4) GROUP scope'larni arxivlash (soft — qatorlar tarix uchun qoladi).
UPDATE scopes
SET is_active = false
WHERE type = 'GROUP'
  AND is_active = true;
