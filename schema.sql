-- Skema produksi yang disarankan untuk tabsipakarcinta.
-- Demo lokal saat ini memakai file JSON agar bisa dijalankan tanpa database.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS share_posts (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL CHECK (topic IN ('Overthinking', 'Burnout', 'Relasi', 'Keluarga', 'Kuliah / kerja', 'Self-worth')),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 20 AND 500),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  is_anonymous INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_share_posts_status_created
  ON share_posts (moderation_status, created_at DESC);

CREATE TABLE IF NOT EXISTS consultation_requests (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  contact_channel TEXT NOT NULL CHECK (contact_channel IN ('Email', 'WhatsApp')),
  topic TEXT NOT NULL,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 20 AND 700),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'closed')),
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_consultations_status_created
  ON consultation_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY,
  mood TEXT NOT NULL,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS moderation_reports (
  id TEXT PRIMARY KEY,
  share_post_id TEXT NOT NULL REFERENCES share_posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
