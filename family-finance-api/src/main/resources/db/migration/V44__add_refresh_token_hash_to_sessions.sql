-- Session rotation uchun refresh token hash ustuni.
--
-- Muammo: AuthService.refreshToken() yangi access token yaratardi, lekin u uchun
-- DB'da session yaratmas yoki yangilamas edi. Natijada access token muddati o'tgach
-- (brauzer 1-24 soat yopiq qolganda) JwtAuthenticationFilter yangi tokenni
-- "session has been revoked" deb hisoblab 401 qaytarardi, frontend esa cheksiz
-- refresh loop'iga tushardi.
--
-- Yechim: har refresh paytida mavjud session refresh_token_hash bo'yicha topiladi
-- va yangi access/refresh token hash bilan rotatsiya qilinadi (bitta qurilma = bitta session).

ALTER TABLE sessions
    ADD COLUMN refresh_token_hash VARCHAR(64);

-- Unique: bitta refresh token aynan bitta sessionga tegishli.
-- PostgreSQL'da NULL qiymatlar unique cheklovni buzmaydi, shuning uchun V44'dan oldingi
-- mavjud sessionlar (refresh_token_hash = NULL) muammosiz qoladi.
CREATE UNIQUE INDEX idx_sessions_refresh_token_hash
    ON sessions (refresh_token_hash);

COMMENT ON COLUMN sessions.refresh_token_hash
    IS 'SHA-256 hash of the refresh token; used to locate and rotate the session on token refresh';
