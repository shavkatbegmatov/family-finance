-- =====================================================
-- V11: Banking Account System
-- 20 xonali acc_code, kartalar, birgalikdagi hisoblar,
-- ikki yoqlama yozuv (double-entry), storno tizimi
-- =====================================================

-- =====================================================
-- 1. ACCOUNTS jadvalini o'zgartirish
-- =====================================================
ALTER TABLE accounts ADD COLUMN acc_code VARCHAR(20) UNIQUE;
ALTER TABLE accounts ADD COLUMN owner_id BIGINT REFERENCES family_members(id);
ALTER TABLE accounts ADD COLUMN balance_account_code VARCHAR(5);
ALTER TABLE accounts ADD COLUMN currency_code VARCHAR(3) DEFAULT '000';
ALTER TABLE accounts ADD COLUMN description VARCHAR(500);
ALTER TABLE accounts ALTER COLUMN type TYPE VARCHAR(30);

CREATE INDEX idx_accounts_acc_code ON accounts(acc_code);
CREATE INDEX idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX idx_accounts_type_active ON accounts(type, is_active);

-- =====================================================
-- 2. CARDS jadvali (YANGI)
-- =====================================================
CREATE TABLE cards (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    card_type VARCHAR(20) NOT NULL,
    card_bin VARCHAR(6),
    card_last_four VARCHAR(4) NOT NULL,
    card_number_encrypted VARCHAR(512),
    card_holder_name VARCHAR(100),
    expiry_date VARCHAR(5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_cards_account_id ON cards(account_id);
CREATE INDEX idx_cards_active ON cards(is_active);

-- =====================================================
-- 3. ACCOUNT_ACCESS jadvali (YANGI)
-- =====================================================
CREATE TABLE account_access (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    UNIQUE(account_id, user_id)
);

CREATE INDEX idx_account_access_user ON account_access(user_id);
CREATE INDEX idx_account_access_account ON account_access(account_id);
CREATE INDEX idx_account_access_role ON account_access(role);

-- =====================================================
-- 4. TRANSACTIONS jadvalini o'zgartirish (Double-Entry)
-- =====================================================
ALTER TABLE transactions ADD COLUMN debit_account_id BIGINT REFERENCES accounts(id);
ALTER TABLE transactions ADD COLUMN credit_account_id BIGINT REFERENCES accounts(id);
ALTER TABLE transactions ADD COLUMN status VARCHAR(20) DEFAULT 'CONFIRMED';
ALTER TABLE transactions ADD COLUMN balance_before_debit DECIMAL(19,2);
ALTER TABLE transactions ADD COLUMN balance_after_debit DECIMAL(19,2);
ALTER TABLE transactions ADD COLUMN balance_before_credit DECIMAL(19,2);
ALTER TABLE transactions ADD COLUMN balance_after_credit DECIMAL(19,2);
ALTER TABLE transactions ADD COLUMN reversed_by_id BIGINT REFERENCES transactions(id);
ALTER TABLE transactions ADD COLUMN original_transaction_id BIGINT REFERENCES transactions(id);

CREATE INDEX idx_transactions_debit_acc ON transactions(debit_account_id);
CREATE INDEX idx_transactions_credit_acc ON transactions(credit_account_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_original ON transactions(original_transaction_id);

-- =====================================================
-- 5. BALANCE_SNAPSHOTS jadvali (YANGI - Kun yopish)
-- =====================================================
CREATE TABLE balance_snapshots (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    snapshot_date DATE NOT NULL,
    balance DECIMAL(19,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, snapshot_date)
);

CREATE INDEX idx_balance_snapshots_account_date ON balance_snapshots(account_id, snapshot_date);

-- =====================================================
-- 6. Mavjud ma'lumotlarni migratsiya qilish
-- =====================================================

-- 6.1) balance_account_code ni hisob turiga qarab to'ldirish
UPDATE accounts SET balance_account_code = '10101' WHERE type = 'CASH';
UPDATE accounts SET balance_account_code = '20202' WHERE type = 'BANK_CARD';
UPDATE accounts SET balance_account_code = '20406' WHERE type = 'SAVINGS';
UPDATE accounts SET balance_account_code = '10301' WHERE type = 'E_WALLET';

-- 6.2) Barcha mavjud hisoblarning valyuta kodini sozlash
UPDATE accounts SET currency_code = '000' WHERE currency_code IS NULL OR currency_code = '000';

-- 6.3) Mavjud tranzaksiyalarning statusini belgilash
UPDATE transactions SET status = 'CONFIRMED' WHERE status IS NULL;

-- 6.4) Mavjud tranzaksiyalar uchun double-entry ma'lumotlarini to'ldirish
-- INCOME: debit = user account (pul tushdi), credit keyinroq transit hisob bilan to'ldiriladi
-- EXPENSE: credit = user account (pul chiqdi), debit keyinroq transit hisob bilan to'ldiriladi
-- TRANSFER: debit = to_account, credit = account
UPDATE transactions
SET debit_account_id = account_id, credit_account_id = NULL
WHERE type = 'INCOME' AND debit_account_id IS NULL;

UPDATE transactions
SET debit_account_id = NULL, credit_account_id = account_id
WHERE type = 'EXPENSE' AND credit_account_id IS NULL;

UPDATE transactions
SET debit_account_id = to_account_id, credit_account_id = account_id
WHERE type = 'TRANSFER' AND debit_account_id IS NULL AND to_account_id IS NOT NULL;

