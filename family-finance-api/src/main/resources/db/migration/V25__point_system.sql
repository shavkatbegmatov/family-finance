-- =============================================
-- V25: Ball tizimi (Point System)
-- =============================================

-- 1. point_configs
CREATE TABLE point_configs (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL UNIQUE REFERENCES family_groups(id),
    conversion_rate NUMERIC(19,4) NOT NULL DEFAULT 100,
    currency        VARCHAR(10) DEFAULT 'UZS',
    inflation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    inflation_rate_monthly NUMERIC(10,4) DEFAULT 0,
    savings_interest_rate NUMERIC(10,4) DEFAULT 0.05,
    streak_bonus_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    streak_bonus_percentage NUMERIC(10,4) DEFAULT 0.1,
    max_daily_points INTEGER,
    auto_approve_below INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);

-- 2. point_participants
CREATE TABLE point_participants (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    nickname        VARCHAR(50),
    birth_date      DATE,
    avatar          VARCHAR(255),
    family_member_id BIGINT REFERENCES family_members(id),
    added_by        BIGINT NOT NULL REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);
CREATE UNIQUE INDEX uk_point_participant_member
    ON point_participants(family_group_id, family_member_id)
    WHERE family_member_id IS NOT NULL;
CREATE INDEX idx_point_participants_group ON point_participants(family_group_id);

-- 3. point_balances
CREATE TABLE point_balances (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    participant_id  BIGINT NOT NULL REFERENCES point_participants(id),
    current_balance INTEGER NOT NULL DEFAULT 0,
    total_earned    INTEGER NOT NULL DEFAULT 0,
    total_spent     INTEGER NOT NULL DEFAULT 0,
    total_penalty   INTEGER NOT NULL DEFAULT 0,
    savings_balance INTEGER NOT NULL DEFAULT 0,
    investment_balance INTEGER NOT NULL DEFAULT 0,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    longest_streak  INTEGER NOT NULL DEFAULT 0,
    last_task_completed_at TIMESTAMP,
    inflation_multiplier NUMERIC(19,6) DEFAULT 1.0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0,
    UNIQUE(family_group_id, participant_id)
);
CREATE INDEX idx_point_balances_participant ON point_balances(participant_id);

-- 4. point_tasks
CREATE TABLE point_tasks (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    title           VARCHAR(200) NOT NULL,
    description     VARCHAR(1000),
    category        VARCHAR(20) NOT NULL,
    point_value     INTEGER NOT NULL,
    penalty_value   INTEGER DEFAULT 0,
    assigned_to     BIGINT REFERENCES point_participants(id),
    assigned_by     BIGINT NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    recurrence      VARCHAR(20) NOT NULL DEFAULT 'ONCE',
    deadline        TIMESTAMP,
    completed_at    TIMESTAMP,
    verified_by     BIGINT REFERENCES users(id),
    rejection_reason VARCHAR(500),
    icon            VARCHAR(50),
    color           VARCHAR(20),
    parent_task_id  BIGINT,
    multiplier      NUMERIC(10,2) DEFAULT 1.0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);
CREATE INDEX idx_point_tasks_group_status ON point_tasks(family_group_id, status);
CREATE INDEX idx_point_tasks_assigned ON point_tasks(assigned_to);
CREATE INDEX idx_point_tasks_deadline ON point_tasks(deadline) WHERE status NOT IN ('VERIFIED', 'REJECTED', 'FAILED', 'EXPIRED');

-- 5. point_transactions
CREATE TABLE point_transactions (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    participant_id  BIGINT NOT NULL REFERENCES point_participants(id),
    type            VARCHAR(30) NOT NULL,
    amount          INTEGER NOT NULL,
    balance_before  INTEGER NOT NULL,
    balance_after   INTEGER NOT NULL,
    description     VARCHAR(500),
    task_id         BIGINT REFERENCES point_tasks(id),
    created_by      BIGINT REFERENCES users(id),
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);
CREATE INDEX idx_point_transactions_participant ON point_transactions(participant_id, transaction_date DESC);
CREATE INDEX idx_point_transactions_group ON point_transactions(family_group_id);

