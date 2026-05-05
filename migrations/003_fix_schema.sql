-- Migration 003: Fix V1 to V2 schema differences

DO $$
BEGIN
  -- Widen user_phone column if it exists and is too short
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='user_phone') THEN
    ALTER TABLE conversations ALTER COLUMN user_phone TYPE TEXT;
  END IF;

  -- Add user_phone if it doesn't exist (as TEXT to fit any value)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='user_phone') THEN
    ALTER TABLE conversations ADD COLUMN user_phone TEXT;
  END IF;

  -- Add last_message if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='last_message') THEN
    ALTER TABLE conversations ADD COLUMN last_message TEXT;
  END IF;

  -- Add summary if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='summary') THEN
    ALTER TABLE conversations ADD COLUMN summary TEXT;
  END IF;

  -- Add lang if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='lang') THEN
    ALTER TABLE conversations ADD COLUMN lang VARCHAR(10) DEFAULT 'fr';
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='updated_at') THEN
    ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;

  -- Copy from user_phone_hash to user_phone if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='user_phone_hash') THEN
    UPDATE conversations SET user_phone = user_phone_hash WHERE user_phone IS NULL AND user_phone_hash IS NOT NULL;
  END IF;
END $$;
