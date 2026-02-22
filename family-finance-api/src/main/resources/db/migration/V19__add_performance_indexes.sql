-- Performance indexes for frequently queried foreign keys

CREATE INDEX IF NOT EXISTS idx_users_family_group ON users(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_group ON family_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_accounts_family_group ON accounts(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_groups_admin ON family_groups(admin_id);

-- Transaction query optimization indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_type_date ON transactions(category_id, type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_debit_account ON transactions(debit_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_account ON transactions(credit_account_id);

-- Account access optimization
CREATE INDEX IF NOT EXISTS idx_account_access_user ON account_access(user_id);
CREATE INDEX IF NOT EXISTS idx_account_access_account_user ON account_access(account_id, user_id);
