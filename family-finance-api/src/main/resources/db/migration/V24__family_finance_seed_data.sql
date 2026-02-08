-- =====================================================
-- V24: Family Finance Seed Data
-- Default income and expense categories
-- =====================================================

-- =====================================================
-- INCOME CATEGORIES (Daromad kategoriyalari)
-- =====================================================

INSERT INTO categories (name, type, icon, is_system, is_active, created_at) VALUES
('Maosh', 'INCOME', 'wallet', true, true, now()),
('Biznes daromad', 'INCOME', 'briefcase', true, true, now()),
('Investitsiya', 'INCOME', 'trending-up', true, true, now()),
('Freelance', 'INCOME', 'laptop', true, true, now()),
('Sovg''a', 'INCOME', 'gift', true, true, now()),
('Boshqa daromad', 'INCOME', 'plus-circle', true, true, now());

-- =====================================================
-- EXPENSE CATEGORIES (Xarajat kategoriyalari)
-- =====================================================

INSERT INTO categories (name, type, icon, is_system, is_active, created_at) VALUES
('Oziq-ovqat', 'EXPENSE', 'shopping-cart', true, true, now()),
('Transport', 'EXPENSE', 'truck', true, true, now()),
('Kommunal to''lovlar', 'EXPENSE', 'home', true, true, now()),
('Uy-joy', 'EXPENSE', 'key', true, true, now()),
('Kiyim-kechak', 'EXPENSE', 'shopping-bag', true, true, now()),
('Sog''liqni saqlash', 'EXPENSE', 'heart', true, true, now()),
('Ta''lim', 'EXPENSE', 'book-open', true, true, now()),
('Ko''ngilochar', 'EXPENSE', 'film', true, true, now()),
('Aloqa va internet', 'EXPENSE', 'wifi', true, true, now()),
('Go''zallik va parvarish', 'EXPENSE', 'scissors', true, true, now()),
('Boshqa xarajat', 'EXPENSE', 'more-horizontal', true, true, now());
