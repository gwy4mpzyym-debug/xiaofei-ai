CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  intent_score INTEGER NOT NULL DEFAULT 2,
  needs_human INTEGER NOT NULL DEFAULT 0,
  phone TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  requested_time TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_business_created ON leads (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_business_status ON leads (business_id, status);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  business_id TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
