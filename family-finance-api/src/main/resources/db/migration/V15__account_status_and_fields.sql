-- AccountStatus maydon
ALTER TABLE accounts ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL;

-- OpeningBalance
ALTER TABLE accounts ADD COLUMN opening_balance NUMERIC(19,2) DEFAULT 0;

-- Bank ma'lumotlari
ALTER TABLE accounts ADD COLUMN bank_name VARCHAR(100);
ALTER TABLE accounts ADD COLUMN bank_mfo VARCHAR(5);
ALTER TABLE accounts ADD COLUMN bank_inn VARCHAR(9);

-- Mavjud balance asosida opening_balance to'ldirish
UPDATE accounts SET opening_balance = balance WHERE opening_balance IS NULL OR opening_balance = 0;
