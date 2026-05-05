-- Migration 002: pgvector and Knowledge base
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- Dimension for text-embedding-3-small
  source VARCHAR(255),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster vector search (IVFFlat)
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
