CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS attacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ip varchar(64) NOT NULL,
  destination_ip varchar(64) NOT NULL,
  attack_type varchar(120) NOT NULL,
  severity varchar(20) NOT NULL,
  "timestamp" timestamptz NOT NULL,
  raw_message text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attack_id uuid NOT NULL REFERENCES attacks(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'queued',
  error text NULL,
  report_json jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_report_jobs_attack_id ON report_jobs(attack_id);