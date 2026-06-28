-- Telegram kirish PIN-kodi (2-faktor, Blok C).
-- PIN hash + brute-force lockout USERS jadvalida saqlanadi (telegramId-based) — qisqa muddatli
-- telegram_auth_requests'da EMAS, aks holda begona har safar yangi init (yangi requestId) bilan
-- urinish hisoblagichini nolga tushirib lockout'ni aylanib o'tardi.

ALTER TABLE users ADD COLUMN telegram_pin_hash VARCHAR(100);
ALTER TABLE users ADD COLUMN telegram_pin_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN telegram_pin_locked_until TIMESTAMP;

COMMENT ON COLUMN users.telegram_pin_hash IS 'Telegram kirish PIN-kodining BCrypt hashi (2-faktor). NULL = o''rnatilmagan';
COMMENT ON COLUMN users.telegram_pin_attempts IS 'PIN noto''g''ri urinishlar soni (brute-force lockout)';
COMMENT ON COLUMN users.telegram_pin_locked_until IS 'PIN vaqtincha qulflangan vaqt (5 noto''g''ri urinishdan keyin 15 min)';
