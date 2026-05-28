-- =====================================================
-- V37: scopes.legacy_family_group_id — eski mapping uchun ustun
-- =====================================================
-- Phase 2.C: Points services'ni qayta yozmasdan, ularning ostidagi
-- `getCurrentFamilyGroup()` chaqiruvini scope-aware qilish strategiyasi.
--
-- Har bir migrated CLAN scope V34 da bitta family_group dan yaratilgan.
-- Ushbu mapping'ni explicit saqlaymiz, runtime query qilmasdan.
--
-- Foydalanish:
--   - User aktiv scope X (HOUSEHOLD) da bo'lsa, parent CLAN'ga boramiz
--   - Parent CLAN.legacy_family_group_id → asl FamilyGroup
--   - PointConfigService shu mapping orqali to'g'ri FamilyGroup'ni qaytaradi
--
-- Yangi yaratilgan scope'lar (V34 dan keyin) uchun legacy_family_group_id NULL
-- bo'lishi mumkin — bu vaziyatda PointConfigService xato qaytaradi yoki
-- chaqiruvchi servisda yangi PointConfig yaratiladi.
-- =====================================================

ALTER TABLE scopes ADD COLUMN IF NOT EXISTS legacy_family_group_id BIGINT
    REFERENCES family_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scopes_legacy_fg
    ON scopes(legacy_family_group_id) WHERE legacy_family_group_id IS NOT NULL;

COMMENT ON COLUMN scopes.legacy_family_group_id IS
    'V34 da yaratilgan CLAN scope''lar uchun asl family_group ID si. '
    'Phase 2 da PointConfigService va boshqa eski servislar shu orqali '
    'aktiv scope''ga mos family_group ni topadi.';

-- Backfill: V34 mantig'i bo'yicha har CLAN scope uchun asl family_group ni topish.
-- Sharti: CLAN.owner_user_id = family_group.admin_id va CLAN.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
UPDATE scopes cs
SET legacy_family_group_id = fg.id
FROM family_groups fg
WHERE cs.type = 'CLAN'
  AND cs.owner_user_id = fg.admin_id
  AND cs.name = COALESCE(fg.name, 'Urug''i') || ' urug''i'
  AND cs.legacy_family_group_id IS NULL;

-- Statistika
DO $$
DECLARE
    v_clans_total INT;
    v_clans_mapped INT;
BEGIN
    SELECT COUNT(*) INTO v_clans_total FROM scopes WHERE type = 'CLAN';
    SELECT COUNT(*) INTO v_clans_mapped FROM scopes
        WHERE type = 'CLAN' AND legacy_family_group_id IS NOT NULL;

    RAISE NOTICE 'V37 Legacy mapping: % / % CLAN scopes mapped to family_groups',
        v_clans_mapped, v_clans_total;
END $$;
