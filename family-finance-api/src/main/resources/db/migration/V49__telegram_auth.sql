-- Telegram orqali ro'yxatdan o'tish / kirish (Blok B).
-- Parolni ixtiyoriy qiladi (Telegram user parolsiz), users ga Telegram maydonlari,
-- va deep-link tasdiq oqimi uchun telegram_auth_requests jadval.

-- 1) Parol endi ixtiyoriy — Telegram orqali kirgan user parolsiz bo'lishi mumkin.
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- 2) Users ga Telegram identifikatori va provayder ma'lumotlari.
ALTER TABLE users ADD COLUMN telegram_id BIGINT;
ALTER TABLE users ADD COLUMN telegram_username VARCHAR(100);
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN telegram_linked_at TIMESTAMP;

-- Bitta Telegram akkaunt = bitta user. NULL qiymatlar (LOCAL user'lar) unique'ni buzmaydi (PG).
CREATE UNIQUE INDEX idx_users_telegram_id ON users (telegram_id);

COMMENT ON COLUMN users.telegram_id IS 'Telegram user ID (bot deep-link orqali tasdiqlangan)';
COMMENT ON COLUMN users.auth_provider IS 'Asosiy autentifikatsiya provayderi: LOCAL yoki TELEGRAM';

-- 3) Telegram deep-link tasdiq so'rovlari (init -> bot /start -> confirm -> complete).
CREATE TABLE telegram_auth_requests (
    id                BIGSERIAL PRIMARY KEY,
    request_id        VARCHAR(64) NOT NULL UNIQUE,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    telegram_id       BIGINT,
    telegram_username VARCHAR(100),
    first_name        VARCHAR(100),
    last_name         VARCHAR(100),
    confirmed_at      TIMESTAMP,
    expires_at        TIMESTAMP NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP,
    version           BIGINT
);

CREATE INDEX idx_telegram_auth_requests_request_id ON telegram_auth_requests (request_id);

COMMENT ON TABLE telegram_auth_requests IS 'Telegram deep-link autentifikatsiya tasdiq so''rovlari (qisqa muddatli)';
