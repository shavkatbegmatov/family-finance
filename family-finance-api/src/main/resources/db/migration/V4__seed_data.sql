-- =====================================================
-- V4: Seed Data - Admin foydalanuvchi va boshlang'ich sozlamalar
-- =====================================================

-- Admin user (password: admin123)
INSERT INTO users (username, password, full_name, email, phone, role, active)
VALUES (
    'admin',
    '$2a$10$YWkBajrWCNq8c2vdG/asgeNO5caWr3AjPcl4aqh4UYTQL4ueA2YMG',
    'Administrator',
    'admin@familyfinance.uz',
    '+998901234567',
    'ADMIN',
    true
);

-- App settings
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('DEBT_DUE_DAYS', '30', 'Default debt due date in days');
