-- Migration 006: Cancelled
-- We use outputDimensionality: 768 in the API instead to avoid the 2000-dimension limit of pgvector ivfflat indexes.
SELECT 1;
