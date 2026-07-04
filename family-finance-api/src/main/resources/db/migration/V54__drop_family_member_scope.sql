-- =====================================================
-- V54: family_members.scope_id ustunini butunlay olib tashlash (ADR-001 Faza 4)
-- =====================================================
-- Genealogiya↔moliya decoupling yakuni: FamilyMember (shaxs) endi byudjet-scope'ga
-- JISMONAN ham bog'lanmaydi. "A'zoning xonadoni" yagona manbadan aniqlanadi —
-- FamilyUnit.scope ko'prigi (shaxs emas, OILA/nikoh birligi xonadonga bog'lanadi).
--
-- Tarix: V35 qo'shgan (nullable) → V39 ATAYLAB NOT NULL qilmagan → F1 (PR #241)
-- yozishni to'xtatgan (o'lik FK) → F4 ustunni o'chiradi. Ma'lumot yo'qotilmaydi:
-- ustundagi qiymatlar allaqachon ishlatilmayotgan edi (repository query'lari yo'q),
-- xonadon bog'lanishi FamilyUnit.scope'da saqlanadi.
-- =====================================================

DROP INDEX IF EXISTS idx_family_members_scope;

ALTER TABLE family_members DROP COLUMN IF EXISTS scope_id;
