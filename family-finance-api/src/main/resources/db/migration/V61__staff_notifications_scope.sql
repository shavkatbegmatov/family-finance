-- V61: staff_notifications scope izolyatsiyasi.
--
-- Muammo: moliyaviy bildirishnomalar (qarz, byudjet, jamg'arma) user_id IS NULL
-- ("global") sifatida saqlanardi va HAR bir foydalanuvchiga qaytarilardi — A
-- xonadonining qarzdor ismi/summasi B xonadoniga sizardi (cross-tenant PII leak).
--
-- Yechim: bildirishnoma kelib chiqqan scope'ga bog'lanadi va faqat o'sha scope
-- a'zolariga ko'rinadi. scope_id NULL = haqiqiy tizim-global bildirishnoma
-- (kelajakda admin/tizim uchun; hozircha kod bunday bildirishnoma yaratmaydi).

ALTER TABLE staff_notifications
    ADD COLUMN scope_id BIGINT;

ALTER TABLE staff_notifications
    ADD CONSTRAINT fk_staff_notifications_scope
        FOREIGN KEY (scope_id) REFERENCES scopes (id) ON DELETE CASCADE;

CREATE INDEX idx_staff_notifications_scope ON staff_notifications (scope_id);

-- Mavjud global (user_id IS NULL) bildirishnomalar scope'siz qolib, endi "tizim-global"
-- sifatida hamon cross-scope ko'rinardi. Bular aynan sizib chiqqan moliyaviy alertlar
-- (qarzdor ismi/summasi). Xavfsizlik uchun tozalanadi — bildirishnomalar efemer
-- (baribir 30 kunda avtomatik o'chadi), foydalanuvchiga xos (user_id NOT NULL)
-- yozuvlarga tegilmaydi.
DELETE FROM staff_notifications WHERE user_id IS NULL;
