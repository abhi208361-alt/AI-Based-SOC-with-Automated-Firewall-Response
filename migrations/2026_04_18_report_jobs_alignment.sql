-- Align report_jobs schema with current SQLAlchemy models and routes
-- Safe to run multiple times where possible.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure primary key type matches ORM (UUID)
ALTER TABLE report_jobs
  ALTER COLUMN id TYPE uuid USING id::uuid;

ALTER TABLE report_jobs
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure foreign key column type matches attacks.id (UUID)
ALTER TABLE report_jobs
  ALTER COLUMN attack_id TYPE uuid USING attack_id::uuid;

-- Legacy compatibility: old column may exist and be NOT NULL
ALTER TABLE report_jobs
  ALTER COLUMN incident_id DROP NOT NULL;

-- Ensure expected columns exist
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'queued';
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS error text;
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS report_json jsonb;
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- Ensure FK exists
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_jobs_attack_id_fkey'
  ) THEN
    ALTER TABLE report_jobs
      ADD CONSTRAINT report_jobs_attack_id_fkey
      FOREIGN KEY (attack_id) REFERENCES attacks(id) ON DELETE CASCADE;
  END IF;
END
$do$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_report_jobs_attack_id ON report_jobs(attack_id);

COMMIT;