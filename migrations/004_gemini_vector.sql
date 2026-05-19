-- Migration 004: Gemini Vector Support
-- Changes the dimension of the embedding column from 1536 (OpenAI) to 768 (Gemini)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='knowledge_chunks' AND column_name='embedding') THEN
    ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(768);
  END IF;
END $$;
