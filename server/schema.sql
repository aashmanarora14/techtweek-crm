-- ============================================================
--  TechTweek Infotech CRM — PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── SALESPERSONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salespersons (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  email       VARCHAR(150),
  role        VARCHAR(80)  DEFAULT 'Sales Executive',
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO salespersons (name, email, role) VALUES
  ('Vinay',  'vinay@techtweek.in',  'Sales Executive'),
  ('Devina', 'devina@techtweek.in', 'Sales Executive'),
  ('Simran', 'simran@techtweek.in', 'Sales Executive'),
  ('Sahil',  'sahil@techtweek.in',  'Sales Executive')
ON CONFLICT (name) DO NOTHING;

-- ─── LEADS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                    SERIAL PRIMARY KEY,
  lead_no               VARCHAR(20)  UNIQUE NOT NULL,  -- e.g. TTIT-SL-0001
  month                 VARCHAR(20),
  date_generated        DATE,
  client_name           VARCHAR(200) NOT NULL,
  company_name          VARCHAR(200),
  contact_email         VARCHAR(150),
  contact_phone         VARCHAR(50),
  service_required      VARCHAR(100),
  sales_channel         VARCHAR(100),
  lead_category         VARCHAR(50)  DEFAULT 'Cold Lead'
                        CHECK (lead_category IN ('Cold Lead','Warm Lead','Hot Lead')),
  assigned_to           VARCHAR(100),
  lead_status           VARCHAR(60)  DEFAULT 'New'
                        CHECK (lead_status IN ('New','Contacted','Follow-up Required',
                               'Proposal Sent','Negotiation','Won','Lost','No Response')),
  estimated_value_usd   NUMERIC(12,2),
  expected_close_date   DATE,
  last_contact_date     DATE,
  next_followup_date    DATE,
  notes                 TEXT,
  interview_call_by     VARCHAR(150),
  comments              TEXT,
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PERFORMANCE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance (
  id               SERIAL PRIMARY KEY,
  salesperson_name VARCHAR(100) NOT NULL,
  month_label      VARCHAR(20)  NOT NULL,  -- e.g. "Sept-25"
  earnings_usd     NUMERIC(12,2) DEFAULT 0,
  received_usd     NUMERIC(12,2) DEFAULT 0,
  billboard_pos    INT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (salesperson_name, month_label)
);

-- Seed performance data
INSERT INTO performance (salesperson_name, month_label, earnings_usd, received_usd, billboard_pos) VALUES
  ('Vinay Sachdeva','Sept-25',0,0,3),('DevinSingh','Sept-25',6390,3640,1),('Simran Devi','Sept-25',1200,1200,2),('Sahil Dubey','Sept-25',0,0,4),
  ('Vinay Sachdeva','Oct-25',1200,832,1),('DevinSingh','Oct-25',0,0,2),('Simran Devi','Oct-25',0,0,3),('Sahil Dubey','Oct-25',0,0,4),
  ('Vinay Sachdeva','Nov-25',0,0,3),('DevinSingh','Nov-25',60,0,2),('Simran Devi','Nov-25',100,0,1),('Sahil Dubey','Nov-25',0,0,4),
  ('Vinay Sachdeva','Dec-25',0,0,3),('DevinSingh','Dec-25',0,0,2),('Simran Devi','Dec-25',186.66,0,1),('Sahil Dubey','Dec-25',0,0,4),
  ('Vinay Sachdeva','Jan-26',0,3100,2),('DevinSingh','Jan-26',0,4968.92,1),('Simran Devi','Jan-26',0,0,3),('Sahil Dubey','Jan-26',0,0,4),
  ('Vinay Sachdeva','Feb-26',0,0,2),('DevinSingh','Feb-26',0,2750,1),('Simran Devi','Feb-26',0,0,3),('Sahil Dubey','Feb-26',0,0,4),
  ('Vinay Sachdeva','Mar-26',0,0,2),('DevinSingh','Mar-26',0,1343.13,1),('Simran Devi','Mar-26',0,0,3),('Sahil Dubey','Mar-26',0,0,4)
ON CONFLICT (salesperson_name, month_label) DO NOTHING;

-- ─── USEFUL INDEXES ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads (lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_channel  ON leads (sales_channel);
CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads (next_followup_date);
CREATE INDEX IF NOT EXISTS idx_leads_created  ON leads (created_at DESC);

-- ─── SEQUENCE for lead_no ────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS lead_seq START 176;

-- Helper function to generate next lead number
CREATE OR REPLACE FUNCTION next_lead_no()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'TTIT-SL-' || LPAD(nextval('lead_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
