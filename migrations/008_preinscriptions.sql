-- ═══════════════════════════════════════════════════════════
--  Migration 008 — Pré-inscriptions ISETAG
--  Stores all pre-registration submissions from the web form
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS preinscriptions (
  id                    SERIAL PRIMARY KEY,

  -- Identité
  full_name             VARCHAR(200) NOT NULL,
  sex                   VARCHAR(10),
  date_of_birth         DATE,
  place_of_birth        VARCHAR(100),
  region                VARCHAR(100),
  nationality           VARCHAR(100),
  religion              VARCHAR(100),
  blood_group           VARCHAR(10),

  -- Contacts
  phone                 VARCHAR(30) NOT NULL,
  email                 VARCHAR(150),
  emergency_contact_1   VARCHAR(200),
  emergency_phone_1     VARCHAR(30),
  emergency_contact_2   VARCHAR(200),
  emergency_phone_2     VARCHAR(30),
  health_notes          TEXT,

  -- Parcours
  former_school         VARCHAR(200),
  graduation_year       VARCHAR(10),

  -- Choix de filière
  domain                VARCHAR(100) NOT NULL,   -- ex: TIC, Commerce, Industrie, Maritime
  specialty             VARCHAR(200),            -- ex: Génie Logiciel, Nautical Science…
  study_level           VARCHAR(50),             -- BTS, HND, Licence, Master

  -- Source (WhatsApp phone that triggered this, if any)
  whatsapp_phone        VARCHAR(30),

  -- Documents (stored as file paths relative to uploads dir)
  doc_photo             VARCHAR(300),
  doc_probatoire        VARCHAR(300),
  doc_bac               VARCHAR(300),
  doc_cv                VARCHAR(300),
  doc_medical           VARCHAR(300),
  doc_cni               VARCHAR(300),
  doc_birth_cert        VARCHAR(300),

  -- Status
  status                VARCHAR(30) DEFAULT 'pending',  -- pending | reviewed | accepted | rejected
  admin_notes           TEXT,

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by phone
CREATE INDEX IF NOT EXISTS idx_preinscriptions_phone ON preinscriptions(phone);
CREATE INDEX IF NOT EXISTS idx_preinscriptions_status ON preinscriptions(status);
CREATE INDEX IF NOT EXISTS idx_preinscriptions_domain ON preinscriptions(domain);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_preinscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_preinscriptions_updated_at ON preinscriptions;
CREATE TRIGGER trg_preinscriptions_updated_at
  BEFORE UPDATE ON preinscriptions
  FOR EACH ROW EXECUTE FUNCTION update_preinscriptions_updated_at();
