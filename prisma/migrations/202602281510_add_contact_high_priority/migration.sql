-- Add manual high-priority flag for contacts (writers)
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "highPriority" BOOLEAN NOT NULL DEFAULT false;