-- 6. point_conversions
CREATE TABLE point_conversions (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    participant_id  BIGINT NOT NULL REFERENCES point_participants(id),
    points_converted INTEGER NOT NULL,
    conversion_rate NUMERIC(19,4) NOT NULL,
    money_amount    NUMERIC(19,2) NOT NULL,
    currency        VARCHAR(10) DEFAULT 'UZS',
    target_account_id BIGINT REFERENCES accounts(id),
    approved_by     BIGINT REFERENCES users(id),
    conversion_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);
CREATE INDEX idx_point_conversions_participant ON point_conversions(participant_id);

-- 7. point_achievements
CREATE TABLE point_achievements (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT REFERENCES family_groups(id),
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    type            VARCHAR(30) NOT NULL,
    icon            VARCHAR(50),
    color           VARCHAR(20),
    required_value  INTEGER NOT NULL,
    bonus_points    INTEGER NOT NULL DEFAULT 0,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);

-- 8. point_member_achievements
CREATE TABLE point_member_achievements (
    id              BIGSERIAL PRIMARY KEY,
    participant_id  BIGINT NOT NULL REFERENCES point_participants(id),
    achievement_id  BIGINT NOT NULL REFERENCES point_achievements(id),
    earned_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0,
    UNIQUE(participant_id, achievement_id)
);

-- 9. point_savings_accounts
CREATE TABLE point_savings_accounts (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    participant_id  BIGINT NOT NULL REFERENCES point_participants(id),
    balance         INTEGER NOT NULL DEFAULT 0,
    interest_rate   NUMERIC(10,4) DEFAULT 0.05,
    last_interest_applied_at TIMESTAMP,
    total_interest_earned INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0,
    UNIQUE(family_group_id, participant_id)
);

-- 10. point_investments
CREATE TABLE point_investments (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    participant_id  BIGINT NOT NULL REFERENCES point_participants(id),
    type            VARCHAR(20) NOT NULL,
    invested_amount INTEGER NOT NULL,
    current_value   INTEGER NOT NULL,
    return_rate     NUMERIC(10,4) DEFAULT 0,
    invested_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    maturity_date   DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);
CREATE INDEX idx_point_investments_participant ON point_investments(participant_id);

-- 11. point_multiplier_events
CREATE TABLE point_multiplier_events (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    multiplier      NUMERIC(10,2) NOT NULL,
    start_date      TIMESTAMP NOT NULL,
    end_date        TIMESTAMP NOT NULL,
    task_category   VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      BIGINT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);

-- 12. point_inflation_snapshots
CREATE TABLE point_inflation_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    snapshot_date   DATE NOT NULL,
    inflation_rate  NUMERIC(10,4) NOT NULL,
    cumulative_multiplier NUMERIC(19,6) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);

-- 13. point_shop_items
CREATE TABLE point_shop_items (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    price           INTEGER NOT NULL,
    icon            VARCHAR(50),
    color           VARCHAR(20),
    stock           INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      BIGINT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);

-- 14. point_purchases
CREATE TABLE point_purchases (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    participant_id  BIGINT NOT NULL REFERENCES point_participants(id),
    shop_item_id    BIGINT NOT NULL REFERENCES point_shop_items(id),
    points_spent    INTEGER NOT NULL,
    purchase_date   TIMESTAMP NOT NULL DEFAULT NOW(),
    is_delivered    BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at    TIMESTAMP,
    delivered_by    BIGINT REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);
CREATE INDEX idx_point_purchases_participant ON point_purchases(participant_id);

-- 15. point_challenges
CREATE TABLE point_challenges (
    id              BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id),
    title           VARCHAR(200) NOT NULL,
    description     VARCHAR(1000),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    reward_points   INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    task_category   VARCHAR(20),
    created_by      BIGINT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);

-- 16. point_challenge_participants
CREATE TABLE point_challenge_participants (
    id              BIGSERIAL PRIMARY KEY,
    challenge_id    BIGINT NOT NULL REFERENCES point_challenges(id),
    participant_id  BIGINT NOT NULL REFERENCES point_participants(id),
    score           INTEGER NOT NULL DEFAULT 0,
    rank            INTEGER,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0,
    UNIQUE(challenge_id, participant_id)
);

