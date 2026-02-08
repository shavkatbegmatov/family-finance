-- =====================================================
-- V22: Family Finance Schema Migration
-- Drop old retail/business tables and create new
-- family finance management tables
-- =====================================================

-- =====================================================
-- 1. DROP OLD TABLES (in correct FK dependency order)
-- =====================================================

-- Purchase-related tables (deepest dependencies first)
DROP TABLE IF EXISTS purchase_return_items CASCADE;
DROP TABLE IF EXISTS purchase_returns CASCADE;
DROP TABLE IF EXISTS purchase_payments CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- Sale-related tables
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;

-- Stock movements
DROP TABLE IF EXISTS stock_movements CASCADE;

-- Products and brands
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS brands CASCADE;

-- Customer-related tables
DROP TABLE IF EXISTS customer_notifications CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Staff notifications
DROP TABLE IF EXISTS staff_notifications CASCADE;

-- Employee, payment, debt, category, supplier tables
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- =====================================================
-- 2. CREATE NEW FAMILY FINANCE TABLES
-- =====================================================

-- Oila a'zolari (Family Members)
CREATE TABLE family_members (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    avatar VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    user_id BIGINT UNIQUE REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Hisoblar (Accounts)
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'UZS',
    balance DECIMAL(19,2) NOT NULL DEFAULT 0,
    color VARCHAR(20),
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Kategoriyalar (Categories)
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    parent_id BIGINT REFERENCES categories(id),
    icon VARCHAR(50),
    color VARCHAR(20),
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Tranzaksiyalar (Transactions)
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    to_account_id BIGINT REFERENCES accounts(id),
    category_id BIGINT REFERENCES categories(id),
    family_member_id BIGINT REFERENCES family_members(id),
    transaction_date TIMESTAMP NOT NULL,
    description VARCHAR(500),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurring_pattern VARCHAR(20),
    tags VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Byudjetlar (Budgets)
CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    amount DECIMAL(19,2) NOT NULL,
    period VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Jamg'arma maqsadlari (Savings Goals)
CREATE TABLE savings_goals (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(19,2) NOT NULL,
    current_amount DECIMAL(19,2) NOT NULL DEFAULT 0,
    deadline DATE,
    account_id BIGINT REFERENCES accounts(id),
    icon VARCHAR(50),
    color VARCHAR(20),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Jamg'arma to'lovlari (Savings Contributions)
CREATE TABLE savings_contributions (
    id BIGSERIAL PRIMARY KEY,
    savings_goal_id BIGINT NOT NULL REFERENCES savings_goals(id),
    amount DECIMAL(19,2) NOT NULL,
    contribution_date DATE NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Qarzlar (Debts)
CREATE TABLE debts (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    person_name VARCHAR(100) NOT NULL,
    person_phone VARCHAR(20),
    amount DECIMAL(19,2) NOT NULL,
    remaining_amount DECIMAL(19,2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Qarz to'lovlari (Debt Payments)
CREATE TABLE debt_payments (
    id BIGSERIAL PRIMARY KEY,
    debt_id BIGINT NOT NULL REFERENCES debts(id),
    amount DECIMAL(19,2) NOT NULL,
    payment_date DATE NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

-- Family Members indexes
CREATE INDEX idx_family_members_user ON family_members(user_id);
CREATE INDEX idx_family_members_role ON family_members(role);
CREATE INDEX idx_family_members_active ON family_members(is_active);

-- Accounts indexes
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- Categories indexes
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- Transactions indexes
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_family_member ON transactions(family_member_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_recurring ON transactions(is_recurring);

-- Budgets indexes
CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budgets_period ON budgets(period);
CREATE INDEX idx_budgets_active ON budgets(is_active);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);

-- Savings Goals indexes
CREATE INDEX idx_savings_goals_account ON savings_goals(account_id);
CREATE INDEX idx_savings_goals_completed ON savings_goals(is_completed);

-- Savings Contributions indexes
CREATE INDEX idx_savings_contributions_goal ON savings_contributions(savings_goal_id);
CREATE INDEX idx_savings_contributions_date ON savings_contributions(contribution_date);

-- Debts indexes
CREATE INDEX idx_debts_type ON debts(type);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_debts_due_date ON debts(due_date);

-- Debt Payments indexes
CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX idx_debt_payments_date ON debt_payments(payment_date);

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON TABLE family_members IS 'Oila a''zolari - har bir foydalanuvchi oila a''zosi sifatida';
COMMENT ON TABLE accounts IS 'Moliyaviy hisoblar - naqd, karta, bank hisobi va boshqalar';
COMMENT ON TABLE categories IS 'Daromad va xarajat kategoriyalari';
COMMENT ON TABLE transactions IS 'Barcha moliyaviy tranzaksiyalar - daromad, xarajat, o''tkazmalar';
COMMENT ON TABLE budgets IS 'Kategoriya bo''yicha byudjet rejalari';
COMMENT ON TABLE savings_goals IS 'Jamg''arma maqsadlari';
COMMENT ON TABLE savings_contributions IS 'Jamg''arma maqsadlariga to''lovlar';
COMMENT ON TABLE debts IS 'Qarzlar - berilgan va olingan';
COMMENT ON TABLE debt_payments IS 'Qarz to''lovlari tarixi';
