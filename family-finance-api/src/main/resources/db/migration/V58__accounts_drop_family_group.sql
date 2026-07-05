-- =====================================================
-- V58: accounts.family_group_id DROP (ADR-002 P2)
-- =====================================================
-- Hisob konteksti — faqat XONADON (scope_id/homeScope); legacy family_group FK o'lik
-- (V35 backfill'dan beri scope_id parallel to'ldirilgan, P2'da yozish ham to'xtadi).
-- SYSTEM_TRANSIT global hisoblar scope_id = NULL bilan qoladi (V39 istisno saqlanadi).
--
-- Xavfsizlik: scope'siz qolgan oddiy hisoblar bo'lsa (kutilmaydi) — owner/fg orqali
-- xonadonga backfill, keyin DROP.

-- 1) Last-resort backfill: fg bor lekin scope NULL bo'lgan NO-SYSTEM hisoblar
WITH fg_household AS (
    SELECT DISTINCT ON (fg.id) fg.id AS fg_id, s.id AS scope_id
    FROM family_groups fg
    JOIN scopes s ON s.owner_user_id = fg.admin_id
                 AND s.type = 'HOUSEHOLD' AND s.is_active = true
    ORDER BY fg.id, s.id
)
UPDATE accounts a SET scope_id = m.scope_id
FROM fg_household m
WHERE a.family_group_id = m.fg_id AND a.scope_id IS NULL AND a.type <> 'SYSTEM_TRANSIT';

-- 2) DROP
ALTER TABLE accounts DROP COLUMN IF EXISTS family_group_id;

DO $$
BEGIN
    RAISE NOTICE 'V58: accounts endi faqat xonadon (scope) kontekstida — family_group chiqarildi';
END $$;
