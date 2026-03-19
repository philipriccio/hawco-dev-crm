-- Add development fields to Coverage
ALTER TABLE "Coverage"
  ADD COLUMN IF NOT EXISTS "synopsis" TEXT,
  ADD COLUMN IF NOT EXISTS "seriesEngine" TEXT,
  ADD COLUMN IF NOT EXISTS "targetNetwork" TEXT,
  ADD COLUMN IF NOT EXISTS "comps" TEXT;