-- =====================================================
-- 7. Tizim tranzit hisoblarini yaratish
-- =====================================================
INSERT INTO accounts (name, type, currency, balance, is_active, balance_account_code, currency_code, description)
VALUES
    ('Tizim: Daromad tranziti (UZS)', 'SYSTEM_TRANSIT', 'UZS', 0, true, '99999', '000', 'Daromad tranzaksiyalari uchun tizim hisobi'),
    ('Tizim: Xarajat tranziti (UZS)', 'SYSTEM_TRANSIT', 'UZS', 0, true, '99999', '000', 'Xarajat tranzaksiyalari uchun tizim hisobi'),
    ('Tizim: Daromad tranziti (USD)', 'SYSTEM_TRANSIT', 'USD', 0, true, '99999', '840', 'Daromad tranzaksiyalari uchun tizim hisobi (USD)'),
    ('Tizim: Xarajat tranziti (USD)', 'SYSTEM_TRANSIT', 'USD', 0, true, '99999', '840', 'Xarajat tranzaksiyalari uchun tizim hisobi (USD)'),
    ('Tizim: Daromad tranziti (EUR)', 'SYSTEM_TRANSIT', 'EUR', 0, true, '99999', '978', 'Daromad tranzaksiyalari uchun tizim hisobi (EUR)'),
    ('Tizim: Xarajat tranziti (EUR)', 'SYSTEM_TRANSIT', 'EUR', 0, true, '99999', '978', 'Xarajat tranzaksiyalari uchun tizim hisobi (EUR)');

-- Tranzit hisoblar uchun acc_code yaratish (99999 + valyuta + 0 + 000000 + 00 + NNN)
UPDATE accounts SET acc_code = '99999000000000000001' WHERE name = 'Tizim: Daromad tranziti (UZS)' AND type = 'SYSTEM_TRANSIT';
UPDATE accounts SET acc_code = '99999000000000000002' WHERE name = 'Tizim: Xarajat tranziti (UZS)' AND type = 'SYSTEM_TRANSIT';
UPDATE accounts SET acc_code = '99999840000000000001' WHERE name = 'Tizim: Daromad tranziti (USD)' AND type = 'SYSTEM_TRANSIT';
UPDATE accounts SET acc_code = '99999840000000000002' WHERE name = 'Tizim: Xarajat tranziti (USD)' AND type = 'SYSTEM_TRANSIT';
UPDATE accounts SET acc_code = '99999978000000000001' WHERE name = 'Tizim: Daromad tranziti (EUR)' AND type = 'SYSTEM_TRANSIT';
UPDATE accounts SET acc_code = '99999978000000000002' WHERE name = 'Tizim: Xarajat tranziti (EUR)' AND type = 'SYSTEM_TRANSIT';

-- 6.4 davomi) Mavjud INCOME tranzaksiyalarning credit hisobini tranzit hisob bilan to'ldirish
UPDATE transactions t
SET credit_account_id = (
    SELECT a.id FROM accounts a
    WHERE a.type = 'SYSTEM_TRANSIT'
      AND a.name LIKE 'Tizim: Daromad tranziti%'
      AND a.currency = (SELECT acc.currency FROM accounts acc WHERE acc.id = t.account_id)
    LIMIT 1
)
WHERE t.type = 'INCOME' AND t.credit_account_id IS NULL;

-- 6.4 davomi) Mavjud EXPENSE tranzaksiyalarning debit hisobini tranzit hisob bilan to'ldirish
UPDATE transactions t
SET debit_account_id = (
    SELECT a.id FROM accounts a
    WHERE a.type = 'SYSTEM_TRANSIT'
      AND a.name LIKE 'Tizim: Xarajat tranziti%'
      AND a.currency = (SELECT acc.currency FROM accounts acc WHERE acc.id = t.account_id)
    LIMIT 1
)
WHERE t.type = 'EXPENSE' AND t.debit_account_id IS NULL;

-- =====================================================
-- 8. Yangi permissionlar
-- =====================================================
INSERT INTO permissions (code, module, action, description) VALUES
    ('ACCOUNTS_ACCESS_MANAGE', 'ACCOUNTS', 'MANAGE', 'Hisob huquqlarini boshqarish'),
    ('CARDS_VIEW', 'CARDS', 'VIEW', 'Kartalarni ko''rish'),
    ('CARDS_CREATE', 'CARDS', 'CREATE', 'Karta qo''shish'),
    ('CARDS_UPDATE', 'CARDS', 'UPDATE', 'Kartani tahrirlash'),
    ('CARDS_DELETE', 'CARDS', 'DELETE', 'Kartani o''chirish'),
    ('CARDS_REVEAL', 'CARDS', 'VIEW', 'Karta raqamini ko''rish (deshifrlash)'),
    ('TRANSACTIONS_REVERSE', 'TRANSACTIONS', 'DELETE', 'Tranzaksiyani storno qilish');

-- Admin roliga yangi permissionlarni berish
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('ACCOUNTS_ACCESS_MANAGE', 'CARDS_VIEW', 'CARDS_CREATE', 'CARDS_UPDATE',
                 'CARDS_DELETE', 'CARDS_REVEAL', 'TRANSACTIONS_REVERSE')
ON CONFLICT DO NOTHING;

-- MEMBER roliga asosiy kartalar permissionlarini berish
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'MEMBER'
  AND p.code IN ('CARDS_VIEW', 'CARDS_CREATE', 'CARDS_UPDATE', 'TRANSACTIONS_REVERSE')
ON CONFLICT DO NOTHING;

-- VIEWER roliga faqat ko'rish permissionlarini berish
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code IN ('CARDS_VIEW')
ON CONFLICT DO NOTHING;
