-- =====================================================
-- V52: HOUSEHOLD root bo'la olishi — parent_scope ixtiyoriy (ADR-001 Faza 2)
-- =====================================================
-- Maqsad: genealogiya↔moliya decoupling davomi. Xonadon (HOUSEHOLD) endi MAJBURAN
-- CLAN (urug'/Group) ostida bo'lishi shart emas — mustaqil root sifatida ham yashay
-- oladi. "Farzand ajralib chiqib yangi xonadon ochadi" ssenariysi urug'siz ham ishlaydi;
-- bir nechta xonadonni ixtiyoriy Group ostida keyin birlashtirish mumkin.
--
-- Eski chk_scope_parent (V33): CLAN → parent NULL; QOLGAN HAMMASI → parent NOT NULL.
-- Yangi qoida:
--   CLAN               → parent NULL      (har doim root)
--   HOUSEHOLD          → IXTIYORIY        (root yoki CLAN/Group ostida)
--   PROJECT/EVENT/FUND/
--   TRUSTEE/PROPERTY   → parent NOT NULL  (o'zgarishsiz — majburiy)
--
-- XAVFSIZLIK: yangi constraint HOUSEHOLD uchun har qanday holatni (parent bor yoki yo'q)
-- ruxsat beradi, shuning uchun mavjud CLAN-ostidagi xonadonlar buzilmaydi — faqat
-- cheklov bo'shatiladi, hech qanday backfill kerak emas.
-- =====================================================

ALTER TABLE scopes DROP CONSTRAINT IF EXISTS chk_scope_parent;

ALTER TABLE scopes ADD CONSTRAINT chk_scope_parent
    CHECK (
        (type = 'CLAN' AND parent_scope_id IS NULL)
        OR (type = 'HOUSEHOLD')
        OR (type NOT IN ('CLAN', 'HOUSEHOLD') AND parent_scope_id IS NOT NULL)
    );

COMMENT ON COLUMN scopes.parent_scope_id IS
    'Ota-scope. CLAN: har doim NULL (root). HOUSEHOLD: ixtiyoriy (mustaqil root yoki CLAN/Group ostida). PROJECT/EVENT/FUND/TRUSTEE/PROPERTY: majburiy.';
