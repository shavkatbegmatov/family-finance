-- =====================================================
-- V45: ADMIN roliga yetishmayotgan BARCHA huquqlarni berish
-- =====================================================
--
-- MUAMMO:
--   "Administrator" (code = ADMIN) rolida katalogdagi 75 ta huquqdan faqat
--   60 tasi bor edi. Yetishmayotgani: POINTS (11) va FAMILY_TREE (4).
--
-- SABABI (uchta joydagi izchillik xatosi):
--   1) V5 dagi "adminga barcha huquq" INSERT'i bir martalik snapshot edi —
--      faqat o'sha paytda mavjud 53 ta huquqni oldi. Keyin qo'shilgan
--      huquqlar adminga avtomatik biriktirilmaydi.
--   2) V9 (FAMILY_TREE) adminga berishga URINDI, lekin "WHERE r.name = 'ADMIN'"
--      ishlatgan. Rolning name'i = 'Administrator' (faqat code'i = 'ADMIN'),
--      shu sabab shart hech qatorga mos kelmadi -> FAMILY_TREE berilmadi.
--      To'g'risi "r.code = 'ADMIN'" bo'lishi kerak edi.
--   3) V25 (POINTS) 11 ta huquq yaratdi, lekin adminga (umuman hech bir rolga)
--      bermadi. Keyin V32 faqat MEMBER ga POINTS_VIEW/LEADERBOARD berdi.
--
-- YECHIM:
--   ADMIN roli tabiatan "barcha modullarga to'liq ruxsat". Shuning uchun
--   adminga katalogda mavjud, ammo hali biriktirilmagan barcha huquqlarni
--   beramiz. Idempotent (NOT EXISTS): qayta ishga tushsa xatosiz, kelajakda
--   yana shunday "qolib ketgan" huquqlar bo'lsa ham o'z-o'zidan yopiladi.
--
-- ESLATMA: V9 va V25 fayllari ATAYIN tahrirlanmadi — ular allaqachon
--   qo'llangan, Flyway esa ularning checksum'ini tekshiradi; tahrirlash
--   keyingi ishga tushishda "checksum mismatch" xatosini beradi.
-- =====================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
  );
