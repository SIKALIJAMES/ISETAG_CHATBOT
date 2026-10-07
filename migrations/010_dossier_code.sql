-- ═══════════════════════════════════════════════════════════
--  Migration 010 — Ajout du Code Dossier Unique
--  Ajoute la colonne dossier_code et génère les codes existants
-- ═══════════════════════════════════════════════════════════

ALTER TABLE preinscriptions ADD COLUMN IF NOT EXISTS dossier_code VARCHAR(50);

-- Mettre à jour les enregistrements existants s'ils n'ont pas encore de code
UPDATE preinscriptions 
SET dossier_code = 'ISETAG-2026-' || LPAD(id::text, 4, '0')
WHERE dossier_code IS NULL;

-- Index pour recherche rapide par code dossier
CREATE UNIQUE INDEX IF NOT EXISTS idx_preinscriptions_dossier_code ON preinscriptions(dossier_code);
