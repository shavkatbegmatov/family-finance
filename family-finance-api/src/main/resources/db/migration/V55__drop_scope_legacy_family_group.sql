-- =====================================================
-- V55: scopes.legacy_family_group_id ustunini olib tashlash (ADR-001 Faza 5)
-- =====================================================
-- Legacy ko'prik yakuni: moliyaviy Scope endi genealogik tenant'ga (FamilyGroup) FK
-- saqlamaydi. Tenant resolution EGALIK orqali: scope.owner_user_id → users.family_group_id
-- (ScopeContextService.resolveFamilyGroup). Bu V34/provisioning invariantiga tayanadi:
-- scope egasining familyGroup'i = scope tegishli oilaning tenant'i.
--
-- FamilyGroup JADVALI QOLADI — u endi sof genealogik tenant (family_members.family_group_id
-- izolyatsiya markeri) va Points tizimining ichki kaliti; moliyaviy scope'dan uzildi.
-- =====================================================

DROP INDEX IF EXISTS idx_scopes_legacy_fg;

ALTER TABLE scopes DROP COLUMN IF EXISTS legacy_family_group_id;
