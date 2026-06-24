-- Migration 007: Add prospect_name column to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS prospect_name VARCHAR(100);
