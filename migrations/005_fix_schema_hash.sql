-- Migration 005: Fix user_phone_hash constraint from V1
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='user_phone_hash') THEN
    ALTER TABLE conversations ALTER COLUMN user_phone_hash DROP NOT NULL;
  END IF;
END $$;
