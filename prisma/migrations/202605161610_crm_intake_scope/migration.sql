-- CRM script-intake scope expansion
-- Adds project-level source tracking and Gmail thread provenance for Cowork intake.

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sourceContactId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "submissionThreadId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Project_sourceContactId_fkey'
  ) THEN
    ALTER TABLE "Project"
      ADD CONSTRAINT "Project_sourceContactId_fkey"
      FOREIGN KEY ("sourceContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Project_sourceContactId_idx" ON "Project"("sourceContactId");
CREATE INDEX IF NOT EXISTS "Project_submissionThreadId_idx" ON "Project"("submissionThreadId");
CREATE INDEX IF NOT EXISTS "Contact_companyId_idx" ON "Contact"("companyId");
