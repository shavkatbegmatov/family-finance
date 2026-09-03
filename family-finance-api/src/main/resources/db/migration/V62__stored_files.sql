-- V62: Rasm (avatar) fayllarini ilovaning o'zida saqlash (G10).
--
-- Muammo: avatar'lar tashqi ImgBB xizmatiga brauzerdan to'g'ridan-to'g'ri yuklanar edi —
-- VITE_IMGBB_API_KEY frontend bundle'ida (public) turardi va rasmlar uchinchi tomonda saqlanardi.
--
-- Yechim: fayl bayti PostgreSQL'da (bytea) — hajmi kichik (avatar 512px JPEG, ~50-150 KB),
-- backup bilan birga saqlanadi, alohida volume/S3 talab qilmaydi. URL taxmin qilib
-- bo'lmaydigan UUID orqali: GET /v1/files/{public_id} (ImgBB havolalari kabi ochiq).
-- Eski (ImgBB) URL'lar family_members.avatar da o'zgarishsiz qoladi va ishlayveradi.

CREATE TABLE stored_files (
    id            BIGSERIAL PRIMARY KEY,
    public_id     UUID         NOT NULL,
    content_type  VARCHAR(100) NOT NULL,
    size_bytes    INTEGER      NOT NULL,
    data          BYTEA        NOT NULL,
    uploaded_by   BIGINT,
    version       BIGINT       NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP,
    CONSTRAINT uk_stored_files_public_id UNIQUE (public_id),
    CONSTRAINT fk_stored_files_uploaded_by FOREIGN KEY (uploaded_by)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT ck_stored_files_size CHECK (size_bytes > 0)
);

COMMENT ON TABLE stored_files IS 'Ilova ichida saqlanadigan rasm fayllari (avatar). URL: /v1/files/{public_id}';
