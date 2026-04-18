ALTER TABLE report_jobs
ADD COLUMN IF NOT EXISTS attack_id uuid;

ALTER TABLE report_jobs
ADD COLUMN IF NOT EXISTS report_json jsonb;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'report_jobs_attack_id_fkey'
  ) THEN
    ALTER TABLE report_jobs
    ADD CONSTRAINT report_jobs_attack_id_fkey
    FOREIGN KEY (attack_id) REFERENCES attacks(id) ON DELETE CASCADE;
  END IF;
END
$do$;

CREATE INDEX IF NOT EXISTS idx_report_jobs_attack_id ON report_jobs(attack_id);
