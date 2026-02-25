CREATE TABLE banks (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    mfo VARCHAR(5),
    logo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bank_bins (
    id BIGSERIAL PRIMARY KEY,
    bank_id BIGINT NOT NULL,
    bin_prefix VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bank_bins_bank FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE CASCADE,
    CONSTRAINT uk_bank_bins_bin_prefix UNIQUE (bin_prefix)
);

-- Modify Accounts to optionally reference the Bank entity
ALTER TABLE accounts ADD COLUMN bank_id BIGINT;
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_bank FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE SET NULL;
