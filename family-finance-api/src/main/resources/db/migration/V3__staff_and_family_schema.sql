-- =====================================================
-- V3: Staff & Family Finance Schema
-- employees, staff_notifications, family_members,
-- accounts, categories, transactions, budgets,
-- savings_goals, savings_contributions, debts, debt_payments
-- =====================================================

-- =====================================================
-- 1. EMPLOYEES (Xodimlar)
-- =====================================================

CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    salary DECIMAL(15, 2),
    hire_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    birth_date DATE,
    passport_number VARCHAR(20),
    address VARCHAR(300),
    bank_account_number VARCHAR(30),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    user_id BIGINT UNIQUE REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_phone ON employees(phone);
CREATE INDEX idx_employees_user ON employees(user_id);

-- =====================================================
-- 2. STAFF_NOTIFICATIONS (Xodimlar bildirishnomalari)
-- =====================================================

CREATE TABLE staff_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    reference_type VARCHAR(30),
    reference_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_staff_notifications_user ON staff_notifications(user_id);
CREATE INDEX idx_staff_notifications_read ON staff_notifications(is_read);
CREATE INDEX idx_staff_notifications_type ON staff_notifications(notification_type);

-- =====================================================
-- 3. FAMILY_MEMBERS (Oila a'zolari)
-- =====================================================

CREATE TABLE family_members (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    avatar VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    user_id BIGINT UNIQUE REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_family_members_user ON family_members(user_id);
CREATE INDEX idx_family_members_role ON family_members(role);
CREATE INDEX idx_family_members_active ON family_members(is_active);

-- =====================================================
-- 4. ACCOUNTS (Hisoblar)
-- =====================================================

CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'UZS',
    balance DECIMAL(19, 2) NOT NULL DEFAULT 0,
    color VARCHAR(20),
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- =====================================================
-- 5. CATEGORIES (Kategoriyalar)
-- =====================================================

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    parent_id BIGINT REFERENCES categories(id),
    icon VARCHAR(50),
    color VARCHAR(20),
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- =====================================================
-- 6. TRANSACTIONS (Tranzaksiyalar)
-- =====================================================

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    to_account_id BIGINT REFERENCES accounts(id),
    category_id BIGINT REFERENCES categories(id),
    family_member_id BIGINT REFERENCES family_members(id),
    transaction_date TIMESTAMP NOT NULL,
    description VARCHAR(500),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurring_pattern VARCHAR(20),
    tags VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_family_member ON transactions(family_member_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_recurring ON transactions(is_recurring);

-- =====================================================
-- 7. BUDGETS (Byudjetlar)
-- =====================================================

CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    amount DECIMAL(19, 2) NOT NULL,
    period VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budgets_period ON budgets(period);
CREATE INDEX idx_budgets_active ON budgets(is_active);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);

-- =====================================================
-- 8. SAVINGS_GOALS (Jamg'arma maqsadlari)
-- =====================================================

CREATE TABLE savings_goals (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(19, 2) NOT NULL,
    current_amount DECIMAL(19, 2) NOT NULL DEFAULT 0,
    deadline DATE,
    account_id BIGINT REFERENCES accounts(id),
    icon VARCHAR(50),
    color VARCHAR(20),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_savings_goals_account ON savings_goals(account_id);
CREATE INDEX idx_savings_goals_completed ON savings_goals(is_completed);

-- =====================================================
-- 9. SAVINGS_CONTRIBUTIONS (Jamg'arma to'lovlari)
-- =====================================================

CREATE TABLE savings_contributions (
    id BIGSERIAL PRIMARY KEY,
    savings_goal_id BIGINT NOT NULL REFERENCES savings_goals(id),
    amount DECIMAL(19, 2) NOT NULL,
    contribution_date DATE NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_savings_contributions_goal ON savings_contributions(savings_goal_id);
CREATE INDEX idx_savings_contributions_date ON savings_contributions(contribution_date);

-- =====================================================
-- 10. DEBTS (Qarzlar)
-- =====================================================

CREATE TABLE debts (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    person_name VARCHAR(100) NOT NULL,
    person_phone VARCHAR(20),
    amount DECIMAL(19, 2) NOT NULL,
    remaining_amount DECIMAL(19, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_debts_type ON debts(type);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_debts_due_date ON debts(due_date);

-- =====================================================
-- 11. DEBT_PAYMENTS (Qarz to'lovlari)
-- =====================================================

CREATE TABLE debt_payments (
    id BIGSERIAL PRIMARY KEY,
    debt_id BIGINT NOT NULL REFERENCES debts(id),
    amount DECIMAL(19, 2) NOT NULL,
    payment_date DATE NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX idx_debt_payments_date ON debt_payments(payment_date);
