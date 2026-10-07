-- ═══════════════════════════════════════════════════════════
--  Migration 011 — Module de Relance Automatique (Nurturing)
--  Ajoute la colonne nurtured_at pour marquer les relances 24h
-- ═══════════════════════════════════════════════════════════

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS nurtured_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_conversations_nurtured_at ON conversations(nurtured_at);
