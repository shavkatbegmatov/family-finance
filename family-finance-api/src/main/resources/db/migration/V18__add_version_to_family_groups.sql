-- V18: Add version column to family_groups
-- This fixes the missing @Version column inherited from BaseEntity

ALTER TABLE family_groups ADD COLUMN version BIGINT DEFAULT 0;
