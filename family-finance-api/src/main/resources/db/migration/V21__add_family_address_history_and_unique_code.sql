-- Add unique_code and current_address to family_groups
ALTER TABLE family_groups
ADD COLUMN unique_code VARCHAR(20) UNIQUE,
ADD COLUMN current_address VARCHAR(500);

-- Create family_address_history table
CREATE TABLE family_address_history (
    id BIGSERIAL PRIMARY KEY,
    family_group_id BIGINT NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    address VARCHAR(500) NOT NULL,
    move_in_date DATE NOT NULL,
    move_out_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    record_status VARCHAR(20)
);

-- Index for querying history
CREATE INDEX idx_fam_add_hist_family_group ON family_address_history(family_group_id);
