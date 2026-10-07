-- ═══════════════════════════════════════════════════════════════════
--  Migration 009 — Frais de Route (Gestion Logistique & Caisse)
--  Tables : trajets, frais_route, baremes_destination
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
--  Barème des montants habituels par destination
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baremes_destination (
  id            SERIAL PRIMARY KEY,
  chantier      VARCHAR(200) NOT NULL UNIQUE,
  montant_fcfa  NUMERIC(12,0) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────
--  Trajets enregistrés par la logistique
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trajets (
  id              SERIAL PRIMARY KEY,
  numero_camion   VARCHAR(30)  NOT NULL,
  chauffeur       VARCHAR(200) NOT NULL,
  chantier        VARCHAR(200) NOT NULL,
  date_trajet     DATE         NOT NULL DEFAULT CURRENT_DATE,
  shift           VARCHAR(10)  NOT NULL DEFAULT 'matin',
  numero_voyage   INT          NOT NULL DEFAULT 1,
  statut_caisse   VARCHAR(20)  NOT NULL DEFAULT 'pending',
  cree_par        VARCHAR(200),
  notes           TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trajets_date     ON trajets(date_trajet);
CREATE INDEX IF NOT EXISTS idx_trajets_camion   ON trajets(numero_camion);
CREATE INDEX IF NOT EXISTS idx_trajets_statut   ON trajets(statut_caisse);
CREATE INDEX IF NOT EXISTS idx_trajets_shift    ON trajets(date_trajet, shift, numero_camion);

-- ──────────────────────────────────────────────────────────────────
--  Frais de route décaissés (dépenses réelles)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frais_route (
  id              SERIAL PRIMARY KEY,
  trajet_id       INT          NOT NULL REFERENCES trajets(id) ON DELETE CASCADE,
  numero_camion   VARCHAR(30)  NOT NULL,
  chauffeur       VARCHAR(200) NOT NULL,
  chantier        VARCHAR(200) NOT NULL,
  date_trajet     DATE         NOT NULL,
  shift           VARCHAR(10)  NOT NULL,
  montant_fcfa    NUMERIC(12,0) NOT NULL DEFAULT 0,
  motif           TEXT,
  caissiere       VARCHAR(200),
  decaisse_le     TIMESTAMPTZ  DEFAULT NOW(),
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frais_route_trajet ON frais_route(trajet_id);
CREATE INDEX IF NOT EXISTS idx_frais_route_date   ON frais_route(date_trajet);

-- ──────────────────────────────────────────────────────────────────
--  Trigger : auto-update updated_at
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_trajets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trajets_updated_at ON trajets;
CREATE TRIGGER trg_trajets_updated_at
  BEFORE UPDATE ON trajets
  FOR EACH ROW EXECUTE FUNCTION update_trajets_updated_at();

-- ──────────────────────────────────────────────────────────────────
--  Barème de démarrage
-- ──────────────────────────────────────────────────────────────────
INSERT INTO baremes_destination (chantier, montant_fcfa, notes) VALUES
  ('Chantier Nord',    5000, 'Tarif standard zone nord'),
  ('Chantier Sud',     7500, 'Distance superieure'),
  ('Chantier Port',    6000, 'Zone portuaire'),
  ('Chantier Centre',  4000, 'Zone urbaine centre'),
  ('Chantier Est',     8000, 'Route longue')
ON CONFLICT (chantier) DO NOTHING;