-- =============================================
-- 17. POINTS permissions
-- =============================================
INSERT INTO permissions (code, module, action, description, created_at)
VALUES
    ('POINTS_VIEW', 'POINTS', 'VIEW', 'Ball tizimini ko''rish', NOW()),
    ('POINTS_MANAGE', 'POINTS', 'MANAGE', 'Ball tizimini boshqarish', NOW()),
    ('POINTS_ASSIGN_TASK', 'POINTS', 'ASSIGN', 'Vazifa tayinlash', NOW()),
    ('POINTS_VERIFY_TASK', 'POINTS', 'VERIFY', 'Vazifani tasdiqlash', NOW()),
    ('POINTS_AWARD', 'POINTS', 'AWARD', 'Ball berish/olish', NOW()),
    ('POINTS_CONVERT', 'POINTS', 'CONVERT', 'Ballni pullga ayirboshlash', NOW()),
    ('POINTS_VIEW_LEADERBOARD', 'POINTS', 'LEADERBOARD', 'Reytingni ko''rish', NOW()),
    ('POINTS_MANAGE_ACHIEVEMENTS', 'POINTS', 'ACHIEVEMENTS', 'Yutuqlarni boshqarish', NOW()),
    ('POINTS_MANAGE_EVENTS', 'POINTS', 'EVENTS', 'Multiplier eventlarni boshqarish', NOW()),
    ('POINTS_MANAGE_SHOP', 'POINTS', 'SHOP', 'Do''konni boshqarish', NOW()),
    ('POINTS_MANAGE_CHALLENGES', 'POINTS', 'CHALLENGES', 'Musobaqalarni boshqarish', NOW());

-- =============================================
-- 18. System achievements (seed data)
-- =============================================
INSERT INTO point_achievements (name, description, type, icon, color, required_value, bonus_points, is_system, is_active, created_at, version)
VALUES
    ('Birinchi qadam', 'Birinchi vazifani bajar', 'TASK_COUNT', 'star', '#FFD700', 1, 5, TRUE, TRUE, NOW(), 0),
    ('Harakatchan', '10 ta vazifani bajar', 'TASK_COUNT', 'zap', '#FF6B35', 10, 15, TRUE, TRUE, NOW(), 0),
    ('Mehnatsevar', '50 ta vazifani bajar', 'TASK_COUNT', 'award', '#4CAF50', 50, 50, TRUE, TRUE, NOW(), 0),
    ('Usta', '100 ta vazifani bajar', 'TASK_COUNT', 'crown', '#9C27B0', 100, 100, TRUE, TRUE, NOW(), 0),
    ('3 kunlik streak', 'Ketma-ket 3 kun vazifa bajar', 'STREAK', 'flame', '#FF5722', 3, 10, TRUE, TRUE, NOW(), 0),
    ('7 kunlik streak', 'Ketma-ket 7 kun vazifa bajar', 'STREAK', 'flame', '#E91E63', 7, 25, TRUE, TRUE, NOW(), 0),
    ('30 kunlik streak', 'Ketma-ket 30 kun vazifa bajar', 'STREAK', 'flame', '#F44336', 30, 100, TRUE, TRUE, NOW(), 0),
    ('Birinchi 100 ball', '100 ball to''pla', 'POINT_MILESTONE', 'target', '#2196F3', 100, 10, TRUE, TRUE, NOW(), 0),
    ('500 ball', '500 ball to''pla', 'POINT_MILESTONE', 'target', '#3F51B5', 500, 30, TRUE, TRUE, NOW(), 0),
    ('1000 ball', '1000 ball to''pla', 'POINT_MILESTONE', 'trophy', '#673AB7', 1000, 75, TRUE, TRUE, NOW(), 0),
    ('Birinchi ayirboshlash', 'Ballni birinchi marta pullga ayirboshla', 'FIRST_CONVERSION', 'repeat', '#009688', 1, 10, TRUE, TRUE, NOW(), 0),
    ('Investor', 'Birinchi investitsiyani qil', 'INVESTOR', 'trending-up', '#795548', 1, 15, TRUE, TRUE, NOW(), 0),
    ('Mukammal hafta', 'Bir haftada barcha vazifalarni bajar', 'PERFECT_WEEK', 'check-circle', '#4CAF50', 1, 50, TRUE, TRUE, NOW(), 0),
    ('Birinchi xarid', 'Do''kondan birinchi xaridni qil', 'FIRST_PURCHASE', 'shopping-bag', '#FF9800', 1, 5, TRUE, TRUE, NOW(), 0),
    ('Jamg''armachi', 'Jamg''arma hisobiga 100 ball qo''y', 'SAVINGS_GOAL', 'piggy-bank', '#8BC34A', 100, 20, TRUE, TRUE, NOW(), 0);
