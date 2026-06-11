-- =====================================================
-- V46: Seed admin paroli hali admin123 bo'lsa — birinchi kirishda
-- majburiy almashtirish (B3 xavfsizlik gigienasi).
--
-- V4 seed har yangi muhitda ommaga ma'lum admin/admin123 yaratadi va
-- must_change_password=false qolardi. Bu migratsiya FAQAT parol hali
-- seed'dagi bcrypt hash bilan bir xil bo'lgan holatda bayroqni ko'taradi —
-- parolini allaqachon almashtirgan adminlarga ta'sir qilmaydi.
-- Frontend mustChangePassword=true bo'lsa PasswordChangeModal'ni majburiy
-- ko'rsatadi (mavjud oqim).
-- =====================================================

UPDATE users
SET must_change_password = true
WHERE username = 'admin'
  AND password = '$2a$10$YWkBajrWCNq8c2vdG/asgeNO5caWr3AjPcl4aqh4UYTQL4ueA2YMG';
